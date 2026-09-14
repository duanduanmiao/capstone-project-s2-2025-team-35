// src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EventCard from "../components/EventCard";
import heroImg1 from "../assets/school1.jpg";
import heroImg2 from "../assets/schoolevent.jpg";
import { API_BASE_URL } from "../utils/config.js";
import "../home.css";

/* ==================== 时间解析与标准化 ==================== */
const fixIso = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v).toISOString();
  let s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(s)) s = s.replace(" ", "T");
  const isoLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(s);
  const hasZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);
  const padded = isoLike && !hasZone ? `${s}Z` : s;
  const d = new Date(padded);
  return isNaN(d) ? null : d.toISOString();
};

const normalizeEvent = (e = {}) => ({
  ...e,
  startAt: fixIso(e.startAt ?? e.startTime ?? e.startDateTime ?? e.date ?? e.start),
  endAt:   fixIso(e.endAt   ?? e.endTime   ?? e.endDateTime   ?? e.finish ?? e.end),
});

/* ==================== Fetch helpers ==================== */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (res.status === 401) {
    const ret = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${API_BASE_URL}/auth/google?returnUrl=${ret}`;
    throw new Error("Unauthorized");
  }
  return res;
}

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

/* ==================== Utils / Categories ==================== */
function getStartMs(ev) {
  const candidate =
    ev?.startAt || ev?.startTime || ev?.startDateTime || ev?.date || ev?.start || ev?.beginTime;
  const d = candidate ? new Date(candidate) : null;
  return d && !isNaN(d) ? d.getTime() : null;
}

const CATEGORY_META = [
  { slug: "Tech", label: "Technology", icon: "💻" },
  { slug: "Creative", label: "Creative", icon: "🎨" },
  { slug: "Sports", label: "Sports", icon: "🏃" },
  { slug: "Wellness", label: "Wellness", icon: "🧘" },
  { slug: "Academic", label: "Academic", icon: "📚" },
];

function CategoryStrip() {
  const cols = CATEGORY_META.length;
  return (
    <section className="cat-strip card">
      <div className="cat-grid cat-grid--fill" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {CATEGORY_META.map((c) => (
          <Link key={c.slug} className="cat-item" to={`/events?category=${encodeURIComponent(c.slug)}`}>
            <span className="cat-icon" aria-hidden>{c.icon}</span>
            <span className="cat-label">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ==================== Hero Carousel ==================== */
const HERO_SLIDES = [
  { src: heroImg1, alt: "Campus moments 1", cta: { text: "Get Tickets Now", to: "/events" } },
  { src: heroImg2, alt: "Campus moments 2", cta: { text: "Get Tickets Now", to: "/events" } },
];

function HeroCarousel({ slides = HERO_SLIDES, autoMs = 3500 }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const hoverRef = useRef(false);
  const containerRef = useRef(null);
  const go = (n) => setIdx((p) => (p + n + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { if (!hoverRef.current) go(1); }, autoMs);
    return () => clearInterval(timerRef.current);
  }, [autoMs, slides.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section
      className="hero-carousel"
      ref={containerRef}
      tabIndex={0}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      aria-roledescription="carousel"
      aria-label="Event highlights"
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src={slides[idx].src}
            alt={slides[idx].alt || `slide ${idx + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", backgroundColor: "#f8fafc" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.35), rgba(0,0,0,.05))" }} aria-hidden />
          {slides[idx].cta && (
            <div style={{ position: "absolute", right: 16, bottom: 16 }}>
              <Link to={slides[idx].cta.to} className="btn-hero">{slides[idx].cta.text}</Link>
            </div>
          )}
        </div>
      </div>
      {slides.length > 1 && (
        <>
          <button className="hero-prev" onClick={() => go(-1)} aria-label="Previous slide">‹</button>
          <button className="hero-next" onClick={() => go(1)} aria-label="Next slide">›</button>
        </>
      )}
    </section>
  );
}

