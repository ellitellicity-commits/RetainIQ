import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DEAL_INSIGHTS, NEXT_BEST_ACTIONS, AUTO_FOLLOWUPS } from "../data/mockData";
import useBreakpoint from "../hooks/useBreakpoint";

const ICONS = {
  sparkle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  lightning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  paperPlane: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

const ACTION_ICONS = {
  call: ICONS.phone,
  email: ICONS.mail,
  meeting: ICONS.calendar,
  task: ICONS.check,
};

function getImpactColor(score) {
  if (score >= 80) return "var(--green)";
  if (score >= 60) return "var(--amber)";
  return "var(--blue)";
}

function getPriorityColor(priority) {
  switch (priority) {
    case "critical":
      return "var(--red)";
    case "high":
      return "var(--amber)";
    case "medium":
      return "var(--blue)";
    default:
      return "var(--text3)";
  }
}

function getSeverityColor(severity) {
  switch (severity) {
    case "critical":
      return "var(--red)";
    case "high":
      return "var(--amber)";
    case "medium":
      return "var(--amber)";
    case "low":
      return "var(--blue)";
    default:
      return "var(--text3)";
  }
}

function getUrgencyColor(urgency) {
  switch (urgency) {
    case "critical":
      return "var(--red)";
    case "high":
      return "var(--amber)";
    case "medium":
      return "var(--blue)";
    default:
      return "var(--text3)";
  }
}

function SectionHeader({ icon, title, expanded, onToggle, count }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "12px 16px",
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        color: "var(--text)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.02em",
        textAlign: "left",
      }}
    >
      <span style={{ color: "var(--cyan)", display: "flex", alignItems: "center" }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{title}</span>
      {count !== undefined && (
        <span
          style={{
            background: "var(--hover2)",
            color: "var(--text2)",
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 10,
          }}
        >
          {count}
        </span>
      )}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          transition: "transform 0.2s",
          transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
        }}
      >
        {ICONS.chevronDown}
      </span>
    </button>
  );
}

