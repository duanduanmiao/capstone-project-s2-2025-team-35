// src/pages/EventsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import EventGrid from "../components/EventGrid";
import EventCard from "../components/EventCard";
import { API_BASE_URL } from "../utils/config.js";

/** 统一 fetch：带 Cookie；401 时跳 Google OAuth 并回跳当前页 */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (res.status === 401) {
    const ret = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${API_BASE_URL}/auth/google?returnUrl=${ret}`;
    throw new Error("Unauthorized");
  }
  return res;
}

/** 并发限流 */
async function withConcurrency(items, worker, limit = 5) {
  const out = [];
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

/** 扫描 /events/{id} 的 isRegistered，推断我报名的活动集合 */
async function loadMyRegsFromEvents(events) {
  if (!Array.isArray(events) || !events.length) return new Set();
  const ids = events.map((e) => e.id).filter(Boolean);

  const results = await withConcurrency(
    ids,
    async (id) => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/events/${id}`);
        if (!res.ok) return { id, isRegistered: false };
        const data = await res.json();
        return { id, isRegistered: !!data.isRegistered };
      } catch {
        return { id, isRegistered: false };
      }
    },
    5
  );
  return new Set(results.filter((r) => r.isRegistered).map((r) => r.id));
}

/** 分类 */
const CATEGORY_META = [
  { slug: "Technology", label: "Technology", icon: "💻" },
  { slug: "Creative", label: "Creative", icon: "🎨" },
  { slug: "Sports", label: "Sports", icon: "🏃" },
  { slug: "Wellness", label: "Wellness", icon: "🧘" },
  { slug: "Academic", label: "Academic", icon: "📚" },
];

/** 判断活动是否过期 */
function isExpired(ev) {
  const end = ev?.endAt ? new Date(ev.endAt).getTime() : NaN;
  if (!Number.isFinite(end)) return false;
  return end <= Date.now();
}

/** 获取活动开始时间的毫秒数 */
function getStartMs(ev) {
  const candidate =
    ev?.startAt || ev?.startTime || ev?.startDateTime || ev?.date || ev?.start || ev?.beginTime;
  const d = candidate ? new Date(candidate) : null;
  return d && !isNaN(d) ? d.getTime() : null;
}

