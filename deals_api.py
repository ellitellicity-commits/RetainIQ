import os, sqlite3
from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify
from activities_api import log_activity
from auth_api import block_guest

deals_bp = Blueprint("deals_bp", __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "retainiq.db")
TABLE = "pipeline_deals"

DESIRED_COLUMNS = {
    "company": "TEXT", "client_id": "INTEGER", "value": "REAL", "stage": "TEXT", "owner": "TEXT",
    "next_action": "TEXT", "next_action_date": "TEXT", "lead_source": "TEXT",
    "product": "TEXT", "stage_updated_at": "TEXT", "created_at": "TEXT",
    "status": "TEXT", "expected_close_date": "TEXT",
}

OFFSETS = {"New Leads": 80, "Qualified": 60, "Demo": 45, "Quote sent": 30, "Negotiation": 15}

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _d(days_ago):
    return (date.today() - timedelta(days=days_ago)).isoformat()

def close_date_for(stage):
    if stage in OFFSETS:
        return _d(-OFFSETS[stage])
    return None

def resolve_client_id(conn, company):
    if not company:
        return None
    try:
        row = conn.execute(
            "SELECT id FROM clients WHERE LOWER(TRIM(company_name))=LOWER(TRIM(?))",
            (str(company),)
        ).fetchone()
        return row["id"] if row else None
    except Exception:
        return None

def ensure_schema():
    conn = get_conn(); c = conn.cursor()
    c.execute(f"""CREATE TABLE IF NOT EXISTS {TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT, value REAL, stage TEXT, owner TEXT,
        next_action TEXT, next_action_date TEXT, lead_source TEXT,
        product TEXT, stage_updated_at TEXT, created_at TEXT, status TEXT,
        expected_close_date TEXT
    )""")
    existing = {r["name"] for r in c.execute(f"PRAGMA table_info({TABLE})").fetchall()}
    for col, typ in DESIRED_COLUMNS.items():
        if col not in existing:
            c.execute(f"ALTER TABLE {TABLE} ADD COLUMN {col} {typ}")
    conn.commit()
    n = c.execute(f"SELECT COUNT(*) AS n FROM {TABLE}").fetchone()["n"]
    if n == 0:
        seed(c); conn.commit()
    # backfill expected_close_date for open deals that lack one
    for r in c.execute(f"SELECT id, stage, expected_close_date, status FROM {TABLE}").fetchall():
        if r["status"] == "open" and not r["expected_close_date"]:
            c.execute(f"UPDATE {TABLE} SET expected_close_date=? WHERE id=?", (close_date_for(r["stage"]), r["id"]))
    conn.commit()
    # backfill client_id by matching company name to a client
    try:
        for r in c.execute(f"SELECT id, company, client_id FROM {TABLE}").fetchall():
            if r["client_id"] is None and r["company"]:
                cid = resolve_client_id(conn, r["company"])
                if cid:
                    c.execute(f"UPDATE {TABLE} SET client_id=? WHERE id=?", (cid, r["id"]))
        conn.commit()
    except Exception as e:
        print("deals_api client_id backfill note:", e)
    conn.close()

def seed(c):
    rows = [
        ("Loblaw Companies", 45000, "New Leads", "Priya Sharma", "Intro call", _d(-2), "Inbound", "Fortinet FortiGate", 2),
        ("WestJet", 30000, "New Leads", "Marcus Reid", "Qualify budget", _d(-1), "Referral", "Cisco Webex", 4),
        ("Bell Canada", 120000, "Qualified", "Priya Sharma", "Book discovery", _d(0), "Outbound", "IBM Security QRadar", 6),
        ("Telus", 60000, "Qualified", "Aisha Khan", "Send capabilities deck", _d(-3), "Inbound", "Veeam Backup", 9),
        ("Scotiabank", 85000, "Demo", "Marcus Reid", "Run product demo", _d(-2), "Outbound", "Palo Alto NGFW", 5),
        ("RBC Bank", 200000, "Quote sent", "Marcus Reid", "Follow-up call", _d(-3), "Referral", "Palo Alto NGFW", 9),
        ("Sun Life Financial", 90000, "Quote sent", "Priya Sharma", "Awaiting signature", _d(4), "Inbound", "Microsoft 365 E5", 18),
        ("TD Bank", 150000, "Negotiation", "Aisha Khan", "Final pricing review", _d(-1), "Outbound", "Fortinet renewal", 7),
        ("Canadian Tire", 250000, "Closed-Won", "Marcus Reid", None, None, "Referral", "Oracle Cloud ERP", 12),
        ("Shell Canada", 150000, "Closed-Won", "Priya Sharma", None, None, "Inbound", "Commvault Backup", 20),
        ("City of Toronto", 80000, "Closed-Lost", "Aisha Khan", None, None, "Outbound", "Lenovo Data Center", 15),
    ]
    for (company, value, stage, owner, na, nad, ls, prod, sd) in rows:
        status = "won" if stage == "Closed-Won" else ("lost" if stage == "Closed-Lost" else "open")
        c.execute(
            f"INSERT INTO {TABLE} (company,value,stage,owner,next_action,next_action_date,lead_source,product,stage_updated_at,created_at,status,expected_close_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (company, value, stage, owner, na, nad, ls, prod, _d(sd), _d(sd + 5), status, close_date_for(stage))
        )

