from datetime import datetime
from flask import Blueprint, request, jsonify
from database import get_db, get_request_conn
from auth_api import require_auth, require_write_access

notifications_bp = Blueprint("notifications_bp", __name__)
TABLE = "notifications"


def ensure_schema():
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute(f"""CREATE TABLE IF NOT EXISTS {TABLE} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT,
            title TEXT,
            message TEXT,
            entity_id INTEGER,
            read INTEGER DEFAULT 0,
            created_at TEXT
        )""")
        conn.commit()
    finally:
        conn.close()


def create_notification(type, title, message, entity_id=None):
    """Importable by other blueprints. Notifications are a single global
    feed (user_id stays unset), consistent with the rest of the app having
    no per-user data scoping -- every authenticated user sees the same
    feed, this just isn't reachable without a valid session anymore."""
    conn = get_request_conn()
    conn.execute(
        f"INSERT INTO {TABLE} (type, title, message, entity_id, read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        (type, title, message, entity_id, datetime.utcnow().isoformat() + "Z"),
    )
    conn.commit()


@notifications_bp.route("/api/db/notifications", methods=["GET"])
@require_auth
def list_notifications():
    conn = get_request_conn()
    rows = conn.execute(f"SELECT * FROM {TABLE} ORDER BY id DESC LIMIT 50").fetchall()
    return jsonify([dict(r) for r in rows])


@notifications_bp.route("/api/db/notifications/<int:nid>", methods=["PATCH"])
@require_write_access
def mark_read(nid):
    conn = get_request_conn()
    conn.execute(f"UPDATE {TABLE} SET read = 1 WHERE id = ?", (nid,))
    conn.commit()
    row = conn.execute(f"SELECT * FROM {TABLE} WHERE id = ?", (nid,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(dict(row))


@notifications_bp.route("/api/db/notifications/mark-all-read", methods=["PATCH"])
@require_write_access
def mark_all_read():
    conn = get_request_conn()
    conn.execute(f"UPDATE {TABLE} SET read = 1 WHERE read = 0")
    conn.commit()
    return jsonify({"ok": True})
