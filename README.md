<div align="center">

<img src="assets/RetainIQ_Banner.png" alt="RetainIQ" width="750">

<p align="center">
  <a href="https://retainiq-thunderhacks-2026.vercel.app/"><strong>Live Demo</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com"><strong>Source Code</strong></a>
</p>



&nbsp;**Gold Sponsor Challenge Winner (ThunderHacks 2026)**

</div>

---

## Overview

RetainIQ is a customer retention intelligence platform built for **Digital Move IT & Telecom** in just 24 hours at ThunderHacks 2026.

By analyzing your entire customer base in real time, RetainIQ automatically scores churn risk, maps customer journeys, and drafts personalized outreach copy with AI. It transforms your retention workflow so your sales team stops reacting to churn and starts preventing it.

<div align="center">

<img src="./assets/thunderhacks-win.jpg" width="720" alt="ThunderHacks Win" />

<sub>Winning the Digital Move Gold Sponsor Challenge at ThunderHacks 2026</sub>

</div>

---

## ⎔ Feature Architecture

* **System Dashboard:** Displays live churn risk scores across every account with quick filters for plan tier and risk level. Includes animated KPI cards and a responsive, color-coded bar chart that updates instantly as you filter data.
* **Customer Intelligence Center:** A sortable, searchable data table equipped with mini sparkline trends, risk bars, and plan badges. Clicking any row expands an inline detail panel containing six deep-dive stats, a risk gauge, and a visual journey stage indicator.
* **Pipeline Journey Map:** Outlines customer status across a four-stage pipeline: *Active, At-Risk, Critical, and Expired*. Teams can click any stage to inspect the exact cohort profile, individual risk scores, and the overall health rating of that segment.
* **Lifecycle Timeline:** A carousel interface holding every customer profile in the dataset. Selecting a user lets you scroll through a three-act narrative tracking their engagement decline, backed by a sticky profile card that morphs seamlessly between Active, Warning, and Critical states using Framer Motion.
* **Automated Alert Center:** Highlights the high-priority accounts needing a phone call today. Features a terminal-style panel that drafts personalized retention emails on demand, generated live by Groq's Llama 3.3 70B model.

---

## λ Predictive Logic & Data Flow

```text
[Customer Data] ──> [scikit-learn Scoring] ──> [Real-Time Risk Score] ──> [Groq · Llama 3.3 70B] ──> [Personalized Email]
```

1. **Predictive Modeling:** The scoring layer evaluates customer signals — contract value, time since last contact, and days until renewal — to produce a 0–100 churn risk score and a lifecycle stage for every account in real time.
2. **AI Copy Generation:** Renewal emails are drafted on demand by Groq's **Llama 3.3 70B** model, personalized per account using the company name, software, contract expiry, value, and account manager. If the AI service is unavailable, the engine falls back to a deterministic local template so a usable draft is always produced.

---

## ⧉ Tech Stack

<div align="left">

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | `React` • `Framer Motion` • `Recharts` |
| **Backend API** | `Python` • `Flask` • `Flask-CORS` |
| **Data & ML** | `scikit-learn` • `Pandas` • `NumPy` |
| **Database** | `SQLite` |
| **AI Generation** | `Groq` • `Llama 3.3 70B` |
| **Design** | `Space Mono` • `DM Sans` |
| **Deployment** | `Vercel` (Frontend) • `Render` (Backend) |

</div>

---

## Sponsor Pillars: Digital Move

Our implementation matches the core priorities outlined for the Digital Move challenge:

* **Predictive churn scoring:** A churn-scoring model evaluates contract and engagement signals to provide an accurate 0–100 risk metric per account.
* **Automated outreach drafts:** Generated live by Groq's Llama 3.3 70B model for genuine, context-aware personalization, with a deterministic local template fallback for guaranteed uptime.
* **Customer journey mapping:** Delivered as a visual four-stage pipeline featuring fully expandable cohort analytics.
* **Real-time alerts dashboard:** Integrated as a dedicated Alert Center complete with instant risk meters and on-demand email generation.

---

## $ Running Locally

### Backend Setup
```bash
cd retainiq-thunderhacks-2026
pip install -r requirements.txt

# AI email generation needs a Groq API key:
export GROQ_API_KEY=your_key_here    # Windows (PowerShell): $env:GROQ_API_KEY="your_key_here"

python app.py
# → Running on http://localhost:5000
```

### Frontend Setup
```bash
cd retainiq-thunderhacks-2026/frontend
npm install
npm start
# → Running on http://localhost:3000
```

> **Demo Credentials (for evaluation purposes only):**
> * **Username:** `digitalmove`
> * **Password:** `retainiq2026`

---

## Deployment Notes

The frontend lives on **Vercel** and the backend is hosted on **Render**.

The backend uses a lightweight **SQLite** database that is automatically initialized and seeded from `clients.csv` on every startup. This keeps the live demo populated with a consistent dataset even on Render's ephemeral free-tier disk, so there's never an empty dashboard. Because that disk resets whenever the instance sleeps, records added through the live UI are not retained long-term — ideal for a clean, repeatable demo.

Because the backend runs on a free-tier instance, it spins down into a sleep state after a period of inactivity. The initial request can take roughly **60 to 90 seconds** while the container provisions. Subsequent requests execute instantly.

↳ **Pro-Tip:** To pre-warm the backend right before a live presentation, visit: `https://retainiq-thunderhacks-2026.onrender.com/api/customers`

---

<div align="center">

**Ellison Naz** • **Rishav Bawa** • **Joel Saji Varghese**

<sub>ThunderHacks 2026 • Algoma University • March 2026</sub>

<sub>Built with focus, intensity, and very little sleep.</sub>

</div>
