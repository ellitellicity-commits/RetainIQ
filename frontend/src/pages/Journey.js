import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { authHeaders, invalidateCache } from "../utils/api";
import useBreakpoint from "../hooks/useBreakpoint";

const STAGES = ["New Leads", "Qualified", "Demo", "Quote sent", "Negotiation", "Closed-Won", "Closed-Lost"];
const STAGE_DOT = {
  "New Leads": "var(--text3)", "Qualified": "#378add", "Demo": "#7F77DD", "Quote sent": "#EF9F27",
  "Negotiation": "#1D9E75", "Closed-Won": "#639922", "Closed-Lost": "#E24B4A",
};
const SOURCES = ["Inbound", "Outbound", "Referral", "Event", "Other"];

const fmtBig = (v) => { v = Number(v || 0); return v >= 1e6 ? "$" + (v / 1e6).toFixed(2) + "M" : "$" + Math.round(v / 1e3) + "K"; };
const fmtK = (v) => { v = Number(v || 0); return v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : "$" + Math.round(v / 1e3) + "K"; };
const fmtDate = (s) => { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
const todayISO = () => new Date().toISOString().slice(0, 10);
const dealSize = (v) => v >= 100000 ? "Enterprise" : v >= 20000 ? "Mid-market" : "SMB";
const initials = (name) => { if (!name) return "—"; const p = name.trim().split(/\s+/); return ((p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "")).toUpperCase() || "—"; };

const num = (x) => { const n = Number(x); return isNaN(n) ? 0 : n; };
const money = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function health(d) {
  if (d.stage === "Closed-Won" || d.stage === "Closed-Lost") return null;
  if ((d.days_in_stage || 0) > 14) return { c: "#E24B4A", t: "Stalled" };
  if (d.next_action_date && d.next_action_date <= todayISO()) return { c: "#EF9F27", t: "Action due" };
  if ((d.value || 0) >= 100000) return { c: "#639922", t: "Whale" };
  return null;
}

const field = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter", fontSize: 14, outline: "none", boxSizing: "border-box" };
const lbl = { fontSize: 12.5, color: "var(--text3)", marginBottom: 4, marginTop: 14 };
const qfield = { padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter", fontSize: 13.5, outline: "none", boxSizing: "border-box" };

export default function Pipeline({ API, pageAction, clearAction, openDealId, clearOpenDeal, isGuest }) {
  const { isMobile } = useBreakpoint();
  const [deals, setDeals] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // Quote builder
  const [quoteItems, setQuoteItems] = useState([]);
  const [quoteDiscount, setQuoteDiscount] = useState("0");
  const [quoteStatus, setQuoteStatus] = useState("none");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteSending, setQuoteSending] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState("");

  const load = () => fetch(`${API}/api/db/deals`, { headers: authHeaders() }).then(r => r.json()).then(setDeals).catch(() => setDeals([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  useEffect(() => {
    if (pageAction === "new-deal") {
      setSelected("new");
      setDraft({ company: "", value: "", stage: "New Leads", owner: "", product: "", lead_source: "Inbound", next_action: "", next_action_date: "", expected_close_date: "" });
      setQuoteItems([]);
      setQuoteDiscount("0");
      setQuoteStatus("none");
      setQuoteMsg("");
      if (clearAction) clearAction();
    }
  }, [pageAction, clearAction]);

  useEffect(() => {
    if (openDealId == null) return;
    const deal = deals.find(d => d.id === openDealId);
    if (deal) {
      openDeal(deal);
      if (clearOpenDeal) clearOpenDeal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDealId, deals]);

  const openValue = deals.filter(d => d.status === "open").reduce((s, d) => s + (d.value || 0), 0);

  const subtotal = quoteItems.reduce((s, it) => s + num(it.quantity) * num(it.unit_price), 0);
  const discPct = num(quoteDiscount);
  const discountAmt = subtotal * discPct / 100;
  const total = subtotal - discountAmt;

  const loadQuote = (dealId) => {
    setQuoteLoading(true);
    fetch(`${API}/api/db/quote/${dealId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(q => {
        const items = (q.items || []).map(it => ({ description: it.description || "", quantity: it.quantity, unit_price: it.unit_price }));
        setQuoteItems(items.length ? items : [{ description: "", quantity: 1, unit_price: 0 }]);
        setQuoteDiscount(q.discount != null ? String(q.discount) : "0");
        setQuoteStatus(q.status || "none");
      })
      .catch(() => { setQuoteItems([{ description: "", quantity: 1, unit_price: 0 }]); setQuoteDiscount("0"); setQuoteStatus("none"); })
      .finally(() => setQuoteLoading(false));
  };

  const moveDeal = (id, stage) => {
    if (isGuest) return;
    const deal = deals.find(d => d.id === id);
    if (!deal || deal.stage === stage) return;
    setDeals(ds => ds.map(d => d.id === id ? { ...d, stage, days_in_stage: 0, stage_updated_at: todayISO(), status: stage === "Closed-Won" ? "won" : stage === "Closed-Lost" ? "lost" : "open" } : d));
    fetch(`${API}/api/db/deals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ stage }) })
      .then(r => r.json()).then(u => { invalidateCache("deals"); setDeals(ds => ds.map(d => d.id === id ? u : d)); }).catch(() => load());
  };

  const openDeal = (d) => { setSelected(d); setDraft({ ...d }); setQuoteMsg(""); loadQuote(d.id); };
  const openNew = () => { setSelected("new"); setDraft({ company: "", value: "", stage: "New Leads", owner: "", product: "", lead_source: "Inbound", next_action: "", next_action_date: "", expected_close_date: "" }); setQuoteItems([]); setQuoteDiscount("0"); setQuoteStatus("none"); setQuoteMsg(""); };
  const close = () => { setSelected(null); setDraft(null); setSaving(false); setQuoteItems([]); setQuoteDiscount("0"); setQuoteStatus("none"); setQuoteSaving(false); setQuoteSending(false); setQuoteMsg(""); };

  const save = () => {
    if (isGuest) return;
    setSaving(true);
    const isNew = selected === "new";
    const url = isNew ? `${API}/api/db/deals` : `${API}/api/db/deals/${selected.id}`;
    fetch(url, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(draft) })
      .then(r => r.json()).then(() => { invalidateCache("deals"); load(); close(); }).catch(() => setSaving(false));
  };

  const quickStage = (stage) => {
    if (isGuest) return;
    if (selected === "new") { setDraft({ ...draft, stage }); return; }
    fetch(`${API}/api/db/deals/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ stage }) })
      .then(r => r.json()).then(() => { invalidateCache("deals"); load(); close(); });
  };

  const del = () => {
    if (isGuest) return;
    if (selected === "new") { close(); return; }
    if (!window.confirm(`Delete the deal with ${selected.company || "this company"}? This can't be undone.`)) return;
    fetch(`${API}/api/db/deals/${selected.id}`, { method: "DELETE", headers: authHeaders() }).then(() => { invalidateCache("deals"); load(); close(); });
  };

  const addItem = () => setQuoteItems([...quoteItems, { description: "", quantity: 1, unit_price: 0 }]);
  const updateItem = (i, key, val) => setQuoteItems(quoteItems.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  const removeItem = (i) => setQuoteItems(quoteItems.filter((_, idx) => idx !== i));

  const putQuote = () => fetch(`${API}/api/db/quote/${selected.id}`, {
    method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ discount: discPct, items: quoteItems }),
  }).then(r => r.json());

  const saveQuote = () => {
    if (isGuest || selected === "new" || !selected) return;
    setQuoteSaving(true); setQuoteMsg("");
    putQuote()
      .then(q => { setQuoteStatus(q.status || "draft"); setQuoteMsg("Saved ✓"); })
      .catch(() => setQuoteMsg("Save failed"))
      .finally(() => setQuoteSaving(false));
  };

  const sendQuote = () => {
    if (isGuest || selected === "new" || !selected) return;
    if (!window.confirm("Mark this quote as sent? This sets the deal value to the quote total and moves it to Quote sent.")) return;
    setQuoteSending(true); setQuoteMsg("");
    putQuote()
      .then(() => fetch(`${API}/api/db/quote/${selected.id}/send`, { method: "POST", headers: authHeaders() }))
      .then(r => r.json())
      .then(() => { load(); close(); })
      .catch(() => { setQuoteMsg("Send failed"); setQuoteSending(false); });
  };

  const card = (d) => {
    const h = health(d);
    const big = (d.value || 0) >= 100000;
    const overdue = d.next_action_date && d.next_action_date <= todayISO() && d.status === "open";
    return (
      <div key={d.id} draggable={!isMobile && !isGuest}
        onDragStart={() => setDraggingId(d.id)}
        onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
        onClick={() => openDeal(d)}
        style={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 13px", marginBottom: 10, cursor: isMobile ? "pointer" : "grab", opacity: d.status === "lost" ? 0.6 : 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {h && <span title={h.t} style={{ width: 9, height: 9, borderRadius: "50%", background: h.c, flex: "0 0 auto" }} />}
            <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.company || "—"}</span>
            {h && isMobile && <span style={{ fontSize: 10.5, fontWeight: 600, color: h.c, flex: "0 0 auto", whiteSpace: "nowrap" }}>{h.t}</span>}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: big ? "#97C459" : "var(--text)", flex: "0 0 auto", marginLeft: 8 }}>{fmtK(d.value)}</span>
        </div>
        <div style={{ marginTop: 9 }}><span style={{ fontSize: 11, color: "var(--brand-bright)", background: "var(--cyan-dim)", padding: "2px 8px", borderRadius: 5 }}>{dealSize(d.value || 0)}</span></div>
        {d.next_action ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginTop: 10, color: overdue ? "#var(--danger-soft)" : "var(--text2)" }}>
            <span>→</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.next_action}{d.next_action_date ? " · " + (overdue ? "Overdue" : "Due " + fmtDate(d.next_action_date)) : ""}</span>
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{d.days_in_stage != null ? d.days_in_stage + "d in stage" : ""}</span>
          <span title={d.owner || ""} style={{ width: 23, height: 23, borderRadius: "50%", background: "var(--cyan-dim)", color: "var(--brand-bright)", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(d.owner)}</span>
        </div>
        {isMobile && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 5 }}>Move to stage</div>
            <select
              value={d.stage}
              onChange={(e) => moveDeal(d.id, e.target.value)}
              disabled={isGuest}
              style={{ width: "100%", minHeight: 40, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter", fontSize: 13.5, cursor: isGuest ? "not-allowed" : "pointer", opacity: isGuest ? 0.6 : 1 }}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  const column = (stage) => {
    const colDeals = deals.filter(d => d.stage === stage);
    const total = colDeals.reduce((s, d) => s + (d.value || 0), 0);
    return (
      <div key={stage}
        onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
        onDrop={(e) => { e.preventDefault(); if (draggingId != null) moveDeal(draggingId, stage); setDraggingId(null); setOverStage(null); }}
        style={{ flex: "0 0 220px", background: overStage === stage ? "var(--hover2)" : "transparent", borderRadius: 10, padding: "6px 6px 10px", transition: "background .12s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, padding: "0 4px" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_DOT[stage] }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{stage}</span>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text3)" }}>{colDeals.length}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, paddingLeft: 20 }}>{fmtK(total)}</div>
        {colDeals.map(card)}
      </div>
    );
  };

  const statusPill = (() => {
    const map = { sent: { bg: "#d7e9e1", fg: "#1b6a58", t: "Sent" }, draft: { bg: "#efe4c4", fg: "#7d6217", t: "Draft" } };
    const s = map[quoteStatus];
    return s ? <span style={{ background: s.bg, color: s.fg, fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 6 }}>{s.t}</span> : null;
  })();

  const drawer = (selected != null) ? createPortal(
    <>
      <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998 }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100dvh", width: isMobile ? "100vw" : 560, maxWidth: isMobile ? "100vw" : "92vw", background: "var(--card)", borderLeft: isMobile ? "none" : "1px solid var(--border2)", zIndex: 9999, overflowY: "auto", fontFamily: "Inter", boxShadow: isMobile ? "none" : "-8px 0 30px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: isMobile ? "18px 18px 34px" : "24px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>{selected === "new" ? "New deal" : (draft.company || "Deal")}</div>
            <button onClick={close} style={{ background: "transparent", border: "none", color: "var(--text3)", fontSize: 26, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          </div>

          <div style={lbl}>Company</div>
          <input style={field} value={draft.company || ""} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          <div style={lbl}>Deal value ($)</div>
          <input style={field} type="number" value={draft.value || ""} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          <div style={lbl}>Stage</div>
          <select style={{ ...field, cursor: "pointer" }} value={draft.stage || "New Leads"} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={lbl}>Owner</div>
          <input style={field} value={draft.owner || ""} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
          <div style={lbl}>Product</div>
          <input style={field} value={draft.product || ""} onChange={(e) => setDraft({ ...draft, product: e.target.value })} />
          <div style={lbl}>Lead source</div>
          <select style={{ ...field, cursor: "pointer" }} value={draft.lead_source || "Inbound"} onChange={(e) => setDraft({ ...draft, lead_source: e.target.value })}>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={lbl}>Next action</div>
          <input style={field} value={draft.next_action || ""} onChange={(e) => setDraft({ ...draft, next_action: e.target.value })} />
          <div style={lbl}>Next action date</div>
          <input style={field} type="date" value={(draft.next_action_date || "").slice(0, 10)} onChange={(e) => setDraft({ ...draft, next_action_date: e.target.value })} />
          <div style={lbl}>Expected close date</div>
          <input style={field} type="date" value={(draft.expected_close_date || "").slice(0, 10)} onChange={(e) => setDraft({ ...draft, expected_close_date: e.target.value })} />

          <button onClick={save} disabled={saving || isGuest} title={isGuest ? "Guest accounts are read-only" : ""}
            style={{ width: "100%", marginTop: 20, padding: "11px 16px", borderRadius: 10, border: "none", background: "var(--cyan)", color: "#fff", fontFamily: "Inter", fontSize: 14, fontWeight: 600, cursor: isGuest ? "not-allowed" : "pointer", opacity: saving || isGuest ? 0.7 : 1 }}>
            {saving ? "Saving…" : (selected === "new" ? "Create deal" : "Save changes")}
          </button>

          {selected !== "new" && !isGuest && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => quickStage("Closed-Won")} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid #4a6b2a", background: "transparent", color: "#97C459", fontFamily: "Inter", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Mark won</button>
              <button onClick={() => quickStage("Closed-Lost")} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid #6e3636", background: "transparent", color: "var(--danger-soft)", fontFamily: "Inter", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Mark lost</button>
              <button onClick={del} style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontFamily: "Inter", fontSize: 13, cursor: "pointer" }}>Delete</button>
            </div>
          )}

          {selected !== "new" && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Quote</div>
                {statusPill}
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>Line items, pricing &amp; discount for this deal.</div>

              {quoteLoading ? (
                <div style={{ fontSize: 13, color: "var(--text3)" }}>Loading…</div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <div style={{ flex: "1 1 auto", fontSize: 12, color: "var(--text3)" }}>Description</div>
                    <div style={{ width: 50, fontSize: 12, color: "var(--text3)", textAlign: "right" }}>Qty</div>
                    <div style={{ width: 78, fontSize: 12, color: "var(--text3)", textAlign: "right" }}>Unit $</div>
                    <div style={{ width: 74, fontSize: 12, color: "var(--text3)", textAlign: "right" }}>Amount</div>
                    <div style={{ width: 22 }} />
                  </div>

                  {quoteItems.map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <input value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Item"
                        style={{ ...qfield, flex: "1 1 auto", minWidth: 0 }} />
                      <input value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} type="number"
                        style={{ ...qfield, width: 50, textAlign: "right" }} />
                      <input value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} type="number"
                        style={{ ...qfield, width: 78, textAlign: "right" }} />
                      <div style={{ width: 74, textAlign: "right", fontSize: 13.5, color: "var(--text)" }}>{money(num(it.quantity) * num(it.unit_price))}</div>
                      <button onClick={() => removeItem(i)} title="Remove"
                        style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, flex: "0 0 auto" }}>×</button>
                    </div>
                  ))}

                  <button onClick={addItem}
                    style={{ background: "transparent", border: "1px dashed var(--border2)", color: "var(--cyan)", fontFamily: "Inter", fontSize: 13, fontWeight: 600, padding: "8px", borderRadius: 8, cursor: "pointer", width: "100%", marginTop: 2 }}>+ Add line item</button>

                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, color: "var(--text2)" }}>Subtotal</span>
                      <span style={{ fontSize: 14, color: "var(--text)" }}>{money(subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, color: "var(--text2)", display: "flex", alignItems: "center", gap: 8 }}>
                        Discount
                        <input value={quoteDiscount} onChange={(e) => setQuoteDiscount(e.target.value)} type="number"
                          style={{ ...qfield, width: 56, textAlign: "right" }} />
                        %
                      </span>
                      <span style={{ fontSize: 14, color: "var(--text3)" }}>−{money(discountAmt)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Total</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--cyan)" }}>{money(total)}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
                    <button onClick={saveQuote} disabled={quoteSaving || quoteSending || isGuest} title={isGuest ? "Guest accounts are read-only" : ""}
                      style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid var(--border2)", background: "transparent", color: "var(--text)", fontFamily: "Inter", fontSize: 14, fontWeight: 600, cursor: isGuest ? "not-allowed" : "pointer", opacity: isGuest ? 0.6 : 1 }}>
                      {quoteSaving ? "Saving…" : "Save quote"}</button>
                    <button onClick={sendQuote} disabled={quoteSaving || quoteSending || isGuest} title={isGuest ? "Guest accounts are read-only" : ""}
                      style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "var(--cyan)", color: "#fff", fontFamily: "Inter", fontSize: 14, fontWeight: 600, cursor: isGuest ? "not-allowed" : "pointer", opacity: (quoteSaving || quoteSending || isGuest) ? 0.7 : 1 }}>
                      {quoteSending ? "Sending…" : "Mark as sent"}</button>
                  </div>
                  {quoteMsg ? <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 8, textAlign: "right" }}>{quoteMsg}</div> : null}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>Pipeline</div>
        {!isGuest && <button onClick={openNew} style={{ background: "var(--cyan)", color: "#fff", border: "none", fontFamily: "Inter", fontSize: 14, fontWeight: 600, padding: "9px 16px", borderRadius: 9, cursor: "pointer" }}>+ New deal</button>}
      </div>
      <div style={{ color: "var(--text2)", fontSize: 15, marginBottom: 20 }}>{isMobile ? "Tap a deal to open it, or move it to a stage below" : "Drag deals between stages"} · {fmtBig(openValue)} open across pipeline</div>

      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: "touch" }}>
        {STAGES.map(column)}
      </div>

      {drawer}
    </div>
  );
}
