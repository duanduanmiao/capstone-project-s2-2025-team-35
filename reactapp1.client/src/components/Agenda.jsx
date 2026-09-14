// src/components/Agenda.jsx
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, getAllowedOrigins } from "../utils/config.js";
import { useDialog } from "./DialogProvider.jsx";
import { formatDateTime, isoToLocalInput } from "../utils/dateTimeUtils.js";

/* ===== 登录弹窗 + apiFetch（与 EventPage 同步） ===== */
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

        let timer;
        const onMsg = (ev) => {
            try {
                // Accept messages from allowed origins
                const allowedOrigins = getAllowedOrigins();
                if (!allowedOrigins.includes(ev.origin)) return;
                if (ev.data?.type === "GOOGLE_AUTH_SUCCESS") {
                    window.removeEventListener("message", onMsg);
                    if (timer) clearInterval(timer);
                    resolve(ev.data.user);
                }
            } catch {}
        };
        window.addEventListener("message", onMsg);

        timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                window.removeEventListener("message", onMsg);
                reject(new Error("Login cancelled"));
            }
        }, 400);
    });
}

async function safeText(res) {
    try {
        return await res.text();
    } catch {
        return "";
    }
}

async function apiFetch(url, options = {}) {
    const res = await fetch(url, { credentials: "include", ...options });

    if (res.status === 403) {
        const t = await safeText(res);
        throw new Error(`403 Forbidden\n${t || ""}`);
    }

    if (res.status === 401) {
        const ret = window.location.pathname + window.location.search;
        try {
            await openLoginPopup(ret);
        } catch {
            return res;
        }
        const retry = await fetch(url, { credentials: "include", ...options });
        if (retry.status === 401) return retry;
        if (retry.status === 403) {
            const t = await safeText(retry);
            throw new Error(`403 Forbidden\n${t || ""}`);
        }
        return retry;
    }

    return res;
}

