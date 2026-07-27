import React, { useState, useEffect, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import DataTable from "../components/DataTable";
import { authHeaders } from "../utils/api";

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
      fetch(`${API}/api/db/contacts`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/db/clients`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
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

  const columns = useMemo(() => {
    const ch = createColumnHelper();
    return [
      ch.accessor("name", {
        header: "Name",
        cell: (info) => (
          <span style={{ fontWeight: 600 }}>
            {info.getValue() || "—"}
            {info.row.original.is_primary ? <span style={{ marginLeft: 8, fontSize: 11, color: "var(--brand-bright)", background: "var(--cyan-dim)", padding: "1px 7px", borderRadius: 5 }}>Primary</span> : null}
          </span>
        ),
        enableSorting: false,
      }),
      ch.accessor("title", {
        header: "Title",
        cell: (info) => <span style={{ color: "var(--text2)" }}>{info.getValue() || "—"}</span>,
        enableSorting: false,
      }),
      ch.accessor((c) => nameFor(c.client_id), {
        id: "company",
        header: "Company",
        cell: (info) => <span style={{ color: "var(--text2)" }}>{info.getValue()}</span>,
        enableSorting: false,
      }),
      ch.accessor("email", {
        header: "Email",
        cell: (info) => info.getValue() ? <a href={"mailto:" + info.getValue()} style={{ color: "var(--cyan)", textDecoration: "none" }}>{info.getValue()}</a> : "—",
        enableSorting: false,
        meta: { width: 220 },
      }),
      ch.accessor("phone", {
        header: "Phone",
        cell: (info) => <span style={{ color: "var(--text2)" }}>{info.getValue() || "—"}</span>,
        enableSorting: false,
      }),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>Contacts</div>
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

      <DataTable columns={columns} data={list} minWidth={680} emptyMessage="No contacts match your filters." />
    </div>
  );
}