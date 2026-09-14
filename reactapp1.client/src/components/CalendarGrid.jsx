// src/components/CalendarGrid.jsx
import { useMemo, useRef, useState } from "react";

/* ---------- date helpers (Monday-first) ---------- */
const startOfMonth = (d) => { const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; };
const startOfWeekMon = (d) => {
  const x = new Date(d);
  const day = x.getDay();               // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7;           // Mon=>0 ... Sun=>6
  x.setDate(x.getDate() - diff);
  x.setHours(0,0,0,0);
  return x;
};
const addDays      = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const isSameDay    = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const clampDate    = (v) => { const x=new Date(v); return isNaN(x) ? null : x; };

/* ---------- fixed colors for 5 categories ---------- */
 const CATEGORY_COLOR = {
   Technology: "#19f0d7", 
   Creative:   "#8b5cf6", 
   Sports:     "#22c55e", 
   Wellness:   "#e15757", 
   Academic:   "#f59e0b", 
};

const Y_SHIFT = 6;
const TRACK_PITCH = 9.5;
/**
 * Compact CalendarGrid
 * props:
 *  - title?: string
 *  - events: [{ id, title, startAt, endAt?, category? }]
 *  - onEventClick?: (ev) => void
 *  - width?: number   默认 280
 *  - rowHeight?: number 单元格高度，默认 36
 */
