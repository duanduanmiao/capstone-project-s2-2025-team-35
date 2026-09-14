import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/config.js";

// Fixed colors (must match CalendarGrid.jsx)
 const CATEGORY_COLOR = {
   Technology: "#19f0d7", 
   Creative:   "#8b5cf6", 
   Sports:     "#22c55e", 
   Wellness:   "#e15757", 
   Academic:   "#f59e0b", 
};

function hexToRgba(hex, a = 0.12) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function EventCard({
  event,
  onPrimary,
  onSecondary,
  primaryText = "Register",
  secondaryText = "View details",
  role = "guest",
  me,
  isRegistered = false,
  onRegister,
  onWithdraw,
  onDelete, // 保留兼容
  // 可选：整卡点击进入详情（默认 true/false 看你项目，这里沿用你传入的值）
  clickable = true,
}) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(undefined);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" });
        if (!res.ok) setUserId(null);
        else {
          const data = await res.json();
          setUserId(data?.id ?? null);
        }
      } catch {
        setUserId(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const {
    id,
    imageUrl,
    title,
    startAt,
    endAt,
    location,
    category,
    registered,
    capacity,
    seatsLeft,
    organizerId,
  } = event ?? {};

  const roleNorm = String(role || "guest").toLowerCase();

  const formatEventDate = (start, end) => {
    try {
      const s = start ? new Date(start) : null;
      const e = end ? new Date(end) : null;
      if (!s && !e) return "";
      const dateOpts = { year: "numeric", month: "short", day: "numeric", weekday: "short" };
      const timeOpts = { hour: "numeric", minute: "numeric", hour12: true };
      const fmtDate = (d) => new Intl.DateTimeFormat("en-US", dateOpts).format(d);
      const fmtTime = (d) => new Intl.DateTimeFormat("en-US", timeOpts).format(d).replace(" ", "");
      if (s && e) {
        const sameDay = s.toDateString() === e.toDateString();
        return sameDay
          ? `${fmtDate(s)} · ${fmtTime(s)} – ${fmtTime(e)}`
          : `${fmtDate(s)} ${fmtTime(s)} – ${fmtDate(e)} ${fmtTime(e)}`;
      }
      if (s) return `${fmtDate(s)} ${fmtTime(s)}`;
      return `${fmtDate(e)} ${fmtTime(e)}`;
    } catch {
      return "";
    }
  };

  // ---- 座位逻辑（仅数字提示，无进度条）----
  const computedRemaining =
    Number.isFinite(capacity) && Number.isFinite(registered)
      ? Math.max(0, capacity - registered)
      : undefined;

  const seatsRemaining =
    Number.isFinite(seatsLeft) ? seatsLeft : (computedRemaining ?? undefined);

  const seatsTotal =
    Number.isFinite(capacity) ? capacity : (seatsRemaining != null ? seatsRemaining : 0);

  const showRegisterBtn =
    !!onRegister && roleNorm !== "organizer" && !isRegistered && (seatsRemaining ?? 1) > 0;

  const showWithdrawBtn = !!onWithdraw && roleNorm !== "organizer" && isRegistered;

  const isOwner =
    roleNorm === "organizer" &&
    me?.id != null &&
    organizerId != null &&
    String(me.id) === String(organizerId);

  // 可选：整卡点击
  const onCardClick = () => {
    if (!clickable || !id) return;
    if (!userId) {
      navigate("/login");
    } else {
      navigate(`/events/${id}`);
    }
  };

    // ADDED: Get event image URL with fallback to default
    const base = import.meta.env.BASE_URL || "/";
    const getImageUrl = () => {
        // Use imageUrl from database if available
        if (imageUrl) {
            return imageUrl;
        }
        // Fallback to default image
        return `${base}images/events/default.jpg`;
    };

    // ADDED: Handle image load error by showing default image
    const onImgError = (e) => {
        const el = e.currentTarget;
        // Set to default image and stop retrying
        el.src = `${base}images/events/default.jpg`;
        el.onerror = null; // Prevent infinite loop
    };
    
    const catColor = CATEGORY_COLOR[category] ?? "#2563eb";
    const chipStyle = {
      background: hexToRgba(catColor, 0.14),
      border: `1px solid ${catColor}`,
      color: catColor,
    };


    return (
        <article
      className={`event-card upgraded ${clickable ? "clickable" : ""}`}
      onClick={onCardClick}
      role={clickable ? "button" : "group"}
      aria-label={title ?? "Event card"}
      tabIndex={clickable ? 0 : -1}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); // 防止空格滚动页面
          onCardClick();
        }
      }}
    >
            {/* MODIFIED: Always show image, use database imageUrl or fallback to default.jpg */}
            <img
                src={getImageUrl()}  // CHANGED: Use getImageUrl() with fallback logic
                onError={onImgError}  // ADDED: Fallback to default.jpg on error
                alt={title ? `Cover image for ${title}` : "Event cover"}
                className="event-card-image"
                style={{ width: "100%", height: "200px", borderRadius: 12, marginBottom: 12, objectFit: "cover" }}
            />

      {/* 内容区 */}
      <div className="content">
        {/* 类别 chip */}
        {category && <span className="chip" style={chipStyle}>{category}</span>}
        {/* 标题（两行截断） */}
        <h3 className="title clamp-2" title={title}>
          {title ?? "Untitled Event"}
        </h3>

        {/* meta 行：时间 + 地点 */}
        <div className="meta">
          <div className="meta-row">
            <span className="i">📅</span>
            <span>{formatEventDate(startAt, endAt)}</span>
          </div>
          {location && (
            <div className="meta-row">
              <span className="i">📍</span>
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* 座位：仅数字提示 */}
        {seatsTotal > 0 && seatsRemaining != null && (
          <div className="seats">
            <span className="i">🎟️</span>
            <strong>{seatsRemaining} / {seatsTotal}</strong>
            <span className="muted">&nbsp;Seats Remaining</span>
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="actions" onClick={(e) => e.stopPropagation()}>
        {/* 次按钮：View details */}
        {onSecondary ? (
          <button
            className="btn btn-ghost"
            disabled={authLoading}
            aria-disabled={authLoading}
            onClick={() => {
              if (!userId) {
                navigate("/login");
                return;
              }
              onSecondary(event);
            }}
          >
            {secondaryText}
          </button>
        ) : (
          id && (
            <Link
              className="btn btn-ghost"
              to={userId ? `/events/${id}` : "/login"}
              aria-disabled={authLoading}
              onClick={(e) => {
                if (authLoading) e.preventDefault();
              }}
            >
              {secondaryText}
            </Link>
          )
        )}

        {/* 主按钮：Register/Withdraw/编辑 */}
        {roleNorm === "organizer" ? (
          isOwner ? (
            <Link
              className="btn btn-primary"
              to={`/manage/create?eventId=${encodeURIComponent(id)}&organizerId=${encodeURIComponent(me?.id ?? "")}`}
            >
              Edit
            </Link>
          ) : null
        ) : (
          <>
            {showWithdrawBtn && (
              <button className="btn btn-secondary" onClick={() => onWithdraw?.(id)}>
                Withdraw
              </button>
            )}
            {showRegisterBtn && (
              <button
                className="btn btn-primary"
                onClick={() => onRegister?.(id)}
                aria-label={`Register for ${title}`}
              >
                {(seatsRemaining ?? 0) <= 0 ? "Full" : primaryText}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
