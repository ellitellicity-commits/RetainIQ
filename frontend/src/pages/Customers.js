import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { createColumnHelper } from "@tanstack/react-table";
import ActivityTimeline from "../components/ActivityTimeline";
import NoteEditor from "../components/NoteEditor";
import DataTable from "../components/DataTable";
import { NOTES } from "../data/mockData";
import { authHeaders, cachedGetJson } from "../utils/api";
import useBreakpoint from "../hooks/useBreakpoint";

const fmtMoney = (v) =>
  v === null || v === undefined || v === "" ? "—" : "$" + Number(v).toLocaleString();
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const STATUS = {
  Expired:   { bg: "#f3dada", fg: "#a83838", label: "Expired" },
  Critical:  { bg: "#f3dada", fg: "#a83838", label: "Critical" },
  "At-Risk": { bg: "#efe4c4", fg: "#7d6217", label: "At-risk" },
  Active:    { bg: "#d7e9e1", fg: "#1b6a58", label: "Active" },
};
const statusOf = (s) => STATUS[s] || STATUS.Active;

const QUOTE_STATUS = {
  sent:  { bg: "#d7e9e1", fg: "#1b6a58", t: "Sent" },
  draft: { bg: "#efe4c4", fg: "#7d6217", t: "Draft" },
};

const ctrl = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
  background: "var(--card)", color: "var(--text)", fontFamily: "Inter", fontSize: 14, outline: "none",
};

const cfield = { width: "100%", padding: "8px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter", fontSize: 13.5, outline: "none", boxSizing: "border-box", marginBottom: 8 };
const iconBtn = { background: "transparent", border: "1px solid var(--border2)", color: "var(--text3)", fontFamily: "Inter", fontSize: 12.5, padding: "4px 10px", borderRadius: 7, cursor: "pointer" };
const iconBtnMobile = { ...iconBtn, padding: "9px 12px", minHeight: 36 };