export default function CalendarGrid({
  title,
  events = [],
  onEventClick,
  width = 280,
  rowHeight = 36,
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [hover, setHover] = useState(null); // {ev, anchor:{x,y}, key:string}
  const containerRef = useRef(null);
  const bubbleRef = useRef(null);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeekMon(monthStart);

  // ✅ 固定 5 周（35 格）
  const days = Array.from({ length: 35 }, (_, i) => addDays(gridStart, i));

  const isCurrentMonth = (d) => d.getMonth() === monthStart.getMonth();

  // 圆圈大小尽量“填满”单元：行高 - 内边距
  const DOT = Math.max(12, Math.min(rowHeight - 14, 18));

  /** 铺到每天：多日 -> 细条；单日 -> 圆圈 */
  const dayMap = useMemo(() => {
    const map = new Map();
    const bucketOf = (key) => { if (!map.has(key)) map.set(key, { bars: [], dots: [] }); return map.get(key); };

    for (const ev of events) {
      const s = clampDate(ev.startAt ?? ev.start ?? ev.startDateTime);
      const e = clampDate(ev.endAt   ?? ev.end   ?? ev.endDateTime) ?? s;
      if (!s) continue;

      const start = new Date(s); start.setHours(0,0,0,0);
      const end   = new Date(e); end.setHours(0,0,0,0);

      const color = CATEGORY_COLOR[ev.category] ?? "#2563eb";
      const letter = String(ev.category ?? "U").slice(0,1).toUpperCase();

      const isSingleDay = isSameDay(start, end);

      if (isSingleDay) {
        const key = start.toISOString().slice(0,10);
        const b = bucketOf(key);
        b.dots.push({ id: `${ev.id}-single`, color, letter, ev });
        continue;
      }

      // 多日：条 + 起止点圆圈（条在起止日缩进，避免覆盖圆圈）
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        const key = d.toISOString().slice(0,10);
        const b = bucketOf(key);
        const isStart = isSameDay(d, start);
        const isEnd   = isSameDay(d, end);

        b.bars.push({ id: ev.id, color, isStart, isEnd, ev });

        if (isStart || isEnd) {
          b.dots.push({ id: `${ev.id}-${isStart ? "s":"e"}`, color, letter, ev });
        }
      }
    }

    for (const v of map.values()) {
      v.bars.sort((a,b)=> a.color.localeCompare(b.color) || String(a.id).localeCompare(String(b.id)));
      v.dots.sort((a,b)=> a.color.localeCompare(b.color) || String(a.id).localeCompare(String(b.id)));
    }
    return map;
  }, [events]);

  /* ---------- Hover 浮层（浅蓝样式，宽度自适应文本） ---------- */
  const hoverOverlay = (() => {
    if (!hover?.ev) return null;
    const host = containerRef.current;
    if (!host) return null;

    const hostRect = host.getBoundingClientRect();
    const centerLeft = Math.max(0, hover.anchor.x - hostRect.left);

    return (
      <div
        ref={bubbleRef}
        style={{
          position: "absolute",
          left: centerLeft,
          top: Math.max(0, hover.anchor.y - hostRect.top) - 10,
          zIndex: 60,
          background: "#eaf7ff",
          color: "#0f172a",
          fontSize: 12,
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid #d8ecff",
          boxShadow: "0 10px 22px rgba(2,36,71,.08)",
          pointerEvents: "none",
          whiteSpace: "nowrap",     // 跟随文字长度
          transform: "translate(-50%,-100%)",
        }}
      >
        {hover.ev.title || "Untitled"}
      </div>
    );
  })();

  const weekDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width,
        background: "#fff",
        border: "1px solid rgba(2,36,71,0.08)",
        borderRadius: 16,
        boxShadow: "0 8px 28px rgba(2,36,71,0.06)",
        padding: 10,
        overflow: "visible",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        {/* 顶部小标题保留一行 */}
        {title ? (
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1f2937", marginBottom: 2 }}>
            {title}
          </div>
        ) : null}

        {/* 月份在左，按钮组固定在最右，不随月份长度改变 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",  // 关键：左右两端对齐
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {cursor.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </div>

          <div style={{ display: "inline-flex", gap: 6 }}>
            <button
              className="btn btn-ghost"
              style={{ padding: "2px 8px", borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}
              onClick={() => setCursor(startOfMonth(new Date()))}
              aria-label="Go to Today"
            >
              Today
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "2px 8px", borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}
              onClick={() => {
                const x = new Date(cursor);
                x.setMonth(x.getMonth() - 1, 1);
                setCursor(x);
              }}
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "2px 8px", borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}
              onClick={() => {
                const x = new Date(cursor);
                x.setMonth(x.getMonth() + 1, 1);
                setCursor(x);
              }}
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>
      </div>




      {/* Week header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {weekDays.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 10, fontWeight: 800, color: "#7C93A8" }}>{w}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: rowHeight, gap: 4 }}>
        {days.map((d, idx) => {
          const key = d.toISOString().slice(0,10);
          const bucket = dayMap.get(key) || { bars: [], dots: [] };
          const today = isSameDay(d, new Date());
          const out = !isCurrentMonth(d);

          return (
            <div
              key={idx}
              style={{
                position: "relative",
                borderRadius: 10,
                background: "#fff",
                border: today ? "1.5px solid #2563eb" : "1px solid rgba(2,36,71,0.08)",
                padding: 4,
                overflow: "visible",
                opacity: out ? 0.45 : 1,
              }}
            >
              {/* day number */}
              <div style={{ position: "absolute", left: 6, top: 4, fontSize: 10, fontWeight: 900, color: today ? "#0b5394" : "#123656" }}>
                {d.getDate()}
              </div>

              {/* bars（多日条）与端点共用同一“轨道” */}
              <div
                style={{
                  position: "absolute",
                  left: 6,
                  right: 6,
                  // 与以前一样的基准，但整体加下移
                  top: Math.floor(rowHeight / 2) - 5 + Y_SHIFT,
                  height: rowHeight,
                }}
              >
                {(() => {
                  // 记录：本格子里每个事件所占的“轨道索引”i，供端点圆圈对齐
                  const trackIndex = new Map();

                  // 先画条，并记下每个 ev.id 的轨道 i
                  bucket.bars.slice(0, 4).forEach((b, i) => {
                    trackIndex.set(b.ev.id, i);
                  });

                  return (
                    <>
                      {/* 条（与旧逻辑一致） */}
                      {bucket.bars.slice(0, 4).map((b, i) => {
                        const light = hexToRgba(b.color, 0.2);
                        const bg = !b.isStart && !b.isEnd ? light : hexToRgba(b.color, 0.28);
                        const radius = 6;
                        const lift = hover?.ev?.id === b.ev.id ? -3 : 0;

                        // 与你现有的缩进保持一致：条在起止日缩进，给端点圆圈让位
                        const padL = b.isStart ? (DOT / 2 + 6) : 0;
                        const padR = b.isEnd ? (DOT / 2 + 6) : 0;

                        return (
                          <div
                            key={b.ev.id + "#" + i}
                            onMouseEnter={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setHover({ ev: b.ev, anchor: { x: r.left + r.width / 2, y: r.top } });
                            }}
                            onMouseLeave={() => setHover(null)}
                            onClick={() => onEventClick?.(b.ev)}
                            style={{
                              position: "absolute",
                              left: padL,
                              right: padR,
                              top: i * TRACK_PITCH + lift,
                              height: 8,
                              background: bg,
                              borderRadius: radius,
                              boxShadow: hover?.ev?.id === b.ev.id ? "0 6px 14px rgba(0,0,0,.12)" : "none",
                              cursor: onEventClick ? "pointer" : "default",
                            }}
                            title={b.ev.title}
                          />
                        );
                      })}

                      {/* 起止端点圆圈：与对应条的轨道 i 对齐 */}
                      {bucket.dots.slice(0, 6).map((dot, idx) => {
                        const i = trackIndex.get(dot.ev.id) ?? 0; // 若当天只有端点没有条，默认放第 0 轨
                        const isHover = hover?.ev?.id === dot.ev.id;

                        // 提取是起点还是终点（来自 id 尾缀 -s / -e）
                        const isStart = String(dot.id).endsWith("-s");
                        const isEnd = String(dot.id).endsWith("-e");

                        // 纵向：居中贴在条上（条高 8，圆 DOT）
                        const trackTop = i * TRACK_PITCH + (hover?.ev?.id === dot.ev.id ? -3 : 0);
                        const circleTop = trackTop - (DOT - 8) / 2;

                        return (
                          <div
                            key={dot.id + "#" + idx}
                            onMouseEnter={(e) => {
                              const rct = e.currentTarget.getBoundingClientRect();
                              setHover({ ev: dot.ev, anchor: { x: rct.left + rct.width / 2, y: rct.top } });
                            }}
                            onMouseLeave={() => setHover(null)}
                            onClick={() => onEventClick?.(dot.ev)}
                            style={{
                              position: "absolute",
                              // 横向：起点贴左 6px，终点贴右 6px，与条 padL/padR 完全对齐（条起点 = 6 + DOT/2）
                              ...(isStart ? { left: 0 } : isEnd ? { right: 0 } : { left: 0 }),
                              // 因为 bars 的容器已经 left/right:6，这里用相对 0 就等价于 6
                              top: circleTop,
                              width: DOT,
                              height: DOT,
                              borderRadius: "50%",
                              background: dot.color,
                              border: "2px solid #fff",
                              display: "grid",
                              placeItems: "center",
                              color: "#0f172a",
                              fontSize: Math.max(10, DOT / 2.2),
                              fontWeight: 900,
                              boxShadow: isHover ? "0 6px 14px rgba(0,0,0,.12)" : "0 2px 6px rgba(0,0,0,.06)",
                              zIndex: isHover ? 30 : 20 + idx,
                              transition: "all .12s ease",
                              cursor: onEventClick ? "pointer" : "default",
                              userSelect: "none",
                              pointerEvents: "auto",
                            }}
                            title={dot.ev.title}
                          >
                            {String(dot.ev.category ?? "U").slice(0, 1).toUpperCase()}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover title */}
      {hoverOverlay}
    </div>
  );
}

/* ---------- utils ---------- */
function hexToRgba(hex, alpha) {
  const m = String(hex).replace("#","").match(/.{1,2}/g) || [];
  const [r,g,b] = m.map((x)=>parseInt(x.length===1?x+x:x,16));
  return `rgba(${r||0},${g||0},${b||0},${alpha})`;
}
