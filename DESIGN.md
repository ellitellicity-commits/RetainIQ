---
name: RetainIQ
description: AI-native CRM that predicts churn and drafts the outreach to prevent it.
colors:
  bg: "#ece8e0"
  card: "#faf8f2"
  sidebar: "#e6e2d8"
  hover: "#e8e4da"
  border: "#ddd8cc"
  border2: "#ccc7b9"
  signal-green: "#0f6e56"
  amber-caution: "#b8740f"
  alert-red: "#c0392b"
  soft-alert: "#b5483f"
  confirmed-green: "#14735d"
  ai-purple: "#7c3aed"
  info-blue: "#2563eb"
  text-primary: "#2a2a28"
  text-secondary: "#57534a"
  text-tertiary: "#827d6f"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.5px"
  stat:
    fontFamily: "Inter, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.6px"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "1.5px"
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-green}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.confirmed-green}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "9px 18px"
  stat-card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "22px 24px"
  status-chip:
    rounded: "{rounded.xs}"
    padding: "3px 12px"
---

# Design System: RetainIQ

## Overview

**Creative North Star: "The Early Warning System"**

RetainIQ's interface is an instrument panel for catching account risk before it becomes churn, not a decorative CRM shell. Every recurring visual device — the pulsing live-status dot, the risk gauge, the color-coded journey stages — exists to answer one question at a glance: is this account fine, or does it need a call today. Signal Green is deliberately the resting/all-clear state; Amber and Red are reserved for escalating alarm, and that reservation is the entire point of the palette.

The voice is calm and clinical: dense data surfaces (KPI grids, sortable tables, drawers packed with contract detail) rendered with soft ambient shadows, restrained 8–16px radii, and a single typeface (Inter) carrying the whole hierarchy through weight and size rather than mixed fonts. Motion is present but purposeful — spring-eased panels, staggered card fade-ups, a pulsing dot on live status — never decorative for its own sake. The system supports full light/dark theming through CSS custom properties; almost every surface, text, and accent color routes through a `var(--token)` rather than a literal value.

**Key Characteristics:**
- One typeface (Inter) for the entire hierarchy — no serif/mono pairing despite what older project docs claim.
- Signal Green as the calm baseline; Amber/Red exist only to signal escalating risk.
- Flat-by-default surfaces with soft ambient shadows at rest, deeper directional shadows on overlays.
- Small, consistent radii (6–16px) plus a 999px pill for filters and status pills — no sharp corners, no heavy rounding.
- Full light/dark theming via CSS custom properties, with a brighter accent variant (`--brand-bright`) swapped in for dark mode where the flat brand color would go flat against a dark surface.

## Colors

A muted, editorial palette built around one calm green accent, with amber/red reserved strictly for risk escalation.

### Primary
- **Signal Green** (`#0f6e56` light / `#6FD9B7` dark): the brand accent — primary buttons, active nav state, focus rings, links, the "all clear" reading on any risk-adjacent element. In dark mode this token (`--brand-bright`) shifts to a brighter mint so it stays legible against dark surfaces; the flat `#0f6e56` (`--cyan`) is kept for smaller accents (icons, borders, glows) where full brightness isn't needed.

### Secondary
- **Confirmed Green** (`#14735d` light / `#1b7361` dark): a close neighbor to Signal Green, used specifically for success/confirmation states — the "live" status pill, a completed send action — kept distinct so a *confirmed action* doesn't visually collide with the *baseline brand accent*.
- **AI Purple** (`#7c3aed` light / `#a78bfa` dark): marks AI-originated content and meeting-type activity — the copilot sparkle icon, AI insight notifications, meeting entries on the activity timeline. Reserved for "this came from the assistant," not used as a general accent.
- **Info Blue** (`#2563eb` light / `#60a5fa` dark): neutral secondary information — medium-priority markers, pending states, mention notifications. The quietest of the semantic colors; used when something needs a color but isn't yet urgent.

### Tertiary
- **Amber Caution** (`#b8740f` light / `#c29a38` dark): at-risk state only — the At-Risk journey stage, expiring-soon KPIs, medium-severity alerts.
- **Alert Red** (`#c0392b` light / `#d94c4c` dark): critical/expired state only — the highest-severity badge in the system. Paired with **Soft Alert** (`#b5483f` light / `#e2a0a0` dark) for softer danger accents (form validation, less final warnings).

