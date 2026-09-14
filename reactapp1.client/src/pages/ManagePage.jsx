// ManagePage.jsx
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../utils/config.js";
import CalendarGrid from "../components/CalendarGrid.jsx";
import { formatDateTimeRange, formatDateTime } from "../utils/dateTimeUtils.js";
/* ----------------------- tiny confirm modal (awaitable) ----------------------- */
function useConfirm() {
  const [state, setState] = useState({
    open: false,
    message: "",
    resolve: null,
  });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve });
    });
  }, []);

  const close = (result) => {
    state.resolve?.(result);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const ui = state.open
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.38)",
            display: "grid",
            placeItems: "center",
            zIndex: 3000,
          }}
          onKeyDown={(e) => e.key === "Escape" && close(false)}
        >
          <div className="card" style={{ maxWidth: 440, padding: 16 }}>
            <h3 style={{ margin: "0 0 6px 0" }}>Please confirm</h3>
            <p style={{ margin: "0 0 16px 0" }}>{state.message}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => close(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => close(true)}>
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return [confirm, ui];
}

/* ------------------------- helpers ------------------------- */
function isExpired(ev) {
  const end = ev?.endAt ? new Date(ev.endAt).getTime() : NaN;
  if (!Number.isFinite(end)) return false; // treat missing/invalid as not expired
  return end <= Date.now();
}

// Compute spots left
function getSpotsLeft(ev) {
  const cap = Number(ev?.capacity ?? 0);
  const reg = Number(ev?.registered ?? 0);
  const fromRemaining = ev?.remainingSeats;
  return typeof fromRemaining === "number" ? fromRemaining : Math.max(0, cap - reg);
}

