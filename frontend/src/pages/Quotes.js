import React, { useState, useEffect } from "react";

const th = { textAlign: "left", padding: "13px 16px", color: "var(--text2)", fontWeight: 500, fontSize: 14, whiteSpace: "nowrap" };
const td = { padding: "14px 16px", color: "var(--text)", fontSize: 15 };
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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "Inter", fontSize: 32, fontWeight: 600, color: "var(--text)", letterSpacing: -0.5 }}>Quotes</div>
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

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontFamily: "Inter" }}>
          <thead>
            <tr style={{ background: "var(--card)" }}>
              <th style={th}>Company</th>
              <th style={th}>Deal stage</th>
              <th style={th}>Status</th>
              <th style={th}>Total</th>
              <th style={th}>Discount</th>
              <th style={th}>Sent</th>
              <th style={th}>Owner</th>
            </tr>
          </thead>
          <tbody>
            {list.map((q) => {
              const s = STATUS[q.status] || STATUS.draft;
              return (
                <tr key={q.deal_id} onClick={() => onOpenDeal && onOpenDeal(q.deal_id)}
                  style={{ borderTop: "1px solid var(--border)", cursor: onOpenDeal ? "pointer" : "default" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...td, fontWeight: 600 }}>{q.company || "—"}</td>
                  <td style={{ ...td, color: "var(--text2)" }}>{q.stage || "—"}</td>
                  <td style={td}>
                    <span style={{ background: s.bg, color: s.fg, fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 6 }}>{s.t}</span>
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{money(q.total)}</td>
                  <td style={{ ...td, color: "var(--text2)" }}>{q.discount ? `${q.discount}%` : "—"}</td>
                  <td style={{ ...td, color: "var(--text2)" }}>{fmtDate(q.sent_at)}</td>
                  <td style={{ ...td, color: "var(--text2)" }}>{q.owner || "—"}</td>
                </tr>
              );
            })}
            {!loading && list.length === 0 && (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "var(--text3)", padding: "32px" }}>No quotes match your filters.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "var(--text3)", padding: "32px" }}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
