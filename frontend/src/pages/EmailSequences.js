import React, { useState } from "react";
import CountUp from "../components/CountUp";
import { cardHoverProps } from "../utils/cardHover";
import { EMAIL_SEQUENCES } from "../data/mockData";
import useBreakpoint from "../hooks/useBreakpoint";

export default function EmailSequences() {
  const { isMobile } = useBreakpoint();
  const [sequences, setSequences] = useState(EMAIL_SEQUENCES);
  const [showForm, setShowForm] = useState(false);
  const [newSeq, setNewSeq] = useState({ name: "", steps: [{ day: 0, type: "email", subject: "" }] });

  const handleAddStep = () => {
    const lastDay = newSeq.steps.length > 0 ? newSeq.steps[newSeq.steps.length - 1].day : 0;
    setNewSeq({ ...newSeq, steps: [...newSeq.steps, { day: lastDay + 3, type: "email", subject: "" }] });
  };

  const handleUpdateStep = (idx, field, value) => {
    const steps = [...newSeq.steps];
    steps[idx] = { ...steps[idx], [field]: field === "day" ? parseInt(value) || 0 : value };
    setNewSeq({ ...newSeq, steps });
  };

  const handleRemoveStep = (idx) => {
    if (newSeq.steps.length <= 1) return;
    setNewSeq({ ...newSeq, steps: newSeq.steps.filter((_, i) => i !== idx) });
  };

  const handleCreateSequence = () => {
    if (!newSeq.name.trim() || newSeq.steps.some(s => !s.subject.trim())) return;
    const seq = {
      id: Date.now(),
      name: newSeq.name.trim(),
      status: "active",
      enrolled: 0,
      completed: 0,
      replied: 0,
      steps: newSeq.steps.map(s => ({ ...s, status: "scheduled", openRate: null, replyRate: null })),
    };
    setSequences(prev => [seq, ...prev]);
    setNewSeq({ name: "", steps: [{ day: 0, type: "email", subject: "" }] });
    setShowForm(false);
  };
  const activeSequences = sequences.filter(s => s.status === "active");
  const totalEnrolled = sequences.reduce((sum, s) => sum + s.enrolled, 0);
  const avgReplyRate = (() => {
    let total = 0, count = 0;
    sequences.forEach(s => {
      s.steps.forEach(step => {
        if (step.replyRate != null) { total += step.replyRate; count++; }
      });
    });
    return count > 0 ? Math.round(total / count) : 0;
  })();

  const stats = [
    { label: "Active Sequences", value: activeSequences.length, color: "var(--green)" },
    { label: "Total Enrolled", value: totalEnrolled, color: "var(--blue)" },
  ];

  const stepStatusColor = (status) => {
    switch (status) {
      case "sent": return "var(--green)";
      case "pending": return "var(--blue)";
      case "scheduled": return "var(--text3)";
      default: return "var(--text3)";
    }
  };

  const stepStatusBg = (status) => {
    switch (status) {
      case "sent": return "var(--green)";
      case "pending": return "transparent";
      case "scheduled": return "transparent";
      default: return "transparent";
    }
  };

  const stepBorder = (status) => {
    switch (status) {
      case "sent": return "2px solid var(--green)";
      case "pending": return "2px solid var(--blue)";
      case "scheduled": return "2px solid var(--text3)";
      default: return "2px solid var(--text3)";
    }
  };

  const statusBadge = (status) => {
    const isActive = status === "active";
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: isActive ? "color-mix(in srgb, var(--green) 14%, transparent)" : "color-mix(in srgb, var(--amber) 14%, transparent)",
        color: isActive ? "var(--green)" : "var(--amber)",
        textTransform: "capitalize"
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "var(--green)" : "var(--amber)" }} />
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>
          Email Sequences
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
          Create Sequence
        </button>
      </div>

      {/* Stats Strip -- one instrument cluster instead of three separate cards, echoing
          the circular step-tracker motif below with a reply-rate ring. */}
      <div {...cardHoverProps} style={{
        display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center",
        background: "var(--card)", border: "1px solid var(--border2)", borderRadius: "var(--radius)",
        padding: isMobile ? "18px 20px" : "10px 8px", boxShadow: "var(--shadow)", marginBottom: 26, gap: isMobile ? 16 : 0,
      }}>
        {stats.slice(0, 2).map((s, i) => (
          <React.Fragment key={s.label}>
            <div style={{ flex: 1, padding: isMobile ? 0 : "10px 22px" }}>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 600, color: s.color, letterSpacing: -0.3 }}><CountUp value={s.value} /></div>
            </div>
            {!isMobile && <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />}
          </React.Fragment>
        ))}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: isMobile ? 0 : "10px 22px" }}>
          <svg width="46" height="46" viewBox="0 0 46 46" style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
            <circle cx="23" cy="23" r="19" fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle cx="23" cy="23" r="19" fill="none" stroke="var(--cyan)" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(avgReplyRate / 100) * 2 * Math.PI * 19} ${2 * Math.PI * 19}`} />
          </svg>
          <div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4, fontWeight: 500 }}>Avg Reply Rate</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--cyan)", letterSpacing: -0.3 }}><CountUp value={avgReplyRate} format={(v) => Math.round(v) + "%"} /></div>
          </div>
        </div>
      </div>

      {/* Sequence Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {sequences.map(seq => (
          <div key={seq.id} style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "20px 24px", boxShadow: "var(--shadow)"
          }}>
            {/* Card Header */}
            <div style={{
              display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between", gap: isMobile ? 10 : 0, marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{seq.name}</div>
                {statusBadge(seq.status)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--text3)" }}>
                <span><strong style={{ color: "var(--text2)" }}>{seq.enrolled}</strong> enrolled</span>
                <span><strong style={{ color: "var(--text2)" }}>{seq.completed}</strong> completed</span>
              </div>
            </div>

            {/* Visual Step Timeline */}
            <div style={{ overflowX: "auto", padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minWidth: "fit-content" }}>
                {seq.steps.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start" }}>
                    {/* Step Node */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 120 }}>
                      {/* Circle */}
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        border: stepBorder(step.status),
                        background: stepStatusBg(step.status),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {step.type === "email" ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={step.status === "sent" ? "#fff" : stepStatusColor(step.status)} strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={step.status === "sent" ? "#fff" : stepStatusColor(step.status)} strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* Day Label */}
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", marginTop: 8 }}>
                        Day {step.day}
                      </div>

                      {/* Subject */}
                      <div style={{
                        fontSize: 10, color: "var(--text3)", marginTop: 4, textAlign: "center",
                        maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}>
                        {step.subject}
                      </div>

                      {/* Metrics */}
                      {step.status === "sent" && step.openRate != null && (
                        <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 10 }}>
                          <span style={{ color: "var(--blue)" }}>{step.openRate}% open</span>
                          <span style={{ color: "var(--cyan)" }}>{step.replyRate}% reply</span>
                        </div>
                      )}
                    </div>

                    {/* Connector Line */}
                    {idx < seq.steps.length - 1 && (
                      <div style={{
                        width: 32, height: 2, background: "var(--border2)",
                        marginTop: 18, flexShrink: 0
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Card Footer */}
            <div style={{
              display: "flex", alignItems: "center", gap: 20, marginTop: 16,
              paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text3)"
            }}>
              <span>{seq.steps.length} steps</span>
              <span>{seq.steps.filter(s => s.status === "sent").length} sent</span>
              <span>{seq.replied} total replies</span>
              <span style={{ marginLeft: "auto", color: "var(--text2)", fontWeight: 500 }}>
                {Math.round((seq.completed / seq.enrolled) * 100)}% completion rate
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Sequence Modal */}
      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 520, maxWidth: "92vw", maxHeight: "80dvh", overflowY: "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? 20 : 28, zIndex: 9999, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", boxSizing: "border-box" }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>New Email Sequence</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Sequence name</label>
                <input placeholder="e.g. Enterprise Follow-up" value={newSeq.name} onChange={e => setNewSeq({ ...newSeq, name: e.target.value })} autoFocus
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginTop: 8 }}>Steps</div>
              {newSeq.steps.map((step, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ width: 60 }}>
                        <label style={{ fontSize: 10, color: "var(--text3)" }}>Day</label>
                        <input type="number" value={step.day} onChange={e => handleUpdateStep(idx, "day", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", fontSize: 12, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ width: 90 }}>
                        <label style={{ fontSize: 10, color: "var(--text3)" }}>Type</label>
                        <select value={step.type} onChange={e => handleUpdateStep(idx, "type", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", fontSize: 12, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }}>
                          <option value="email">Email</option>
                          <option value="task">Task</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: "var(--text3)" }}>Subject</label>
                        <input placeholder="Subject line" value={step.subject} onChange={e => handleUpdateStep(idx, "subject", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border2)", background: "var(--card)", color: "var(--text)", fontSize: 12, fontFamily: "Inter", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                  </div>
                  {newSeq.steps.length > 1 && (
                    <button onClick={() => handleRemoveStep(idx)}
                      style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1 }}>&times;</button>
                  )}
                </div>
              ))}
              <button onClick={handleAddStep}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px dashed var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "Inter" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add step
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, fontFamily: "Inter", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateSequence}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--cyan)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer", opacity: newSeq.name.trim() ? 1 : 0.5 }}>Create Sequence</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
