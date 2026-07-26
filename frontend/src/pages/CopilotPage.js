import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import RelationshipMap from "../components/RelationshipMap";
import { DEAL_INSIGHTS, MEETING_PREPS, RELATIONSHIP_MAP, NEXT_BEST_ACTIONS } from "../data/mockData";
import useBreakpoint from "../hooks/useBreakpoint";

const ICONS = {
  sparkle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  ),
  lightning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  externalLink: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

function getSeverityColor(severity) {
  switch (severity) {
    case "critical": return "var(--red)";
    case "high": return "var(--amber)";
    case "medium": return "var(--amber)";
    case "low": return "var(--blue, var(--cyan))";
    default: return "var(--text3)";
  }
}

function getWarmthLabel(warmth) {
  if (warmth > 0.7) return "warm";
  if (warmth >= 0.4) return "lukewarm";
  return "cold";
}

function DealInsightCard({ insight, matchedDeal, onOpenDeal }) {
  const [expanded, setExpanded] = useState(true);
  const fillRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!fillRef.current || hasAnimated.current) return;
    hasAnimated.current = true;
    gsap.fromTo(
      fillRef.current,
      { width: "0%" },
      { width: `${insight.confidence * 100}%`, duration: 0.9, ease: "power2.out", delay: 0.15 }
    );
  }, [insight.confidence]);

  return (
    <div style={{ background: "var(--bg, color-mix(in srgb, var(--card) 80%, black))", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      {/* Header row -- always visible, toggles the detail below */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", font: "inherit" }}
      >
        <span
          style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
            color: getSeverityColor(insight.severity),
            background: `color-mix(in srgb, ${getSeverityColor(insight.severity)} 12%, transparent)`,
            padding: "3px 9px", borderRadius: 10, flexShrink: 0,
          }}
        >
          {insight.severity}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1 }}>{insight.title}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan)", flexShrink: 0 }}>{insight.impact}</span>
        <span style={{ display: "flex", color: "var(--text3)", transition: "transform 0.2s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }}>
          {ICONS.chevron}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "0 18px 16px" }}>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>{insight.reason}</div>

          <div style={{ fontSize: 12, color: "var(--text2)", padding: "10px 14px", background: "color-mix(in srgb, var(--cyan) 6%, transparent)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--cyan)", lineHeight: 1.5, marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: "var(--cyan)", fontSize: 10, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Recommendation</span>
            {insight.recommendation}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: matchedDeal ? 10 : 0 }}>
            <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500 }}>Confidence</span>
            <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div ref={fillRef} style={{ width: 0, height: "100%", background: "var(--cyan)", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", minWidth: 32, textAlign: "right" }}>
              {Math.round(insight.confidence * 100)}%
            </span>
          </div>

          {matchedDeal && onOpenDeal && (
            <button
              onClick={() => onOpenDeal(matchedDeal.id)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, color: "var(--cyan)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              {ICONS.externalLink} View {insight.dealName} in Pipeline
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CopilotPage({ API, onOpenDeal }) {
  const { isMobile } = useBreakpoint();
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/db/deals`).then((r) => r.json()).then((d) => setDeals(Array.isArray(d) ? d : [])).catch(() => setDeals([]));
  }, [API]);

  const dealFor = (dealName) => deals.find((d) => (d.company || "").toLowerCase() === (dealName || "").toLowerCase());
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [selectedMeetingCompany, setSelectedMeetingCompany] = useState(Object.keys(MEETING_PREPS)[0]);

  const avgConfidence = Math.round(
    (DEAL_INSIGHTS.reduce((sum, d) => sum + d.confidence, 0) / DEAL_INSIGHTS.length) * 100
  );

  const selectedMapData = RELATIONSHIP_MAP[selectedMapIndex];
  const warmCounts = { warm: 0, lukewarm: 0, cold: 0 };
  selectedMapData.contacts.forEach((c) => {
    warmCounts[getWarmthLabel(c.warmth)]++;
  });

  const meetingData = MEETING_PREPS[selectedMeetingCompany];

  return (
    <div
      style={{
        padding: isMobile ? "8px 4px 24px" : "32px 40px",
        maxWidth: 1100,
        margin: "0 auto",
        overflowY: "auto",
        minHeight: "100dvh",
      }}
    >
      {/* ===== SECTION 1: HEADER ===== */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ color: "var(--brand-bright)", display: "flex", alignItems: "center" }}>
            {ICONS.sparkle}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            AI Co-pilot
          </h1>
        </div>
        <p style={{ fontSize: 14, color: "var(--text3)", margin: "0 0 24px 0" }}>
          Your AI-powered sales intelligence hub
        </p>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          <StatCard label="Active Insights" value={DEAL_INSIGHTS.length} color="var(--cyan)" />
          <StatCard label="Actions Pending" value={NEXT_BEST_ACTIONS.length} color="var(--amber)" />
          <StatCard label="Avg Confidence" value={`${avgConfidence}%`} color="var(--green)" />
        </div>
      </div>

      {/* ===== SECTION 2: RELATIONSHIP HEALTH MAP ===== */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 16px 0" }}>
          Relationship Intelligence
        </h2>

        {/* Company tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {RELATIONSHIP_MAP.map((item, idx) => (
            <button
              key={item.company}
              onClick={() => setSelectedMapIndex(idx)}
              style={{
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: "var(--radius)",
                border: selectedMapIndex === idx ? "1px solid var(--cyan)" : "1px solid var(--border)",
                background: selectedMapIndex === idx ? "color-mix(in srgb, var(--cyan) 12%, transparent)" : "transparent",
                color: selectedMapIndex === idx ? "var(--cyan)" : "var(--text2)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {item.company}
            </button>
          ))}
        </div>

        {/* Relationship Map */}
        <RelationshipMap data={selectedMapData} />

        {/* Summary text */}
        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 12,
            color: "var(--text3)",
            fontWeight: 500,
          }}
        >
          <span style={{ color: "var(--green)", fontWeight: 600 }}>{warmCounts.warm} warm</span>
          {", "}
          <span style={{ color: "var(--amber)", fontWeight: 600 }}>{warmCounts.lukewarm} lukewarm</span>
          {", "}
          <span style={{ color: "var(--red)", fontWeight: 600 }}>{warmCounts.cold} cold</span>
          {" contacts"}
        </div>
      </div>

      {/* ===== SECTION 3: MEETING PREP ===== */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 16px 0" }}>
          Meeting Prep
        </h2>

        {/* Company selector */}
        <div style={{ marginBottom: 20 }}>
          <select
            value={selectedMeetingCompany}
            onChange={(e) => setSelectedMeetingCompany(e.target.value)}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
              outline: "none",
              minWidth: 180,
            }}
          >
            {Object.keys(MEETING_PREPS).map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {meetingData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Company Context */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Company Context
              </h3>
              <p style={{ fontSize: 13, color: "var(--text2)", margin: 0, lineHeight: 1.6 }}>
                {meetingData.companyContext}
              </p>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Recent Activity
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                {meetingData.recentActivity.map((item, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6, lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Talking Points */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Talking Points
              </h3>
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {meetingData.talkingPoints.map((point, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--text2)",
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "var(--amber)", display: "flex", alignItems: "center", marginTop: 1, flexShrink: 0 }}>
                      {ICONS.lightning}
                    </span>
                    <span>
                      <span style={{ color: "var(--text3)", fontWeight: 600, marginRight: 6 }}>{i + 1}.</span>
                      {point}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Key Stakeholders */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Key Stakeholders
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {meetingData.stakeholders.map((stakeholder, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 14px",
                      background: "var(--bg, color-mix(in srgb, var(--card) 80%, black))",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                      {stakeholder.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>
                      {stakeholder.role}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {stakeholder.influence}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risks */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Risks
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {meetingData.risks.map((risk, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
                      background: "color-mix(in srgb, var(--red) 6%, var(--card))",
                      border: "1px solid color-mix(in srgb, var(--red) 20%, var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <span style={{ color: "var(--red)", display: "flex", alignItems: "center", marginTop: 1, flexShrink: 0 }}>
                      {ICONS.warning}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                      {risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== SECTION 4: DEAL INTELLIGENCE ===== */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 16px 0" }}>
          Deal Insights
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {DEAL_INSIGHTS.map((insight) => (
            <DealInsightCard key={insight.id} insight={insight} matchedDeal={dealFor(insight.dealName)} onOpenDeal={onOpenDeal} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "18px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 26,
          fontWeight: 600,
          color: color,
          marginBottom: 4,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
    </div>
  );
}
