import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceDot,
} from "recharts";
import CountUp from "../components/CountUp";
import { cardHoverProps } from "../utils/cardHover";
import useBreakpoint from "../hooks/useBreakpoint";

const PROB = { "New Leads": 0.10, "Qualified": 0.25, "Demo": 0.40, "Quote sent": 0.60, "Negotiation": 0.80 };
const OPEN_STAGES = ["New Leads", "Qualified", "Demo", "Quote sent", "Negotiation"];

const fmtBig = (v) => { v = Number(v || 0); return v >= 1e6 ? "$" + (v / 1e6).toFixed(2) + "M" : "$" + Math.round(v / 1e3) + "K"; };
const monthKey = (d) => d.toLocaleDateString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(-2);

const card = { background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 12, padding: "16px 18px" };
const cardTitle = { fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 16 };

const tickStyle = { fill: "var(--text3)", fontSize: 12, fontFamily: "Inter, sans-serif" };

function ChartTooltipCard({ children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 12, boxShadow: "var(--shadow)" }}>
      {children}
    </div>
  );
}

function RetentionTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <ChartTooltipCard>
      <div style={{ color: "var(--text3)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "var(--brand-bright)" }}>{payload[0].value}% retained</div>
    </ChartTooltipCard>
  );
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <ChartTooltipCard>
      <div style={{ color: "var(--text3)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "var(--text)" }}>{fmtBig(payload[0].value)} weighted</div>
    </ChartTooltipCard>
  );
}

function FunnelTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <ChartTooltipCard>
      <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{d.name}</div>
      <div style={{ color: "var(--text3)" }}>{d.n} deal{d.n === 1 ? "" : "s"} · {fmtBig(d.value)}</div>
    </ChartTooltipCard>
  );
}

function RepTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <ChartTooltipCard>
      <div style={{ fontWeight: 600, color: "var(--text)" }}>{d.owner}</div>
      <div style={{ color: "var(--brand-bright)" }}>{fmtBig(d.val)} open pipeline</div>
    </ChartTooltipCard>
  );
}

