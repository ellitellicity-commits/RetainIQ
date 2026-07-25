# RetainIQ CRM - Developer Guide

## Running the Application

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Backend Setup

```bash
cd retainiq-thunderhacks-2026

# Create virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file with API key (for AI email generation)
echo GROQ_API_KEY=your_key_here > .env

# Run the backend
python app.py
```

The Flask server starts on `http://127.0.0.1:5000`.

On first run, it automatically:
1. Creates the SQLite database (`retainiq.db`)
2. Seeds demo data from `clients.csv` and `demo_data.json`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

The React app runs on `http://localhost:3000` and proxies API calls to port 5000.

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | For AI emails | Groq API key for LLaMA 3.3 70B email generation |
| `TAVILY_API_KEY` | For chatbot web search | Tavily API key for the chatbot's `web_search` tool |

If the key is missing, the email generator falls back to a template. If `TAVILY_API_KEY` is missing, the chatbot's `web_search` tool tells the user web search isn't available and falls back to CRM-only answers.

---

## Architecture

```
retainiq-thunderhacks-2026/
├── app.py                  # Flask main app, routes, CORS
├── database.py             # SQLite init, schema, seeding
├── contacts_api.py         # /api/db/contacts blueprint
├── deals_api.py            # /api/db/deals blueprint
├── quotes_api.py           # /api/db/quote blueprint
├── importer.py             # CSV/Excel import logic
├── model.py                # ML churn scoring model
├── clients.csv             # Demo client data
├── demo_data.json          # Single source of truth for contacts + deals
├── requirements.txt        # Python dependencies
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.js          # Main layout, sidebar, routing, copilot panel
│   │   ├── App.css         # Global styles, CSS variables, themes
│   │   ├── data/
│   │   │   └── mockData.js # All frontend-only mock data
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Customers.js    # Clients page
│   │   │   ├── Contacts.js
│   │   │   ├── Journey.js      # Pipeline/Kanban
│   │   │   ├── Alerts.js       # Analytics
│   │   │   ├── CopilotPage.js  # Full AI page
│   │   │   ├── Tasks.js
│   │   │   ├── EmailSequences.js
│   │   │   ├── Automations.js
│   │   │   └── Upload.js       # Data import wizard
│   │   └── components/
│   │       ├── AICopilotPanel.js
│   │       ├── CommandPalette.js
│   │       ├── NotificationCenter.js
│   │       ├── ActivityTimeline.js
│   │       ├── NoteEditor.js
│   │       ├── TaskList.js
│   │       └── RelationshipMap.js
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Framer Motion, inline styles with CSS variables |
| Backend | Python Flask, Flask-CORS |
| Database | SQLite (file-based) |
| AI | Groq API (LLaMA 3.3 70B) for email generation |
| ML | scikit-learn for churn risk scoring |
| Styling | CSS variables for theming (dark/light), no CSS framework |

---

## Database Schema

Defined in `database.py` → `init_db()`:

| Table | Purpose |
|-------|---------|
| `clients` | Companies (id, company_name, industry, country, website) |
| `contacts` | People linked to clients (name, role, email, phone) |
| `client_contacts` | UI-facing contacts table (same data, different schema) |
| `contracts` | Software licenses (vendor, dates, value, status, assigned_to) |
| `deals` | Proposals (title, value, stage, assigned_to) |
| `pipeline_deals` | Kanban deals (company, value, stage, owner, product, lead_source) |
| `quote_items` | Line items per deal (description, quantity, unit_price) |
| `activities` | Call/email/meeting logs |
| `users` | User accounts (unused in POC) |
| `extra_fields` | Custom fields from imported data |
| `column_mappings` | Saved CSV column mappings |

### Data Seeding

On startup, `seed_if_empty()` checks if `clients` table is empty:
1. Loads companies from `clients.csv`
2. Loads contacts and deals from `demo_data.json`
3. This ensures consistent demo data across fresh deployments

---

## API Endpoints

### Client/Contract Endpoints (app.py)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db/clients` | All clients with computed journey_stage (Active/At-Risk/Critical/Expired) |
| GET | `/api/db/stats` | Dashboard KPIs (total, expiring_90d, critical, value_at_risk) |
| POST | `/api/db/import` | Import CSV/Excel file with column mapping |
| POST | `/api/email` | Generate AI email via Groq. Body: `{client_name, contact_name, context}` |

