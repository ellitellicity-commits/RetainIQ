import React, { useState, useEffect, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import DataTable from "../components/DataTable";

const ctrl = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontFamily: "Inter", fontSize: 14, outline: "none" };
const pill = { padding: "7px 16px", borderRadius: 999, fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--text2)" };

const money = (v) => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (s) => { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

const STATUS = {
  sent:  { bg: "color-mix(in srgb, var(--green) 16%, transparent)", fg: "var(--green)", t: "Sent" },
  draft: { bg: "color-mix(in srgb, var(--amber) 16%, transparent)", fg: "var(--amber)", t: "Draft" },
};

export default function Quotes({ API, onOpenDeal }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/db/quotes`)
      .then(r => r.json())
      .then(d => setQuotes(Array.isArray(d) ? d : []))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  let list = quotes.slice();
  if (status !== "all") list = list.filter(q => (q.status || "none") === status);
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(x => (x.company || "").toLowerCase().includes(q) || (x.owner || "").toLowerCase().includes(q));
  }
  list = [...list].sort((a, b) => (b.sent_at || "").localeCompare(a.sent_at || "") || (b.deal_id - a.deal_id));

  const totalValue = list.reduce((s, q) => s + (q.total || 0), 0);
  const activeFilters = search.trim() || status !== "all";
  const clearFilters = () => { setSearch(""); setStatus("all"); };

  const columns = useMemo(() => {
    const ch = createColumnHelper();
    return [
      ch.accessor("company", {
        header: "Company",
        cell: (info) => <span style={{ fontWeight: 600 }}>{info.getValue() || "—"}</span>,
        enableSorting: false,
      }),
      ch.accessor("stage", {
        header: "Deal stage",
        cell: (info) => <span style={{ color: "var(--text2)" }}>{info.getValue() || "—"}</span>,
        enableSorting: false,
      }),
      ch.accessor("status", {
        header: "Status",
        cell: (info) => {
          const s = STATUS[info.getValue()] || STATUS.draft;
          return <span style={{ background: s.bg, color: s.fg, fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>{s.t}</span>;
        },
        enableSorting: false,
      }),
      ch.accessor("total", {
        header: "Total",
        cell: (info) => <span style={{ fontWeight: 600 }}>{money(info.getValue())}</span>,
        enableSorting: false,
      }),
      ch.accessor("discount", {
        header: "Discount",
        cell: (info) => <span style={{ color: "var(--text2)" }}>{info.getValue() ? `${info.getValue()}%` : "—"}</span>,
        enableSorting: false,
      }),
      ch.accessor("sent_at", {
        header: "Sent",
        cell: (info) => <span style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(info.getValue())}</span>,
        enableSorting: false,
        meta: { width: 120 },
      }),
      ch.accessor("owner", {
        header: "Owner",
        cell: (info) => <span style={{ color: "var(--text2)" }}>{info.getValue() || "—"}</span>,
        enableSorting: false,
      }),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>Quotes</div>
        <div style={{ color: "var(--text2)", fontSize: 15, marginTop: 6 }}>Every quote raised across your deals, in one place</div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or owner…" style={{ ...ctrl, flex: "1 1 260px" }} />
        <button onClick={() => setStatus("all")}
          style={{ ...pill, ...(status === "all" ? { border: "1px solid var(--cyan)", background: "var(--cyan-dim)", color: "var(--cyan)" } : {}) }}>All</button>
        <button onClick={() => setStatus("draft")}
          style={{ ...pill, ...(status === "draft" ? { border: "1px solid var(--amber)", color: "var(--amber)", background: STATUS.draft.bg } : {}) }}>Draft</button>
        <button onClick={() => setStatus("sent")}
          style={{ ...pill, ...(status === "sent" ? { border: "1px solid var(--green)", color: "var(--green)", background: STATUS.sent.bg } : {}) }}>Sent</button>
        {activeFilters && (
          <button onClick={clearFilters} style={{ ...ctrl, cursor: "pointer", color: "var(--text2)", background: "transparent" }}>Clear filters</button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 14, color: "var(--text3)" }}>
          {list.length} quote{list.length === 1 ? "" : "s"} · {money(totalValue)}
        </div>
      </div>

      <DataTable columns={columns} data={list} onRowClick={onOpenDeal ? (q) => onOpenDeal(q.deal_id) : undefined} loading={loading} minWidth={800} emptyMessage="No quotes match your filters." />
    </div>
  );
}
