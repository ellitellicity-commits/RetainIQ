import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useBreakpoint from "../hooks/useBreakpoint";

const ICONS = {
  sparkle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  send: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

const SUGGESTED_PROMPTS = [
  "Which clients are at risk?",
  "Summarize this week's activity",
  "What's my pipeline value at risk?",
];

function Spinner() {
  return (
    <div style={{ width: 13, height: 13, border: "2px solid var(--border2)", borderTop: "2px solid var(--text2)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
  );
}

function ActionProposalCard({ msg, onConfirm, onCancel }) {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        maxWidth: "92%",
        background: "var(--bg)",
        border: "1px solid var(--border2)",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>
        Proposed action
      </div>
      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: msg.status === "pending" ? 12 : 0 }}>
        {msg.summary}
      </div>

      {msg.status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onConfirm()}
            style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", background: "var(--cyan)", color: "#fff", cursor: "pointer", fontFamily: "Inter", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--green)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--cyan)")}
          >
            Confirm
          </button>
          <button
            onClick={() => onCancel()}
            style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontFamily: "Inter", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Cancel
          </button>
        </div>
      )}

      {msg.status === "confirming" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text2)" }}>
          <Spinner /> Working on it…
        </div>
      )}

      {msg.status === "confirmed" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)", fontWeight: 500 }}>
          <span style={{ display: "flex" }}>{ICONS.check}</span> {msg.resultMessage || "Done."}
        </div>
      )}

      {msg.status === "error" && (
        <div style={{ fontSize: 12, color: "var(--text2)" }}>{msg.resultMessage || "That didn't go through."}</div>
      )}

      {msg.status === "cancelled" && (
        <div style={{ fontSize: 12, color: "var(--text3)" }}>Cancelled.</div>
      )}
    </div>
  );
}

export default function ChatWidget({ API }) {
  const { isMobile } = useBreakpoint();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const historyFor = (msgs) =>
    msgs
      .filter((m) => m.kind !== "action_proposal")
      .map((m) => ({ role: m.role, content: m.content }));

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const priorHistory = historyFor(messages);
    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: priorHistory }),
      });
      const data = await resp.json();
      if (data.type === "action_proposal") {
        setMessages((m) => [...m, { role: "assistant", kind: "action_proposal", tool: data.tool, args: data.args, summary: data.summary, status: "pending" }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", kind: data.type || "answer", content: data.content, searchedFor: data.searched_for, sources: data.sources },
        ]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", kind: "answer", content: "Something went wrong reaching the assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async (index) => {
    const target = messages[index];
    setMessages((m) => m.map((mm, i) => (i === index ? { ...mm, status: "confirming" } : mm)));
    try {
      const resp = await fetch(`${API}/api/chatbot/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: target.tool, args: target.args }),
      });
      const data = await resp.json();
      setMessages((m) => m.map((mm, i) => (i === index ? { ...mm, status: data.success ? "confirmed" : "error", resultMessage: data.message } : mm)));
    } catch (e) {
      setMessages((m) => m.map((mm, i) => (i === index ? { ...mm, status: "error", resultMessage: "Something went wrong." } : mm)));
    }
  };

  const cancelAction = (index) => {
    setMessages((m) => m.map((mm, i) => (i === index ? { ...mm, status: "cancelled" } : mm)));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--purple)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "var(--shadow)",
          zIndex: 1001,
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover2)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        {open ? <span style={{ color: "var(--text2)" }}>{ICONS.close}</span> : ICONS.sparkle}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={isMobile ? {
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100dvh",
              background: "var(--card)",
              border: "none",
              borderRadius: 0,
              boxShadow: "none",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            } : {
              position: "fixed",
              bottom: 88,
              right: 24,
              width: 380,
              height: 560,
              maxHeight: "calc(100vh - 120px)",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              zIndex: 1002,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <span style={{ color: "var(--purple)", display: "flex" }}>{ICONS.sparkle}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", flex: 1, letterSpacing: "-0.01em" }}>Ask RetainIQ</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "var(--text3)", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover2)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}
              >
                {ICONS.close}
              </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text3)", lineHeight: 1.5 }}>
                    Ask about clients, deals, or activity — or ask me to log a call, move a deal, or draft an email.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {SUGGESTED_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        style={{ textAlign: "left", padding: "7px 16px", fontSize: 12, color: "var(--text2)", background: "transparent", border: "1px solid var(--border2)", borderRadius: 999, cursor: "pointer", fontFamily: "Inter", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div
                    key={i}
                    style={{ alignSelf: "flex-end", maxWidth: "85%", background: "var(--hover2)", color: "var(--text)", borderRadius: "12px 12px 6px 12px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5 }}
                  >
                    {m.content}
                  </div>
                ) : m.kind === "action_proposal" ? (
                  <ActionProposalCard key={i} msg={m} onConfirm={() => confirmAction(i)} onCancel={() => cancelAction(i)} />
                ) : (
                  <div
                    key={i}
                    style={{ alignSelf: "flex-start", maxWidth: "92%", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "12px 12px 12px 6px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5 }}
                  >
                    {m.searchedFor && (
                      <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic", marginBottom: 6 }}>
                        Searched the web for “{m.searchedFor}”
                      </div>
                    )}
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                    {m.sources && m.sources.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--text3)" }}>
                          Sources
                        </div>
                        {m.sources.map((s, si) => (
                          <a
                            key={si}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11.5, color: "var(--cyan)", textDecoration: "none" }}
                          >
                            {s.title || s.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}

              {loading && (
                <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
                  <Spinner />
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>Thinking…</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or request an action…"
                style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "Inter", outline: "none" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                aria-label="Send"
                onMouseEnter={(e) => { if (input.trim() && !loading) e.currentTarget.style.background = "var(--green)"; }}
                onMouseLeave={(e) => { if (input.trim() && !loading) e.currentTarget.style.background = "var(--cyan)"; }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 8,
                  border: "none",
                  transition: "background 0.15s",
                  background: !input.trim() || loading ? "var(--hover2)" : "var(--cyan)",
                  color: !input.trim() || loading ? "var(--text3)" : "#fff",
                  cursor: !input.trim() || loading ? "default" : "pointer",
                }}
              >
                {ICONS.send}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