### Contacts Blueprint (contacts_api.py)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db/contacts` | All contacts (joined with client company names) |
| POST | `/api/db/contacts` | Create contact. Body: `{client_id, name, title, email, phone, is_primary}` |
| PUT | `/api/db/contacts/<id>` | Update contact |
| DELETE | `/api/db/contacts/<id>` | Delete contact |

### Deals Blueprint (deals_api.py)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db/deals` | All pipeline deals with computed `days_in_stage` |
| POST | `/api/db/deals` | Create deal. Body: `{company, value, stage, owner, product, lead_source, ...}` |
| PATCH | `/api/db/deals/<id>` | Update deal fields (partial update) |
| DELETE | `/api/db/deals/<id>` | Delete deal |

### Quotes Blueprint (quotes_api.py)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db/quote/<deal_id>` | Get quote (items + discount + status) for a deal |
| PUT | `/api/db/quote/<deal_id>` | Save quote (replaces all items). Body: `{items, discount}` |
| POST | `/api/db/quote/<deal_id>/send` | Mark quote as sent, update deal, stamp `quote_sent_at` |
| GET | `/api/db/quotes?company=X` | Quotes for one company (used by the Clients drawer) |
| GET | `/api/db/quotes` | Every quote across every deal (used by the standalone Quotes page) |

---

## Page Implementation Status

### Fully Implemented (Real API + Database)

| Page | What Works | Data Source |
|------|-----------|-------------|
| **Dashboard** | KPI cards, filterable client table | `/api/db/stats`, `/api/db/clients` |
| **Clients** | Full CRUD contacts, quote viewing, AI email generation, search/filter/sort | `/api/db/clients`, `/api/db/contacts`, `/api/db/quotes`, `/api/email` |
| **Contacts** | Full listing with search, filter by company, primary toggle | `/api/db/contacts`, `/api/db/clients` |
| **Pipeline** | Kanban drag-drop, create/edit/delete deals, quote builder with line items | `/api/db/deals`, `/api/db/quote` |
| **Quotes** | Standalone list of every quote across every deal, with search + status filter; click-through opens the deal in Pipeline for editing | `/api/db/quotes` |
| **Analytics** | All charts and metrics computed from real deal data | `/api/db/deals` |

### Mock Data (Frontend-Only State)

| Page | What Works | What Needs Real Implementation |
|------|-----------|-------------------------------|
| **AI Co-pilot (page)** | Relationship map, meeting prep, deal insights display | Needs real AI model/API for generating insights, relationship scoring, meeting prep |
| **AI Co-pilot (panel)** | Priority actions, deal alerts, send/edit emails | Needs real email sending integration (SMTP/API), real AI insight generation |
| **Tasks** | Create, toggle complete, filter by status/assignee/date | Needs DB table, CRUD API, user assignment system |
| **Email Sequences** | Create sequences with steps, view metrics | Needs DB persistence, actual email scheduling engine, tracking pixels for open/reply |
| **Automations** | Create rules, toggle enable/disable | Needs DB persistence, event system to evaluate triggers, action execution engine |
| **Notifications** | Mark read (individual + all), visual indicators | Needs real-time event system (WebSocket/SSE), DB persistence |
| **Activity Timeline** | Display in client drawer | Needs to pull from real activities table, log actual user actions |
| **Notes** | Display and add in client drawer | Needs DB table, CRUD API |
| **Command Palette** | Search, navigate pages, trigger create modals | Fully functional for current scope |

---

## How Each Page Should Work (For Real Implementation)

### Tasks (Priority: High)

**Current:** Local React state initialized from `mockData.js`. Tasks reset on page refresh.

**Target implementation:**
1. Create `tasks` table: `id, title, due_date, priority, assignee, linked_deal_id, type, completed, created_at`
2. Create `tasks_api.py` blueprint with CRUD endpoints
3. Wire frontend to fetch/post to API instead of local state
4. Add task creation from deal context (linked_deal_id)
5. Add notifications when tasks become overdue

