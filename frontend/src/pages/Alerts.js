import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import useBreakpoint from "../hooks/useBreakpoint";

const PROB = { "New Leads": 0.10, "Qualified": 0.25, "Demo": 0.40, "Quote sent": 0.60, "Negotiation": 0.80 };
const OPEN_STAGES = ["New Leads", "Qualified", "Demo", "Quote sent", "Negotiation"];

const fmtBig = (v) => { v = Number(v || 0); return v >= 1e6 ? "$" + (v / 1e6).toFixed(2) + "M" : "$" + Math.round(v / 1e3) + "K"; };

const card = { background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 12, padding: "16px 18px" };
const cardTitle = { fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 16 };

const tickStyle = { fill: "var(--text3)", fontSize: 12, fontFamily: "Inter, sans-serif" };

function RetentionTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 12, boxShadow: "var(--shadow)" }}>
      <div style={{ color: "var(--text3)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "var(--brand-bright)" }}>{payload[0].value}% retained</div>
    </div>
  );
}

export default function Analytics({ API }) {
  const { isMobile, isTablet } = useBreakpoint();
  const kpiColumns = isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)";
  const [deals, setDeals] = useState([]);
  const [retention, setRetention] = useState([]);
  const [horizon, setHorizon] = useState("3");

  const refetch = () => fetch(`${API}/api/db/deals`).then(r => r.json()).then(setDeals).catch(() => setDeals([]));
  useEffect(() => { refetch(); }, [API]);

  useEffect(() => {
    fetch(`${API}/api/db/retention-history?months=${horizon}`).then(r => r.json()).then(setRetention).catch(() => setRetention([]));
  }, [API, horizon]);

  const open = deals.filter(d => d.status === "open");
  const won = deals.filter(d => d.status === "won");
  const lost = deals.filter(d => d.status === "lost");

  const pipelineValue = open.reduce((s, d) => s + (d.value || 0), 0);
  const weighted = open.reduce((s, d) => s + (d.value || 0) * (PROB[d.stage] || 0), 0);
  const winRate = (won.length + lost.length) > 0 ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
  const avgDeal = deals.length ? deals.reduce((s, d) => s + (d.value || 0), 0) / deals.length : 0;
  const conv = deals.length ? Math.round(won.length / deals.length * 100) : 0;

  const hM = horizon === "3" ? 3 : horizon === "6" ? 6 : 12;
  const now = new Date();
  const months = [];
  for (let i = 0; i < hM; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-US", { month: "short" }), total: 0 });
  }
  open.forEach(d => {
    if (!d.expected_close_date) return;
    const k = String(d.expected_close_date).slice(0, 7);
    const m = months.find(x => x.key === k);
    if (m) m.total += (d.value || 0) * (PROB[d.stage] || 0);
  });
  const maxMonth = Math.max(1, ...months.map(m => m.total));
  const fcShades = ["#3B6D11", "#4d8016", "#639922", "#7DB037", "#97C459", "#b0d36f"];
  const hasForecast = months.some(m => m.total > 0);

  const funnel = OPEN_STAGES.map(st => { const ds = open.filter(d => d.stage === st); return { stage: st, n: ds.length, val: ds.reduce((s, d) => s + (d.value || 0), 0) }; });
  const funnelShades = ["var(--cyan)", "#1D9E75", "#3DB390", "#5DCAA5", "var(--brand-bright)"];
  const funnelWidths = [100, 86, 70, 55, 42];

  const retentionVals = retention.map(r => r.retention_pct);
  const minRetention = retentionVals.length ? Math.min(...retentionVals) : 0;
  const retentionYDomain = [Math.max(0, Math.floor((minRetention - 5) / 5) * 5), 100];

  const byOwner = {};
  open.forEach(d => { const o = d.owner || "Unassigned"; byOwner[o] = (byOwner[o] || 0) + (d.value || 0); });
  const reps = Object.entries(byOwner).map(([owner, val]) => ({ owner, val })).sort((a, b) => b.val - a.val);
  const maxRep = Math.max(1, ...reps.map(r => r.val));

  const kpis = [
    { label: "Pipeline value", value: fmtBig(pipelineValue), color: "var(--text)" },
    { label: "Weighted forecast", value: fmtBig(weighted), color: "var(--brand-bright)" },
    { label: "Win rate", value: winRate + "%", color: "#97C459" },
    { label: "Avg deal size", value: fmtBig(avgDeal), color: "var(--text)" },
  ];

  const metrics = [
    ["Opportunities created", String(deals.length), "var(--text)"],
    ["Won deals", String(won.length), "#97C459"],
    ["Lost deals", String(lost.length), "#d98c8c"],
    ["Conversion rate", conv + "%", "var(--text)"],
    ["Avg deal size", fmtBig(avgDeal), "var(--text)"],
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "Inter", fontSize: 32, fontWeight: 600, color: "var(--text)", letterSpacing: -0.5 }}>Analytics</div>
          <div style={{ color: "var(--text2)", fontSize: 15, marginTop: 6 }}>Sales performance &amp; forecast · Digital Move IT &amp; Telecom</div>
        </div>
        <select value={horizon} onChange={(e) => setHorizon(e.target.value)}
          style={{ background: "var(--card)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "Inter", fontSize: 13, padding: "9px 12px", borderRadius: 9, cursor: "pointer", outline: "none" }}>
          <option value="3">Window: 3 months</option>
          <option value="6">Window: 6 months</option>
          <option value="12">Window: 12 months</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: kpiColumns, gap: 14, marginBottom: 18 }}>
        {kpis.map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: k.color, letterSpacing: -0.5 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px", minWidth: 320 }}>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={cardTitle}>Revenue forecast</div>
            {hasForecast ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 6 : 16, height: 150 }}>
                  {months.map((m, i) => (
                    <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{m.total > 0 ? fmtBig(m.total) : ""}</span>
                      <div style={{ width: "100%", height: Math.round((m.total / maxMonth) * 120) + 2, background: fcShades[Math.min(i, fcShades.length - 1)], borderRadius: 5 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: isMobile ? 6 : 16, marginTop: 8 }}>
                  {months.map(m => <span key={m.key} style={{ flex: 1, textAlign: "center", fontSize: 12, color: "var(--text2)" }}>{m.label}</span>)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text3)", padding: "24px 0" }}>No deals with a close date in this window. Set expected close dates on deals to populate the forecast.</div>
            )}
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={cardTitle}>Pipeline funnel</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              {funnel.map((f, i) => (
                <div key={f.stage} style={{ width: funnelWidths[i] + "%", background: funnelShades[i], color: i === 0 ? "#E1F5EE" : "#04342C", borderRadius: 6, padding: "8px 0", textAlign: "center", fontSize: 13, fontWeight: i === 0 ? 400 : 500 }}>
                  {f.stage} · {f.n} · {fmtBig(f.val)}
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>Retention trend</div>
            {retention.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={retention} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}
                  accessibilityLayer role="img" aria-label={`Retention trend over the last ${horizon} months, ending at ${retention[retention.length - 1]?.retention_pct}%`}>
                  <defs>
                    <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-bright)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--brand-bright)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={tickStyle} axisLine={{ stroke: "var(--border)" }} tickLine={false}
                    interval={isMobile ? 1 : (horizon === "12" ? 1 : 0)} />
                  <YAxis domain={retentionYDomain} tick={tickStyle} axisLine={false} tickLine={false} width={38}
                    tickFormatter={(v) => v + "%"} />
                  <Tooltip content={<RetentionTooltip />} cursor={{ stroke: "var(--border2)", strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="retention_pct" stroke="var(--brand-bright)" strokeWidth={2.5}
                    fill="url(#retentionFill)" dot={{ r: 3, fill: "var(--brand-bright)", stroke: "var(--card)", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: "var(--brand-bright)", stroke: "var(--card)", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text3)", padding: "24px 0" }}>No retention snapshots recorded yet. This fills in automatically once client contract data is available.</div>
            )}
          </div>
        </div>

        <div style={{ flex: "1 1 280px", minWidth: 260 }}>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={cardTitle}>Open pipeline by rep</div>
            {reps.length === 0 && <div style={{ fontSize: 13, color: "var(--text3)" }}>No open deals.</div>}
            {reps.map(r => (
              <div key={r.owner} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: "var(--text)" }}>{r.owner}</span>
                  <span style={{ color: "var(--brand-bright)", fontWeight: 600 }}>{fmtBig(r.val)}</span>
                </div>
                <div style={{ height: 8, background: "var(--border)", borderRadius: 4 }}>
                  <div style={{ width: Math.round((r.val / maxRep) * 100) + "%", height: 8, background: "var(--cyan)", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: 12 }}>Sales metrics</div>
            <div style={{ fontSize: 13 }}>
              {metrics.map((m, i) => (
                <div key={m[0]} style={{ display: "flex", justifyContent: "space-between", padding: "9px 8px", borderRadius: 6, background: i % 2 === 0 ? "var(--hover)" : "transparent" }}>
                  <span style={{ color: "var(--text2)" }}>{m[0]}</span>
                  <span style={{ color: m[2], fontWeight: m[2] !== "var(--text)" ? 600 : 400 }}>{m[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