export default function Clients({ API, pageAction, clearAction, isGuest }) {
  const { isMobile } = useBreakpoint();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("expiry");
  const [filter, setFilter] = useState("all");
  const [renewWithin, setRenewWithin] = useState("any");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactForm, setContactForm] = useState(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");

  // Quotes (read-only, from Pipeline)
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Activities
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [logForm, setLogForm] = useState(null);
  const [logSaving, setLogSaving] = useState(false);

  // Drawer tabs
  const [drawerTab, setDrawerTab] = useState("details");
  const [detailsSubTab, setDetailsSubTab] = useState("overview");

  useEffect(() => {
    cachedGetJson(`${API}/api/db/clients`).then(setClients).catch(() => setClients([]));
  }, [API]);

  useEffect(() => {
    if (pageAction === "new-note") {
      if (clients.length > 0 && !selected) {
        setSelected(clients[0]);
        setDrawerTab("notes");
      } else if (selected) {
        setDrawerTab("notes");
      }
      if (clearAction) clearAction();
    }
  }, [pageAction, clearAction, clients, selected]);

  const nameOf = (c) => c.company_name || c.client_name || "—";

  // Customers.js carries a lot of unrelated UI state (drawer tabs, forms,
  // note editors, email drafts) -- without memoizing, every one of those
  // updates re-runs this filter/sort chain over the full client list even
  // though none of them touch search/filter/sort inputs.
  const list = useMemo(() => {
    let l = clients.filter(c => {
      if (filter === "critical") return c.journey_stage === "Expired" || c.journey_stage === "Critical";
      if (filter === "atrisk")   return c.journey_stage === "At-Risk";
      if (filter === "healthy")  return c.journey_stage === "Active";
      return true;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(c =>
        nameOf(c).toLowerCase().includes(q) ||
        (c.software || "").toLowerCase().includes(q) ||
        (c.vendor || "").toLowerCase().includes(q) ||
        (c.account_manager || "").toLowerCase().includes(q)
      );
    }

    const parseNum = (x) => {
      if (x === null || x === undefined || x === "") return null;
      const n = Number(String(x).replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? null : n;
    };
    const min = parseNum(minValue);
    const max = parseNum(maxValue);
    if (min != null || max != null) {
      l = l.filter(c => {
        const v = parseNum(c.contract_value) ?? 0;
        if (min != null && v < min) return false;
        if (max != null && v > max) return false;
        return true;
      });
    }

    if (renewWithin !== "any") {
      l = l.filter(c => {
        const d = c.days_until_expiry;
        if (d == null) return false;
        if (renewWithin === "expired") return d < 0;
        return d >= 0 && d <= Number(renewWithin);
      });
    }

    return [...l].sort((a, b) => {
      if (sortKey === "value")  return (b.contract_value || 0) - (a.contract_value || 0);
      if (sortKey === "name")   return nameOf(a).localeCompare(nameOf(b));
      if (sortKey === "status") return (b.churn_risk_score || 0) - (a.churn_risk_score || 0);
      const av = a.days_until_expiry == null ? 99999 : a.days_until_expiry;
      const bv = b.days_until_expiry == null ? 99999 : b.days_until_expiry;
      return av - bv;
    });
  }, [clients, filter, search, minValue, maxValue, renewWithin, sortKey]);

  const clearFilters = () => {
    setSearch(""); setFilter("all"); setRenewWithin("any"); setMinValue(""); setMaxValue("");
  };
  const activeFilters = search.trim() || filter !== "all" || renewWithin !== "any" || minValue !== "" || maxValue !== "";

  const loadContacts = (clientId) => {
    setContactsLoading(true);
    fetch(`${API}/api/db/contacts?client_id=${clientId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setContacts(arr);
        const primary = arr.find(c => c.is_primary) || arr[0];
        setSelectedContactId(primary ? String(primary.id) : "");
      })
      .catch(() => { setContacts([]); setSelectedContactId(""); })
      .finally(() => setContactsLoading(false));
  };

  const loadQuotes = (companyName) => {
    if (!companyName || companyName === "—") { setQuotes([]); return; }
    setQuotesLoading(true);
    fetch(`${API}/api/db/quotes?company=${encodeURIComponent(companyName)}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setQuotes(Array.isArray(d) ? d : []))
      .catch(() => setQuotes([]))
      .finally(() => setQuotesLoading(false));
  };

  const loadActivities = (clientId) => {
    setActivitiesLoading(true);
    fetch(`${API}/api/db/activities?client_id=${clientId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setActivities(Array.isArray(d) ? d : []))
      .catch(() => setActivities([]))
      .finally(() => setActivitiesLoading(false));
  };

  const openClient = (c) => {
    setSelected(c); setEmail(null);
    setContacts([]); setContactForm(null); setSelectedContactId("");
    setQuotes([]); setActivities([]); setLogForm(null); setDrawerTab("details"); setDetailsSubTab("overview");
    loadContacts(c.id);
    loadQuotes(nameOf(c));
    loadActivities(c.id);
  };
  const closeDrawer = () => {
    setSelected(null); setEmail(null); setEmailLoading(false);
    setContacts([]); setContactForm(null); setSelectedContactId("");
    setQuotes([]); setActivities([]); setLogForm(null);
  };

  const openLogForm = (type) => setLogForm({ type, notes: "", date: new Date().toISOString().slice(0, 10) });

  const saveLog = () => {
    if (isGuest || !logForm || !selected) return;
    setLogSaving(true);
    fetch(`${API}/api/db/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        client_id: selected.id,
        type: logForm.type,
        notes: logForm.notes,
        date: logForm.date,
        done_by: selected.account_manager || undefined,
      }),
    })
      .then(r => { if (!r.ok) throw new Error("save failed"); return r.json(); })
      .then(() => { setLogForm(null); loadActivities(selected.id); })
      .catch(() => setLogForm(f => f ? { ...f, error: true } : f))
      .finally(() => setLogSaving(false));
  };

  const logEmailDrafted = () => {
    if (isGuest || !selected || !email) return;
    fetch(`${API}/api/db/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        client_id: selected.id,
        type: "email",
        notes: `Subject: ${email.subject}`,
        done_by: selected.account_manager || undefined,
      }),
    })
      .then(() => loadActivities(selected.id))
      .catch(() => {});
  };

  const openAddContact = () => setContactForm({ name: "", title: "", email: "", phone: "", is_primary: contacts.length === 0 });
  const openEditContact = (ct) => setContactForm({ id: ct.id, name: ct.name || "", title: ct.title || "", email: ct.email || "", phone: ct.phone || "", is_primary: !!ct.is_primary });

  const saveContact = () => {
    if (isGuest || !contactForm || !selected) return;
    if (!(contactForm.name || "").trim()) return;
    setContactSaving(true);
    const isEdit = !!contactForm.id;
    const url = isEdit ? `${API}/api/db/contacts/${contactForm.id}` : `${API}/api/db/contacts`;
    const payload = {
      name: contactForm.name, title: contactForm.title, email: contactForm.email,
      phone: contactForm.phone, is_primary: contactForm.is_primary ? 1 : 0,
    };
    if (!isEdit) payload.client_id = selected.id;
    fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(payload) })
      .then(r => r.json())
      .then(() => { setContactForm(null); loadContacts(selected.id); })
      .catch(() => {})
      .finally(() => setContactSaving(false));
  };

  const deleteContact = (id, name) => {
    if (isGuest || !selected) return;
    if (!window.confirm(`Delete ${name || "this contact"}? This can't be undone.`)) return;
    fetch(`${API}/api/db/contacts/${id}`, { method: "DELETE", headers: authHeaders() })
      .then(() => loadContacts(selected.id))
      .catch(() => {});
  };

  const generateEmail = () => {
    if (!selected) return;
    setEmailLoading(true);
    setEmail(null);
    fetch(`${API}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        name: nameOf(selected),
        plan: selected.software,
        spend: selected.contract_value,
        risk_score: selected.churn_risk_score,
        days_since_contact: selected.days_since_contact,
        days_until_expiry: selected.days_until_expiry,
        software: selected.software,
        contract_expiry: selected.contract_expiry,
        account_manager: selected.account_manager,
      }),
    })
      .then(r => r.json())
      .then(d => {
        let body = d.body || "";
        const rc = contacts.find(c => String(c.id) === selectedContactId);
        if (rc && rc.name && body && !/^\s*(hi|hello|dear)\b/i.test(body)) {
          const first = rc.name.trim().split(/\s+/)[0];
          body = "Hi " + first + ",\n\n" + body;
        }
        setEmail({ subject: d.subject || "", body });
      })
      .catch(() => setEmail({ subject: "", body: "Could not generate the email. Make sure the backend is running." }))
      .finally(() => setEmailLoading(false));
  };

  const copyEmail = () => { if (email) { navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`); logEmailDrafted(); } };
  const openInMail = () => {
    if (!email) return;
    const rc = contacts.find(c => String(c.id) === selectedContactId);
    const to = rc && rc.email ? rc.email : "";
    window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(email.subject) + "&body=" + encodeURIComponent(email.body);
    logEmailDrafted();
  };

  const pill = { padding: "7px 16px", borderRadius: 999, fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer" };

  const contactFormEl = (
    <div style={{ border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 13px", marginBottom: 8, background: "var(--hover)" }}>
      <input style={cfield} placeholder="Name" value={contactForm ? contactForm.name : ""} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
      <input style={cfield} placeholder="Title (e.g. IT Director)" value={contactForm ? contactForm.title : ""} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} />
      <input style={cfield} placeholder="Email" value={contactForm ? contactForm.email : ""} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
      <input style={cfield} placeholder="Phone" value={contactForm ? contactForm.phone : ""} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)", marginBottom: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={!!(contactForm && contactForm.is_primary)} onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })} />
        Primary contact
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={saveContact} disabled={contactSaving}
          style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "var(--cyan)", color: "#fff", fontFamily: "Inter", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: contactSaving ? 0.7 : 1 }}>
          {contactSaving ? "Saving…" : (contactForm && contactForm.id ? "Save" : "Add contact")}
        </button>
        <button onClick={() => setContactForm(null)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontFamily: "Inter", fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );

  const drawer = selected ? createPortal(
    <>
      <div onClick={closeDrawer}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998 }} />
      <motion.div
        initial={{ x: 480 }} animate={{ x: 0 }} transition={{ type: "tween", duration: 0.25 }}
        style={{
          position: "fixed", top: 0, right: 0, height: "100dvh", width: isMobile ? "100vw" : 560, maxWidth: isMobile ? "100vw" : "92vw",
          background: "var(--card)", borderLeft: isMobile ? "none" : "1px solid var(--border2)", zIndex: 9999,
          overflowY: "auto", fontFamily: "Inter", boxShadow: isMobile ? "none" : "-8px 0 30px rgba(0,0,0,0.5)",
        }}>
        <div style={{ padding: isMobile ? "18px 18px 34px" : "24px 34px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text)" }}>{nameOf(selected)}</div>
              {(() => { const s = statusOf(selected.journey_stage);
                return <span style={{ background: s.bg, color: s.fg, fontSize: 13, padding: "3px 12px", borderRadius: 6, fontWeight: 500, display: "inline-block", marginTop: 8 }}>{s.label}</span>; })()}
            </div>
            <button onClick={closeDrawer}
              style={{ background: "transparent", border: "none", color: "var(--text3)", fontSize: 26, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          </div>

          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 0, marginTop: 16 }}>
            {[["details", "Details"], ["activity", "Activity"], ["notes", "Notes"]].map(([id, label]) => (
              <button key={id} onClick={() => setDrawerTab(id)}
                style={{ padding: "10px 18px", fontSize: 13, fontWeight: 500, fontFamily: "Inter", cursor: "pointer", border: "none", borderBottom: drawerTab === id ? "2px solid var(--cyan)" : "2px solid transparent", background: "transparent", color: drawerTab === id ? "var(--brand-bright)" : "var(--text3)" }}>
                {label}
              </button>
            ))}
          </div>

          {drawerTab === "activity" && (
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => openLogForm("call")} disabled={isGuest} title={isGuest ? "Guest accounts are read-only" : ""}
                  style={{ background: "transparent", border: "1px solid var(--border2)", color: "var(--cyan)", fontFamily: "Inter", fontSize: 13, fontWeight: 600, padding: "5px 12px", borderRadius: 8, cursor: isGuest ? "not-allowed" : "pointer", opacity: isGuest ? 0.5 : 1 }}>+ Log a call</button>
                <button onClick={() => openLogForm("meeting")} disabled={isGuest} title={isGuest ? "Guest accounts are read-only" : ""}
                  style={{ background: "transparent", border: "1px solid var(--border2)", color: "var(--cyan)", fontFamily: "Inter", fontSize: 13, fontWeight: 600, padding: "5px 12px", borderRadius: 8, cursor: isGuest ? "not-allowed" : "pointer", opacity: isGuest ? 0.5 : 1 }}>+ Log a meeting</button>
              </div>

              {logForm && (
                <div style={{ border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 13px", marginBottom: 14, background: "var(--hover)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                    {logForm.type === "call" ? "Log a call" : "Log a meeting"}
                  </div>
                  <textarea style={{ ...cfield, minHeight: 70, resize: "vertical" }} placeholder="Notes"
                    value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value, error: false })} />
                  <input type="date" style={cfield} value={logForm.date}
                    onChange={(e) => setLogForm({ ...logForm, date: e.target.value, error: false })} />
                  {logForm.error && (
                    <div style={{ fontSize: 12, color: "var(--danger-soft)", marginBottom: 8 }}>Couldn't save — try again.</div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveLog} disabled={logSaving}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "var(--cyan)", color: "#fff", fontFamily: "Inter", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: logSaving ? 0.7 : 1 }}>
                      {logSaving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setLogForm(null)}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontFamily: "Inter", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              {activitiesLoading
                ? <div style={{ fontSize: 13, color: "var(--text3)" }}>Loading…</div>
                : <ActivityTimeline activities={activities} maxItems={12} />}
            </div>
          )}

          {drawerTab === "notes" && (
            <div style={{ marginTop: 18 }}>
              <NoteEditor notes={NOTES} entityId={selected.id} entityType="client" />
            </div>
          )}

          {drawerTab === "details" && <>
          <div style={{ display: "flex", gap: 4, marginTop: 16, marginBottom: 4, flexWrap: "wrap" }}>
            {[["overview", "Overview"], ["contacts", "Contacts"], ["quotes", "Quotes"], ["email", "AI Email"]].map(([id, label]) => (
              <button key={id} onClick={() => setDetailsSubTab(id)}
                style={{ padding: "6px 13px", fontSize: 12.5, fontWeight: 500, fontFamily: "Inter", cursor: "pointer",
                  border: "1px solid " + (detailsSubTab === id ? "var(--cyan)" : "var(--border2)"), borderRadius: 999,
                  background: detailsSubTab === id ? "var(--cyan-dim)" : "transparent",
                  color: detailsSubTab === id ? "var(--cyan)" : "var(--text2)" }}>
                {label}
              </button>
            ))}
          </div>

          {detailsSubTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px 18px", padding: "18px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
            {[
              ["Software", selected.software || "—"],
              ["Vendor", selected.vendor || "—"],
              ["Contract value", fmtMoney(selected.contract_value)],
              ["Account manager", selected.account_manager || "—"],
              ["Start date", fmtDate(selected.contract_start || selected.start_date)],
              ["Renewal date", fmtDate(selected.contract_expiry)],
              ["Days until renewal", selected.days_until_expiry == null ? "—" : (selected.days_until_expiry < 0 ? "Expired" : selected.days_until_expiry + " days")],
              ["Last contact", selected.days_since_contact == null ? "—" : selected.days_since_contact + " days ago"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 12.5, color: "var(--text3)", marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 15, color: "var(--text)" }}>{v}</div>
              </div>
            ))}
          </div>
          )}

          {/* Contacts */}
          {detailsSubTab === "contacts" && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Contacts</div>
              {!contactForm && !isGuest && (
                <button onClick={openAddContact}
                  style={{ background: "transparent", border: "1px solid var(--border2)", color: "var(--cyan)", fontFamily: "Inter", fontSize: 13, fontWeight: 600, padding: "5px 12px", borderRadius: 8, cursor: "pointer" }}>+ Add contact</button>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>People at this company you work with.</div>

            {contactsLoading && <div style={{ fontSize: 13, color: "var(--text3)" }}>Loading…</div>}
            {!contactsLoading && contacts.length === 0 && !contactForm && (
              <div style={{ fontSize: 13, color: "var(--text3)", padding: "4px 0 8px" }}>No contacts yet.</div>
            )}

            {contacts.map((ct) => (
              contactForm && contactForm.id === ct.id ? (
                <div key={ct.id}>{contactFormEl}</div>
              ) : (
                <div key={ct.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>
                        {ct.name}
                        {ct.is_primary ? <span style={{ marginLeft: 8, fontSize: 11, color: "var(--brand-bright)", background: "var(--cyan-dim)", padding: "1px 7px", borderRadius: 5 }}>Primary</span> : null}
                      </div>
                      {ct.title ? <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{ct.title}</div> : null}
                      {ct.email ? <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{ct.email}</div> : null}
                      {ct.phone ? <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{ct.phone}</div> : null}
                    </div>
                    <div style={{ display: "flex", gap: 6, flex: "0 0 auto", marginLeft: 8 }}>
                      {!isGuest && <button onClick={() => openEditContact(ct)} style={isMobile ? iconBtnMobile : iconBtn}>Edit</button>}
                      {!isGuest && <button onClick={() => deleteContact(ct.id, ct.name)} style={isMobile ? iconBtnMobile : iconBtn}>Delete</button>}
                    </div>
                  </div>
                </div>
              )
            ))}

            {contactForm && !contactForm.id && contactFormEl}
          </div>
          )}

          {/* Quotes (read-only) */}
          {detailsSubTab === "quotes" && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Quotes</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>Quotes raised for this company in Pipeline.</div>

            {quotesLoading && <div style={{ fontSize: 13, color: "var(--text3)" }}>Loading…</div>}
            {!quotesLoading && quotes.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text3)", padding: "4px 0 8px" }}>No quotes yet. Build one from the Pipeline tab.</div>
            )}

            {quotes.map((q) => {
              const s = QUOTE_STATUS[q.status];
              return (
                <div key={q.deal_id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--text)" }}>{fmtMoney(Math.round(q.total))}</div>
                      <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 3 }}>
                        {q.item_count} item{q.item_count === 1 ? "" : "s"} · {q.stage}{q.discount ? " · " + q.discount + "% off" : ""}
                      </div>
                    </div>
                    {s ? <span style={{ background: s.bg, color: s.fg, fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 6, flex: "0 0 auto", marginLeft: 8 }}>{s.t}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* AI email */}
          {detailsSubTab === "email" && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>AI renewal email</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>Generated by LLaMA via Groq, personalized to this client.</div>

            {contacts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, color: "var(--text3)", marginBottom: 4 }}>Send to</div>
                <select value={selectedContactId} onChange={(e) => setSelectedContactId(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter", fontSize: 14, outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                  <option value="">No specific recipient</option>
                  {contacts.map(c => <option key={c.id} value={String(c.id)}>{c.name}{c.title ? " — " + c.title : ""}</option>)}
                </select>
              </div>
            )}

            {!email && (
              <button onClick={generateEmail} disabled={emailLoading}
                style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: "none",
                  background: "var(--cyan)", color: "#ffffff", fontFamily: "Inter", fontSize: 14, fontWeight: 600,
                  cursor: emailLoading ? "default" : "pointer", opacity: emailLoading ? 0.7 : 1 }}>
                {emailLoading ? "Drafting…" : "Generate renewal email"}
              </button>
            )}

            {email && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--text3)", marginBottom: 4 }}>Subject</div>
                <input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--bg)", color: "var(--text)", fontFamily: "Inter", fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
                <div style={{ fontSize: 12.5, color: "var(--text3)", marginBottom: 4 }}>Body</div>
                <textarea value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} rows={12}
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--bg)", color: "var(--text)", fontFamily: "Inter", fontSize: 14, lineHeight: 1.55, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button onClick={openInMail}
                    style={{ flex: "1 1 auto", padding: "10px 14px", borderRadius: 9, border: "none", background: "var(--cyan)", color: "#fff", fontFamily: "Inter", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Open in email</button>
                  <button onClick={copyEmail}
                    style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid var(--border2)", background: "transparent", color: "var(--text)", fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Copy</button>
                  <button onClick={generateEmail} disabled={emailLoading}
                    style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                    {emailLoading ? "…" : "Regenerate"}</button>
                </div>
              </div>
            )}
          </div>
          )}</>}
        </div>
      </motion.div>
    </>,
    document.body
  ) : null;

  const columns = useMemo(() => {
    const ch = createColumnHelper();
    return [
      ch.accessor((c) => nameOf(c), {
        id: "client",
        header: "Client",
        cell: (info) => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
        enableSorting: false,
      }),
      ch.accessor("software", {
        header: "Software",
        cell: (info) => (
          <span style={{ color: "var(--text2)" }}>
            {info.getValue() || "—"}
            {info.row.original.vendor ? <div style={{ fontSize: 12.5, color: "var(--text3)" }}>{info.row.original.vendor}</div> : null}
          </span>
        ),
        enableSorting: false,
      }),
      ch.accessor("contract_value", {
        header: "Value",
        cell: (info) => fmtMoney(info.getValue()),
        meta: { align: "right" },
        enableSorting: false,
      }),
      ch.accessor("contract_expiry", {
        header: "Renews",
        cell: (info) => (
          <span style={{ color: "var(--text2)" }}>
            {info.row.original.days_until_expiry < 0 ? "Expired" : fmtDate(info.getValue())}
          </span>
        ),
        enableSorting: false,
      }),
      ch.accessor("account_manager", {
        header: "Owner",
        cell: (info) => <span style={{ color: "var(--text2)" }}>{info.getValue() || "—"}</span>,
        enableSorting: false,
      }),
      ch.accessor((c) => statusOf(c.journey_stage), {
        id: "status",
        header: "Status",
        cell: (info) => {
          const s = info.getValue();
          return <span style={{ background: s.bg, color: s.fg, fontSize: 13, padding: "3px 12px", borderRadius: 6, fontWeight: 500, whiteSpace: "nowrap" }}>{s.label}</span>;
        },
        enableSorting: false,
      }),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>Clients</div>
        <div style={{ color: "var(--text2)", fontSize: 15, marginTop: 6 }}>Manage accounts &amp; renewals · Digital Move IT &amp; Telecom</div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, software, or account manager…"
          style={{ ...ctrl, flex: "1 1 260px" }} />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ ...ctrl, cursor: "pointer" }}>
          <option value="expiry">Sort: Renewal soonest</option>
          <option value="value">Sort: Highest value</option>
          <option value="status">Sort: Most at risk</option>
          <option value="name">Sort: Name (A–Z)</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <select value={renewWithin} onChange={(e) => setRenewWithin(e.target.value)} style={{ ...ctrl, cursor: "pointer" }}>
          <option value="any">Renews: any time</option>
          <option value="30">Renews in ≤ 30 days</option>
          <option value="90">Renews in ≤ 90 days</option>
          <option value="180">Renews in ≤ 6 months</option>
          <option value="365">Renews in ≤ 12 months</option>
          <option value="expired">Expired only</option>
        </select>
        <input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)}
          placeholder="Min $" style={{ ...ctrl, width: 120 }} />
        <span style={{ color: "var(--text3)", fontSize: 14 }}>–</span>
        <input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)}
          placeholder="Max $" style={{ ...ctrl, width: 120 }} />
        {activeFilters && (
          <button onClick={clearFilters}
            style={{ ...ctrl, cursor: "pointer", color: "var(--text2)", background: "transparent" }}>Clear filters</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        {[["all", "All"], ["critical", "Critical"], ["atrisk", "At Risk"], ["healthy", "Healthy"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ ...pill,
              border: "1px solid " + (filter === id ? "var(--cyan)" : "var(--border)"),
              background: filter === id ? "var(--cyan-dim)" : "transparent",
              color: filter === id ? "var(--cyan)" : "var(--text2)" }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 14, color: "var(--text3)" }}>{list.length} clients</div>
      </div>

      <DataTable columns={columns} data={list} onRowClick={openClient} minWidth={760} emptyMessage="No clients match your filters." />

      {drawer}
    </div>
  );
}
