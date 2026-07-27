import os, sqlite3
from datetime import datetime
from flask import Blueprint, request, jsonify
from auth_api import block_guest

notifications_bp = Blueprint("notifications_bp", __name__)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "retainiq.db")
TABLE = "notifications"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema():
    conn = get_conn()
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
    """Importable by other blueprints. This app has no real auth/session, so
    notifications are a single global feed (user_id stays unset), consistent
    with the rest of the app having no per-user scoping."""
    conn = get_conn()
    try:
        conn.execute(
            f"INSERT INTO {TABLE} (type, title, message, entity_id, read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (type, title, message, entity_id, datetime.utcnow().isoformat() + "Z"),
        )
        conn.commit()
    finally:
        conn.close()


@notifications_bp.route("/api/db/notifications", methods=["GET"])
def list_notifications():
    conn = get_conn()
    try:
        rows = conn.execute(f"SELECT * FROM {TABLE} ORDER BY id DESC LIMIT 50").fetchall()
    finally:
        conn.close()
    return jsonify([dict(r) for r in rows])


@notifications_bp.route("/api/db/notifications/<int:nid>", methods=["PATCH"])
@block_guest
def mark_read(nid):
    conn = get_conn()
    try:
        conn.execute(f"UPDATE {TABLE} SET read = 1 WHERE id = ?", (nid,))
        conn.commit()
        row = conn.execute(f"SELECT * FROM {TABLE} WHERE id = ?", (nid,)).fetchone()
    finally:
        conn.close()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(dict(row))


@notifications_bp.route("/api/db/notifications/mark-all-read", methods=["PATCH"])
@block_guest
def mark_all_read():
    conn = get_conn()
    try:
        conn.execute(f"UPDATE {TABLE} SET read = 1 WHERE read = 0")
        conn.commit()
    finally:
        conn.close()
    return jsonify({"ok": True})


try:
    ensure_schema()
except Exception as e:
    print("notifications_api ensure_schema warning:", e)