function PriorityActionsSection() {
  const [expanded, setExpanded] = useState(true);
  const actions = NEXT_BEST_ACTIONS.slice(0, 5);

  return (
    <div>
      <SectionHeader
        icon={ICONS.lightning}
        title="Priority Actions"
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        count={actions.length}
      />
      {expanded && (
        <div style={{ padding: "8px 12px" }}>
          {actions.map((action) => (
            <div
              key={action.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                marginBottom: 6,
                background: "var(--bg)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                transition: "border-color 0.15s",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius)",
                  background: "var(--hover2)",
                  color: "var(--cyan)",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {ACTION_ICONS[action.type] || ICONS.check}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}
                  >
                    {action.title}
                  </span>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: getPriorityColor(action.priority),
                      flexShrink: 0,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text2)",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  {action.company}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.4,
                  }}
                >
                  {action.reason}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: getImpactColor(action.impact),
                  background: `color-mix(in srgb, ${getImpactColor(action.impact)} 12%, transparent)`,
                  padding: "2px 7px",
                  borderRadius: 10,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {action.impact}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DealAlertsSection() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <SectionHeader
        icon={ICONS.warning}
        title="Deal Alerts"
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        count={DEAL_INSIGHTS.length}
      />
      {expanded && (
        <div style={{ padding: "8px 12px" }}>
          {DEAL_INSIGHTS.map((insight) => (
            <div
              key={insight.id}
              style={{
                padding: "10px 12px",
                marginBottom: 6,
                background: "var(--bg)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: getSeverityColor(insight.severity),
                    background: `color-mix(in srgb, ${getSeverityColor(insight.severity)} 12%, transparent)`,
                    padding: "2px 7px",
                    borderRadius: 10,
                  }}
                >
                  {insight.severity}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text)",
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {insight.title}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}
              >
                {insight.reason}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text2)",
                  padding: "8px 10px",
                  background: "color-mix(in srgb, var(--cyan) 6%, var(--bg))",
                  borderRadius: "var(--radius)",
                  borderLeft: "2px solid var(--cyan)",
                  lineHeight: 1.5,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--cyan)", fontSize: 10, textTransform: "uppercase", display: "block", marginBottom: 2 }}>
                  AI Recommendation
                </span>
                {insight.recommendation}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>Confidence:</span>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: "var(--hover2)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${insight.confidence * 100}%`,
                      height: "100%",
                      background: "var(--cyan)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text2)" }}>
                  {Math.round(insight.confidence * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadyToSendSection() {
  const { isMobile } = useBreakpoint();
  const [expanded, setExpanded] = useState(true);
  const [followups, setFollowups] = useState(AUTO_FOLLOWUPS);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ subject: "", body: "" });
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState([]);

  const handleEdit = (followup) => {
    setEditingId(followup.id);
    setEditDraft({ subject: followup.subject, body: followup.fullDraft });
  };

  const handleSaveEdit = () => {
    setFollowups(prev => prev.map(f => f.id === editingId ? { ...f, subject: editDraft.subject, fullDraft: editDraft.body, preview: editDraft.body.split("\n").find(l => l.trim()) || f.preview } : f));
    setEditingId(null);
  };

  const handleSend = (id) => {
    setSendingId(id);
    setTimeout(() => {
      setSendingId(null);
      setSentIds(prev => [...prev, id]);
    }, 1200);
  };

  const visibleFollowups = followups.filter(f => !sentIds.includes(f.id));

  return (
    <div>
      <SectionHeader
        icon={ICONS.paperPlane}
        title="Ready to Send"
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        count={visibleFollowups.length}
      />
      {expanded && (
        <div style={{ padding: "8px 12px" }}>
          {visibleFollowups.map((followup) => (
            <div
              key={followup.id}
              style={{
                padding: "10px 12px",
                marginBottom: 6,
                background: "var(--bg)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text)",
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {followup.dealName}
                </span>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: getUrgencyColor(followup.urgency),
                    flexShrink: 0,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text2)",
                  marginBottom: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {followup.subject}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  lineHeight: 1.5,
                  marginBottom: 10,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {followup.preview}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleSend(followup.id)}
                  disabled={sendingId === followup.id}
                  style={{
                    padding: "5px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: "var(--radius)",
                    border: "none",
                    background: sendingId === followup.id ? "var(--green)" : "var(--cyan)",
                    color: "#fff",
                    cursor: sendingId === followup.id ? "default" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {sendingId === followup.id ? "Sending..." : "Send"}
                </button>
                <button
                  onClick={() => handleEdit(followup)}
                  style={{
                    padding: "5px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border2)",
                    background: "transparent",
                    color: "var(--text2)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
          {sentIds.length > 0 && (
            <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--green)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              {ICONS.check}
              {sentIds.length} email{sentIds.length > 1 ? "s" : ""} sent successfully
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <>
          <div onClick={() => setEditingId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10001 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", zIndex: 10002 }}>
            <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Edit Follow-up Email</div>
                <button onClick={() => setEditingId(null)} style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", padding: 4 }}>
                  {ICONS.close}
                </button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block", fontWeight: 500 }}>To: {followups.find(f => f.id === editingId)?.dealName}</label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block", fontWeight: 500 }}>Subject</label>
                <input value={editDraft.subject} onChange={e => setEditDraft({ ...editDraft, subject: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ padding: "0 24px", flex: 1, overflowY: "auto" }}>
              <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block", fontWeight: 500 }}>Body</label>
              <textarea value={editDraft.body} onChange={e => setEditDraft({ ...editDraft, body: e.target.value })}
                style={{ width: "100%", minHeight: 220, padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", lineHeight: 1.6, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, padding: "16px 24px", justifyContent: "flex-end", borderTop: "1px solid var(--border)", marginTop: 16 }}>
              <button onClick={() => setEditingId(null)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, fontFamily: "Inter", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveEdit}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--cyan)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer" }}>Save Changes</button>
            </div>
          </div>
        </>
      )}

      {/* Send Confirmation Modal */}
      {sendingId && (
        <div style={{ position: "fixed", bottom: 24, right: isMobile ? 24 : 380, left: isMobile ? 24 : "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 10001, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 18, height: 18, border: "2px solid var(--cyan)", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>Sending email to {followups.find(f => f.id === sendingId)?.dealName}...</span>
        </div>
      )}
    </div>
  );
}

export default function AICopilotPanel({ open, onClose }) {
  const { isMobile } = useBreakpoint();
  return (
    <AnimatePresence>
      {open && (
        <>
          {isMobile && (
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998 }} />
          )}
        <motion.div
          initial={{ x: isMobile ? 0 : 360, y: isMobile ? 40 : 0, opacity: isMobile ? 0 : 1 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: isMobile ? 0 : 360, y: isMobile ? 40 : 0, opacity: isMobile ? 0 : 1 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          style={isMobile ? {
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100dvh",
            zIndex: 9999,
            background: "var(--card)",
            borderLeft: "none",
            boxShadow: "none",
            display: "flex",
            flexDirection: "column",
          } : {
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: 360,
            zIndex: 1000,
            background: "var(--card)",
            borderLeft: "1px solid var(--border)",
            boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.18)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 16px 14px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "var(--brand-bright)", display: "flex", alignItems: "center" }}>
              {ICONS.sparkle}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text)",
                flex: 1,
                letterSpacing: "-0.01em",
              }}
            >
              AI Co-pilot
            </span>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: "var(--radius)",
                border: "none",
                background: "transparent",
                color: "var(--text3)",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover2)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text3)";
              }}
            >
              {ICONS.close}
            </button>
          </div>

          {/* Scrollable content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <PriorityActionsSection />
            <DealAlertsSection />
            <ReadyToSendSection />
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--border)",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--text3)",
                letterSpacing: "0.03em",
                opacity: 0.7,
              }}
            >
              Powered by AI
            </span>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