/** 分类条 */
function CategoryStripInline({ value, onChange, disabled }) {
  return (
    <section className="cat-strip card">
      <div className="cat-grid">
        <button
          className="cat-item"
          disabled={disabled}
          onClick={() => onChange("")}
          aria-pressed={value === ""}
        >
          <span className="cat-icon" aria-hidden>⭐</span>
          <span className="cat-label">All</span>
        </button>
        {CATEGORY_META.map((c) => (
          <button
            key={c.slug}
            className="cat-item"
            disabled={disabled}
            onClick={() => onChange(c.slug)}
            aria-pressed={value === c.slug}
          >
            <span className="cat-icon" aria-hidden>{c.icon}</span>
            <span className="cat-label">{c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ======= 状态（以 URL 为单一来源） =======
  const [field, setField] = useState("title"); // 当前输入框针对的字段：title/location
  const [q, setQ] = useState("");              // 输入框里的值（未提交）
  const [submittedField, setSubmittedField] = useState("title");
  const [submittedQ, setSubmittedQ] = useState("");
  const [cat, setCat] = useState("");
  const [sortBy, setSortBy] = useState("time");

  const [events, setEvents] = useState([]);
  const [me, setMe] = useState(null);
  const role = me?.role ?? "guest";
  const [myRegs, setMyRegs] = useState(new Set());
  const isRegistered = (ev) => ev?.isRegistered || myRegs.has(ev.id);

  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState("");
  const abortRef = useRef(null);

  // ======= 用户身份 =======
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" });
        if (res.ok) setMe(await res.json());
      } catch {}
    })();
  }, []);

  // ======= 当 URL 的 search 变化时，同步到本地状态并拉取数据（修复 quick link 不刷新） =======
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const urlCat = sp.get("category") ?? "";
    const title = sp.get("title") ?? "";
    const locationKw = sp.get("location") ?? "";
    const search = sp.get("search") ?? "";
    const urlField = title ? "title" : locationKw ? "location" : "title";
    const urlQ = title || locationKw || search || "";

    setCat(urlCat);
    setSubmittedField(urlField);
    setSubmittedQ(urlQ);

    // 把输入框同步成当前 URL 的值，避免 UI 不一致
    setField(urlField);
    setQ(urlQ);

    // 拉取数据
    const doFetch = async () => {
      try {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setLoading(true);
        setErr("");

        const params = new URLSearchParams();
        if (urlCat) params.set("category", urlCat);
        if (urlQ.trim()) {
          params.set("search", urlQ.trim());
          if (urlField === "title") params.set("title", urlQ.trim());
          if (urlField === "location") params.set("location", urlQ.trim());
        }

        const res = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
          signal: ctrl.signal,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        let list = await res.json();
        list = list.filter((e) => !isExpired(e));
        setEvents(Array.isArray(list) ? list : []);
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error(e);
          setErr("Failed to load events. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    doFetch();

    return () => abortRef.current?.abort();
  }, [location.search]);

  // ======= 我报名的活动集合 =======
  useEffect(() => {
    (async () => {
      if (events.length) {
        const set = await loadMyRegsFromEvents(events);
        setMyRegs(set);
      } else {
        setMyRegs(new Set());
      }
    })();
  }, [events]);

  // ======= 排序前的过滤（基于“已提交”的 URL 值） =======
  const filtered = useMemo(() => {
    if (loading) return events;
    const kw = (submittedQ || "").trim().toLowerCase();

    return events.filter((ev) => {
      const okCat = !cat || ev.category === cat;
      if (!kw) return okCat;

      const title = (ev.title || "").toLowerCase();
      const loc = (ev.location || "").toLowerCase();

      const match =
        submittedField === "title" ? title.includes(kw)
        : submittedField === "location" ? loc.includes(kw)
        : title.includes(kw) || loc.includes(kw);

      return okCat && match;
    });
  }, [events, loading, submittedQ, submittedField, cat]);

  // ======= 排序 =======
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "time") {
      arr.sort((a, b) => (getStartMs(a) ?? Infinity) - (getStartMs(b) ?? Infinity));
    } else if (sortBy === "seats") {
      const remaining = (e) => (e.capacity ?? 0) - (e.registered ?? 0);
      arr.sort((a, b) => remaining(b) - remaining(a));
    }
    return arr;
  }, [filtered, sortBy]);

  // ======= 操作：更新 URL（从而触发上面的 effect） =======
  const updateURL = (nextCat, nextField, nextQ) => {
    const sp = new URLSearchParams();
    if (nextCat) sp.set("category", nextCat);
    const trimmed = (nextQ || "").trim();
    if (trimmed) {
      sp.set("search", trimmed);
      if (nextField === "title") sp.set("title", trimmed);
      if (nextField === "location") sp.set("location", trimmed);
    }
    navigate({ pathname: "/events", search: sp.toString() });
  };

  const onSubmitSearch = () => {
    updateURL(cat, field, q);
  };

  const onChangeCategory = (next) => {
    updateURL(next, field, q); // 保留当前搜索输入
  };

  // ======= 注册/撤回/删除 =======
  const handleRegisterEvent = async (id) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/events/${id}/register`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setMyRegs((s) => new Set(s).add(id));
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, registered: (e.registered ?? 0) + 1 } : e))
      );
      alert("Successfully registered!");
    } catch (e) {
      alert(e.message || "Register failed");
    }
  };

  const handleWithdrawEvent = async (id) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/events/${id}/register`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setMyRegs((s) => {
        const t = new Set(s);
        t.delete(id);
        return t;
      });
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, registered: (e.registered ?? 0) - 1 } : e))
      );
      alert("Withdrawn successfully.");
    } catch (e) {
      alert(e.message || "Withdraw failed");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      // 删除后基于当前 URL 再拉一次
      navigate({ pathname: "/events", search: location.search });
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  };

  // ======= 渲染 =======
  return (
    <main className="container" style={{ marginTop: 20 }}>
      {/* 搜索栏 */}
      <header className="card" style={{ padding: 12, borderRadius: 18 }}>
        <div className="search-bar">
          <select
            className="select search-select"
            value={field}
            onChange={(e) => setField(e.target.value)}
            disabled={loading}
          >
            <option value="title">Title</option>
            <option value="location">Location</option>
          </select>

          <input
            className="input search-input"
            placeholder={field === "location" ? "Search location" : "Search title"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitSearch();
              }
            }}
            disabled={loading}
          />

          <button
            className="btn btn-brand search-btn"
            onClick={onSubmitSearch}
            disabled={loading}
          >
            🔍 Search
          </button>
        </div>
      </header>

      {/* 分类栏（通过更新 URL 触发刷新） */}
      <CategoryStripInline value={cat} onChange={onChangeCategory} disabled={loading} />

      {/* 标题 + 排序 */}
      {!error && (
        <>
          <div
            style={{
              margin: "26px 0 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>
              {submittedQ || cat ? "Search results" : "All events"}
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label htmlFor="sort" style={{ fontWeight: 500 }}>Sort by</label>
              <select
                id="sort"
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: 180 }}
              >
                <option value="time">Time</option>
                <option value="seats">Seats remaining</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ padding: 24, textAlign: "center", color: "#666" }}>
              Loading events…
            </div>
          ) : sorted.length ? (
            <EventGrid
              events={sorted}
              renderCard={(ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  role={role}
                  me={me}
                  isRegistered={isRegistered(ev)}
                  onRegister={handleRegisterEvent}
                  onWithdraw={handleWithdrawEvent}
                  onDelete={handleDeleteEvent}
                />
              )}
            />
          ) : (
            <div className="card" style={{ padding: 24, textAlign: "center", color: "#666" }}>
              {submittedQ || cat
                ? "No events match your search criteria."
                : "No events available at the moment."}
            </div>
          )}
        </>
      )}

      {error && (
        <div
          className="card"
          style={{
            padding: 24,
            textAlign: "center",
            color: "#dc2626",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 18,
          }}
        >
          {error}
        </div>
      )}
    </main>
  );
}
