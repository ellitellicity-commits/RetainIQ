import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

function getWarmthColor(warmth) {
  if (warmth > 0.7) return "var(--green)";
  if (warmth >= 0.4) return "var(--amber)";
  return "var(--red)";
}

function getWarmthLabel(warmth) {
  if (warmth > 0.7) return "warm";
  if (warmth >= 0.4) return "lukewarm";
  return "cold";
}

// The map only has an influence bucket (high/medium/low) to work with, not a
// real job-function taxonomy -- translate that into a plain-language tag
// rather than inventing detail the data doesn't support.
function getInfluenceTag(influence) {
  switch (influence) {
    case "high": return "Decision-maker";
    case "medium": return "Influencer";
    default: return "Stakeholder";
  }
}

function getInfluenceSize(influence) {
  switch (influence) {
    case "high":
      return 24;
    case "medium":
      return 18;
    case "low":
      return 14;
    default:
      return 18;
  }
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function RelationshipMap({ data }) {
  const [hoveredContact, setHoveredContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  const hubRef = useRef(null);
  const nodeRefs = useRef([]);
  const lineRefs = useRef([]);
  const badgeRefs = useRef([]);

  const svgWidth = 480;
  const svgHeight = 380;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const orbitRadius = 130;
  const companyNodeRadius = 36;

  const contacts = data ? data.contacts : [];
  const company = data ? data.company : "";

  const contactPositions = contacts.map((contact, i) => {
    const angle = (2 * Math.PI * i) / contacts.length - Math.PI / 2;
    return {
      ...contact,
      x: centerX + orbitRadius * Math.cos(angle),
      y: centerY + orbitRadius * Math.sin(angle),
      radius: getInfluenceSize(contact.influence),
    };
  });

  // Company switch is a full re-read of the map, not an edit to it -- clear
  // any popover left open on the previous company's contact list, whose
  // index would otherwise point at an unrelated person.
  useEffect(() => {
    setSelectedContact(null);
    setHoveredContact(null);
  }, [company]);

  // Entrance choreography, replayed every time the selected company changes:
  // the hub and connecting lines settle first, then contact nodes pop in
  // with a slight stagger. Animates the `r` SVG attribute (not a CSS
  // transform) and gsap.set/.to on real refs throughout -- both deliberate,
  // since transform-based scaling on SVG shapes needs an explicit
  // transform-box/-origin to scale around their own center rather than the
  // svg viewport's (0,0) corner, and `r` sidesteps that entirely.
  useEffect(() => {
    const hub = hubRef.current;
    const nodes = nodeRefs.current.filter(Boolean);
    const lines = lineRefs.current.filter(Boolean);
    const badges = badgeRefs.current.filter(Boolean);
    if (!hub || nodes.length === 0) return undefined;

    const targetNodeR = contactPositions.map((c) => c.radius);

    gsap.set(hub, { attr: { r: 0 } });
    gsap.set(lines, { opacity: 0 });
    gsap.set(nodes, { attr: { r: 0 } });
    if (badges.length) gsap.set(badges, { opacity: 0, attr: { r: 0 } });

    const tl = gsap.timeline({ delay: 0.1 });
    tl.to(hub, { attr: { r: companyNodeRadius }, duration: 0.45, ease: "back.out(2)" })
      .to(lines, { opacity: 1, duration: 0.3, ease: "power1.out", stagger: 0.04 }, "-=0.15")
      .to(nodes, { attr: { r: (i) => targetNodeR[i] }, duration: 0.4, ease: "back.out(2.2)", stagger: 0.06 }, "-=0.2");
    if (badges.length) {
      tl.to(badges, { opacity: 1, attr: { r: 4 }, duration: 0.25, ease: "power1.out", stagger: 0.06 }, "-=0.25");
    }

    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, contacts.length]);

  if (!data) return null;

  const handleEnter = (i) => {
    setHoveredContact(i);
    const node = nodeRefs.current[i];
    if (node) gsap.to(node, { attr: { r: contactPositions[i].radius + 3 }, duration: 0.15, ease: "power1.out" });
    const line = lineRefs.current[i];
    if (line) gsap.to(line, { strokeOpacity: 0.9, duration: 0.15 });
  };
  const handleLeave = (i) => {
    setHoveredContact(null);
    const node = nodeRefs.current[i];
    if (node) gsap.to(node, { attr: { r: contactPositions[i].radius }, duration: 0.2, ease: "power1.out" });
    const line = lineRefs.current[i];
    if (line) gsap.to(line, { strokeOpacity: 0.5, duration: 0.2 });
  };

  const popoverContact = selectedContact !== null ? contactPositions[selectedContact] : null;

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {/* Connection lines */}
        {contactPositions.map((contact, i) => (
          <line
            key={`line-${i}`}
            ref={(el) => (lineRefs.current[i] = el)}
            x1={centerX}
            y1={centerY}
            x2={contact.x}
            y2={contact.y}
            stroke={getWarmthColor(contact.warmth)}
            strokeWidth={2}
            strokeOpacity={0.5}
            strokeDasharray={contact.warmth < 0.4 ? "4 3" : "none"}
          />
        ))}

        {/* Company center node */}
        <circle
          ref={hubRef}
          cx={centerX}
          cy={centerY}
          r={companyNodeRadius}
          fill="var(--cyan)"
          opacity={0.9}
        />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={11}
          fontWeight={700}
          letterSpacing="0.02em"
        >
          {company.length > 12 ? company.slice(0, 11) + "..." : company}
        </text>

        {/* Contact nodes */}
        {contactPositions.map((contact, i) => (
          <g
            key={`contact-${i}`}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={() => handleLeave(i)}
            onClick={() => setSelectedContact((s) => (s === i ? null : i))}
            style={{ cursor: "pointer" }}
          >
            {/* Outer ring for warmth indication */}
            <circle
              cx={contact.x}
              cy={contact.y}
              r={contact.radius + 3}
              fill="none"
              stroke={getWarmthColor(contact.warmth)}
              strokeWidth={2}
              strokeOpacity={0.6}
            />
            {/* Node circle -- radius is animated (entrance + hover), so it
                starts at the JSX value and gsap takes over from there. */}
            <circle
              ref={(el) => (nodeRefs.current[i] = el)}
              cx={contact.x}
              cy={contact.y}
              r={contact.radius}
              fill="var(--card)"
              stroke={selectedContact === i ? "var(--brand-bright)" : getWarmthColor(contact.warmth)}
              strokeWidth={selectedContact === i ? 2.5 : 1.5}
            />
            {/* Champion/decision-maker marker -- influence is a coarse
                bucket, so this reads as "high influence," not a fabricated
                job title. */}
            {contact.influence === "high" && (
              <circle
                ref={(el) => (badgeRefs.current[i] = el)}
                cx={contact.x + contact.radius * 0.62}
                cy={contact.y - contact.radius * 0.62}
                r={4}
                fill="var(--brand-bright)"
                stroke="var(--card)"
                strokeWidth={1.5}
              />
            )}
            {/* Initials */}
            <text
              x={contact.x}
              y={contact.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text)"
              fontSize={contact.radius * 0.7}
              fontWeight={600}
              style={{ pointerEvents: "none" }}
            >
              {getInitials(contact.name)}
            </text>
            {/* Name label below node */}
            <text
              x={contact.x}
              y={contact.y + contact.radius + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text2)"
              fontSize={10}
              fontWeight={500}
              style={{ pointerEvents: "none" }}
            >
              {contact.name.split(" ")[0]}
            </text>
          </g>
        ))}
      </svg>

      {/* Hover hint -- name + role only, a lightweight "this is clickable"
          preview. Full detail lives in the click popover below. */}
      {hoveredContact !== null && selectedContact !== hoveredContact && (
        <div
          style={{
            position: "absolute",
            top: contactPositions[hoveredContact].y - 10,
            left: contactPositions[hoveredContact].x + contactPositions[hoveredContact].radius + 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "8px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            zIndex: 10,
            pointerEvents: "none",
            minWidth: 140,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            {contactPositions[hoveredContact].name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>
            {contactPositions[hoveredContact].role}
          </div>
        </div>
      )}

      {/* Click popover -- persistent detail panel, not a navigation. */}
      {popoverContact && (
        <div
          style={{
            position: "absolute",
            top: Math.max(0, popoverContact.y - 20),
            left: Math.min(svgWidth - 190, popoverContact.x + popoverContact.radius + 14),
            background: "var(--card)",
            border: "1px solid var(--brand-bright)",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            zIndex: 11,
            minWidth: 190,
          }}
        >
          <button
            onClick={() => setSelectedContact(null)}
            aria-label="Close"
            style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 2, lineHeight: 0 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" /></svg>
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2, paddingRight: 14 }}>
            {popoverContact.name}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text2)", marginBottom: 8 }}>
            {popoverContact.role}
          </div>
          <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "var(--brand-bright)", background: "var(--cyan-dim)", padding: "2px 8px", borderRadius: 6, marginBottom: 8 }}>
            {getInfluenceTag(popoverContact.influence)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>Relationship:</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: getWarmthColor(popoverContact.warmth) }}>
              {getWarmthLabel(popoverContact.warmth)} · {Math.round(popoverContact.warmth * 100)}%
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>
            Last contact: {popoverContact.lastContact} days ago
          </div>
        </div>
      )}
    </div>
  );
}