### Neutral
- **Canvas** (`#ece8e0` light / `#30302e` dark): the page background (`--bg`).
- **Card** (`#faf8f2` light / `#262624` dark): surface for cards, tables, panels (`--card`).
- **Sidebar** (`#e6e2d8` light / `#2a2a28` dark): the nav rail's distinct, slightly deeper surface (`--sidebar`).
- **Border** (`#ddd8cc` light / `#3a3a36` dark) and **Border, Deep** (`#ccc7b9` light / `#45433d` dark): default and hover/emphasis border weights.
- **Text Primary** (`#2a2a28` light / `#f4f4f2` dark), **Text Secondary** (`#57534a` / `#bfbfbf`), **Text Tertiary** (`#827d6f` / `#8a8a86`): a three-step legibility hierarchy — primary for values and headings, secondary for supporting copy, tertiary for labels, meta, and placeholders.

### Named Rules
**The Reserved Alarm Rule.** Amber and Red never appear as decoration or as a general accent — they exist exclusively to mark At-Risk and Critical/Expired states. If a new element needs an eye-catching color without implying risk, reach for Signal Green or AI Purple, never Amber/Red.

**The Bright Variant Rule.** Dark theme doesn't just invert lightness — where the flat brand accent (`--cyan`, `#0f6e56`) would read flat against a dark surface, dark mode swaps in a distinct brighter token (`--brand-bright`, `#6FD9B7`) for foregrounded uses like active nav text and the logo. Follow this pattern for any new accent that needs to read clearly on both a light card and a near-black sidebar.

### Known inconsistency
The Active/At-Risk/Critical/Expired **status chip** colors (used in Dashboard and Clients tables) are hardcoded hex pairs (e.g. `#f3dada`/`#a83838`) defined locally per-page, not routed through the `--var()` token system like every other color in the app. They render identically in light and dark mode and don't currently adapt. This is a known quirk of the current implementation, not an intentional design decision — new status-color work should route through tokens; don't propagate the hardcoded pattern.

## Typography

**Display / Body / Label Font:** Inter (system sans-serif fallback).

**Character:** One typeface carries the entire hierarchy through weight and size rather than a display/body pairing. This keeps the dense, data-heavy surfaces (tables, KPI grids, drawers) feeling like one continuous instrument rather than a mix of typographic voices.

### Hierarchy
- **Display** (600, 32px, -0.5px tracking): page titles ("Dashboard", "Clients").
- **Stat** (700, 34–40px, -0.6px to -1px tracking): the large number in a KPI card — the single most important value on a dashboard-style page.
- **Title** (700, 20–22px): section/step headers, drawer titles.
- **Body** (400–500, 13–16px): table cells, form fields, general copy.
- **Label** (600–700, 9–11px, 1–1.5px tracking, uppercase): table headers, stat labels, badges, section eyebrows — the smallest, most technical layer of the type system.

### Named Rules
**The One Font Rule.** Every weight and size in the system comes from Inter. Do not introduce a second family (serif, mono, or otherwise) for "editorial" or "technical" flavor — hierarchy is built with size, weight, and letter-spacing, not font mixing.

## Layout

The shell is a fixed-height, no-page-scroll application frame: a collapsible left sidebar (222px expanded / 66px collapsed, icon-only when collapsed) plus a scrollable main content column, with the AI Co-pilot as a slide-in panel from the right and a Command Palette (Ctrl+K) as a centered overlay. Content pages cap around 1300px and use a consistent `page-wrap`-style padding (~28–34px).

KPI/stat rows use a 4-column grid (`repeat(4, 1fr)`, 14–16px gap) with each card entering on a staggered Framer Motion fade-up (`delay: i * 0.05`). Tables are full-width with a bordered, rounded (12px) wrapping container and a distinct header row. Client/deal detail opens as a right-side drawer that overlays the content column rather than navigating away.

## Responsive Layout

RetainIQ shipped desktop-only through its first several features; this section is the first documented responsive treatment, introduced for the mobile/responsive optimization pass. Treat it as a new, first-of-its-kind pattern the same way Charts (Recharts) and the AI Co-pilot Panel were when they were introduced — everything below is binding for new responsive work, not just descriptive of what exists.