export default function Analytics({ API }) {
  const { isMobile, isTablet } = useBreakpoint();
  const kpiColumns = isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)";
  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [retention, setRetention] = useState([]);
  const [horizon, setHorizon] = useState("3");

  useEffect(() => {
    fetch(`${API}/api/db/deals`).then(r => r.json()).then(setDeals).catch(() => setDeals([]));
  }, [API]);

  useEffect(() => {
    fetch(`${API}/api/db/clients`).then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => setClients([]));
  }, [API]);

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
  const fcShades = ["#3B6D11", "#4d8016", "#639922", "#7DB037", "#97C459", "#b0d36f"];
  const hasForecast = months.some(m => m.total > 0);
  const maxMonth = Math.max(1, ...months.map(m => m.total));

  const funnel = OPEN_STAGES.map(st => { const ds = open.filter(d => d.stage === st); return { name: st, n: ds.length, value: ds.reduce((s, d) => s + (d.value || 0), 0) }; });
  const funnelShades = ["var(--cyan)", "#1D9E75", "#3DB390", "#5DCAA5", "var(--brand-bright)"];

  // Rescale to the real data range (not a flat 0-100) so the true variation is visible.
  const retentionVals = retention.map(r => r.retention_pct);
  const minRetention = retentionVals.length ? Math.min(...retentionVals) : 0;
  const maxRetention = retentionVals.length ? Math.max(...retentionVals) : 100;
  const retentionYDomain = [
    Math.max(0, Math.floor((minRetention - 5) / 5) * 5),
    Math.min(100, Math.ceil((maxRetention + 5) / 5) * 5),
  ];

  // Inflection annotation: which of the shown months had the most contract
  // expirations, computed from real client data (not fabricated) -- only
  // called out when it's actually a meaningful cluster (2+).
  const expiredByMonth = {};
  clients.forEach(c => {
    if (!c.contract_expiry) return;
    if (c.journey_stage !== "Expired" && c.journey_stage !== "Critical") return;
    const d = new Date(c.contract_expiry);
    if (isNaN(d)) return;
    const k = monthKey(d);
    expiredByMonth[k] = (expiredByMonth[k] || 0) + 1;
  });
  let inflection = null;
  retention.forEach(r => {
    const n = expiredByMonth[r.month] || 0;
    if (n >= 2 && (!inflection || n > inflection.n)) inflection = { month: r.month, n, retention_pct: r.retention_pct };
  });

  const byOwner = {};
  open.forEach(d => { const o = d.owner || "Unassigned"; byOwner[o] = (byOwner[o] || 0) + (d.value || 0); });
  const reps = Object.entries(byOwner).map(([owner, val]) => ({ owner, val })).sort((a, b) => b.val - a.val);
  const maxRep = Math.max(1, ...reps.map(r => r.val));
  const maxFunnel = Math.max(1, ...funnel.map(f => f.value));

  const kpis = [
    { label: "Pipeline value", value: pipelineValue, format: fmtBig, color: "var(--text)" },
    { label: "Weighted forecast", value: weighted, format: fmtBig, color: "var(--brand-bright)" },
    { label: "Win rate", value: winRate, format: (v) => Math.round(v) + "%", color: "#97C459" },
    { label: "Avg deal size", value: avgDeal, format: fmtBig, color: "var(--text)" },
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
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5 }}>Analytics</div>
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
          <div key={k.label} style={card} {...cardHoverProps}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 600, color: k.color, letterSpacing: -0.3 }}><CountUp value={k.value} format={k.format} /></div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px", minWidth: 320 }}>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={cardTitle}>Revenue forecast</div>
            {hasForecast ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={months} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
                  accessibilityLayer role="img" aria-label={`Weighted revenue forecast for the next ${hM} months`}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis hide domain={[0, maxMonth * 1.15]} />
                  <Tooltip content={<ForecastTooltip />} cursor={{ fill: "var(--hover2)" }} />
                  <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={64}>
                    <LabelList dataKey="total" position="top" formatter={(v) => (v > 0 ? fmtBig(v) : "")} style={{ fill: "var(--text)", fontSize: 12.5, fontWeight: 600, fontFamily: "Inter, sans-serif" }} />
                    {months.map((m, i) => <Cell key={m.key} fill={fcShades[Math.min(i, fcShades.length - 1)]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text3)", padding: "24px 0" }}>No deals with a close date in this window. Set expected close dates on deals to populate the forecast.</div>
            )}
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={cardTitle}>Pipeline funnel</div>
            {funnel.some(f => f.value > 0) ? (
              // Dollar value isn't monotonically decreasing stage-to-stage (later
              // stages carry fewer, larger deals), so a geometric funnel shape
              // misrepresents it -- a stage-ordered horizontal bar keeps the real
              // sequence legible while still getting hover tooltips + shared styling.
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
                  accessibilityLayer role="img" aria-label="Open pipeline by stage, in sequence order">
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" hide domain={[0, maxFunnel * 1.15]} />
                  <YAxis type="category" dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} width={82} />
                  <Tooltip content={<FunnelTooltip />} cursor={{ fill: "var(--hover2)" }} />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={26}>
                    <LabelList dataKey="value" position="right" formatter={fmtBig} style={{ fill: "var(--text2)", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif" }} />
                    {funnel.map((f, i) => <Cell key={f.name} fill={funnelShades[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text3)", padding: "24px 0" }}>No open deals yet.</div>
            )}
          </div>

          <div style={card}>
            <div style={cardTitle}>Retention trend</div>
            {retention.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={retention} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}
                  accessibilityLayer role="img" aria-label={`Retention trend over the last ${horizon} months, ending at ${retention[retention.length - 1]?.retention_pct}%`}>
                  <defs>
                    <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--green)" stopOpacity={0.32} />
                      <stop offset="55%" stopColor="var(--amber)" stopOpacity={0.20} />
                      <stop offset="100%" stopColor="var(--red)" stopOpacity={0.14} />
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
                  {inflection && (
                    <ReferenceDot x={inflection.month} y={inflection.retention_pct} r={0}
                      label={{ value: `${inflection.n} contracts expired here`, position: "top", fill: "var(--red)", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif" }} />
                  )}
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
            {reps.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text3)" }}>No open deals.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, reps.length * 44)}>
                <BarChart data={reps} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                  accessibilityLayer role="img" aria-label="Open pipeline value by sales rep">
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" hide domain={[0, maxRep * 1.15]} />
                  <YAxis type="category" dataKey="owner" tick={tickStyle} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<RepTooltip />} cursor={{ fill: "var(--hover2)" }} />
                  <Bar dataKey="val" fill="var(--cyan)" radius={[0, 5, 5, 0]} maxBarSize={22}>
                    <LabelList dataKey="val" position="right" formatter={fmtBig} style={{ fill: "var(--brand-bright)", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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
