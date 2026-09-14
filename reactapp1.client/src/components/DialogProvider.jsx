// src/components/DialogProvider.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

const DialogCtx = createContext(null);
export function useDialog() { return useContext(DialogCtx); }

export function DialogProvider({ children }) {
    const [toast, setToast] = useState(null);        // { text, variant }
    const [confirm, setConfirm] = useState(null);    // { text, resolve }
    const [prompt, setPrompt] = useState(null);      // { text, value, resolve }
    const [alertDlg, setAlertDlg] = useState(null);  // { title, content (string|JSX) }

    const api = useMemo(() => ({
        toast(text, variant = "info", ms = 2200) {
            setToast({ text, variant });
            clearTimeout(api._t);
            api._t = setTimeout(() => setToast(null), ms);
        },
        confirm(text) {
            return new Promise(resolve => setConfirm({ text, resolve }));
        },
        prompt(text, value = "") {
            return new Promise(resolve => setPrompt({ text, value, resolve }));
        },
        /** ✅ 新增：信息弹窗（只有 OK），支持 JSX 内容，适合长文案/列表 */
        alertBox(title, content) {
            setAlertDlg({ title: String(title || "Notice"), content });
        },
    }), []);

    // 用统一样式覆盖原生弹窗（alert 仍保持短提示 → toast）
    useEffect(() => {
        const orig = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
        window.alert   = (msg)         => api.toast(String(msg), "info");
        window.confirm = (msg)         => api.confirm(String(msg));
        window.prompt  = (msg, def="") => api.prompt(String(msg), def);
        return () => Object.assign(window, orig);
    }, [api]);

    // 导航时关闭对话框
    useEffect(() => {
        const closeAll = () => { setConfirm(null); setPrompt(null); setAlertDlg(null); };
        window.addEventListener("popstate", closeAll);
        window.addEventListener("hashchange", closeAll);
        return () => {
            window.removeEventListener("popstate", closeAll);
            window.removeEventListener("hashchange", closeAll);
        };
    }, []);

    return (
        <DialogCtx.Provider value={api}>
            {children}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            {confirm && (
                <Confirm
                    text={confirm.text}
                    onCancel={() => { confirm.resolve(false); setConfirm(null); }}
                    onOk={() => { confirm.resolve(true); setConfirm(null); }}
                />
            )}
            {prompt && (
                <Prompt
                    text={prompt.text}
                    defaultValue={prompt.value}
                    onCancel={() => { prompt.resolve(null); setPrompt(null); }}
                    onOk={(v) => { prompt.resolve(v); setPrompt(null); }}
                />
            )}
            {alertDlg && (
                <Alert
                    title={alertDlg.title}
                    onOk={() => setAlertDlg(null)}
                >
                    {alertDlg.content}
                </Alert>
            )}
        </DialogCtx.Provider>
    );
}

/* --- Shared layer --- */
function Layer({ children, role="dialog" }) {
    return (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.38)", zIndex:100 }} role="presentation">
            <div role={role} aria-modal="true" style={{
                position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)",
                minWidth:320, maxWidth:"92vw", background:"#fff",
                border:"1px solid var(--edge)", borderRadius:16, boxShadow:"var(--shadow)", padding:16
            }}>
                {children}
            </div>
        </div>
    );
}

/* --- Confirm --- */
function Confirm({ text, onOk, onCancel }) {
    return (
        <Layer>
            <div style={{ fontWeight:700, marginBottom:8 }}>Please confirm</div>
            <div style={{ color:"#475569", marginBottom:14, whiteSpace:"pre-wrap" }}>{text}</div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button className="btn btn-ghost" onClick={onCancel}
                        style={{ padding:"10px 14px", borderRadius:9999, border:"1px solid var(--edge)" }}>Cancel</button>
                <button className="btn btn-primary" onClick={onOk}
                        style={{ padding:"10px 14px", borderRadius:9999 }}>OK</button>
            </div>
        </Layer>
    );
}

/* --- Prompt --- */
function Prompt({ text, defaultValue="", onOk, onCancel }) {
    const [val, setVal] = useState(defaultValue);
    return (
        <Layer>
            <div style={{ fontWeight:700, marginBottom:8 }}>Input</div>
            <div style={{ color:"#475569", marginBottom:10 }}>{text}</div>
            <input className="input" value={val} onChange={e=>setVal(e.target.value)} style={{ width:"100%", marginBottom:14 }} />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button className="btn btn-ghost" onClick={onCancel}
                        style={{ padding:"10px 14px", borderRadius:9999, border:"1px solid var(--edge)" }}>Cancel</button>
                <button className="btn btn-primary" onClick={()=>onOk(val)}
                        style={{ padding:"10px 14px", borderRadius:9999 }}>OK</button>
            </div>
        </Layer>
    );
}

/* --- ✅ Alert (Info-only) --- */
function Alert({ title="Notice", children, onOk }) {
    return (
        <Layer>
            <div style={{ fontWeight:800, marginBottom:8 }}>{title}</div>
            <div style={{
                color:"#475569",
                marginBottom:14,
                maxHeight: "48vh",
                overflow: "auto",
                lineHeight: 1.55,
                whiteSpace: "normal"
            }}>
                {/* 传入的 JSX / 文本 */}
                {typeof children === "string"
                    ? <div style={{ whiteSpace:"pre-wrap" }}>{children}</div>
                    : children}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button className="btn btn-primary" onClick={onOk}
                        style={{ padding:"10px 14px", borderRadius:9999 }}>OK</button>
            </div>
        </Layer>
    );
}

/* --- Toast --- */
function Toast({ text, variant="info", onClose }) {
    const palette = variant === "success"
        ? { bg:"#f0fdf4", border:"#bbf7d0", fg:"#166534" }
        : variant === "error"
            ? { bg:"#fef2f2", border:"#fecaca", fg:"#991b1b" }
            : { bg:"#eff6ff", border:"#bfdbfe", fg:"#1e3a8a" };
    return (
        <div role="status" aria-live="polite" style={{
            position:"fixed", right:24, bottom:24, zIndex:100,
            display:"inline-flex", alignItems:"center", gap:10,
            padding:"10px 14px", borderRadius:14,
            background:palette.bg, color:palette.fg, border:`1px solid ${palette.border}`,
            boxShadow:"var(--shadow)"
        }}>
            <span style={{ fontWeight:700 }}>{text}</span>
            <button onClick={onClose} aria-label="Close"
                    style={{ marginLeft:6, border:"none", background:"transparent", color:palette.fg, cursor:"pointer" }}>✕</button>
        </div>
    );
}
