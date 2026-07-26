import React, { useState } from "react";
import CountUp from "../components/CountUp";
import { cardHoverProps } from "../utils/cardHover";
import { AUTOMATION_RULES } from "../data/mockData";
import useBreakpoint from "../hooks/useBreakpoint";

export default function Automations() {
  const { isMobile } = useBreakpoint();
  const [rules, setRules] = useState(AUTOMATION_RULES);

  const activeRules = rules.filter(r => r.active);
  const totalTriggers = rules.reduce((sum, r) => sum + r.timesTriggered, 0);
  const lastTriggered = rules.reduce((latest, r) => {
    if (!latest) return r.lastTriggered;
    return new Date(r.lastTriggered) > new Date(latest) ? r.lastTriggered : latest;
  }, null);

  const formatDate = (str) => {
    if (!str) return "--";
    const d = new Date(str);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleToggle = (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", trigger: "", action: "" });

  const handleCreateRule = () => {
    if (!newRule.name.trim() || !newRule.trigger.trim() || !newRule.action.trim()) return;
    const rule = {
      id: Date.now(),
      name: newRule.name.trim(),
      trigger: newRule.trigger.trim(),
      action: newRule.action.trim(),
      active: true,
      timesTriggered: 0,
      lastTriggered: null,
    };
    setRules(prev => [rule, ...prev]);
    setNewRule({ name: "", trigger: "", action: "" });
    setShowForm(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>
          Automations
        </div>
        <button onClick={() => setShowForm(true)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 18px", borderRadius: "var(--radius)", border: "none",
          background: "var(--cyan)", color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "Inter"
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Rule
        </button>
      </div>

      {/* Status Bar -- a single console strip instead of three stat cards: a live
          pulsing dot for Active Rules (the same "is this fine right now" device
          DESIGN.md calls out elsewhere), Total Triggers as the one true stat number,
          Last Triggered demoted to a caption since a date doesn't read well as a stat digit. */}
      <div {...cardHoverProps} style={{
        display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 12 : 28, background: "var(--card)", border: "1px solid var(--border2)", borderRadius: "var(--radius)",
        padding: "14px 22px", boxShadow: "var(--shadow)", marginBottom: 26,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ position: "relative", display: "flex", width: 9, height: 9 }}>
            {activeRules.length > 0 && (
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--green)", animation: "pulse-dot 1.8s ease-out infinite" }} />
            )}
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: activeRules.length > 0 ? "var(--green)" : "var(--text3)" }} />
          </span>
          <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}><CountUp value={activeRules.length} /> active</span>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>of {rules.length} rule{rules.length === 1 ? "" : "s"}</span>
        </div>

        {!isMobile && <div style={{ width: 1, height: 24, background: "var(--border)" }} />}

        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--cyan)", letterSpacing: -0.3 }}><CountUp value={totalTriggers} /></span>
          <span style={{ fontSize: 12.5, color: "var(--text3)" }}>total triggers</span>
        </div>

        {!isMobile && <div style={{ width: 1, height: 24, background: "var(--border)" }} />}

        <div style={{ fontSize: 12.5, color: "var(--text3)", marginLeft: isMobile ? 0 : "auto" }}>
          Last triggered <span style={{ color: "var(--text2)", fontWeight: 500 }}>{formatDate(lastTriggered)}</span>
        </div>
      </div>

      {/* Rule Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rules.map(rule => (
          <div key={rule.id} style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "18px 22px", boxShadow: "var(--shadow)",
            opacity: rule.active ? 1 : 0.7,
            transition: "opacity 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle(rule.id)}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none",
                  background: rule.active ? "var(--green)" : "var(--border2)",
                  position: "relative", cursor: "pointer", flexShrink: 0,
                  transition: "background 0.2s"
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: rule.active ? 21 : 3,
                  width: 16, height: 16, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                }} />
              </button>

              {/* Rule Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Rule Name */}
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
                  {rule.name}
                </div>

                {/* Visual Flow */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {/* WHEN badge */}
                  <span style={{
                    padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: "color-mix(in srgb, var(--amber) 15%, transparent)", color: "var(--amber)",
                    letterSpacing: 0.5, textTransform: "uppercase"
                  }}>
                    WHEN
                  </span>

                  {/* Trigger text */}
                  <span style={{
                    fontSize: 12, color: "var(--text2)", padding: "4px 10px",
                    background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)"
                  }}>
                    {rule.trigger}
                  </span>

                  {/* Arrow */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>

                  {/* THEN badge */}
                  <span style={{
                    padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: "color-mix(in srgb, var(--cyan) 15%, transparent)", color: "var(--cyan)",
                    letterSpacing: 0.5, textTransform: "uppercase"
                  }}>
                    THEN
                  </span>

                  {/* Action text */}
                  <span style={{
                    fontSize: 12, color: "var(--text2)", padding: "4px 10px",
                    background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)"
                  }}>
                    {rule.action}
                  </span>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, fontSize: 11, color: "var(--text3)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Triggered {rule.timesTriggered} times
                  </span>
                  <span>Last: {formatDate(rule.lastTriggered)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Rule Modal */}
      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, maxWidth: "92vw", maxHeight: "90dvh", overflowY: "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? 20 : 28, zIndex: 9999, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", boxSizing: "border-box" }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>New Automation Rule</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Rule name</label>
                <input placeholder="e.g. Stale deal follow-up" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} autoFocus
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>
                  <span style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: "color-mix(in srgb, var(--amber) 15%, transparent)", color: "var(--amber)", marginRight: 6 }}>WHEN</span>
                  Trigger condition
                </label>
                <input placeholder="e.g. Deal has no activity for 14+ days" value={newRule.trigger} onChange={e => setNewRule({ ...newRule, trigger: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>
                  <span style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: "color-mix(in srgb, var(--cyan) 15%, transparent)", color: "var(--cyan)", marginRight: 6 }}>THEN</span>
                  Action to perform
                </label>
                <input placeholder="e.g. Create task for deal owner + send notification" value={newRule.action} onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, fontFamily: "Inter", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateRule}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--cyan)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer", opacity: (newRule.name.trim() && newRule.trigger.trim() && newRule.action.trim()) ? 1 : 0.5 }}>Create Rule</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
