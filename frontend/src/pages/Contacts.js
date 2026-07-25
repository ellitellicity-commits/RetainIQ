import React, { useState, useEffect } from "react";

const th = { textAlign: "left", padding: "13px 16px", color: "var(--text2)", fontWeight: 500, fontSize: 14, whiteSpace: "nowrap" };
const td = { padding: "14px 16px", color: "var(--text)", fontSize: 15 };
const ctrl = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontFamily: "Inter", fontSize: 14, outline: "none" };
const pill = { padding: "7px 16px", borderRadius: 999, fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer" };

export default function Contacts({ API }) {
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("all");
  const [primaryOnly, setPrimaryOnly] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/db/contacts`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/db/clients`).then(r => r.json()).catch(() => []),
    ]).then(([cts, cls]) => {
      setContacts(Array.isArray(cts) ? cts : []);
      setClients(Array.isArray(cls) ? cls : []);
    });
  }, [API]);

  const clientName = {};
  clients.forEach(c => { clientName[c.id] = c.company_name || c.client_name || "—"; });
  const nameFor = (cid) => clientName[cid] || "—";

  const companies = [...new Set(contacts.map(c => nameFor(c.client_id)).filter(n => n && n !== "—"))].sort();

  let list = contacts.slice();
  if (primaryOnly) list = list.filter(c => c.is_primary);
  if (company !== "all") list = list.filter(c => nameFor(c.client_id) === company);
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.title || "").toLowerCase().includes(q) ||
      nameFor(c.client_id).toLowerCase().includes(q)
    );
  }
  list = [...list].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.name || "").localeCompare(b.name || ""));

  const activeFilters = search.trim() || company !== "all" || primaryOnly;
  const clearFilters = () => { setSearch(""); setCompany("all"); setPrimaryOnly(false); };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "Inter", fontSize: 32, fontWeight: 600, color: "var(--text)", letterSpacing: -0.5 }}>Contacts</div>
        <div style={{ color: "var(--text2)", fontSize: 15, marginTop: 6 }}>Everyone you work with across your accounts</div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, title, or company…" style={{ ...ctrl, flex: "1 1 260px" }} />
        <select value={company} onChange={(e) => setCompany(e.target.value)} style={{ ...ctrl, cursor: "pointer" }}>
          <option value="all">All companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setPrimaryOnly(v => !v)}
          style={{ ...pill, border: "1px solid " + (primaryOnly ? "var(--cyan)" : "var(--border)"), background: primaryOnly ? "var(--cyan-dim)" : "transparent", color: primaryOnly ? "var(--cyan)" : "var(--text2)" }}>
          Primary only
        </button>
        {activeFilters && (
          <button onClick={clearFilters} style={{ ...ctrl, cursor: "pointer", color: "var(--text2)", background: "transparent" }}>Clear filters</button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 14, color: "var(--text3)" }}>{list.length} contacts</div>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontFamily: "Inter" }}>
          <thead>
            <tr style={{ background: "var(--card)" }}>
              <th style={th}>Name</th>
              <th style={th}>Title</th>
              <th style={th}>Company</th>
              <th style={th}>Email</th>
              <th style={th}>Phone</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ ...td, fontWeight: 600 }}>
                  {c.name || "—"}
                  {c.is_primary ? <span style={{ marginLeft: 8, fontSize: 11, color: "var(--brand-bright)", background: "rgba(15,110,86,.22)", padding: "1px 7px", borderRadius: 5 }}>Primary</span> : null}
                </td>
                <td style={{ ...td, color: "var(--text2)" }}>{c.title || "—"}</td>
                <td style={{ ...td, color: "var(--text2)" }}>{nameFor(c.client_id)}</td>
                <td style={td}>{c.email ? <a href={"mailto:" + c.email} style={{ color: "var(--cyan)", textDecoration: "none" }}>{c.email}</a> : "—"}</td>
                <td style={{ ...td, color: "var(--text2)" }}>{c.phone || "—"}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--text3)", padding: "32px" }}>No contacts match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}