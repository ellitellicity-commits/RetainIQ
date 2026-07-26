import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command } from "cmdk";
import { QUICK_ACTIONS } from "../data/mockData";

const SEARCHABLE = [
  { type: "client", label: "TD Bank", subtitle: "Client • Negotiation • $150K", page: "customers" },
  { type: "client", label: "Bell Canada", subtitle: "Client • Negotiation • $520K", page: "customers" },
  { type: "client", label: "RBC Bank", subtitle: "Client • Quote Sent • $200K", page: "customers" },
  { type: "client", label: "Loblaw Companies", subtitle: "Client • Demo • $180K", page: "customers" },
  { type: "client", label: "Sun Life Financial", subtitle: "Client • Quote Sent • $340K", page: "customers" },
  { type: "contact", label: "Aisha Khan", subtitle: "Contact • CFO at TD Bank", page: "contacts" },
  { type: "contact", label: "Marcus Reid", subtitle: "Contact • VP Technology at RBC", page: "contacts" },
  { type: "contact", label: "James Morrison", subtitle: "Contact • VP Security at Bell Canada", page: "contacts" },
  { type: "contact", label: "Priya Sharma", subtitle: "Contact • Dir. Engineering at Loblaw", page: "contacts" },
  { type: "deal", label: "TD Bank Enterprise Expansion", subtitle: "Deal • Negotiation • $150K", page: "journey" },
  { type: "deal", label: "Bell Canada Security Platform", subtitle: "Deal • Negotiation • $520K", page: "journey" },
  { type: "deal", label: "RBC Bank Renewal", subtitle: "Deal • Quote Sent • $200K", page: "journey" },
  { type: "page", label: "Dashboard", subtitle: "Navigate to Dashboard", page: "dashboard" },
  { type: "page", label: "Pipeline", subtitle: "Navigate to Pipeline", page: "journey" },
  { type: "page", label: "Analytics", subtitle: "Navigate to Analytics", page: "alerts" },
  { type: "page", label: "AI Co-pilot", subtitle: "Navigate to AI Co-pilot", page: "copilot" },
  { type: "page", label: "Tasks", subtitle: "Navigate to Tasks", page: "tasks" },
  { type: "page", label: "Email Sequences", subtitle: "Navigate to Sequences", page: "sequences" },
  { type: "page", label: "Automations", subtitle: "Navigate to Automations", page: "automations" },
];

const TYPE_ORDER = ["client", "contact", "deal", "page"];
const TYPE_LABELS = {
  client: "Clients",
  contact: "Contacts",
  deal: "Deals",
  page: "Pages",
};

function getIcon(type, iconField) {
  const iconStyle = {
    width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--text2)", flexShrink: 0,
  };

  if (type === "action") {
    switch (iconField) {
      case "plus": return <span style={iconStyle}>+</span>;
      case "check": return (<span style={iconStyle}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 7 12 13 4" /></svg></span>);
      case "edit": return (<span style={iconStyle}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3L5 14H2v-3L11 2z" /></svg></span>);
      case "sparkle": return (<span style={{ ...iconStyle, color: "var(--cyan)" }}><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 0z" /></svg></span>);
      case "search": return (<span style={iconStyle}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></svg></span>);
      default: return <span style={iconStyle}>*</span>;
    }
  }
  if (type === "client") return (<span style={iconStyle}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="10" height="12" rx="1" /><line x1="6" y1="5" x2="10" y2="5" /><line x1="6" y1="8" x2="10" y2="8" /><line x1="6" y1="11" x2="8" y2="11" /></svg></span>);
  if (type === "contact") return (<span style={iconStyle}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3 3-5 6-5s6 2 6 5" /></svg></span>);
  if (type === "deal") return (<span style={iconStyle}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="1" x2="8" y2="15" /><path d="M11 4H6.5a2.5 2.5 0 000 5h3a2.5 2.5 0 010 5H5" /></svg></span>);
  if (type === "page") return (<span style={iconStyle}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="8" x2="12" y2="8" /><polyline points="9 5 12 8 9 11" /></svg></span>);
  return <span style={iconStyle}>*</span>;
}

const kbdStyle = { fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text3)", fontFamily: "inherit" };

function Row({ type, icon, label, subtitle, onSelect }) {
  return (
    <Command.Item value={label} onSelect={onSelect} className="riq-cmdk-item"
      style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      {getIcon(type, icon)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
      </div>
      <kbd className="riq-cmdk-kbd" style={{ ...kbdStyle, flexShrink: 0, visibility: "hidden" }}>↵</kbd>
    </Command.Item>
  );
}

// Simple substring match (case-insensitive) instead of cmdk's default fuzzy
// scorer, to keep the exact matching behavior this palette shipped with.
const substringFilter = (value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0);

export default function CommandPalette({ open, onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const select = (item) => {
    if (item.id) onNavigate({ action: item.id });
    else if (item.page) onNavigate(item.page);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh", background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 620, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "60vh" }}
          >
            <Command shouldFilter filter={substringFilter} loop style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="9" cy="9" r="6" /><line x1="14" y1="14" x2="18" y2="18" />
                </svg>
                <Command.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search or type a command..."
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 16, color: "var(--text)", fontFamily: "inherit" }}
                />
                <kbd style={kbdStyle}>ESC</kbd>
              </div>

              <Command.List style={{ overflowY: "auto", padding: "8px 0", flex: 1 }}>
                <Command.Empty style={{ padding: "32px 20px", textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
                  No results found
                </Command.Empty>

                {!query.trim() ? (
                  <Command.Group heading="Actions">
                    {QUICK_ACTIONS.map((a) => (
                      <Row key={a.id} type="action" icon={a.icon} label={a.label}
                        subtitle={a.shortcut ? `Shortcut: ${a.shortcut}` : ""}
                        onSelect={() => select({ id: a.id })} />
                    ))}
                  </Command.Group>
                ) : (
                  TYPE_ORDER.map((type) => {
                    const items = SEARCHABLE.filter((i) => i.type === type);
                    if (!items.length) return null;
                    return (
                      <Command.Group key={type} heading={TYPE_LABELS[type]}>
                        {items.map((item) => (
                          <Row key={item.label} type={item.type} label={item.label} subtitle={item.subtitle}
                            onSelect={() => select(item)} />
                        ))}
                      </Command.Group>
                    );
                  })
                )}
              </Command.List>

              <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><kbd style={{ padding: "1px 5px", borderRadius: 3, background: "var(--bg)", border: "1px solid var(--border2)", fontFamily: "inherit" }}>↑↓</kbd>navigate</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><kbd style={{ padding: "1px 5px", borderRadius: 3, background: "var(--bg)", border: "1px solid var(--border2)", fontFamily: "inherit" }}>↵</kbd>select</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><kbd style={{ padding: "1px 5px", borderRadius: 3, background: "var(--bg)", border: "1px solid var(--border2)", fontFamily: "inherit" }}>esc</kbd>close</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
