// ManageCreateEventPage.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../utils/config.js";
import { useDialog } from "../components/DialogProvider";
import { isoToLocalInput, localInputToIso } from "../utils/dateTimeUtils.js";
/* ---------- spacing constants ---------- */
const GAPS = { section: 20, inner: 12, footer: 10 };

/* ---------- description word limit (CJK-friendly) ---------- */
const MAX_WORDS = 500;
const TOKEN_RE =
  /[A-Za-z0-9]+(?:'[A-Za-z0-9]+)*|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

function countTokens(text) {
  if (!text) return 0;
  const m = text.match(TOKEN_RE);
  return m ? m.length : 0;
}
function clipToTokenLimit(text, limit) {
  if (!text) return "";
  if (limit <= 0) return "";
  let count = 0;
  let end = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    count++;
    end = match.index + match[0].length;
    if (count >= limit) break;
  }
  return count < limit ? text : text.slice(0, end);
}

/* ---------- UUID helper ---------- */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ---------- Google Maps / Places ---------- */
const GMAPS_KEY = import.meta?.env?.VITE_GMAPS_KEY || "AIzaSyDD8k2BkgtBRnumIa-3wGe-svPC8xyJ3h0";

function loadGooglePlacesScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) return resolve();
    const id = "gmaps-places-sdk";
    if (document.getElementById(id)) {
      const onReady = () => window.google?.maps?.places ? resolve() : reject(new Error("Google not ready"));
      setTimeout(onReady, 50);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.defer = true;
    // libraries=places；let language、region to be en / NZ
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GMAPS_KEY)}&libraries=places&language=en&region=NZ`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS API"));
    document.head.appendChild(s);
  });
}

export default function ManageCreateEventPage() {
  const navigate = useNavigate();
  const dlg = useDialog();

  // /manage/create?organizerId=1&eventId=23  or route params
  const { userId: paramUserId, eventId: paramEventId } = useParams();
  const [sp] = useSearchParams();
  const userId = paramUserId ?? sp.get("organizerId");
  const eventId = paramEventId ?? sp.get("eventId");
  const isEdit = Boolean(eventId);

  // form state
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [category, setCategory] = useState("Tech");
  const [description, setDescription] = useState("");

  // location UX states
  const [locationType, setLocationType] = useState("venue"); // 'venue' | 'online'
  const [venueAddress, setVenueAddress] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");

  // image states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingS3Key, setExistingS3Key] = useState("");
  const [imageRemoved, setImageRemoved] = useState(false);

  // Generate UUID for new events (only once per component lifecycle)
  const [tempId] = useState(() => isEdit ? null : generateUUID());

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // dirty baseline
  const [baseline, setBaseline] = useState(null);
  const isDirty = useMemo(() => {
    if (!baseline) return true;
    return (
      baseline.title !== title ||
      baseline.start !== start ||
      baseline.end !== end ||
      baseline.capacity !== capacity ||
      baseline.category !== category ||
      baseline.imagePreview !== imagePreview ||
      baseline.description !== description ||
      baseline.locationType !== locationType ||
      baseline.venueAddress !== venueAddress ||
      baseline.onlineUrl !== onlineUrl
    );
  }, [baseline, title, start, end, capacity, category, imagePreview, description, locationType, venueAddress, onlineUrl]);

  /* ---------- Address Autocomplete（改为 Google Places） ---------- */
  const [addrQuery, setAddrQuery] = useState("");            // mirrors venueAddress
  const [addrSuggests, setAddrSuggests] = useState([]);      // Google predictions
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrHi, setAddrHi] = useState(-1);
  const [coords, setCoords] = useState(null);                // {lat, lon}
  const [googleQueryAddress, setGoogleQueryAddress] = useState(""); // for iframe

  // Google services
  const gReadyRef = useRef(false);
  const autoSvcRef = useRef(null);
  const placesSvcRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const justPickedRef = useRef(false);

  // 初始化 Google Places
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadGooglePlacesScript();
        if (!alive) return;
        gReadyRef.current = true;
        autoSvcRef.current = new window.google.maps.places.AutocompleteService();
        // PlacesService 需要挂在一个“空的”HTML元素/地图上，创建一个 div 即可
        const dummyDiv = document.createElement("div");
        placesSvcRef.current = new window.google.maps.places.PlacesService(dummyDiv);
        // 初始化会话 token（提升计费与结果一致性）
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 加载已有事件（原逻辑完全不变）
  useEffect(() => {
    if (!isEdit || !userId || !eventId) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `${API_BASE_URL}/events/${encodeURIComponent(eventId)}`,
          { credentials: "include", headers: { Accept: "application/json" } }
        );

        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (res.status === 403) throw new Error("You are not allowed to edit this event.");
        if (res.status === 404) throw new Error("Event not found.");
        if (!res.ok) throw new Error(`Load failed (${res.status})`);

        const ev = await res.json();
        if (!alive) return;

        setTitle(ev.title ?? "");
        setStart(isoToLocalInput(ev.startAt));
        setEnd(isoToLocalInput(ev.endAt));
        setLocation(ev.location ?? "");
        setCapacity(Number(ev.capacity ?? 50));
        setCategory(ev.category ?? "Tech");
        setDescription(ev.description ?? "");

        setImagePreview(ev.imageUrl ?? "");
        setExistingS3Key(ev.imageS3Key ?? "");

        const loc = ev.location ?? "";
        if (/^https?:\/\//i.test(loc)) {
          setLocationType("online");
          setOnlineUrl(loc);
          setVenueAddress("");
          setAddrQuery("");
          setGoogleQueryAddress("");
        } else {
          setLocationType("venue");
          setVenueAddress(loc);
          setAddrQuery(loc);
          setGoogleQueryAddress(loc);
        }

        setBaseline({
          title: ev.title ?? "",
          start: isoToLocalInput(ev.startAt),
          end: isoToLocalInput(ev.endAt),
          location: ev.location ?? "",
          capacity: Number(ev.capacity ?? 50),
          category: ev.category ?? "Tech",
          imagePreview: ev.imageUrl ?? "",
          description: ev.description ?? "",
          locationType: /^https?:\/\//i.test(loc) ? "online" : "venue",
          venueAddress: /^https?:\/\//i.test(loc) ? "" : (loc || ""),
          onlineUrl: /^https?:\/\//i.test(loc) ? (loc || "") : "",
        });
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [isEdit, userId, eventId, navigate]);

  // venueAddress -> addrQuery 同步（原逻辑）
  useEffect(() => {
    if (locationType !== "venue") return;
    setAddrQuery(venueAddress);
  }, [venueAddress, locationType]);

  // Google Autocomplete：去抖获取预测
  useEffect(() => {
    if (locationType !== "venue") return;
    if (!gReadyRef.current || !autoSvcRef.current) return;

    if (justPickedRef.current) { justPickedRef.current = false; return; }
    const q = addrQuery?.trim();
    if (!q) { setAddrSuggests([]); setAddrOpen(false); return; }

    const t = setTimeout(() => {
      setAddrLoading(true);
      autoSvcRef.current.getPlacePredictions(
        {
          input: q,
          types: ["address"],               
          componentRestrictions: { country: "nz" },
          sessionToken: sessionTokenRef.current,
        },
        (preds, status) => {
          setAddrLoading(false);
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !Array.isArray(preds)) {
            setAddrSuggests([]);
            setAddrOpen(false);
            return;
          }
          // 只保留我们需要的字段，保持你原来下拉样式
          const mapped = preds.map((p) => {
            const main = p.structured_formatting?.main_text || p.description || "";
            const secondary = p.structured_formatting?.secondary_text || "";
            return {
              place_id: p.place_id,
              main_text: main,
              secondary_text: secondary,
              full_text: p.description || [main, secondary].filter(Boolean).join(", "),
            };
          });
          setAddrSuggests(mapped);
          setAddrOpen(mapped.length > 0);
          setAddrHi(-1);
        }
      );
    }, 220);

    return () => clearTimeout(t);
  }, [addrQuery, locationType]);

  // 选择某个候选：用 Places Details 拿“标准地址 + 坐标”
  const pickSuggestion = useCallback((sug) => {
    if (!sug?.place_id || !placesSvcRef.current) return;

    placesSvcRef.current.getDetails(
      {
        placeId: sug.place_id,
        fields: ["formatted_address", "geometry"],
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return;

        justPickedRef.current = true;

        const formatted = place.formatted_address || sug.full_text || sug.main_text;
        setVenueAddress(formatted);
        setAddrQuery(formatted);
        setGoogleQueryAddress(formatted);     // iframe 使用同一串，保证地图与输入一致

        const loc = place.geometry?.location;
        if (loc) setCoords({ lat: loc.lat(), lon: loc.lng() });

        setAddrOpen(false);
        setAddrSuggests([]);
        setAddrHi(-1);

        // 每次 pick 都重置 session token，开启新的会话（官方建议）
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    );
  }, []);

  /* ---------- S3 upload helpers ---------- */
  const getPresignedUrl = async (fileName, contentType) => {
    const params = new URLSearchParams({ fileName, contentType });
    
    // Use eventId for edit mode, tempId for create mode
    if (isEdit && eventId) {
      params.append('eventId', eventId);
    } else if (tempId) {
      params.append('tempId', tempId);
    } else {
      throw new Error('No valid ID for upload');
    }
    
    const response = await fetch(`${API_BASE_URL}/fileupload/presigned-url?${params}`, { credentials: "include" });
    if (!response.ok) throw new Error("Failed to get presigned URL");
    return await response.json();
  };
  const uploadToS3 = async (file, presignedData) => {
    const formData = new FormData();
    Object.entries(presignedData.fields).forEach(([k, v]) => formData.append(k, v));
    formData.append("file", file);
    const response = await fetch(presignedData.url, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Failed to upload to S3");
    return presignedData.s3Key;
  };

  // ManageCreateEventPage.jsx - onSubmit 函数的修改部分
  /* ---------- Save ---------- */
  const onSubmit = useCallback(async (e) => {
    e.preventDefault();

    const startIso = localInputToIso(start);
    const endIso = localInputToIso(end);
    
    if (!startIso || !endIso) {
      dlg.toast("Please provide valid start/end date & time.", "error");
      return;
    }
    
    if (new Date(endIso) <= new Date(startIso)) {
      dlg.toast("End time must be after start time.", "error");
      return;
    }
    
    if (locationType === "venue" && !venueAddress.trim()) {
      dlg.toast("Please enter the venue address.", "error");
      return;
    }
    
    if (locationType === "online" && !onlineUrl.trim()) {
      dlg.toast("Please enter the online meeting link.", "error");
      return;
    }
    
    const effectiveLocation =
      locationType === "online" ? onlineUrl.trim() : venueAddress.trim();

    try {
      setSaving(true);
      setError("");

      let s3Key = existingS3Key;
      let newImagePreview = imagePreview;
      
      if (imageFile) {
        try {
          dlg.toast("Uploading image...");
          const presignedData = await getPresignedUrl(imageFile.name, imageFile.type);
          s3Key = await uploadToS3(imageFile, presignedData);
          dlg.toast("Image uploaded successfully!");
          newImagePreview = imagePreview;
        } catch (err) {
          dlg.toast("Failed to upload image: " + err.message, "error");
          setSaving(false);
          return;
        }
      }
      
      if (imageRemoved && !imageFile) {
        s3Key = "";
        newImagePreview = "";
      }

      const payload = {
        title,
        startAt: startIso,
        endAt: endIso,
        location: effectiveLocation,
        capacity: Number(capacity) || 0,
        category,
        imageS3Key: s3Key || null,
        imageUrl: null,
        description,
        locationType,
      };

      const url = isEdit
        ? `${API_BASE_URL}/manage/organizer/${encodeURIComponent(userId)}/events/${encodeURIComponent(eventId)}`
        : `${API_BASE_URL}/manage/organizer/${encodeURIComponent(userId)}/events`;
      const method = isEdit ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.status === 401) {
        dlg.toast("Please log in again.", "error");
        navigate("/login", { replace: true });
        return;
      }
      
      if (r.status === 403) {
        dlg.toast("You are not allowed to modify this event.", "error");
        return;
      }
      
      if (!r.ok) {
        dlg.toast(`${method} failed (${r.status})`, "error");
        return;
      }

      if (isEdit) {
        // 👇 更新 baseline 时使用 newImagePreview
        setBaseline({
          title, 
          start, 
          end, 
          location: effectiveLocation, 
          capacity: Number(capacity) || 0,
          category, 
          imagePreview: newImagePreview, // 👈 这里改用 newImagePreview
          description, 
          locationType, 
          venueAddress, 
          onlineUrl,
        });
        setExistingS3Key(s3Key);
        setImageFile(null);
        setImageRemoved(false);
        dlg.toast("Event changes saved successfully! ✓");
      } else {
        dlg.toast("Event created successfully! ✓");
        navigate(`/manage`, { replace: true });
      }
    } catch (e2) {
      dlg.toast(e2.message || "Save failed. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }, [isEdit, userId, eventId, title, start, end, capacity, category, description, 
      locationType, venueAddress, onlineUrl, navigate, dlg, imageFile, existingS3Key, 
      imageRemoved, imagePreview]); // 👈 在依赖数组中添加 imagePreview
  /* ---------- Image handlers ---------- */
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please choose an image.");
    setImageFile(file);
    setImageRemoved(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };
  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageRemoved(true);
  };

  return (
    <main className="container section">
      <section className="hero" style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{isEdit ? "Edit event" : "Create event"}</h1>
        <p className="small" style={{ marginTop: 6 }}>
          Organizer: <code>{userId ?? "?"}</code>
        </p>
        <div style={{ marginTop: 10 }}>
          <Link className="btn btn-ghost" to={"/manage"}>
            ← Back to Manage
          </Link>
        </div>
      </section>

      <div className="card card--hero-bg">
        {loading ? (
          <div className="small">Loading…</div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: GAPS.section }}>
            {error && <div className="small" style={{ color: "crimson" }}>Error: {error}</div>}

            {/* ---------- Image ---------- */}
            <section className="card section" style={{ margin: 0, padding: 30, display: "flex", flexDirection: "column", gap: GAPS.inner }}>
              <h2 style={{ margin: 0 }}>Image</h2>
              <label>Event cover
                <input className="input" type="file" accept="image/*" onChange={onFileChange} />
              </label>
              {imagePreview && (
                <div className="avatar-preview-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="avatar-preview"
                    style={{
                      maxWidth: "400px",
                      maxHeight: "300px",
                      width: "100%",
                      height: "auto",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <button type="button" className="btn" onClick={removeImage}>Remove</button>
                </div>
              )}
            </section>

            {/* ---------- Event overview ---------- */}
            <section className="card section" style={{ margin: 0,padding: 30, display: "flex", flexDirection: "column", gap: GAPS.inner }}>
              <h2 style={{ margin: 0 }}>Event overview</h2>

              <label>Title
                <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <label>Description
                <textarea
                  className="textarea"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    const next = e.target.value;
                    const tokens = countTokens(next);
                    setDescription(tokens <= MAX_WORDS ? next : clipToTokenLimit(next, MAX_WORDS));
                  }}
                />
                <div className="small" style={{ marginTop: 6 }}>
                  {countTokens(description)} / {MAX_WORDS}
                </div>
              </label>

              <label>Category
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Technology</option>
                  <option>Creative</option>
                  <option>Sports</option>
                  <option>Wellness</option>
                  <option>Academic</option>
                </select>
              </label>
            </section>

            {/* ---------- Date & location ---------- */}
            <section className="card section" style={{ margin: 0,padding: 30, display: "flex", flexDirection: "column", gap: GAPS.inner }}>
              <h2 style={{ margin: 0 }}>Date and location</h2>

              <div className="grid grid-2">
                <label>Start
                  <input type="datetime-local" className="input" required value={start} onChange={(e) => setStart(e.target.value)} />
                </label>
                <label>End
                  <input type="datetime-local" className="input" required value={end} onChange={(e) => setEnd(e.target.value)} />
                </label>
              </div>

              {/* Location */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label id="location-type-label">Location</label>

                <div aria-labelledby="location-type-label" role="radiogroup" style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`btn ${locationType === "venue" ? "btn-primary" : "btn-ghost"}`}
                    aria-checked={locationType === "venue"}
                    role="radio"
                    onClick={() => setLocationType("venue")}
                  >
                    Venue
                  </button>
                  <button
                    type="button"
                    className={`btn ${locationType === "online" ? "btn-primary" : "btn-ghost"}`}
                    aria-checked={locationType === "online"}
                    role="radio"
                    onClick={() => setLocationType("online")}
                  >
                    Online
                  </button>
                </div>
              </div>

              {/* Conditional inputs */}
              {locationType === "venue" ? (
                <>
                  <label>Venue address
                    <input
                      className="input"
                      placeholder="e.g., 12 Queen St, Auckland"
                      value={venueAddress}
                      onChange={(e) => {
                        setVenueAddress(e.target.value);
                        setAddrQuery(e.target.value);
                        setAddrOpen(true);
                        setGoogleQueryAddress(e.target.value); // typing 时地图先用原串
                      }}
                      onFocus={() => {
                        // 每次开始新的输入，让下拉更相关
                        if (window.google?.maps?.places) {
                          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (!addrOpen || !addrSuggests.length) return;
                        if (e.key === "ArrowDown") { e.preventDefault(); setAddrHi(h => Math.min(h + 1, addrSuggests.length - 1)); }
                        if (e.key === "ArrowUp")   { e.preventDefault(); setAddrHi(h => Math.max(h - 1, 0)); }
                        if (e.key === "Enter")     { e.preventDefault(); if (addrHi >= 0) pickSuggestion(addrSuggests[addrHi]); }
                        if (e.key === "Escape")    { setAddrOpen(false); }
                      }}
                      required
                    />
                  </label>

                  {/* Address suggestions (Google) */}
                  {addrOpen && addrSuggests.length > 0 && (
                    <div
                      role="listbox"
                      aria-label="Address suggestions"
                      className="card"
                      style={{
                        marginTop: 6,
                        borderRadius: 12,
                        padding: 4,
                        maxHeight: 260,
                        overflowY: "auto",
                        boxShadow: "0 8px 24px rgba(0,0,0,.08)",
                      }}
                    >
                      {addrSuggests.map((sug, i) => {
                        const active = i === addrHi;
                        return (
                          <button
                            type="button"
                            key={sug.place_id || i}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setAddrHi(i)}
                            onMouseLeave={() => setAddrHi(-1)}
                            onMouseDown={(e) => { e.preventDefault(); pickSuggestion(sug); }}  // Ensure that you can select and close with just one click
                            className="btn btn-ghost"
                            style={{
                              width: "100%",
                              textAlign: "left",
                              justifyContent: "flex-start",
                              whiteSpace: "normal",
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: active ? "rgba(37,99,235,0.06)" : "transparent",
                            }}
                            title={sug.full_text}
                          >
                            <div style={{ lineHeight: 1.25 }}>
                              <strong style={{ color: "#0f3a67", fontWeight: 800 }}>
                                {sug.main_text}
                              </strong>
                              {sug.secondary_text ? (
                                <span style={{ opacity: 0.8 }}>
                                  {`, ${sug.secondary_text}`}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                      {addrLoading && <div className="small" style={{ padding: 8, opacity: .7 }}>Searching…</div>}
                    </div>
                  )}

                  {/* Map preview —— 继续用无 key 的标准 embed 搜索；但我们传的是 Google 返回的 formatted_address，命中更准 */}
                  {venueAddress.trim() && (
                    <div className="card" style={{ padding: 0 }}>
                      <iframe
                        title="venue-map"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(googleQueryAddress || venueAddress)}&z=15&hl=en&gl=US&output=embed`}
                        width="100%"
                        height="340"
                        style={{ border: 0, borderRadius: 12, display: "block" }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                </>
              ) : (
                <label>Online meeting link
                  <input
                    className="input"
                    type="url"
                    placeholder="https://…"
                    value={onlineUrl}
                    onChange={(e) => setOnlineUrl(e.target.value)}
                    required
                  />
                </label>
              )}

              <div className="grid grid-2">
                <label>Capacity
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </label>
              </div>
            </section>

            {/* footer buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: GAPS.footer, justifyContent: "flex-end" }}>
              <Link className="btn btn-ghost" to={"/manage"}>
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving || !isDirty}>
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
