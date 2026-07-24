import sqlite3
import os
import csv
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "retainiq.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # Clients table — companies
    c.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            industry TEXT,
            country TEXT,
            website TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Contacts table — people within companies
    c.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            role TEXT,
            email TEXT,
            phone TEXT,
            is_primary INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')

    # Client contacts table (used by UI)
    c.execute('''
        CREATE TABLE IF NOT EXISTS client_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            name TEXT,
            title TEXT,
            email TEXT,
            phone TEXT,
            is_primary INTEGER DEFAULT 0,
            created_at TEXT
        )
    ''')

    # Contracts table — software licenses
    c.execute('''
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            software TEXT,
            vendor TEXT,
            start_date TEXT,
            expiry_date TEXT,
            value REAL,
            status TEXT DEFAULT 'active',
            assigned_to TEXT,
            last_contact TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')

    # Deals table — ongoing proposals
    c.execute('''
        CREATE TABLE IF NOT EXISTS deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            title TEXT,
            value REAL,
            stage TEXT DEFAULT 'prospecting',
            expected_close TEXT,
            assigned_to TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')

    # Activities table — calls, emails, meetings
    c.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            type TEXT,
            title TEXT,
            notes TEXT,
            date TEXT,
            done_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')

    # Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Pipeline deals table (used by UI)
    c.execute('''
        CREATE TABLE IF NOT EXISTS pipeline_deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT,
            client_id INTEGER,
            value REAL,
            stage TEXT,
            owner TEXT,
            next_action TEXT,
            next_action_date TEXT,
            lead_source TEXT,
            product TEXT,
            stage_updated_at TEXT,
            created_at TEXT,
            status TEXT DEFAULT 'open',
            expected_close_date TEXT,
            quote_discount REAL,
            quote_status TEXT,
            quote_sent_at TEXT
        )
    ''')

    # Quote items table
    c.execute('''
        CREATE TABLE IF NOT EXISTS quote_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deal_id INTEGER,
            description TEXT,
            quantity INTEGER DEFAULT 1,
            unit_price REAL,
            sort_order INTEGER DEFAULT 0
        )
    ''')

    # Extra fields table — for any custom columns from their Excel
    c.execute('''
        CREATE TABLE IF NOT EXISTS extra_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')

    # Column mappings — save their Excel mappings for next time
    c.execute('''
        CREATE TABLE IF NOT EXISTS column_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_column TEXT NOT NULL,
            mapped_to TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Retention snapshots — one row per day retention % was recorded,
    # powers the Analytics "Retention trend" chart.
    c.execute('''
        CREATE TABLE IF NOT EXISTS retention_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_date TEXT NOT NULL UNIQUE,
            total_clients INTEGER,
            active_count INTEGER,
            at_risk_count INTEGER,
            critical_count INTEGER,
            expired_count INTEGER,
            retention_pct REAL,
            source TEXT DEFAULT 'seed'
        )
    ''')

    conn.commit()
    conn.close()
    print("Database initialized successfully!")
    
# New Seeding Function Implementation
CSV_PATH = os.path.join(BASE_DIR, "clients.csv")

def _to_float(v):
    try:
        return float(str(v).replace(",", "").replace("$", "").strip())
    except (TypeError, ValueError):
        return None

# Demo quotes keyed by company name (matched against demo_data.json's deals).
# Line items are sized so each quote's subtotal lands exactly on that deal's
# seeded value -- "sent" deals are the ones already narratively in
# Quote sent/Closed-Won; "draft" deals are still in Negotiation.
DEMO_QUOTES = [
    {
        "company": "RBC Bank", "status": "sent", "sent_at": "2026-07-12",
        "items": [
            ("IBM QRadar SIEM - Annual License Renewal", 1, 150000),
            ("Premium Support & Maintenance", 1, 35000),
            ("Professional Services - Implementation", 1, 15000),
        ],
    },
    {
        "company": "Sun Life Financial", "status": "sent", "sent_at": "2026-07-15",
        "items": [
            ("Cloud Security Platform - Enterprise Tier", 1, 280000),
            ("Data Loss Prevention Module", 1, 45000),
            ("Onboarding & Training", 1, 15000),
        ],
    },
    {
        "company": "Telus Corporation", "status": "sent", "sent_at": "2026-07-08",
        "items": [
            ("Managed Detection & Response - Annual", 1, 78000),
            ("24/7 SOC Monitoring", 12, 1250),
            ("Incident Response Retainer", 1, 2000),
        ],
    },
    {
        "company": "Manulife", "status": "sent", "sent_at": "2026-07-05",
        "items": [
            ("Identity & Access Management Platform", 1, 70000),
            ("Multi-Factor Authentication Add-on (per seat)", 500, 40),
            ("Implementation Services", 1, 5000),
        ],
    },
    {
        "company": "TD Bank", "status": "draft", "sent_at": None,
        "items": [
            ("Enterprise Security Platform - Base License", 1, 110000),
            ("Advanced Threat Analytics Module", 1, 30000),
            ("Training & Enablement", 1, 10000),
        ],
    },
    {
        "company": "Bell Canada", "status": "draft", "sent_at": None,
        "items": [
            ("Network Security Suite - Enterprise", 1, 400000),
            ("Next-Gen Firewall Appliances", 8, 12000),
            ("Deployment & Integration Services", 1, 24000),
        ],
    },
]

def seed_demo_quotes(c, deal_id_by_company):
    """Populate quote_items + quote_discount/status/sent_at for a handful of
    seeded deals, so the Quotes page has real data instead of an empty list."""
    for q in DEMO_QUOTES:
        deal_id = deal_id_by_company.get(q["company"])
        if not deal_id:
            continue
        for idx, (description, quantity, unit_price) in enumerate(q["items"]):
            c.execute(
                "INSERT INTO quote_items (deal_id, description, quantity, unit_price, sort_order) VALUES (?, ?, ?, ?, ?)",
                (deal_id, description, quantity, unit_price, idx),
            )
        c.execute(
            "UPDATE pipeline_deals SET quote_discount = 0, quote_status = ?, quote_sent_at = ? WHERE id = ?",
            (q["status"], q["sent_at"], deal_id),
        )

def seed_if_empty():
    """Load demo data from clients.csv if the database is empty.
    Needed because Render's free tier wipes the disk on every boot,
    so the DB starts empty and no import is ever run in production."""
    conn = get_db()
    c = conn.cursor()

    count = c.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
    if count == 0:
        if not os.path.exists(CSV_PATH):
            print("Warning: clients.csv not found -- skipping demo seed.")
        else:
            rows = 0
            with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    company = (row.get("client_name") or "").strip()
                    if not company:
                        continue
                    c.execute("INSERT INTO clients (company_name) VALUES (?)", (company,))
                    client_id = c.lastrowid
                    c.execute(
                        """INSERT INTO contracts
                           (client_id, software, vendor, start_date, expiry_date,
                            value, assigned_to, status, last_contact)
                           VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)""",
                        (
                            client_id,
                            (row.get("software") or "").strip() or None,
                            (row.get("vendor") or "").strip() or None,
                            (row.get("contract_start") or "").strip() or None,
                            (row.get("contract_expiry") or "").strip() or None,
                            _to_float(row.get("contract_value")),
                            (row.get("account_manager") or "").strip() or None,
                            (row.get("last_contact") or "").strip() or None,
                        ),
                    )
                    rows += 1

            # Seed demo contacts and deals from demo_data.json
            demo_json_path = os.path.join(BASE_DIR, "demo_data.json")
            if os.path.exists(demo_json_path):
                with open(demo_json_path, encoding="utf-8") as f:
                    demo = json.load(f)
                for ct in demo.get("contacts", []):
                    c.execute(
                        """INSERT INTO client_contacts (client_id, name, title, email, phone, is_primary)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (ct["client_id"], ct["name"], ct["title"], ct["email"], ct["phone"], ct["is_primary"])
                    )
                deal_id_by_company = {}
                for deal in demo.get("deals", []):
                    c.execute(
                        """INSERT INTO pipeline_deals (company, client_id, value, stage, owner, product, lead_source, status, created_at, stage_updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, 'open', '2026-07-01', '2026-07-10')""",
                        (deal["company"], deal["client_id"], deal["value"], deal["stage"], deal["owner"], deal["product"], deal["lead_source"])
                    )
                    deal_id_by_company[deal["company"]] = c.lastrowid

                seed_demo_quotes(c, deal_id_by_company)

            conn.commit()
            print(f"Seeded {rows} demo clients from clients.csv")

    # Retention history: backfill a full 12-month window if empty, and make
    # sure today's real snapshot exists, independent of whether the client
    # seed above ran (both are cheap, idempotent no-ops if already present).
    backfill_retention_snapshots_if_empty(conn)
    ensure_todays_retention_snapshot(conn)

    conn.close()


def compute_live_retention_snapshot(conn):
    """Derives today's real retention counts from contracts.expiry_date,
    using the same day-thresholds /api/db/stats already uses for
    Active / At-Risk / Critical / Expired."""
    from datetime import datetime

    c = conn.cursor()
    c.execute("SELECT expiry_date FROM contracts WHERE expiry_date IS NOT NULL")
    today = datetime.today()

    total = active = at_risk = critical = expired = 0
    for row in c.fetchall():
        try:
            expiry = datetime.strptime(row["expiry_date"], "%Y-%m-%d")
        except (TypeError, ValueError):
            continue
        days = (expiry - today).days
        total += 1
        if days < 0:
            expired += 1
        elif days <= 30:
            critical += 1
        elif days <= 90:
            at_risk += 1
        else:
            active += 1

    retention_pct = round((active / total) * 100, 1) if total else 0.0
    return {
        "total_clients": total,
        "active_count": active,
        "at_risk_count": at_risk,
        "critical_count": critical,
        "expired_count": expired,
        "retention_pct": retention_pct,
    }


def ensure_todays_retention_snapshot(conn):
    """Inserts a source='live' snapshot for today if one doesn't exist yet.
    Called on startup and defensively from the retention-history endpoint,
    so a warm process always has a fresh row without needing a scheduler."""
    from datetime import date

    c = conn.cursor()
    today_str = date.today().isoformat()
    existing = c.execute(
        "SELECT 1 FROM retention_snapshots WHERE snapshot_date = ?", (today_str,)
    ).fetchone()
    if existing:
        return

    snap = compute_live_retention_snapshot(conn)
    if snap["total_clients"] == 0:
        return

    c.execute(
        """INSERT OR IGNORE INTO retention_snapshots
           (snapshot_date, total_clients, active_count, at_risk_count,
            critical_count, expired_count, retention_pct, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'live')""",
        (
            today_str,
            snap["total_clients"],
            snap["active_count"],
            snap["at_risk_count"],
            snap["critical_count"],
            snap["expired_count"],
            snap["retention_pct"],
        ),
    )
    conn.commit()


def backfill_retention_snapshots_if_empty(conn):
    """Synthesizes a plausible 12-month retention trend ending near today's
    real value, so the chart always has a full window right after a cold
    start / redeploy (Render wipes SQLite on sleep/wake)."""
    import random
    from datetime import date

    c = conn.cursor()
    count = c.execute("SELECT COUNT(*) FROM retention_snapshots").fetchone()[0]
    if count > 0:
        return

    snap = compute_live_retention_snapshot(conn)
    total_clients = snap["total_clients"]
    if total_clients == 0:
        return

    current_pct = snap["retention_pct"]
    rng = random.Random(1337)
    today = date.today()

    value = max(35.0, min(98.0, current_pct - rng.uniform(6, 14) * rng.choice([-1, 1])))
    rows = []
    for i in range(11, -1, -1):  # 11 months ago ... this month
        total_months = today.year * 12 + (today.month - 1) - i
        yy, mm = divmod(total_months, 12)
        snapshot_date = date(yy, mm + 1, 1).isoformat()

        drift = (current_pct - value) * 0.35
        noise = rng.uniform(-2.5, 2.5)
        value = max(30.0, min(99.0, value + drift + noise))

        active = round(total_clients * value / 100)
        remaining = total_clients - active
        at_risk = round(remaining * 0.55)
        critical = round(remaining * 0.30)
        expired = max(0, remaining - at_risk - critical)

        rows.append((snapshot_date, total_clients, active, at_risk, critical, expired, round(value, 1), "seed"))

    c.executemany(
        """INSERT OR IGNORE INTO retention_snapshots
           (snapshot_date, total_clients, active_count, at_risk_count,
            critical_count, expired_count, retention_pct, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        rows,
    )
    conn.commit()
    print(f"Backfilled {len(rows)} synthetic retention snapshots.")


if __name__ == "__main__":
    init_db()
    seed_if_empty()