**Breakpoints** (`frontend/src/hooks/useBreakpoint.js`, `window.innerWidth`-based with a resize listener):
- **Mobile**: ≤640px
- **Tablet**: 641–1024px
- **Desktop**: >1024px (the original, unchanged experience)

Two tiers exist because several grids need a 4→2→1 or 3→2→1 collapse, not a single on/off switch.

**Why a JS hook, not CSS media queries.** The existing, active design system is inline-style + CSS custom properties (see Do's and Don'ts) — there is no App.css class layer new work should extend. `useBreakpoint()` keeps responsive decisions in the same inline-style idiom every page already uses, and — critically — it can drive *structural* swaps (off-canvas nav vs. sidebar, a Kanban move-to-stage control vs. drag, a full-screen overlay vs. a fixed-width panel) that CSS media queries alone cannot express. Reach for plain CSS only for things that never need JS awareness (e.g. a bare font-size tweak); default to the hook for anything else.

**Navigation.** Below the mobile breakpoint, the persistent sidebar is replaced by an off-canvas drawer behind a hamburger trigger in a new mobile top bar. This is a straight reskin, not a new nav concept: the drawer renders the same `mainTabs`/`aiTabs` arrays and the same `renderTab` logic already in `App.js`, just behind a different trigger. The existing icon-only collapsed sidebar (66px) remains a desktop-only space-saving toggle — it is not the mobile nav pattern, and was never meant to be one.

**Overlays and panels.** Fixed-width panels (`ChatWidget`, `AICopilotPanel`, the client/deal detail drawer) become full-screen takeovers below the mobile breakpoint rather than shrinking in place — a 380px chat panel or a 560px drawer has no legible smaller version on a 360–390px phone viewport. `NotificationCenter`'s dropdown instead clamps to `min(360px, calc(100vw - 24px))` since it's a small anchored popover, not a primary task surface. All overlay/panel z-index values share one scale (the drawer/palette scale already used in `Journey.js`/`Customers.js`) so multiple full-screen takeovers can never silently collide.

**Tables.** Wrap in `overflowX: auto`, never `overflow: hidden` — the same horizontal-scroll pattern already used for the Kanban board and a few other flex rows, just applied consistently to data tables too.

**Kanban board.** Native HTML5 drag-and-drop (`draggable`/`onDragStart`/`onDrop`) does not fire on touch at all. Below the mobile breakpoint, each deal card gets an explicit "Move to stage" control as a first-class action — not a fallback bolted on after the fact, and not a replacement for desktop drag.

## Elevation & Depth

The system is mostly flat, with shadow reserved to separate resting content from floating overlays — not used as general decoration.

### Shadow Vocabulary
- **Ambient** (`box-shadow: var(--shadow)` → `0 1px 3px rgba(0,0,0,0.07)` light / `0 4px 24px rgba(0,0,0,0.4)` dark): resting cards, stat tiles, the base state of any surface sitting on the canvas.
- **Directional overlay**: drawers and panels cast a deeper shadow toward the edge they slide in from — e.g. the client detail drawer (`-8px 0 30px rgba(0,0,0,0.5)`) and AI Co-pilot panel (`-4px 0 24px rgba(0,0,0,0.18)`) both shadow leftward, since both enter from the right.
- **Modal** (`0 20px 60px rgba(0,0,0,0.4)`): centered dialogs (e.g. the email edit modal) get the deepest, most diffuse shadow in the system, appropriate to floating above everything else.

### Named Rules
**The Directional Shadow Rule.** An overlay's shadow points toward the edge it emerged from, reinforcing where it came from and that it's temporary. A modal, which has no single edge of origin, gets an omnidirectional shadow instead.

## Shapes

Small, consistent radii throughout — nothing sharp, nothing heavily rounded. Inputs and buttons sit at 8–10px, cards and table containers at 10–14px, drawers/modals at 14–16px, and anything pill-shaped (filter chips, status pills, the live-status indicator) goes fully round at 999px. No borders heavier than 1px; emphasis comes from the border color shifting to `--border2`, not from weight.

## Components

