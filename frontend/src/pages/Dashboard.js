import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import useBreakpoint from "../hooks/useBreakpoint";

const fmtMoney = (v) => "$" + Number(v || 0).toLocaleString();
const fmtBig = (v) => {
  v = Number(v || 0);
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  return "$" + Math.round(v / 1e3) + "K";
};
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const STATUS = {
  Expired:   { bg: "#f3dada", fg: "#a83838", label: "Expired" },
  Critical:  { bg: "#f3dada", fg: "#a83838", label: "Critical" },
  "At-Risk": { bg: "#efe4c4", fg: "#7d6217", label: "At-risk" },
  Active:    { bg: "#d7e9e1", fg: "#1b6a58", label: "Active" },
};

const th = { textAlign: "left", padding: "13px 16px", color: "var(--text2)", fontWeight: 500, fontSize: 14 };
const td = { padding: "15px 16px", color: "var(--text)" };

export default function Dashboard({ API }) {
  const { isMobile, isTablet } = useBreakpoint();
  const kpiColumns = isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)";
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch(`${API}/api/db/stats`).then(r => r.json()).then(setStats);
    fetch(`${API}/api/db/clients`).then(r => r.json()).then(setCustomers);
  }, [API]);

  if (!stats) return (
    <div style={{ color: "var(--text3)", fontFamily: "Inter", fontSize: 15, paddingTop: 60, textAlign: "center" }}>
      Loading…
    </div>
  );

  const filtered = customers.filter(c => {
    if (filter === "critical") return c.journey_stage === "Expired" || c.journey_stage === "Critical";
    if (filter === "atrisk")   return c.journey_stage === "At-Risk";
    if (filter === "healthy")  return c.journey_stage === "Active";
    return true;
  });

  const cards = [
    { label: "Total clients",      value: stats.total_customers,             color: "var(--text)" },
    { label: "Expiring in 90d",    value: stats.expiring_90 || 0,            color: "var(--amber)" },
    { label: "Critical / expired", value: stats.high_risk_count,             color: "var(--red)" },
    { label: "Value at risk",      value: fmtBig(stats.total_value_at_risk), color: "var(--cyan)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontFamily: "Inter", fontSize: 32, fontWeight: 600, color: "var(--text)", letterSpacing: -0.5 }}>Dashboard</div>
        <div style={{ color: "var(--text2)", fontSize: 15, marginTop: 6 }}>Contract renewal overview · Digital Move IT &amp; Telecom</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: kpiColumns, gap: 16, marginBottom: 26 }}>
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 14, padding: "22px 24px", boxShadow: "0 2px 14px rgba(0,0,0,0.38)" }}>
            <div style={{ fontSize: 18, color: "var(--text2)", marginBottom: 12 }}>{c.label}</div>
            <div style={{ fontSize: 40, fontWeight: 600, color: c.color, letterSpacing: -0.6 }}>{c.value}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {[["all", "All"], ["critical", "Critical"], ["atrisk", "At Risk"], ["healthy", "Healthy"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ padding: "8px 18px", borderRadius: 999,
              border: "1px solid " + (filter === id ? "var(--cyan)" : "var(--border)"),
              background: filter === id ? "var(--cyan-dim)" : "transparent",
              color: filter === id ? "var(--cyan)" : "var(--text2)",
              fontFamily: "Inter", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 14, color: "var(--text3)" }}>{filtered.length} clients</div>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter", fontSize: 16 }}>
          <thead>
            <tr style={{ background: "var(--card)" }}>
              <th style={th}>Client</th>
              <th style={th}>Software</th>
              <th style={{ ...th, textAlign: "right" }}>Value</th>
              <th style={th}>Renews</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const s = STATUS[c.journey_stage] || STATUS.Active;
              return (
                <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.company_name}</td>
                  <td style={{ ...td, color: "var(--text2)" }}>{c.software}</td>
                  <td style={{ ...td, textAlign: "right" }}>{fmtMoney(c.contract_value)}</td>
                  <td style={{ ...td, color: "var(--text2)" }}>{c.days_until_expiry < 0 ? "Expired" : fmtDate(c.contract_expiry)}</td>
                  <td style={td}><span style={{ background: s.bg, color: s.fg, fontSize: 14, padding: "3px 12px", borderRadius: 6, fontWeight: 500 }}>{s.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