def row_to_dict(r):
    d = dict(r)
    dis = None
    if d.get("stage_updated_at"):
        try:
            dis = (date.today() - date.fromisoformat(d["stage_updated_at"][:10])).days
        except Exception:
            dis = None
    d["days_in_stage"] = dis
    return d

@deals_bp.route("/api/db/deals", methods=["GET"])
def list_deals():
    conn = get_conn()
    rows = conn.execute(f"SELECT * FROM {TABLE} ORDER BY id").fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])

@deals_bp.route("/api/db/deals", methods=["POST"])
@block_guest
def create_deal():
    data = request.get_json(force=True) or {}
    now = date.today().isoformat()
    try:
        val = float(data.get("value") or 0)
    except Exception:
        val = 0
    stage = data.get("stage") or "New Leads"
    ecd = data.get("expected_close_date") or close_date_for(stage)
    conn = get_conn()
    cid = resolve_client_id(conn, data.get("company"))
    cur = conn.execute(
        f"INSERT INTO {TABLE} (company,client_id,value,stage,owner,next_action,next_action_date,lead_source,product,stage_updated_at,created_at,status,expected_close_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (data.get("company"), cid, val, stage, data.get("owner"), data.get("next_action"), data.get("next_action_date"),
         data.get("lead_source"), data.get("product"), now, now, "open", ecd)
    )
    conn.commit()
    row = conn.execute(f"SELECT * FROM {TABLE} WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))

@deals_bp.route("/api/db/deals/<int:deal_id>", methods=["PATCH", "PUT"])
@block_guest
def update_deal(deal_id):
    data = request.get_json(force=True) or {}
    conn = get_conn()
    existing = conn.execute(f"SELECT * FROM {TABLE} WHERE id=?", (deal_id,)).fetchone()
    if not existing:
        conn.close(); return jsonify({"error": "not found"}), 404
    fields = ["company", "value", "stage", "owner", "next_action", "next_action_date", "lead_source", "product", "expected_close_date"]
    updates, params = [], []
    for fld in fields:
        if fld in data:
            updates.append(f"{fld}=?"); params.append(data[fld])
    new_client_id = existing["client_id"]
    if "company" in data:
        new_client_id = resolve_client_id(conn, data.get("company"))
        updates.append("client_id=?"); params.append(new_client_id)
    stage_changed = "stage" in data and data["stage"] != existing["stage"]
    if stage_changed:
        updates.append("stage_updated_at=?"); params.append(date.today().isoformat())
        st = data["stage"]
        updates.append("status=?"); params.append("won" if st == "Closed-Won" else ("lost" if st == "Closed-Lost" else "open"))
    if updates:
        params.append(deal_id)
        conn.execute(f"UPDATE {TABLE} SET {', '.join(updates)} WHERE id=?", params); conn.commit()
    row = conn.execute(f"SELECT * FROM {TABLE} WHERE id=?", (deal_id,)).fetchone()
    conn.close()

    if stage_changed:
        log_activity(
            client_id=new_client_id,
            type="deal_stage_change",
            notes=f'{existing["company"]}: stage changed from "{existing["stage"]}" to "{data["stage"]}"',
            done_by=existing["owner"],
            stage=data["stage"],
        )

    return jsonify(row_to_dict(row))

@deals_bp.route("/api/db/deals/<int:deal_id>", methods=["DELETE"])
@block_guest
def delete_deal(deal_id):
    conn = get_conn()
    conn.execute(f"DELETE FROM {TABLE} WHERE id=?", (deal_id,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

try:
    ensure_schema()
except Exception as e:
    print("deals_api ensure_schema warning:", e)