/* ===== 视图小组件 ===== */
function AgendaEmpty({ canEdit, onCreateFirst }) {
    return (
        <div className="agenda-empty">
            {!canEdit ? (
                <p>The organizer hasn’t published an agenda yet.</p>
            ) : (
                <div>
                    <p>No agenda yet—click “Create first item” to get started.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" type="button" onClick={onCreateFirst}>
                            + Create first item
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** 单条（可编辑） */
function AgendaEditorRow({
                             item,
                             index,
                             total,
                             onSave,
                             onDelete,
                             onMoveUp,
                             onMoveDown,
                             eventStart,
                             eventEnd,
                         }) {
    const dialog = useDialog();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        title: item.title,
        description: item.description || "",
        startAt: isoToLocalInput(item.startAt),
        endAt: isoToLocalInput(item.endAt),
        isDone: item.isDone || false,
    });

    // 记录“进入编辑时”的原始值，用于无效保存时回退
    const originalRef = useRef({
        startAt: isoToLocalInput(item.startAt),
        endAt: isoToLocalInput(item.endAt),
    });
    useEffect(() => {
        if (editing) {
            originalRef.current = {
                startAt: form.startAt,
                endAt: form.endAt,
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing]);

    // ✅ 更清晰的“时间 Chip”
    const TimeChip = ({ children }) => (
        <span
            style={{
                display: "inline-block",
                marginTop: 6,
                padding: "6px 10px",
                borderRadius: 8,
                background: "#f1f5f9", // slate-100
                border: "1px solid var(--edge)",
                fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 15,
                color: "#0f172a", // slate-900
            }}
        >
            {children}
        </span>
    );

    // 保存前校验（优先 event 窗口越界；再检查 End ≤ Start）
    const save = () => {
        const s = form.startAt ? new Date(form.startAt) : null;
        const e = form.endAt ? new Date(form.endAt) : null;
        const evS = eventStart ? new Date(eventStart) : null;
        const evE = eventEnd ? new Date(eventEnd) : null;

        // 0) 没拿到 event window → 禁止保存
        if (!evS || !evE) {
            dialog?.alertBox?.(
                "Please wait",
                <div>The event time window is still loading. Please try again in a moment.</div>
            ) ?? window.alert("Event window not loaded yet.");
            return;
        }

        // 1) 先判断窗口越界
        const startOut = !!(s && (s < evS || s > evE));
        const endOut   = !!(e && (e < evS || e > evE));
        if (startOut || endOut) {
            const bullets = [];
            if (startOut) {
                bullets.push(
                    <li key="s">
                        Start is outside the event window.
                        <br />
                        <TimeChip>Start: {formatDateTime(s)}</TimeChip>
                    </li>
                );
            }
            if (endOut) {
                bullets.push(
                    <li key="e">
                        End is outside the event window.
                        <br />
                        <TimeChip>End: {formatDateTime(e)}</TimeChip>
                    </li>
                );
            }
            dialog?.alertBox?.(
                "Invalid time",
                <div>
                    <ul style={{ margin: "0 0 10px 18px" }}>{bullets}</ul>
                    <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 2 }}>
                        Event window:
                    </div>
                    <TimeChip>{formatDateTime(evS)} → {formatDateTime(evE)}</TimeChip>
                </div>
            ) ?? window.alert("Invalid time");

            // 回退到进入编辑时的有效时间
            setForm((f) => ({
                ...f,
                startAt: originalRef.current.startAt,
                endAt: originalRef.current.endAt,
            }));
            return;
        }

        // 2) 窗口内，再检查 End ≤ Start
        if (s && e && e.getTime() <= s.getTime()) {
            dialog?.alertBox?.(
                "Invalid time",
                <div>
                    <ul style={{ margin: "0 0 10px 18px" }}>
                        <li>End is earlier than (or equal to) Start.</li>
                    </ul>
                    <div><TimeChip>Start: {formatDateTime(s)}</TimeChip></div>
                    <div><TimeChip>End: {formatDateTime(e)}</TimeChip></div>
                </div>
            ) ?? window.alert("Invalid time: End ≤ Start");

            // 回退到进入编辑时的有效时间
            setForm((f) => ({
                ...f,
                startAt: originalRef.current.startAt,
                endAt: originalRef.current.endAt,
            }));
            return;
        }

        // 通过校验 → 保存（并更新原始快照）
        onSave(item.id, {
            title: form.title,
            description: form.description || null,
            startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
            endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
            isDone: form.isDone,
        });
        originalRef.current = { startAt: form.startAt, endAt: form.endAt };
        setEditing(false);
    };

    return (
        <li className="agenda-row">
            {!editing ? (
                <div className="agenda-line">
                    <div className="agenda-dot">{index + 1}</div>
                    <div className="agenda-content">
                        <div className="agenda-title">
                            <strong>{item.title}</strong>
                            {item.startAt && <span className="agenda-time"> • {formatDateTime(item.startAt)}</span>}
                            {item.endAt && <span className="agenda-time"> → {formatDateTime(item.endAt)}</span>}
                            {item.isDone && <span className="agenda-time"> • ✅ Done</span>}
                        </div>
                        {item.description && <div className="agenda-desc">{item.description}</div>}
                        <div className="agenda-actions">
                            <button type="button" onClick={() => setEditing(true)}>Edit</button>
                            <button type="button" onClick={() => onDelete(item.id)} style={{ marginLeft: 8 }}>Delete</button>
                            <button
                                type="button"
                                onClick={() => onMoveUp(item.id)}
                                disabled={index === 0}
                                style={{ marginLeft: 8 }}
                                aria-label="Move up"
                                title="Move up"
                            >
                                ▲
                            </button>
                            <button
                                type="button"
                                onClick={() => onMoveDown(item.id)}
                                disabled={index === total - 1}
                                style={{ marginLeft: 4 }}
                                aria-label="Move down"
                                title="Move down"
                            >
                                ▼
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="agenda-edit">
                    <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Title"
                    />
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Description (optional)"
                    />
                    <div className="agenda-times">
                        <label>
                            Start{" "}
                            <input
                                type="datetime-local"
                                value={form.startAt}
                                onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                            />
                        </label>
                        <label>
                            End{" "}
                            <input
                                type="datetime-local"
                                value={form.endAt}
                                onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                            />
                        </label>
                    </div>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <input
                            type="checkbox"
                            checked={form.isDone}
                            onChange={(e) => setForm((f) => ({ ...f, isDone: e.target.checked }))}
                        />
                        Done
                    </label>
                    <div className="agenda-actions">
                        <button
                            type="button"
                            onClick={save}
                            disabled={!eventStart || !eventEnd}
                            title={!eventStart || !eventEnd ? "Loading event time window…" : undefined}
                        >
                            Save
                        </button>
                        <button type="button" onClick={() => setEditing(false)} style={{ marginLeft: 8 }}>
                            Cancel
                        </button>
                    </div>
                    {eventStart && eventEnd && (
                        <div className="help" style={{ marginTop: 6 }}>
                            Event window: <strong>{formatDateTime(eventStart)} → {formatDateTime(eventEnd)}</strong>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}

function AgendaReadOnlyRow({ item, index }) {
    return (
        <li className="agenda-row">
            <div className="agenda-line">
                <div className="agenda-dot">{index + 1}</div>
                <div className="agenda-content">
                    <div className="agenda-title">
                        <strong>{item.title}</strong>
                        {item.startAt && <span className="agenda-time"> • {formatDateTime(item.startAt)}</span>}
                        {item.endAt && <span className="agenda-time"> → {formatDateTime(item.endAt)}</span>}
                    </div>
                    {item.description && <div className="agenda-desc">{item.description}</div>}
                </div>
            </div>
        </li>
    );
}

/* ===== 主组件 ===== */
export default function Agenda({ eventId, canEdit }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const dialog = useDialog();
    const toast = (msg, variant = "info") => (dialog ? dialog.toast(msg, variant) : window.alert(msg));
    const ask = async (msg) => (dialog ? await dialog.confirm(msg) : window.confirm(msg));

    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");

    // 事件时间窗（用于校验）
    const [eventStart, setEventStart] = useState(null);
    const [eventEnd, setEventEnd] = useState(null);

    const fetchAgenda = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`${API_BASE_URL}/events/${eventId}/agenda`);
            if (!res.ok) {
                const t = await safeText(res);
                throw new Error(`Load failed (${res.status})\n${t}`);
            }
            const data = await res.json();
            data.sort((a, b) => a.order - b.order);
            setItems(data);
        } catch (e) {
            console.error(e);
            toast(e.message || "Failed to load agenda.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchEventWindow = async () => {
        try {
            const r = await apiFetch(`${API_BASE_URL}/events/${eventId}`);
            if (!r.ok) return;
            const ev = await r.json();
            setEventStart(ev.startAt || null);
            setEventEnd(ev.endAt || null);
        } catch {}
    };

    useEffect(() => {
        fetchAgenda();
        fetchEventWindow();
    }, [eventId]);

    const createItem = async () => {
        if (!newTitle.trim()) {
            toast("Please input a title", "error");
            return;
        }
        try {
            const res = await apiFetch(`${API_BASE_URL}/events/${eventId}/agenda`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            if (!res.ok) {
                const t = await safeText(res);
                throw new Error(`Create failed (${res.status})\n${t}`);
            }
            setNewTitle("");
            setCreating(false);
            await fetchAgenda();
            toast("Created!", "success");
        } catch (e) {
            console.error(e);
            toast(e.message || "Create failed.", "error");
        }
    };

    const updateItem = async (id, patch) => {
        try {
            const res = await apiFetch(`${API_BASE_URL}/events/agenda/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            if (!res.ok && res.status !== 204) {
                const t = await safeText(res);
                throw new Error(`Update failed (${res.status})\n${t}`);
            }
            await fetchAgenda();
            toast("Saved.", "success");
        } catch (e) {
            console.error(e);
            toast(e.message || "Update failed.", "error");
        }
    };

    const deleteItem = async (id) => {
        const ok = await ask("Delete this agenda item?");
        if (!ok) return;
        try {
            const res = await apiFetch(`${API_BASE_URL}/events/agenda/${id}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) {
                const t = await safeText(res);
                throw new Error(`Delete failed (${res.status})\n${t}`);
            }
            const newList = items.filter((x) => x.id !== id).map((x, i) => ({ ...x, order: i }));
            setItems(newList);
            await reorder(newList.map((x) => ({ id: x.id, order: x.order })));
            toast("Deleted.", "success");
        } catch (e) {
            console.error(e);
            toast(e.message || "Delete failed.", "error");
        }
    };

    const reorder = async (pairs) => {
        try {
            const res = await apiFetch(`${API_BASE_URL}/events/${eventId}/agenda/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: pairs }),
            });
            if (!res.ok && res.status !== 204) {
                const t = await safeText(res);
                throw new Error(`Reorder failed (${res.status})\n${t}`);
            }
        } catch (e) {
            console.error(e);
            toast(e.message || "Reorder failed.", "error");
        }
    };

    const moveUp = async (id) => {
        const idx = items.findIndex((x) => x.id === id);
        if (idx <= 0) return;

        const newList = [...items];
        [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
        newList.forEach((x, i) => (x.order = i));
        setItems(newList);

        await reorder(newList.map((x) => ({ id: x.id, order: x.order })));
    };

    const moveDown = async (id) => {
        const idx = items.findIndex((x) => x.id === id);
        if (idx === -1 || idx >= items.length - 1) return;

        const newList = [...items];
        [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
        newList.forEach((x, i) => (x.order = i));
        setItems(newList);

        await reorder(newList.map((x) => ({ id: x.id, order: x.order })));
    };

    if (loading) return <div>Loading agenda…</div>;

    if (!items.length) {
        return (
            <div className="agenda">
                <AgendaEmpty canEdit={canEdit} onCreateFirst={() => { setCreating(true); }} />
                {canEdit && creating && (
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 10,
                            borderRadius: 16,
                            padding: 8,
                            background: "var(--card-bg, #fff)",
                        }}
                    >
                        <input
                            placeholder="Agenda Title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            style={{ flex: 1, borderRadius: 12, paddingLeft: 10 }}
                        />
                        <button type="button" className="btn btn-primary" onClick={createItem}>
                            Create
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="agenda">
            {canEdit && (
                <>
                    {!creating ? (
                        <div style={{ marginBottom: 12 }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => { setCreating(true); }}
                            >
                                + Add item
                            </button>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                margin: "0 0 12px 0",
                                borderRadius: 16,
                                padding: 8,
                                background: "var(--card-bg, #fff)",
                            }}
                        >
                            <input
                                placeholder="Agenda Title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                style={{ flex: 1, borderRadius: 12, paddingLeft: 10 }}
                            />
                            <button type="button" className="btn btn-primary" onClick={createItem}>
                                Create
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                                Cancel
                            </button>
                        </div>
                    )}
                </>
            )}

            <ol className="agenda-list">
                {items.map((it, idx) =>
                    canEdit ? (
                        <AgendaEditorRow
                            key={it.id}
                            item={it}
                            index={idx}
                            total={items.length}
                            onSave={updateItem}
                            onDelete={deleteItem}
                            onMoveUp={moveUp}
                            onMoveDown={moveDown}
                            eventStart={eventStart}
                            eventEnd={eventEnd}
                        />
                    ) : (
                        <AgendaReadOnlyRow key={it.id} item={it} index={idx} />
                    )
                )}
            </ol>
        </div>
    );
}