/* ==================== CountUp ==================== */
function usePrefersReducedMotion() {
  const [reduced, set] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => set(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}
function useInView(ref, { root = null, rootMargin = "0px 0px -20% 0px", threshold = 0, once = true } = {}) {
  const [inView, setInView] = useState(false);
  const hasEnteredRef = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting) {
        setInView(true);
        if (once) { hasEnteredRef.current = true; io.disconnect(); }
      } else if (!once) setInView(false);
    }, { root, rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, root, rootMargin, threshold, once]);
  return once ? (inView || hasEnteredRef.current) : inView;
}
function rafAnimate({ from, to, duration = 900, easing = (p) => 1 - Math.pow(1 - p, 3), onUpdate, onDone }) {
  let raf, t0;
  const tick = (t) => {
    if (!t0) t0 = t;
    const p = Math.min(1, (t - t0) / duration);
    const v = from + (to - from) * easing(p);
    onUpdate?.(v);
    if (p < 1) raf = requestAnimationFrame(tick);
    else onDone?.();
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
function formatShort(n) {
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${Math.floor(n / 100000) / 10}m+`;
  if (abs >= 10000)   return `${Math.floor(n / 1000)}k+`;
  if (abs >= 1000)    return `${Math.floor(n / 100) / 10}k+`;
  return n.toLocaleString();
}
function CountUp({ value = 0, duration = 900, delay = 0, format = "comma", startWhenInView = true, className }) {
  const prefersReduce = usePrefersReducedMotion();
  const hostRef = useRef(null);
  const inView = useInView(hostRef, { once: true, rootMargin: "0px 0px -20% 0px" });
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const stopRef = useRef(null);
  const fmt = (n) => {
    const r = Math.round(n);
    if (typeof format === "function") return format(r);
    if (format === "short") return formatShort(r);
    return r.toLocaleString();
  };
  useEffect(() => {
    const shouldStart = startWhenInView ? inView : true;
    if (!shouldStart) return;
    if (prefersReduce) { setDisplay(value); prevRef.current = value; return; }
    if (stopRef.current) stopRef.current();
    const start = () => {
      const from = prevRef.current ?? 0;
      const to = Number(value) || 0;
      if (Math.abs(to - from) < 1) { setDisplay(to); prevRef.current = to; return; }
      stopRef.current = rafAnimate({
        from, to, duration,
        onUpdate: (v) => setDisplay(v),
        onDone: () => { prevRef.current = to; stopRef.current = null; },
      });
    };
    const t = delay ? setTimeout(start, delay) : (start(), 0);
    return () => { if (t) clearTimeout(t); if (stopRef.current) stopRef.current(); };
  }, [value, inView, prefersReduce, duration, delay, startWhenInView]);
  return <span ref={hostRef} className={className}>{fmt(display)}</span>;
}

/* ==================== 演示卡片（右侧） ==================== */
function RegisterHowtoUsingEventCard({ role = "guest" }) {
  const BASE_REGISTERED = 22;
  const CAPACITY = 50;

  const [phase, setPhase] = useState("idle"); // idle -> approach -> click -> done
  const [demoReg, setDemoReg] = useState(false);
  const [regCount, setRegCount] = useState(BASE_REGISTERED);
  const stageRef = useRef(null);

  /* ---- 测量按钮与目标点，写入 CSS 变量 ---- */
  useEffect(() => {
    function measure() {
      const stage = stageRef.current;
      if (!stage) return;

      const btns = Array.from(stage.querySelectorAll("button, a"));
      let target =
        btns.find((b) => /register(ed)?/i.test(b.textContent || "")) ||
        btns.find((b) => /withdraw|withdrawal|withdrawl/i.test(b.textContent || "")) ||
        btns.find((b) => /view/i.test(b.textContent || ""));

      const stageRect = stage.getBoundingClientRect();
      let x = stageRect.width - 90, y = stageRect.height - 64, w = 148, h = 44;

      if (target) {
        const r = target.getBoundingClientRect();
        x = r.left - stageRect.left;
        y = r.top  - stageRect.top;
        w = r.width; h = r.height;
      }

      stage.style.setProperty("--btn-x", `${x}px`);
      stage.style.setProperty("--btn-y", `${y}px`);
      stage.style.setProperty("--btn-w", `${w}px`);
      stage.style.setProperty("--btn-h", `${h}px`);

      // 点击波纹中心
      stage.style.setProperty("--click-x", `${x + w / 2}px`);
      stage.style.setProperty("--click-y", `${y + h / 2}px`);

      // 指针起止点（起点舞台左上，终点按钮右上内侧）
      stage.style.setProperty("--ptr-start-x", `0px`);
      stage.style.setProperty("--ptr-start-y", `0px`);
      stage.style.setProperty("--ptr-end-x", `${x + w - 18}px`);
      stage.style.setProperty("--ptr-end-y", `${y + 10}px`);
    }

    // 初次 + 下一帧再测，确保布局/文案切换完成
    measure();
    requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    const mo = new MutationObserver(measure);
    if (stageRef.current) mo.observe(stageRef.current, { childList: true, subtree: true, characterData: true });
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* ---- 只禁用演示卡片里的 View details / Register / Withdraw(含常见拼写) ---- */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const normalize = (t) => (t || "").trim().toLowerCase().replace(/\s+/g, " ");
    const isTargetText = (t) => {
      const s = normalize(t);
      return s === "view details" || s === "register" || s === "withdraw" || s === "withdrawal" || s === "withdrawl";
    };
    const block = (e) => { e.preventDefault(); e.stopPropagation(); };

    const candidates = Array.from(stage.querySelectorAll("a,button"));
    const targets = candidates.filter((el) => isTargetText(el.textContent || el.getAttribute("aria-label") || ""));

    targets.forEach((el) => {
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("tabindex", "-1");
      el.classList.add("demo-disabled");
      el.addEventListener("click", block, true);
    });

    return () => {
      targets.forEach((el) => {
        el.removeEventListener("click", block, true);
        el.classList.remove("demo-disabled");
        el.removeAttribute("aria-disabled");
        if (el.getAttribute("tabindex") === "-1") el.removeAttribute("tabindex");
      });
    };
  }, [demoReg, phase]);

  /* ---- 循环动画 + 强制重启点击波纹 ---- */
  useEffect(() => {
    let t1, t2, t3, loopId;

    const restartRipple = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const el = stage.querySelector(".demo-click");
      if (!el) return;
      el.classList.remove("go");
      // 强制回流，重置动画计时
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add("go");
    };

    const loop = () => {
      setDemoReg(false);
      setRegCount(BASE_REGISTERED);
      setPhase("approach");

      t1 = setTimeout(() => {
        setDemoReg(true);
        setRegCount((n) => Math.min(n + 1, CAPACITY));
        // 文案切换后下一帧再触发点击，确保测量正确
        requestAnimationFrame(() => {
          setPhase("click");
          restartRipple();
        });
      }, 900);

      t2 = setTimeout(() => setPhase("done"), 1400);
      t3 = setTimeout(() => setPhase("idle"), 2400);
    };

    loop();
    loopId = setInterval(loop, 3000);

    return () => {
      clearInterval(loopId);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, []);

  const demoEvent = {
    id: "demo-evt-1",
    title: "AI Summit: Intro to LLMs",
    location: "Engineering",
    startAt: new Date(Date.now() + 86400000).toISOString(),
    category: "Tech",
    status: "open",
    capacity: CAPACITY,
    registered: regCount,
    seatsRemaining: CAPACITY - regCount,
    isRegistered: demoReg,
  };

  return (
    <div className="howto-demo">
      <div className="demo-stage" ref={stageRef}>
        <EventCard
          event={demoEvent}
          role='guest'
          isRegistered={demoReg}
          onRegister={() => {}}
          onWithdraw={() => {}}
          onDelete={() => {}}
        />
        {/* 指针 */}
        <svg
          className={`demo-pointer ${phase === "approach" ? "approach" : phase === "click" ? "click" : ""}`}
          viewBox="0 0 32 32" width="28" height="28" aria-hidden
        >
          <path d="M5 4l14 14-6 1 3 7-3.5 1.6-3-7-6 1L5 4z" fill="#0f172a" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
        {/* 点击波纹（对齐按钮中心） */}
        <span className={`demo-click ${phase === "click" ? "go" : ""}`} aria-hidden />
      </div>
    </div>
  );
}

/* ==================== 页面 ==================== */
export default function Home() {
  // query
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  // data
  const [events, setEvents] = useState([]);
  const [popularEvents, setPopular] = useState([]);

  // me
  const [me, setMe] = useState(null);
  const role = me?.role ?? "guest";

  // my regs
  const [myRegs, setMyRegs] = useState(new Set());
  const isRegistered = (ev) => ev?.isRegistered || myRegs.has(ev.id);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState("");
  const abortRef = useRef(null);
  const didInitial = useRef(false);

  /* 样式：仅演示相关 */
  const demoStyles = `
    /* 禁用态（仅 demo） */
    .demo-disabled{ opacity:.55; cursor:not-allowed; pointer-events:auto; filter:grayscale(.15); }
    .demo-disabled:focus{ outline:none; }
    /* 指针与波纹 */
    .demo-stage{ position:relative; }
    .demo-pointer{
      position:absolute;
      left: var(--ptr-start-x, 0px);
      top:  var(--ptr-start-y, 0px);
      width:28px; height:28px;
      pointer-events:none;
      z-index:5;
      transform: translate(-50%, -50%);
    }
    .demo-pointer.approach{
      animation: demo-pointer-move .8s ease forwards;
    }
    @keyframes demo-pointer-move{
      from{ transform: translate(-50%,-50%) translate(var(--ptr-start-x,0px), var(--ptr-start-y,0px)); }
      to  { transform: translate(-50%,-50%) translate(var(--ptr-end-x,0px),   var(--ptr-end-y,0px)); }
    }
    .demo-click{
      position:absolute;
      left: var(--click-x, 0px);
      top:  var(--click-y, 0px);
      width:12px; height:12px;
      border-radius:999px;
      background: rgba(0,0,0,.18);
      transform: translate(-50%,-50%) scale(0);
      opacity:0;
      pointer-events:none;
      z-index:6;
    }
    .demo-click.go{ animation: demo-click .35s ease-out; }
    @keyframes demo-click{
      0%   { transform: translate(-50%,-50%) scale(.2); opacity:0; }
      30%  { opacity:.25; }
      100% { transform: translate(-50%,-50%) scale(2.6); opacity:0; }
    }
  `;

  /* fetch current user */
  useEffect(() => {
    (async () => {
      try { const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" }); if (res.ok) setMe(await res.json()); } catch {}
    })();
  }, []);

  /* fetch events */
  const fetchEvents = async () => {
    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true); setErr("");

      const params = new URLSearchParams();
      if (cat) params.append("category", cat);
      if (q.trim()) params.append("search", q.trim());

      const res = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
        signal: ctrl.signal, credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
      const list = await res.json();
      setEvents(Array.isArray(list) ? list.map(normalizeEvent) : []);
    } catch (e) {
      if (e?.name !== "AbortError") setErr("Failed to load events. Please try again.");
    } finally { setLoading(false); }
  };

  /* fetch popular (least-registered) */
  const loadPopular = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/events/least-registered?count=6`, { credentials: "include" });
      if (r.ok) {
        const arr = await r.json();
        setPopular(Array.isArray(arr) ? arr.map(normalizeEvent) : []);
      }
    } catch {}
  };

  /* initial load */
  useEffect(() => {
    (async () => {
      await Promise.all([fetchEvents(), loadPopular()]);
      didInitial.current = true;
    })();
    return () => abortRef.current?.abort();
  }, []);

  /* debounce search/category */
  useEffect(() => {
    if (!didInitial.current) return;
    const t = setTimeout(fetchEvents, 500);
    return () => clearTimeout(t);
  }, [q, cat]);

  /* build myRegs after list changes */
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

  /* ===== actions ===== */
  function bumpRegistered(list, id, delta) {
    return (list || []).map((ev) => ev.id === id ? { ...ev, registered: (ev.registered ?? 0) + delta } : ev);
  }

  const handleRegisterEvent = async (eventId) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/events/${eventId}/register`, { method: "POST" });
      const text = await res.text();
      if (!res.ok) {
        let msg = text; try { msg = JSON.parse(text)?.message || msg; } catch {}
        alert(msg || `Register failed (${res.status})`); return;
      }
      setMyRegs((prev) => new Set(prev).add(eventId));
      setEvents((prev) => bumpRegistered(prev, eventId, +1));
      setPopular((prev) => bumpRegistered(prev, eventId, +1));
      await Promise.all([fetchEvents(), loadPopular()]);
      alert("Successfully registered!");
    } catch (e) { alert(e.message || "Register failed"); }
  };

  const handleWithdrawEvent = async (eventId) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/events/${eventId}/register`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) {
        let msg = text; try { msg = JSON.parse(text)?.message || msg; } catch {}
        alert(msg || `Withdraw failed (${res.status})`); return;
      }
      setMyRegs((prev) => { const s = new Set(prev); s.delete(eventId); return s; });
      setEvents((prev) => bumpRegistered(prev, eventId, -1));
      setPopular((prev) => bumpRegistered(prev, eventId, -1));
      await Promise.all([fetchEvents(), loadPopular()]);
      alert("Withdrawn successfully.");
    } catch (e) { alert(e.message || "Withdraw failed"); }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/events/${eventId}`, { method: "DELETE" });
      if (res.status === 403) { alert("You are not allowed to delete this event."); return; }
      if (!res.ok) throw new Error(await res.text());
      await Promise.all([fetchEvents(), loadPopular()]);
      alert("Deleted successfully.");
    } catch (e) { alert(e.message || "Delete failed"); }
  };

  /* filters */
  const filtered = useMemo(() => {
    if (loading) return events;
    const kw = q.trim().toLowerCase();
    return events.filter((ev) => {
      const okCat = !cat || ev.category === cat;
      const okKw =
        !kw ||
        (ev.title && ev.title.toLowerCase().includes(kw)) ||
        (ev.location && ev.location.toLowerCase().includes(kw));
      return okCat && okKw;
    });
  }, [events, q, cat, loading]);

  /* upcoming */
  const upcomingTop = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .map((ev) => ({ ev, ms: getStartMs(ev) }))
      .filter((x) => x.ms && x.ms > now)
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 5)
      .map((x) => x.ev);
  }, [events]);

  /* stats */
  const stats = useMemo(() => {
    const now = Date.now();
    const activeEvents = (events || []).filter((ev) => {
      if (String(ev?.status).toLowerCase() === "cancelled") return false;
      const ms = getStartMs(ev);
      return ms == null || ms >= now;
    }).length;
    const registrations = (events || []).reduce((sum, ev) => {
      const n = Number(ev?.registered);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const categories = CATEGORY_META.length;
    return { activeEvents, registrations, categories };
  }, [events]);

  return (
    <main className="container container--lg page-home" style={{ marginTop: 20 }}>
      {/* 仅演示相关的内联样式（可移到 home.css） */}
      <style>{demoStyles}</style>

      {/* 1) About / Hero Copy */}
      <section className="section about-hero">
        <div className="about-hero__inner">
          <div className="about-hero__copy">
            <span className="about-hero__eyebrow">✨ Event discovery & easy registration</span>
            <h1 className="about-hero__title">
              Find events.<br/>Register fast.<br/>All in one place.
            </h1>
            <p className="about-hero__lead">
              Browse campus events across technology, arts, wellness, sports, and academics. Tap <strong>Register</strong> on any event card to join instantly.
            </p>
            <div className="about-hero__actions">
              <Link to="/events" className="btn-primary">Browse events</Link>
            </div>

            <div className="about-hero__stats">
              <div className="stat">
                <div className="stat-num"><CountUp value={stats.activeEvents} duration={900} delay={0} format="comma"/><span aria-hidden>+</span></div>
                <div className="stat-label">Active events</div>
              </div>
              <div className="stat">
                <div className="stat-num"><CountUp value={stats.registrations} duration={1000} delay={120} format="short"/><span aria-hidden>+</span></div>
                <div className="stat-label">Registrations</div>
              </div>
              <div className="stat">
                <div className="stat-num"><CountUp value={stats.categories} duration={900} delay={240} format="comma"/><span aria-hidden>+</span></div>
                <div className="stat-label">Categories</div>
              </div>
            </div>
          </div>

          <div className="about-hero__media">
            <RegisterHowtoUsingEventCard role={role} />
          </div>
        </div>
      </section>

      {/* 2) Categories */}
      <section className="section">
        <CategoryStrip />
      </section>

      {/* 3) Hero 轮播 */}
      <section className="section">
        <HeroCarousel />
      </section>

      {/* 4) Popular */}
      {popularEvents?.length > 0 && (
        <section className="section">
          <h2 className="section-title">Popular events</h2>
          <div className="popular-carousel">
            <div className="popular-carousel-track">
              {[...popularEvents, ...popularEvents].map((event, idx) => (
                <div key={`${event.id}-${idx}`} className="popular-carousel-item">
                  <EventCard
                    event={event}
                    role={role}
                    isRegistered={isRegistered(event)}
                    onRegister={handleRegisterEvent}
                    onWithdraw={handleWithdrawEvent}
                    onDelete={handleDeleteEvent}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5) Upcoming */}
      {upcomingTop.length > 0 && (
        <section className="section">
          <h2 className="section-title">Upcoming events</h2>
          <UpcomingTimelineHorizontal
            items={upcomingTop}
            renderCard={(ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                role={role}
                isRegistered={isRegistered(ev)}
                onRegister={handleRegisterEvent}
                onWithdraw={handleWithdrawEvent}
                onDelete={handleDeleteEvent}
              />
            )}
          />
        </section>
      )}

      {error && (
        <section className="section">
          <div className="card" style={{ padding: 24, textAlign: "center", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 18 }}>
            {error}
          </div>
        </section>
      )}
    </main>
  );
}

/* ==================== Upcoming timeline ==================== */
function UpcomingTimelineHorizontal({ items = [], renderCard }) {
  if (!items.length) return null;
  return (
    <section className="upcoming-h" style={{ position: "relative", paddingTop: 30 }}>
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 20, height: 2, background: "var(--edge, #d8ecff)" }} />
      <div className="timeline-scroll" style={{ overflowX: "auto", overflowY: "visible", paddingBottom: 8, scrollSnapType: "x mandatory", display: "flex", gap: 20 }}>
        {items.map((ev, i) => (
          <div key={ev.id ?? i} className="timeline-item" style={{ position: "relative", minWidth: 300, scrollSnapAlign: "start" }}>
            <div aria-hidden style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 999, background: "var(--brand, #6ecbff)", boxShadow: "0 0 0 3px rgba(110,203,255,.25)" }} />
            <div aria-hidden style={{ position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)", width: 2, height: 14, background: "var(--edge, #d8ecff)" }} />
            <div style={{ marginTop: 40 }}>{renderCard ? renderCard(ev) : null}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
