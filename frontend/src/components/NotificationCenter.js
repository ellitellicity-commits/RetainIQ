import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function getRelativeTime(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffSec = Math.floor((now - then) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) return `${Math.floor(diffDay / 30)} months ago`;
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffHr > 0) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffMin > 0) return `${diffMin} min ago`;
  return "just now";
}

export default function NotificationCenter({ API }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const loadNotifications = () => {
      fetch(`${API}/api/db/notifications`).then(r => r.json()).then(d => setNotifications(Array.isArray(d) ? d : [])).catch(() => {});
    };
    loadNotifications();
    // Notifications can be created from many places (this drawer, the Pipeline
    // board, contact edits, quotes) with no single frontend choke point to hook
    // an event into -- several fire from backend side effects of an existing
    // PATCH/POST, not a dedicated "log this" call. Polling is what keeps the
    // bell honest without every future call site needing to remember to signal it.
    const id = setInterval(loadNotifications, 15000);
    return () => clearInterval(id);
  }, [API]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch(`${API}/api/db/notifications/mark-all-read`, { method: "PATCH" }).catch(() => {});
  };

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    fetch(`${API}/api/db/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const iconForType = (type) => {
    switch (type) {
      case "task_due": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
      case "deal_stalled": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
      case "ai_insight": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2"><path d="M12 2L9 9l-7 1 5 5-1.5 7L12 18.5l6.5 3.5L17 15l5-5-7-1z"/></svg>;
      case "deal_won": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
      case "mention": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.9 7.9"/></svg>;
      case "email": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
      case "call": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>;
      case "meeting": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
      case "deal_stage_change": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
      case "contact_added": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.8 19c0-2.9 2.3-5 5.2-5s5.2 2.1 5.2 5"/><line x1="17" y1="9" x2="17" y2="15"/><line x1="14" y1="12" x2="20" y2="12"/></svg>;
      case "contact_updated": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.8 19c0-2.9 2.3-5 5.2-5s5.2 2.1 5.2 5"/><path d="M16.5 5.5a3 3 0 0 1 0 5.4"/></svg>;
      case "contact_deleted": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.8 19c0-2.9 2.3-5 5.2-5s5.2 2.1 5.2 5"/><line x1="14" y1="9" x2="20" y2="15"/><line x1="20" y1="9" x2="14" y2="15"/></svg>;
      case "quote_created": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></svg>;
      case "quote_sent": return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 14 11 16 15 12"/></svg>;
      default: return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: "transparent", border: "none", color: "var(--text2)", cursor: "pointer", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", position: "relative" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--hover2)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "min(360px, calc(100vw - 24px))", maxHeight: 480, overflowY: "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", zIndex: 1001 }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
              {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 12, color: "var(--brand-bright)", cursor: "pointer", background: "none", border: "none", fontFamily: "Inter", fontWeight: 500 }}>Mark all read</button>}
            </div>
            <div>
              {notifications.length === 0 && (
                <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>No notifications yet.</div>
              )}
              {notifications.map(n => (
                <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-start", background: n.read ? "transparent" : "var(--cyan-dim)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (n.read) e.currentTarget.style.background = "var(--hover2)"; }}
                  onMouseLeave={e => { if (n.read) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ marginTop: 2 }}>{iconForType(n.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: "var(--text)", marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>{getRelativeTime(n.created_at)}</div>
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand-bright)", marginTop: 6, flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