### Buttons
- **Shape:** 8–9px radius, no border on filled variants.
- **Primary:** Signal Green background, white text, 9–11px vertical / 14–18px horizontal padding, 600 weight.
- **Ghost:** transparent background, 1px `--border2` outline, `--text2` label; used for secondary actions (Cancel, Copy) next to a primary action.
- **Hover/Focus:** filled buttons darken toward Confirmed Green or deepen shadow slightly; ghost buttons pick up `--hover2` background. Transitions are quick (0.15–0.2s ease).

### Chips / Pills
- **Filter pill:** fully round (999px), 7–8px vertical / 16–18px horizontal padding; active state = Signal Green border + tinted background + Signal Green text, inactive = neutral border/text.
- **Risk / plan / status chip:** small radius (5–6px), 2–3px vertical / 9–12px horizontal padding, semantic color per severity (see Colors → Known inconsistency for the status-chip caveat).

### Cards / Containers
- **Corner Style:** 12–16px radius.
- **Background:** `--card` surface on `--bg` canvas.
- **Shadow Strategy:** Ambient shadow at rest (see Elevation).
- **Border:** 1px `--border`, shifting to `--border2` on hover/emphasis.
- **Internal Padding:** 20–24px for stat/content cards, 12–16px for compact list rows.

### Inputs / Fields
- **Style:** 1px `--border` (or `--border2` on more prominent fields), 8px radius, `--bg` or `--card` background depending on context.
- **Focus:** border tightens to `--border2` / accent color; no heavy glow, kept consistent with the system's restrained motion language.

### Navigation (Sidebar)
- **Style:** icon + label rows, 9px radius, active state = Signal-Green-tinted background (`rgba(15,110,86,0.18)`) with Signal Green (bright variant) text; inactive = transparent background, `--text2` label, hover picks up `--hover2`.
- **Collapse behavior:** icon-only at 66px width with tooltips (`title` attr) replacing visible labels; a toggle button lives at the top of the rail.

### Charts (Recharts)
Recharts entered the system with the Analytics page's Retention trend card (`frontend/src/pages/Alerts.js`) — the first chart in RetainIQ built with a charting library instead of hand-rolled bar/funnel divs. It sets the pattern every later chart should follow, since recharts ships with zero of this system's visual identity by default.

