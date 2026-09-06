from datetime import date
from flask import Blueprint, request, jsonify
from database import get_db, get_request_conn
from notifications_api import create_notification
from auth_api import require_auth, require_write_access

activities_bp = Blueprint("activities_bp", __name__)
TABLE = "activities"

TITLES = {
    "email": lambda ctx: "Email drafted",
    "call": lambda ctx: "Call logged",
    "meeting": lambda ctx: "Meeting logged",
    "deal_stage_change": lambda ctx: f"Deal moved to {ctx.get('stage', '')}".strip(),
    "contact_added": lambda ctx: "Contact added",
    "contact_updated": lambda ctx: "Contact updated",
    "contact_deleted": lambda ctx: "Contact removed",
    "quote_created": lambda ctx: "Quote created",
    "quote_sent": lambda ctx: "Quote sent",
}


def ensure_schema():
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute(f"""CREATE TABLE IF NOT EXISTS {TABLE} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            type TEXT, title TEXT, notes TEXT, date TEXT, done_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )""")
        try:
            c.execute(f"ALTER TABLE {TABLE} ADD COLUMN title TEXT")
        except Exception:
            pass
        conn.commit()
    finally:
        conn.close()


def _default_title(type, ctx):
    fn = TITLES.get(type)
    return fn(ctx) if fn else type.replace("_", " ").capitalize()


def _iso_utc(sqlite_ts):
    if not sqlite_ts:
        return None
    return sqlite_ts.replace(" ", "T") + "Z"


def _fallback_done_by(conn, client_id):
    if not client_id:
        return None
    row = conn.execute(
        "SELECT assigned_to FROM contracts WHERE client_id = ? AND assigned_to IS NOT NULL LIMIT 1",
        (client_id,),
    ).fetchone()
    return row["assigned_to"] if row else None


def log_activity(client_id, type, notes=None, done_by=None, date_=None, notif_message=None, **title_ctx):
    """Importable by other blueprints (deals_api, contacts_api, quotes_api) as
    a direct Python call, not an HTTP round-trip."""
    title = _default_title(type, title_ctx)
    activity_id = None
    try:
        conn = get_request_conn()
        if client_id:
            resolved_done_by = done_by or _fallback_done_by(conn, client_id)
            cur = conn.execute(
                f"INSERT INTO {TABLE} (client_id, type, title, notes, date, done_by) VALUES (?, ?, ?, ?, ?, ?)",
                (client_id, type, title, notes, date_ or date.today().isoformat(), resolved_done_by),
            )
            conn.commit()
            activity_id = cur.lastrowid
    except Exception as e:
        print("log_activity warning (activity insert skipped):", e)

    try:
        create_notification(
            type=type,
            title=title,
            message=notif_message or notes or title,
            entity_id=client_id,
        )
    except Exception as e:
        print("log_activity warning (notification skipped):", e)

    return activity_id


def compute_activities_data(client_id=None):
    conn = get_request_conn()
    if client_id is not None:
        rows = conn.execute(
            f"SELECT * FROM {TABLE} WHERE client_id = ? ORDER BY date DESC, id DESC", (client_id,)
        ).fetchall()
    else:
        rows = conn.execute(f"SELECT * FROM {TABLE} ORDER BY date DESC, id DESC LIMIT 100").fetchall()
    return [
        {
            "id": r["id"],
            "clientId": r["client_id"],
            "type": r["type"],
            "title": r["title"],
            "description": r["notes"],
            "date": r["date"],
            "loggedAt": _iso_utc(r["created_at"]),
            "user": r["done_by"],
        }
        for r in rows
    ]


@activities_bp.route("/api/db/activities", methods=["GET"])
@require_auth
def list_activities():
    return jsonify(compute_activities_data(request.args.get("client_id")))


@activities_bp.route("/api/db/activities", methods=["POST"])
@require_write_access
def create_activity():
    d = request.get_json(force=True) or {}
    client_id = d.get("client_id")
    if not client_id:
        return jsonify({"error": "client_id is required"}), 400
    activity_id = log_activity(
        client_id=client_id,
        type=d.get("type") or "note",
        notes=d.get("notes"),
        done_by=d.get("done_by"),
        date_=d.get("date"),
    )
    if not activity_id:
        return jsonify({"error": "activity was not persisted"}), 500
    conn = get_request_conn()
    row = conn.execute(f"SELECT * FROM {TABLE} WHERE id = ?", (activity_id,)).fetchone()
    if not row:
        return jsonify({"error": "activity was not persisted"}), 500
    return jsonify({
        "id": row["id"], "clientId": row["client_id"], "type": row["type"],
        "title": row["title"], "description": row["notes"], "date": row["date"],
        "loggedAt": _iso_utc(row["created_at"]), "user": row["done_by"],
    })
