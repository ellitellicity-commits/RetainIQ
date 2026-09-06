from datetime import date
from flask import Blueprint, request, jsonify
from database import get_db, get_request_conn
from activities_api import log_activity
from auth_api import require_auth, require_write_access

contacts_bp = Blueprint("contacts_bp", __name__)
TABLE = "client_contacts"

def ensure_schema():
    conn = get_db()
    c = conn.cursor()
    c.execute(f"""CREATE TABLE IF NOT EXISTS {TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER, name TEXT, title TEXT, email TEXT, phone TEXT,
        is_primary INTEGER DEFAULT 0, created_at TEXT
    )""")
    conn.commit(); conn.close()

@contacts_bp.route("/api/db/contacts", methods=["GET"])
@require_auth
def list_contacts():
    cid = request.args.get("client_id")
    conn = get_request_conn()
    if cid is not None:
        rows = conn.execute(f"SELECT * FROM {TABLE} WHERE client_id=? ORDER BY is_primary DESC, id", (cid,)).fetchall()
    else:
        rows = conn.execute(f"SELECT * FROM {TABLE} ORDER BY id").fetchall()
    return jsonify([dict(r) for r in rows])

@contacts_bp.route("/api/db/contacts", methods=["POST"])
@require_write_access
def create_contact():
    d = request.get_json(force=True) or {}
    conn = get_request_conn()
    cur = conn.execute(
        f"INSERT INTO {TABLE} (client_id,name,title,email,phone,is_primary,created_at) VALUES (?,?,?,?,?,?,?)",
        (d.get("client_id"), d.get("name"), d.get("title"), d.get("email"), d.get("phone"),
         1 if d.get("is_primary") else 0, date.today().isoformat())
    )
    conn.commit()
    row = conn.execute(f"SELECT * FROM {TABLE} WHERE id=?", (cur.lastrowid,)).fetchone()
    log_activity(
        client_id=row["client_id"],
        type="contact_added",
        notes=row["name"] + (f" ({row['title']})" if row["title"] else ""),
    )
    return jsonify(dict(row))

@contacts_bp.route("/api/db/contacts/<int:cid>", methods=["PATCH", "PUT"])
@require_write_access
def update_contact(cid):
    d = request.get_json(force=True) or {}
    conn = get_request_conn()
    ex = conn.execute(f"SELECT * FROM {TABLE} WHERE id=?", (cid,)).fetchone()
    if not ex:
        return jsonify({"error": "not found"}), 404
    fields = ["name", "title", "email", "phone", "is_primary", "client_id"]
    ups, ps = [], []
    for f in fields:
        if f in d:
            ups.append(f"{f}=?")
            ps.append((1 if d[f] else 0) if f == "is_primary" else d[f])
    if ups:
        ps.append(cid)
        conn.execute(f"UPDATE {TABLE} SET {', '.join(ups)} WHERE id=?", ps)
        conn.commit()
    row = conn.execute(f"SELECT * FROM {TABLE} WHERE id=?", (cid,)).fetchone()
    if ups:
        log_activity(
            client_id=row["client_id"],
            type="contact_updated",
            notes=row["name"] + (f" ({row['title']})" if row["title"] else ""),
        )
    return jsonify(dict(row))

@contacts_bp.route("/api/db/contacts/<int:cid>", methods=["DELETE"])
@require_write_access
def delete_contact(cid):
    conn = get_request_conn()
    existing = conn.execute(f"SELECT * FROM {TABLE} WHERE id=?", (cid,)).fetchone()
    conn.execute(f"DELETE FROM {TABLE} WHERE id=?", (cid,))
    conn.commit()
    if existing:
        log_activity(
            client_id=existing["client_id"],
            type="contact_deleted",
            notes=existing["name"],
        )
    return jsonify({"ok": True})