### Email Sequences (Priority: Medium)

**Current:** Local state from mock data. Create works within session only.

**Target implementation:**
1. Tables: `sequences(id, name, status, created_at)`, `sequence_steps(id, sequence_id, day, type, subject, body, sort_order)`, `sequence_enrollments(id, sequence_id, contact_id, current_step, status)`
2. Background job scheduler (Celery/APScheduler) to send emails on schedule
3. Tracking: embed pixel for opens, track link clicks for replies
4. Analytics computed from enrollment/step completion data

### Automations (Priority: Medium)

**Current:** Local state. Toggle and create work within session only.

**Target implementation:**
1. Tables: `automation_rules(id, name, trigger_type, trigger_config, action_type, action_config, active, times_triggered, last_triggered)`
2. Event bus: emit events on deal stage change, inactivity threshold, contact action
3. Rule evaluator: on each event, check matching active rules, execute actions
4. Actions: create task, send email, send notification, update deal stage

### AI Co-pilot Intelligence (Priority: High - Key Differentiator)

**Current:** Static mock insights in `mockData.js`.

**Target implementation:**
1. Scheduled analysis job that runs daily:
   - Score deal health based on activity recency, stage duration, value
   - Identify stalling deals (no activity > 7 days)
   - Generate next-best-action recommendations
   - Compute relationship warmth from interaction frequency
2. API endpoint: `GET /api/ai/insights` returning prioritized action list
3. Real email drafting: Use LLM (already have Groq integration) to draft contextual follow-ups based on deal history
4. Meeting prep generation: Pull recent activities + deal context, generate via LLM

### Notifications (Priority: Low)

**Current:** Static list with functional mark-read UI.

**Target implementation:**
1. Table: `notifications(id, user_id, type, title, message, entity_id, read, created_at)`
2. Generate notifications on: task due, deal stalled (>14 days), deal won, AI insight ready
3. Optional: WebSocket/SSE for real-time push to frontend
4. Badge count from `SELECT COUNT(*) WHERE read = 0`

### Activity Logging (Priority: High)

**Current:** Mock data displayed in client drawer.

**Target implementation:**
1. Already have `activities` table in schema
2. Auto-log: email sent, deal created/moved, contact added, quote sent
3. Manual log: "Log a call" / "Log a meeting" button in client drawer
4. Fetch per-client: `GET /api/db/activities?client_id=X`

---

## Styling Conventions

- **No CSS framework** - all inline styles using CSS variables
- **Theme variables** defined in `App.css` under `:root` (light) and `[data-theme="dark"]`
- **Key variables:** `--bg`, `--card`, `--border`, `--text`, `--text2`, `--text3`, `--cyan`, `--green`, `--red`, `--amber`, `--purple`
- **Font:** Inter (loaded from Google Fonts)
- **Border radius:** `var(--radius)` (default 10px)
- **Shadows:** `var(--shadow)`
- **Modal pattern:** Fixed overlay (`rgba(0,0,0,0.5)`) + centered card with `transform: translate(-50%, -50%)`
- **Animations:** Framer Motion for panels, drawers, modals

---

## Key Patterns

### Page Navigation
`App.js` uses `useState("dashboard")` for page routing. Pages are conditionally rendered. Some pages accept `pageAction` prop to auto-trigger modals (e.g., "new-deal" opens the create deal form).

### Data Consistency
`demo_data.json` is the single source of truth for demo contacts and deals. It maps `client_id` values to match the order companies appear in `clients.csv`. Frontend mock data in `mockData.js` uses the same company names and rep names.

### Create Modal Pattern
All create forms follow the same pattern:
1. `[showForm, setShowForm] = useState(false)`
2. Button with `onClick={() => setShowForm(true)}`
3. Modal: fixed backdrop + centered card with form fields
4. Submit adds to local state array (or posts to API)
5. Cancel/backdrop-click closes modal

---

## Deployment

The app is configured for Render deployment:
- Backend: `gunicorn app:app` (in requirements.txt)
- Frontend: `npm run build` produces static files in `frontend/build/`
- Database: SQLite file resets on each Render free-tier deploy (seeded automatically)
- API URL switches between localhost and Render URL based on `window.location.hostname`