- **Area, not bare Line, for anything read as a trend.** A filled gradient under the stroke reads like a vitals monitor — consistent with the "Early Warning System" north star — where a bare line reads more like a generic spreadsheet export. Reserve plain `Line` for charts overlaying multiple series where a fill would visually collide.
- **Every recharts default gets overridden with a system token before shipping** — recharts' out-of-the-box blue line, gray grid, and white tooltip box are an instant "unstyled chart" tell. Concretely: `stroke`/`fill` on the primary series use `var(--brand-bright)` (the same "this is the number to watch" accent used elsewhere on Analytics — Weighted forecast, Open pipeline by rep); `CartesianGrid` uses `var(--border)`, horizontal-only (`vertical={false}`) — this system doesn't grid its bar/funnel charts, so a grid at all is already a chart-specific concession, keep it as light as possible; axis ticks use `var(--text3)` and explicit `fontFamily: "Inter, sans-serif"` (recharts' default tick font is a generic sans that will look subtly wrong next to the rest of the page).
- **Tooltip is always a custom `content` component, never the recharts default.** Style it exactly like a small card: `var(--card)` background, `var(--border2)` border, `var(--shadow)` for elevation (reuse the token — do not hand-write a new shadow rgba for it, see Elevation's Named Rule) — matching an existing token beats inventing a shadow for a single component.
- **Y-axis domain is computed from the data, never left at a flat 0–100.** A retention percentage that lives in the 30–95 range flattens into a nearly straight line against a 0–100 axis; compute `[floor(min - 5, step 5), 100]` so the real variation is visible.
- **Dense category axes (12 monthly ticks in a ~340px card) skip labels, never data.** `interval` on the tick axis thins to every-other label; every underlying data point still renders and is still hoverable.
- **Dots stay small and quiet** (`r: 3`, `activeDot r: 5`), stroked in `var(--card)` so they read as a ring punched through the line rather than a solid blob — matches the system's restrained, non-bouncy motion language (no elastic/bounce easing on chart elements, ever).
- **Every chart declares `accessibilityLayer` plus a descriptive `aria-label`.** Recharts' native accessibility layer is opt-in, not default — skipping it silently ships a chart invisible to keyboard and screen-reader users.

### AI Co-pilot Panel (signature component)
A 360px panel that springs in from the right (Framer Motion spring, damping 28 / stiffness 300) with three collapsible sections — Priority Actions, Deal Alerts, Ready to Send — each using the same compact row pattern (`--bg` inset card, `--radius` corners, 1px `--border`) with severity/urgency communicated through a small color dot or `color-mix()`-tinted pill rather than a full-background badge. This restrained, dot-and-tint approach to severity (instead of loud full-color chips) is distinct to this component and worth reusing for any future insight/alert surface.

### Activity & Notification Feed
Real, database-backed activity logging (`activities_api.py`, `notifications_api.py`) replaced the mock `ACTIVITIES`/`NOTIFICATIONS` arrays. Two patterns worth reusing for any future log-style feature:

- **Inline log-entry form, not a modal.** "+ Log a call" / "+ Log a meeting" in the client drawer's Activity tab open an inline bordered box directly in the flow (`var(--hover)` background, 10px radius, 1px `--border2`) — the exact visual pattern the drawer's existing "+ Add contact" form already established. A short, contextual capture form stays inline; only genuinely separate tasks (the AI email editor, quote line items) earn the fixed-overlay modal pattern used elsewhere.
- **Type→color mapping stays inside the Reserved Alarm Rule.** Every activity/notification type gets a color from the existing semantic palette (`--blue` for neutral state changes, `--green` for a completed/confirming action, `--amber` only when it directly parallels an existing amber-toned status like the "Draft" quote badge) — Amber and Red are never used for a routine CRUD action. Concretely: `contact_deleted` uses `--text3` (neutral), matching this app's own "Delete" buttons, which are gray, not red — deleting a contact isn't a churn-risk signal, and Red's reserved for At-Risk/Critical-Expired.
- **`loggedAt` (a precise timestamp) drives "time ago" displays; `date` (day-only) is for user-facing "which day did this happen" context.** A day-only value can never honestly render "just now" — computing relative time from it made a call logged seconds ago read as "18 hours ago." Any new loggable-event feature needs both: a precise system timestamp for recency display, and a separate user-editable date field if backdating matters to the feature.

## Do's and Don'ts

### Do:
- **Do** route every color through the existing CSS custom-property tokens (`var(--bg)`, `var(--cyan)`, `var(--text2)`, etc.) so new UI themes automatically between light and dark — this is how nearly the entire app already works.
- **Do** use `--brand-bright` instead of `--cyan` for any element foregrounded on a dark surface (active nav, logo mark), per the Bright Variant Rule.
- **Do** reserve Amber/Red exclusively for At-Risk / Critical-Expired states, per the Reserved Alarm Rule.
- **Do** give overlay surfaces (drawers, side panels, modals) a shadow directional to the edge they emerge from; give modals an omnidirectional shadow instead.
- **Do** follow the inline-style + CSS-variable pattern already used in every `pages/` and `components/` file for new UI — that is the actual, active design system.
- **Do** override every recharts default (line color, grid, tooltip, tick font) with a system token and set `accessibilityLayer` before shipping a chart, per Components → Charts (Recharts).
- **Do** compute "time ago" displays from a precise timestamp (`loggedAt`/`created_at`), never from a day-only date field, per the Activity & Notification Feed pattern.

### Don't:
- **Don't** color a routine CRUD action (add/edit/delete) Amber or Red just because it needs *some* accent — delete actions in this app are neutral (`--text3`), matching the existing Delete buttons; reserve Amber/Red for actual risk states, per the Reserved Alarm Rule.
- **Don't** add new component classes to `App.css`. It's a legacy stylesheet from an earlier iteration of the UI: no page or component references any of its `.card` / `.btn` / `.stat-card` / `.terminal-panel` classes (or most of its keyframes) anymore — only the `:root`/`[data-theme="dark"]` variable declarations and the `spin` keyframe are still live. Writing new classes there will silently do nothing.
- **Don't** introduce a second typeface. Inter carries the entire hierarchy; treat the README's "Space Mono • DM Sans" line as stale, not a spec.
- **Don't** copy the hardcoded status-chip hex pairs for new status/severity UI — route new work through the token system instead of replicating that inconsistency.
- **Don't** use Amber or Red as a general-purpose accent color; they carry risk meaning everywhere else in the product.