function SpotsDropdown({ event }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(null); // null until fetched
  const [err, setErr] = useState("");

  const left = getSpotsLeft(event);
  const cap = Number(event?.capacity ?? 0);
  const critical = left <= 0;
  const warn = left > 0 && left <= 5;
  const GAP = 20;

  const badgeStyle = {
    background: critical ? "#fee2e2" : warn ? "#fef9c3" : undefined,
    color: critical ? "#b91c1c" : warn ? "#92400e" : undefined,
    borderColor: critical ? "#fecaca" : undefined,
    cursor: "pointer",
  };

  const updatePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();

    // place BELOW the button with 20px gap
    const top = window.scrollY + r.top + GAP + r.height / 2;
    const left = window.scrollX + r.left;

    setPos({
      top, // clamp a bit to keep on screen
      left,
      width: Math.max(280, r.width),
    });
  };

  // After opening, wait a frame so the portal menu exists, then measure & position
  useLayoutEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      updatePosition();
      // run once more next frame in case fonts/layout change height
      requestAnimationFrame(updatePosition);
    });
  }, [open]);

  // keep it stuck above on scroll/resize
  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [open]);

  const loadRegistrants = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // Controller route: [Route("api/[controller]")] => /api/manage
      // Endpoint: [HttpGet("events/{eventId:int}/registrations")]
      const res = await fetch(
        `${API_BASE_URL}/manage/events/${encodeURIComponent(event.id)}/registrations`,
        { credentials: "include", headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`Failed to load registrants (${res.status})`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Failed to load registrants");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen((o) => {
      const next = !o;
      if (next && rows === null) loadRegistrants();
      requestAnimationFrame(updatePosition);
      return next;
    });
  };

  const readUser = (r) => {
    // supports shapes like { userId, user:{id,username,email} } or flat
    const uid = r.userId ?? r.studentId ?? r.user?.id ?? r.id;
    const name = r.user?.username ?? r.username ?? r.name ?? `User ${uid ?? ""}`;
    const email = r.user?.email ?? r.email ?? "";
    return { uid, name, email };
  };

  const dropdown = open ? createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Registrants"
      className="reg-card"
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        zIndex: 2000,
      }}
    >
      <div className="reg-card-head">
        <strong>Registrants</strong>
        <span className="reg-count">
          {rows?.length ?? 0}{cap ? ` / ${cap}` : ""}
        </span>
      </div>

      {loading && <div className="small">Loading…</div>}
      {!loading && err && <div className="small" style={{ color: "crimson" }}>Error: {err}</div>}
      {!loading && !err && rows && rows.length === 0 && (
        <div className="small" style={{ opacity: 0.7, padding: 10}}>No registrants yet.</div>
      )}

      {!loading && !err && rows && rows.length > 0 && (
        <ul className="reg-list">
          {rows.map((r, i) => {
            const { uid, name } = readUser(r);
            return (
              <li key={uid ?? i} className="reg-item">
                <Link
                  to={`/profile/${encodeURIComponent(uid)}`}
                  className="manage-link"
                  title="Open profile"
                >
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <span
      ref={btnRef}
      className="badge"
      role="button"
      tabIndex={0}
      onClick={toggleOpen}
      onKeyDown={(e) => {
        if (["Enter", " "].includes(e.key)) { e.preventDefault(); toggleOpen(); }
        if (e.key === "Escape") setOpen(false);
      }}
      style={badgeStyle}
      title="Click to view registrants"
    >
      {critical ? "Full" : `${left} left`}{cap ? ` / ${cap}` : ""}
      {dropdown}
    </span>
  );
}

/* ---------------------- Sort dropdown (styled) ---------------------- */
function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = "sort-menu";

  const items = [
    { key: "time", label: "Start time (asc)" },
    { key: "spots", label: "Spots left (asc)" },
    { key: "created", label: "Created time (ID asc)" },
  ];
  const current = items.find((i) => i.key === value)?.label ?? "Sort";

  const updatePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 8;
    setPos({
      top: window.scrollY + r.bottom + gap,
      left: window.scrollX + r.left,
      width: Math.max(220, r.width),
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target))
        return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = open
    ? createPortal(
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label="Sort options"
          className="card"
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            minWidth: pos.width,
            zIndex: 2000,
            padding: 6,
          }}
        >
          {items.map((it) => {
            const checked = value === it.key;
            return (
              <button
                key={it.key}
                role="menuitemradio"
                aria-checked={checked}
                className="btn btn-ghost"
                onClick={() => {
                  onChange?.(it.key);
                  setOpen(false);
                  btnRef.current?.focus();
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span>{it.label}</span>
                {checked && (
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M20 6L9 17l-5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="dropdown">
      <button
        ref={btnRef}
        className="dropbtn"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setOpen((o) => !o);
          requestAnimationFrame(updatePosition);
        }}
        onKeyDown={(e) => {
          if (["ArrowDown", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(updatePosition);
          }
        }}
        title="Sort list"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ opacity: 0.9 }}>
          <path d="M10 6h10M4 12h16M8 18h12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <span style={{ fontWeight: 700 }}>{current}</span>
      </button>
      {menu}
    </div>
  );
}

/* ----------------------------- Manage Page ----------------------------- */

export default function ManagePage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(new Set());
  const [sortBy, setSortBy] = useState("time");
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  const [confirm, confirmUI] = useConfirm();

  // Get current user from cookie/session
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const userData = await response.json();
        setUserId(userData.id);
        setUserRole(userData.role);

        // Only organizers can manage
        if (userData.role !== "Organizer") {
          navigate(`/dashboard/${encodeURIComponent(userData.id)}`, { replace: true });
          return;
        }

        await loadEvents();
      } catch (err) {
        console.error("Failed to get current user:", err);
        navigate("/login", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Param-less: backend infers organizer from cookie
      const res = await fetch(`${API_BASE_URL}/manage/events`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (res.status === 403) {
        setError("You are not allowed to view these events.");
        return;
      }
      if (!res.ok) throw new Error(`GET /manage/events failed (${res.status})`);

      const data = await res.json();
      // Normalize time fields to ISO-UTC and unify names to startAt/endAt
      const normalized = (Array.isArray(data) ? data : []).map((e) => {
        const fixIso = (v) => {
          if (v == null) return null;
          if (typeof v === "number") return new Date(v).toISOString();

          const s = String(v).trim();

          // "YYYY-MM-DDTHH:mm(:ss[.ms])?" 这种像 ISO 的字符串，但末尾没有 Z 或 ±hh:mm
          const isoLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(s);
          const hasZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);

          // 关键：如果长得像 ISO 但没有时区，就当它本该是 UTC（给它补一个 Z）
          const padded = isoLike && !hasZone ? `${s}Z` : s;

          const d = new Date(padded);
          return isNaN(d) ? null : d.toISOString();
        };

        const pick = (...cands) => fixIso(cands.find(Boolean));

        return {
          ...e,
          startAt: pick(e.startAt, e.startTime, e.startDateTime, e.date, e.start),
          endAt:   pick(e.endAt,   e.endTime,   e.endDateTime,   e.finish, e.end),
        };
      });

      setEvents(normalized);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  async function remove(id) {
    const ev = events.find((e) => String(e.id) === String(id));
    const ok = await confirm(`Delete "${ev?.title ?? "this event"}"? This cannot be undone.`);
    if (!ok) return;

    setDeleting((s) => new Set(s).add(id));
    try {
      // Param-less delete: server checks ownership via cookie
      const res = await fetch(`${API_BASE_URL}/manage/events/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (res.status === 403) throw new Error("You don't own this event.");
      if (res.status === 404) {
        await loadEvents();
        return;
      }
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setEvents((curr) => curr.filter((e) => String(e.id) !== String(id)));
    } catch (err) {
      setError(err.message || String(err));
      await loadEvents();
    } finally {
      setDeleting((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  const activeSorted = useMemo(() => {
    const list = events.filter((e) => !isExpired(e));
    const copy = [...list];
    if (sortBy === "spots") {
      copy.sort((a, b) => {
        const la = getSpotsLeft(a);
        const lb = getSpotsLeft(b);
        if (la !== lb) return la - lb;
        return String(a.title).localeCompare(String(b.title));
      });
    } else if (sortBy === "created") {
      copy.sort((a, b) => {
        const ia = Number.isFinite(+a?.id) ? +a.id : Number.POSITIVE_INFINITY;
        const ib = Number.isFinite(+b?.id) ? +b.id : Number.POSITIVE_INFINITY;
        if (ia !== ib) return ia - ib;
        return String(a.title).localeCompare(String(b.title));
      });
    } else {
      copy.sort((a, b) => {
        const ta = a?.startAt ? new Date(a.startAt).getTime() : Number.POSITIVE_INFINITY;
        const tb = b?.startAt ? new Date(b.startAt).getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
        return String(a.title).localeCompare(String(b.title));
      });
    }
    return copy;
  }, [events, sortBy]);

  const expiredSorted = useMemo(() => {
    const list = events.filter((e) => isExpired(e));
    const copy = [...list];
    if (sortBy === "spots") {
      copy.sort((a, b) => {
        const la = getSpotsLeft(a);
        const lb = getSpotsLeft(b);
        if (la !== lb) return la - lb;
        return String(a.title).localeCompare(String(b.title));
      });
    } else if (sortBy === "created") {
      copy.sort((a, b) => {
        const ia = Number.isFinite(+a?.id) ? +a.id : Number.POSITIVE_INFINITY;
        const ib = Number.isFinite(+b?.id) ? +b.id : Number.POSITIVE_INFINITY;
        if (ia !== ib) return ia - ib;
        return String(a.title).localeCompare(String(b.title));
      });
    } else {
      copy.sort((a, b) => {
        const ta = a?.startAt ? new Date(a.startAt).getTime() : Number.POSITIVE_INFINITY;
        const tb = b?.startAt ? new Date(b.startAt).getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
        return String(a.title).localeCompare(String(b.title));
      });
    }
    return copy;
  }, [events, sortBy]);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter((e) => !isExpired(e)).length;
    const totalRegistrations = events.reduce(
      (sum, e) => sum + (Number(e?.registered ?? 0) || 0),
      0
    );
    return { totalEvents, upcomingEvents, totalRegistrations };
  }, [events]);

  const shownActive = activeSorted.length;
  const shownExpired = expiredSorted.length;

// upcoming helpers
  // After normalization, always rely on startAt
  function getStartMs(ev) {
    const d = ev?.startAt ? new Date(ev.startAt) : null;
    return d && !isNaN(d) ? d.getTime() : null;
  }

  function UpcomingTimeline({ items = []}) {
    if (!items.length) return null;

    const chip = {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 400, // 普通，不加粗
      borderRadius: 999,
      background: "var(--soft, #eaf7ff)",
      color: "var(--ink, #1f2937)",
      border: "1px dashed var(--edge, #d8ecff)",
      whiteSpace: "nowrap",
    };

    return (
      <section className="upcoming card" style={{ padding: 16, borderRadius: 18, marginBottom: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((ev) => {
            const startMs = getStartMs(ev);
            const whenStr = startMs ? formatDateTime(new Date(startMs)) : "TBA";
            const reg = typeof isRegistered === "function" ? !!isRegistered(ev) : false;

            return (
              <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12 }}>
                {/* 竖线 + 节点 */}
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: "var(--edge, #d8ecff)",
                    }}
                    aria-hidden
                  />
                  <div
                    style={{
                      position: "relative",
                      top: 6,
                      left: 3,
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "var(--brand, #6ecbff)",
                      boxShadow: "0 0 0 3px rgba(110,203,255,.25)",
                    }}
                  />
                </div>

                {/* 内容 */}
                <div
                  style={{
                    background: "var(--soft, #eaf7ff)",
                    border: "1px solid var(--edge, #d8ecff)",
                    borderRadius: 14,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* 第一行：标题 + 类别 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, lineHeight: 1.25 }}>
                      {ev.title || "Untitled event"}
                    </div>
                    {ev.category ? <span style={chip}>🏷️ {ev.category}</span> : null}
                  </div>

                  {/* 第二行：时间 & 地点（靠左） */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={chip}>🕒 {whenStr}</span>
                    {ev.location ? <span style={chip}>📍 {ev.location}</span> : null}
                  </div>

                  {/* 第三行：操作组（靠左） */}
                  <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, marginTop: 4 }}>
                    <Link
                      to={`/events/${encodeURIComponent(ev.id)}`}
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      View details
                    </Link>
                    <Link
                      className="btn btn-primary"
                      to={`/manage/create?organizerId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(ev.id)}`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      Edit
                    </Link>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                      onClick={() => remove(ev.id)}
                      disabled={deleting.has(ev.id)}
                      aria-label={`Delete ${ev.title}`}
                    >
                      {deleting.has(ev.id) ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }


  const upcomingTop = useMemo(() => {
    const now = Date.now();
    const future = (activeSorted || [])
      .map((ev) => ({ ev, ms: getStartMs(ev) }))
      .filter((x) => x.ms && x.ms > now)
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 5)
      .map((x) => x.ev);
    return future;
  }, [events]);

  return (
    <>
      <main className="container section">
        <section style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 16,
              alignItems: "stretch", // 两列等高
            }}
          >
            {/* 左：hero */}
            <section
              className="hero"
              style={{
                marginBottom: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <h1 style={{ margin: 0 }}>My events</h1>
              <p style={{ marginTop: 6 }}>Here are the events you’ve organized. 📅</p>
              {!loading && !error && (
                <div className="small" style={{ marginTop: 8 }}>
                  {stats.totalEvents} event{stats.totalEvents !== 1 ? "s" : ""},{" "}
                  {stats.upcomingEvents} upcoming,{" "}
                  {stats.totalRegistrations} total registration
                  {stats.totalRegistrations !== 1 ? "s" : ""}
                </div>
              )}
            </section>

            {/* 右：Calendar（独立，不套额外 card） */}
            <aside style={{ display: "flex", alignItems: "stretch" }}>
              <CalendarGrid
                title={userRole === "Organizer" ? "My Organizer Calendar" : "My Registered Events"}
                events={events}
                width={330}
                rowHeight={40}
                onEventClick={(ev) => {
                  if (userRole === "Organizer") {
                    if (userId) {
                      window.location.href =
                        `/manage/create?organizerId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(ev.id)}`;
                    }
                  } else {
                    window.location.href = `/events/${encodeURIComponent(ev.id)}`;
                  }
                }}
              />
            </aside>
          </div>
        </section>


        <section style={{marginLeft: 100,marginBottom: 40, flexWrap: 'wrap', display: 'flex', gap: 100, alignItems: 'center'}}>
          {activeSorted.length > 0 && (
            <>
              <button className="animated-button"
                onClick={() => document.getElementById('upcoming')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
                  <path
                    d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                  ></path>
                </svg>
                <span className="text">Upcoming Events</span>
                <span className="circle"></span>
                <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
                  <path
                    d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
                  ></path>
                </svg>
              </button>
          </>)}

          <button className="animated-button"
            onClick={() => document.getElementById('active')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
              <path
                d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
              ></path>
            </svg>
            <span className="text">Active Events</span>
            <span className="circle"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
              <path
                d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
              ></path>
            </svg>
          </button>

          <button className="animated-button"
            onClick={() => document.getElementById('expired')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
              <path
                d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
              ></path>
            </svg>
            <span className="text">Expired Events</span>
            <span className="circle"></span>
            <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
              <path
                d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
              ></path>
            </svg>
          </button>
        </section>

        <section id="upcoming" style={{ marginBottom: 40 }}>
          {upcomingTop.length > 0 && (
            <>
              <h2 style={{ margin: "26px 0 10px" }}>Upcoming Events</h2>
              <UpcomingTimeline
                items={upcomingTop}
              />
            </>
          )}
        </section>
        
        <section id="active" style={{ marginBottom: 40 }}>
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Active / Upcoming</h2>
              {!loading && !error && (
                <div className="small">Total: {shownActive}</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <SortDropdown value={sortBy} onChange={setSortBy} />
              <Link
                to={`/manage/create${userId ? `?organizerId=${encodeURIComponent(userId)}` : ""}`}
                className="createBtn"
              >
                Create event
              </Link>
            </div>
          </div>

          {/* Active / Upcoming */}
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>When</th>
                <th>Location</th>
                <th>Spots</th>
                <th className="right" style={{ width: 220 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="small">Loading…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={5} className="small" style={{ color: "crimson" }}>Error: {error}</td></tr>
              )}
              {!loading && !error && activeSorted.map((ev) => (
                <tr key={`a-${ev.id}`}>
                  <td>{ev.title}</td>
                  <td>{formatDateTimeRange(ev.startAt, ev.endAt)}</td>
                  <td>{ev.location}</td>
                  <td><SpotsDropdown event={ev} /></td>
                  <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link
                      to={`/events/${encodeURIComponent(ev.id)}`}
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      View
                    </Link>
                    <Link
                      className="btn btn-primary"
                      to={`/manage/create?organizerId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(ev.id)}`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      Edit
                    </Link>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                      onClick={() => remove(ev.id)}
                      disabled={deleting.has(ev.id)}
                      aria-label={`Delete ${ev.title}`}
                    >
                      {deleting.has(ev.id) ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !error && activeSorted.length === 0 && (
                <tr><td colSpan={5} className="small">No active events.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
        
        <section id="expired" style={{ marginBottom: 80 }}>
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Expired</h2>
              {!loading && !error && (
                <div className="small">Total: {shownExpired}</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          </div>

          {/* Expired */}
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>When</th>
                <th>Location</th>
                <th>Spots</th>
                <th className="right" style={{ width: 220 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="small">Loading…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={5} className="small" style={{ color: "crimson" }}>Error: {error}</td></tr>
              )}
              {!loading && !error && expiredSorted.map((ev) => (
                <tr key={`e-${ev.id}`}>
                  <td>{ev.title}</td>
                  <td>{formatDateTimeRange(ev.startAt, ev.endAt)}</td>
                  <td>{ev.location}</td>
                  <td><SpotsDropdown event={ev} /></td>
                  <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link
                      to={`/events/${encodeURIComponent(ev.id)}`}
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      View
                    </Link>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                      onClick={() => remove(ev.id)}
                      disabled={deleting.has(ev.id)}
                      aria-label={`Delete ${ev.title}`}
                    >
                      {deleting.has(ev.id) ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !error && expiredSorted.length === 0 && (
                <tr><td colSpan={5} className="small">No expired events.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      </main>
      {confirmUI}
    </>
  );
}