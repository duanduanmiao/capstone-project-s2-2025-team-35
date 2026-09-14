// src/pages/EventPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import "../styles.css";
import { API_BASE_URL, getAllowedOrigins } from "../utils/config.js";
import Agenda from "../components/Agenda";
import { useDialog } from "../components/DialogProvider.jsx";
import defaultAvatar from "../assets/img/profile.jpg"; // 🆕 兜底头像
import { formatDateTime, formatDateTimeRange } from "../utils/dateTimeUtils.js";
import { getAvatarUrl } from "../utils/avatars.js";

// fixed colors (keep in sync with CalendarGrid & EventCard)
const CATEGORY_COLOR = {
  Technology: "#19f0d7",
  Creative:   "#8b5cf6",
  Sports:     "#22c55e",
  Wellness:   "#e15757",
  Academic:   "#f59e0b",
};
// Map UI select values (e.g. "Tech") to color keys ("Technology")
const CAT_ALIAS = { Tech: "Technology" };

function hexToRgba(hex, a = 0.14) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** 🔧 FIXED: Clear polling timer when popup succeeds to avoid memory leaks **/
function openLoginPopup(returnUrl) {
    return new Promise((resolve, reject) => {
        const w = 520, h = 620;
        const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
        const loginUrl = `${API_BASE_URL}/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;

        const popup = window.open(
            loginUrl,
            "google_oauth",
            `width=${w},height=${h},left=${left},top=${top},resizable,scrollbars`
        );
        if (!popup) return reject(new Error("Popup blocked"));

        let timer; // 🔧 keep timer reference so we can clear it on success

        const onMsg = (ev) => {
            try {
                // Accept messages from allowed origins
                const allowedOrigins = getAllowedOrigins();
                if (!allowedOrigins.includes(ev.origin)) return;
                if (ev.data && ev.data.type === "GOOGLE_AUTH_SUCCESS") {
                    window.removeEventListener("message", onMsg);
                    if (timer) clearInterval(timer);
                    resolve(ev.data.user);
                }
            } catch (_) {
                /* ignore */
            }
        };
        window.addEventListener("message", onMsg);

        // Fallback: if popup is closed without success message, treat as cancel/failure
        timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                window.removeEventListener("message", onMsg);
                reject(new Error("Login cancelled"));
            }
        }, 400);
    });
}

/** Make non-OK responses throw Error with status & code */
async function throwIfNotOk(res) {
    if (res.ok) return res;

    let body = null;
    let text = "";
    const ct = res.headers.get("content-type") || "";
    try {
        text = await res.text();
        if (ct.includes("json") || /^\s*[{[]/.test(text)) {
            body = JSON.parse(text);
        }
    } catch (_) {
        /* ignore parse failures */
    }

    const message =
        body?.message ||
        body?.error ||
        body?.title ||
        text?.trim() ||
        res.statusText ||
        "Request failed";

    const err = new Error(message);
    err.status = res.status;     // <-- 关键：携带 HTTP 状态码
    err.code = body?.code || ""; // <-- 关键：携带后端业务错误码（如 TIME_CONFLICT/NO_SEATS）
    err.data = body || null;     // ← 新增：把原始 JSON 体带上
    throw err;
}

/** Handle 401 with login popup + retry; let throwIfNotOk handle 4xx details */
async function apiFetch(url, options = {}) {
    const res = await fetch(url, { credentials: "include", ...options });

    // 对 403：不在这里 new Error；直接返回给 throwIfNotOk 生成带 status/code 的错误
    if (res.status === 403) {
        return res;
    }

    // 对 401：尝试登录并重试；重试结果原样返回（让 throwIfNotOk 处理）
    if (res.status === 401) {
        const ret = window.location.pathname + window.location.search;
        try {
            await openLoginPopup(ret);
        } catch {
            return res; // 用户取消或失败 → 仍返回原 401
        }

        const retry = await fetch(url, { credentials: "include", ...options });
        return retry; // 不管成功/失败都交给上层 throwIfNotOk
    }

    return res;
}

// Gadget: Check if location is a URL
const isHttpUrl = (s = "") => /^https?:\/\//i.test(String(s).trim());

export default function EventPage() {
    const { id } = useParams();
    const dialog = useDialog();

    const [event, setEvent] = useState(null);
    const [organizer, setOrganizer] = useState(null); // 组件状态：保存组织者信息
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    /** current user (for organizer/ownership checks) **/
    const [me, setMe] = useState(null);
    const [meErr, setMeErr] = useState("");

    /** NEW: registrations (owner-only) **/
    const [regs, setRegs] = useState([]);
    const [regErr, setRegErr] = useState("");
    const [regLoading, setRegLoading] = useState(false);
    const [regPage, setRegPage] = useState(1);
    const REG_PER_PAGE = 10;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`${API_BASE_URL}/events/${id}`);
            await throwIfNotOk(res);
            const data = await res.json();
            setEvent(data);
            setErr("");
        } catch (e) {
            setErr(e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadMe = useCallback(async () => {
        try {
            const res = await apiFetch(`${API_BASE_URL}/auth/me`);
            await throwIfNotOk(res);
            const data = await res.json(); // expect { id, role, ... }
            setMe(data);
            setMeErr("");
        } catch (e) {
            // Non-fatal: allow anonymous browsing or unauthenticated state
            setMe(null);
            setMeErr(e.message || "Failed to load user");
        }
    }, []);

    /** fetch both event and me on mount/when id changes **/
    useEffect(() => {
        load();
        loadMe();
    }, [load, loadMe]);

    /*拉取组织者资料*/
    useEffect(() => {
        (async () => {
            if (!event?.organizerId) { setOrganizer(null); return; }
            try {
                const r = await apiFetch(`${API_BASE_URL}/profile/${event.organizerId}`);
                await throwIfNotOk(r);
                setOrganizer(await r.json());
            } catch {
                setOrganizer(null); // 没权限或出错就隐藏组织者卡片，不阻塞页面
            }
        })();
    }, [event?.organizerId]);

    const onRegister = async () => {
        try {
            const ok = await dialog.confirm("Do you want to register for this event?");
            if (!ok) return;

            const res = await apiFetch(`${API_BASE_URL}/events/${id}/register`, { method: "POST" });
            await throwIfNotOk(res);

            await load(); // refresh seats / status
            dialog.toast("Registered successfully!", "success");
        } catch (e) {
            // e 来自 throwIfNotOk；包含 e.status 与 e.code（若后端返回了 { code }）
            const code = (e.code || "").toUpperCase();
            const status = e.status;

            switch (code) {
                case "TIME_CONFLICT": {
                    const c = e.data?.conflict;
                    if (c?.id) {
                        const when = `${new Date(c.startAt).toLocaleString()} – ${new Date(c.endAt).toLocaleString()}`;
                        return dialog.alertBox?.(
                            "Time Conflict Detected",
                            "This event overlaps with other registration(s). Showing only the earliest conflicting event.\n\n" +
                            `You’re already registered for:\n\n• ${c.title}\n  ${when}\n\n` +
                            `Please review your schedule in your dashboard or ` +
                            `withdraw from the overlapping event first.`
                        );
                    }
                    // 没拿到具体冲突事件就用通用文案兜底
                    return dialog.alertBox?.(
                        "Time Conflict Detected",
                        "You’re already registered for an overlapping event.\nPlease review your schedule in your dashboard\nor withdraw from the other event first."
                    );
                }

                case "NO_SEATS":
                    return dialog.alertBox?.(
                        "No Seats Available",
                        "This event is currently full.\nPlease check back later or look for similar events."
                    );

                case "EVENT_ENDED":
                    return dialog.alertBox?.(
                        "Event Unavailable",
                        "This event has already ended. Registration is closed."
                    );

                case "ROLE_FORBIDDEN":
                    return dialog.alertBox?.(
                        "Registration Not Allowed",
                        "Organizer accounts cannot register for events."
                    );

                case "EVENT_NOT_FOUND":
                    return dialog.alertBox?.("Event Not Found", "The event may have been removed or is unavailable.");

                case "UNAUTHENTICATED":
                    return dialog.alertBox?.("Sign in required", "Please sign in to register.");

                default:
                    // 没有业务 code 时，用 HTTP 状态兜底
                    if (status === 401) return dialog.alertBox?.("Sign in required", "Please sign in to register.");
                    if (status === 403) return dialog.alertBox?.("Registration Not Allowed", "You don’t have permission to register for this event.");
                    if (status === 404) return dialog.alertBox?.("Event Not Found", "The event may have been removed or is unavailable.");
                    if (status === 409) {
                        return dialog.alertBox?.(
                            "Registration Conflict",
                            "Your registration could not be completed due to a conflict (seats or schedule). Please try again."
                        );
                    }
                    // 其他错误（网络/500等）
                    return dialog.alertBox?.("Registration Error", e.message || "Register failed");
            }
        }
    };

    const onUnregister = async () => {
        try {
            const ok = await dialog.confirm("Withdraw your registration?");
            if (!ok) return;

            const res = await apiFetch(`${API_BASE_URL}/events/${id}/register`, {
                method: "DELETE",
            });
            await throwIfNotOk(res);
            await load();
            dialog.toast("Withdrawn.", "success");
        } catch (e) {
            dialog.toast(e.message || "Unregister failed", "error");
        }
    };

    /** derived flags **/
    const isOrganizer = me?.role === "Organizer";
    const isOwner =
        isOrganizer &&
        me?.id != null &&
        event?.organizerId != null &&
        String(me.id) === String(event.organizerId);

    // NEW: load registrations only for owner
    const loadRegistrations = useCallback(async () => {
        if (!isOwner || !id) return;
        try {
            setRegLoading(true);
            setRegErr("");
            // Organizer-only endpoint in ManageController:
            // GET /api/manage/events/{eventId}/registrations
            const res = await apiFetch(`${API_BASE_URL}/manage/events/${id}/registrations`);
            await throwIfNotOk(res);
            const arr = await res.json();
            // Normalize: try to read nested user info if present
            const norm = (arr || []).map((r) => {
                const u = r.user || r.User || {};
                const uid = r.userId ?? r.UserId ?? u.id ?? u.Id;
                const username = u.username ?? u.Username ?? r.username ?? r.Username ?? (uid ? `Student #${uid}` : "Student");
                const avatar = u.profilePictureUrl ?? u.ProfilePictureUrl ?? r.profilePictureUrl ?? r.ProfilePictureUrl ?? null;
                const createdAt = r.registeredAt ?? r.RegisteredAt ?? r.createdAt ?? r.CreatedAt ?? null;
                return { userId: uid, username, avatar, createdAt };
            });
            setRegs(norm);
            setRegPage(1); // reset to first page on reload
        } catch (e) {
            setRegErr(e.message || "Failed to load registrations");
        } finally {
            setRegLoading(false);
        }
    }, [id, isOwner]);

    useEffect(() => {
        loadRegistrations();
    }, [loadRegistrations]);

    if (loading) return <main className="container">Loading…</main>;
    if (err) return <main className="container">❌ {err}</main>;
    if (!event) return null;

    const seatsLeft = Math.max((event.capacity ?? 0) - (event.registered ?? 0), 0);

    /**
     * visibility rules
     * - showEdit: only if organizer AND owner
     * - showStudentActions: only if NOT an organizer (students can register/unregister)
     * - If organizer but NOT owner: hide both Edit and Register/Unregister
     */
    const showEdit = isOwner;
    const showStudentActions = !isOrganizer;

    const base = import.meta.env.BASE_URL || "/";
    const cat = (event.category || "").toLowerCase().replace(/\s+/g, "-");

    // ADDED: Get event image URL with priority fallback logic
    const getImageUrl = () => {
        // CHANGED: Use imageUrl from database first
        if (event.imageUrl) {
            return event.imageUrl;
        }
        // Fallback to default image only if no uploaded image
        return `${base}images/events/default.jpg`;
    };

    // REMOVED: Complex fallback logic, now only use default.jpg on error
    const onImgError = (e) => {
        const el = e.currentTarget;
        // Set to default image and stop retrying
        el.src = `${base}images/events/default.jpg`;
        el.onerror = null; // Prevent infinite loop
    };

    // Map embed query string (only used if it is an "address" and not a URL)
    const locationText = String(event.location || "").trim();
    const isOnlineLink = isHttpUrl(locationText);
    const mapsEmbedSrc = locationText && !isOnlineLink
        ? `https://www.google.com/maps?q=${encodeURIComponent(locationText)}&z=15&hl=en&gl=US&output=embed`
        : "";

    // --- pagination helpers for registrations ---
    const totalRegs = regs.length;
    const totalPages = Math.max(1, Math.ceil(totalRegs / REG_PER_PAGE));
    const pageSafe = Math.min(Math.max(1, regPage), totalPages);
    const pageSlice = regs.slice((pageSafe - 1) * REG_PER_PAGE, pageSafe * REG_PER_PAGE);

    const catKey = CAT_ALIAS[event?.category] ?? event?.category;
    const catColor = CATEGORY_COLOR[catKey] ?? "#2563eb";
    const catChipStyle = {
    background: hexToRgba(catColor, 0.14),
    border: `1px solid ${catColor}`,
    color: catColor,
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 9999,
    fontWeight: 700,
    };

    return (
        <main className="container" style={{ marginTop: 24 }}>
            <article className="card" style={{ padding: 28 }}>
                {/* MODIFIED: Now displays image from database (S3) instead of hardcoded local path */}
                <img
                    src={getImageUrl()}  // CHANGED: Use dynamic URL from database via getImageUrl()
                    onError={onImgError}
                    alt={event.title || "Event cover"}
                    loading="lazy"
                    decoding="async"
                    style={{
                        width: "100%",
                        aspectRatio: "16 / 9",
                        height: "clamp(160px, 28vw, 320px)",
                        objectFit: "cover",
                        borderRadius: 16,
                        marginBottom: 16,
                        display: "block",
                    }}
                />
                {/* Tag pill */}
                {event.category && (
                    <div style={{ marginBottom: 10 }}>
                        <span className="chip" style={catChipStyle}>{event.category}</span>
                    </div>
                )}

                {/* Title */}
                <h1 style={{ margin: "10px 0 8px", fontWeight: 800, fontSize: 28 }}>
                    {event.title}
                </h1>

                {/* Meta lines (split + icons) */}
                <p style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 4px", color: "var(--ink)" }}>
                    <span role="img" aria-label="calendar">📅</span>
                    <strong>When:</strong>{" "}
                    {formatDateTimeRange(event.startAt, event.endAt)}
                </p>
                <p style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px", color: "var(--ink)" }}>
                    <span role="img" aria-label="location">📍</span>
                    <strong>Where:</strong>{" "}
                    {event.location}
                </p>

                {/* ✅ Map display / Online link */}
                {locationText && (
                    isOnlineLink ? (
                        <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ fontWeight: 600 }}>This is an online event.</div>
                                <a
                                    className="btn btn-primary"
                                    href={locationText}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Join online
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
                            <iframe
                                title="event-location-map"
                                src={mapsEmbedSrc}
                                width="100%"
                                height="340"
                                style={{ border: 0, display: "block" }}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                            <div style={{ padding: 10, display: "flex", justifyContent: "flex-end" }}>
                                <a
                                    className="btn btn-ghost"
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open in Google Maps
                                </a>
                            </div>
                        </div>
                    )
                )}

                {/* Info strip */}
                <div
                    className="success"
                    style={{
                        borderRadius: 16,
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontWeight: 600,
                        marginBottom: 18,
                    }}
                >
                    <span role="img" aria-label="alarm">⏰</span>
                    <span>
            <strong>Seats left:</strong> {seatsLeft}
          </span>
                </div>

                {/* Footer actions */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
          <span className="small">
            {showEdit
                ? "You are the organizer"
                : isOrganizer
                    ? "Organizer view"
                    : "Student view"}
          </span>

                    <div style={{ display: "flex", gap: 8 }}>
                        {/* Only owner organizer sees Edit; organizers (non-owner) see nothing here */}
                        {showEdit ? (
                            <Link
                                className="btn btn-primary"
                                to={`/manage/create?organizerId=${encodeURIComponent(
                                    event.organizerId
                                )}&eventId=${encodeURIComponent(event.id)}`}
                            >
                                Edit
                            </Link>
                        ) : showStudentActions ? (
                            event.isRegistered ? (
                                // Student (already registered): allow unregistration
                                <button className="btn btn-secondary" onClick={onUnregister}>
                                    Withdraw
                                </button>
                            ) : (
                                // Student (not registered): allow registration (disabled if no seats left)
                                <button
                                    className="btn btn-primary"
                                    onClick={onRegister}
                                    disabled={seatsLeft <= 0}
                                >
                                    Register
                                </button>
                            )
                        ) : null}

                        <Link className="btn btn-ghost" to="/events">
                            Back to list
                        </Link>
                    </div>
                </div>
            </article>

            {/* ✅ About the Event section */}
            {(event.description?.trim() || event.organizerId) && (
                <section className="about">
                    <div className="about-header">
                        <h2 className="about-title">About the Event</h2>

                        {/* Organized by：所有能进到这个页面的登录用户都可见、可点击 */}
                        {event.organizerId && (
                            <div className="about-org">
                                <span className="about-org-label">Organized by</span>
                                <Link
                                    to={`/profile/${organizer?.id ?? event.organizerId}`}
                                    className="about-org-link"
                                    title="View organizer profile"
                                >
                                    <img
                                        className="about-org-avatar"
                                        src={
                                            organizer?.profilePictureUrl
                                            || getAvatarUrl(organizer?.id ?? event.organizerId)
                                            || defaultAvatar
                                        }
                                        onError={(e) => { e.currentTarget.src = defaultAvatar; }}
                                        alt={(organizer?.username || organizer?.name || "Organizer") + " avatar"}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: "9999px",
                                            objectFit: "cover",
                                            border: "1px solid var(--edge)",
                                            marginRight: 8
                                        }}
                                    />
                                    <strong>{organizer?.username || organizer?.name || "Organizer"}</strong>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* 描述：有就显示；没有就显示温馨提示 */}
                    <div className="agenda-empty" style={{ whiteSpace: "pre-wrap" }}>
                        {event.description?.trim()
                            ? event.description
                            : (
                                // If current user is the owner, show a clearer call-to-action
                                showEdit
                                    ? "You haven’t published a description for this event yet. Click the Edit button above to add/edit the event details."
                                    : "The organizer hasn’t published the description yet. Please check back later."
                            )}
                    </div>
                </section>
            )}

            {/* ✅ Agenda section */}
            <section className="card" style={{ padding: 24, marginTop: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>
                    Agenda
                </h2>
                <Agenda eventId={Number(id)} canEdit={!!event?.canEdit} />
            </section>

            {/* ✅ NEW: Registration Students (owner-only) */}
            {showEdit && (
                <section className="card" style={{ padding: 24, marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                            Registration Students
                        </h2>
                        <span className="small">Total: {regs.length}</span>
                    </div>

                    {regLoading ? (
                        <div className="agenda-empty">Loading registrations…</div>
                    ) : regErr ? (
                        <div className="agenda-empty" style={{ color: "#dc2626" }}>{regErr}</div>
                    ) : regs.length === 0 ? (
                        <div className="agenda-empty">
                            No students have registered yet. Once students sign up, you’ll see them here.
                        </div>
                    ) : (
                        <>
                            {/* ✅ 改动 1：固定 5 列 */}
                            <div
                                className="reg-grid"
                                style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(5, 1fr)" }}
                            >
                                {pageSlice.map((r, idx) => (
                                    <div key={`${r.userId}-${idx}`} className="card" style={{ padding: 14, borderRadius: 16 }}>
                                        {/* ✅ 改动 2：用 Link 包裹头像+姓名，移除按钮 */}
                                        <Link
                                            to={`/profile/${encodeURIComponent(r.userId)}`}
                                            title="View profile"
                                            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
                                        >
                                            <img
                                                 src={r.avatar || getAvatarUrl(r.userId) || defaultAvatar}
                                                onError={(e) => { e.currentTarget.src = defaultAvatar; }}
                                                alt="Student avatar"
                                                style={{ width: 44, height: 44, borderRadius: "9999px", objectFit: "cover", border: "1px solid var(--edge)" }}
                                            />
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 800, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {r.username || "Student"}
                                                </div>
                                                {r.createdAt && (
                                                    <div className="small">Joined: {formatDateTime(r.createdAt)}</div>
                                                )}
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>

                            {/* pager：统一成 ghost 小按钮样式 */}
                            {totalPages > 1 && (
                                <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setRegPage((p) => Math.max(1, p - 1))}
                                        disabled={pageSafe <= 1}
                                    >
                                        ← Prev
                                    </button>

                                    <span
                                        className="btn btn-ghost btn-sm"
                                        aria-live="polite"
                                        style={{ pointerEvents: "none", cursor: "default" }}
                                    >
                    Page {pageSafe} / {totalPages}
                  </span>

                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setRegPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={pageSafe >= totalPages}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}
        </main>
    );
}
