from flask import Blueprint, request, jsonify
import sqlite3, os
from datetime import datetime
from activities_api import log_activity
from auth_api import require_auth, require_write_access

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "retainiq.db")

quotes_bp = Blueprint("quotes_bp", __name__)


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema():
    conn = get_conn()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS quote_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deal_id INTEGER NOT NULL,
            description TEXT,
            quantity REAL DEFAULT 1,
            unit_price REAL DEFAULT 0,
            sort_order INTEGER DEFAULT 0
        )
    ''')
    for ddl in [
        "ALTER TABLE pipeline_deals ADD COLUMN quote_discount REAL DEFAULT 0",
        "ALTER TABLE pipeline_deals ADD COLUMN quote_status TEXT DEFAULT 'none'",
        "ALTER TABLE pipeline_deals ADD COLUMN quote_sent_at TEXT",
    ]:
        try:
            c.execute(ddl)
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()


try:
    ensure_schema()
except Exception as e:
    print("[quotes] schema init note:", e)


def quote_total_for(c, deal_id, discount):
    items = c.execute(
        "SELECT quantity, unit_price FROM quote_items WHERE deal_id = ?", (deal_id,)
    ).fetchall()
    subtotal = sum((i["quantity"] or 0) * (i["unit_price"] or 0) for i in items)
    total = subtotal * (1 - (discount or 0) / 100.0)
    return subtotal, total, len(items)


@quotes_bp.route("/api/db/quote/<int:deal_id>", methods=["GET"])
@require_auth
def get_quote(deal_id):
    conn = get_conn()
    c = conn.cursor()
    row = c.execute(
        "SELECT quote_discount, quote_status FROM pipeline_deals WHERE id = ?",
        (deal_id,),
    ).fetchone()
    discount = row["quote_discount"] if row and row["quote_discount"] is not None else 0
    status = row["quote_status"] if row and row["quote_status"] else "none"
    items = c.execute(
        "SELECT id, description, quantity, unit_price FROM quote_items WHERE deal_id = ? ORDER BY sort_order, id",
        (deal_id,),
    ).fetchall()
    conn.close()
    return jsonify({
        "deal_id": deal_id,
        "discount": discount,
        "status": status,
        "items": [dict(i) for i in items],
    })


@quotes_bp.route("/api/db/quote/<int:deal_id>", methods=["PUT"])
@require_write_access
def save_quote(deal_id):
    data = request.get_json(force=True) or {}
    items = data.get("items", []) or []
    try:
        discount = float(data.get("discount", 0) or 0)
    except (TypeError, ValueError):
        discount = 0

    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM quote_items WHERE deal_id = ?", (deal_id,))
    for idx, it in enumerate(items):
        desc = (it.get("description") or "").strip()
        try:
            qty = float(it.get("quantity") or 0)
        except (TypeError, ValueError):
            qty = 0
        try:
            price = float(it.get("unit_price") or 0)
        except (TypeError, ValueError):
            price = 0
        c.execute(
            "INSERT INTO quote_items (deal_id, description, quantity, unit_price, sort_order) VALUES (?, ?, ?, ?, ?)",
            (deal_id, desc, qty, price, idx),
        )

    c.execute("UPDATE pipeline_deals SET quote_discount = ? WHERE id = ?", (discount, deal_id))

    deal = c.execute("SELECT company, client_id, owner, quote_status FROM pipeline_deals WHERE id = ?", (deal_id,)).fetchone()
    status = deal["quote_status"] if deal and deal["quote_status"] else "none"
    just_created = status == "none" and items
    if just_created:
        c.execute("UPDATE pipeline_deals SET quote_status = 'draft' WHERE id = ?", (deal_id,))
        status = "draft"

    conn.commit()
    saved = c.execute(
        "SELECT id, description, quantity, unit_price FROM quote_items WHERE deal_id = ? ORDER BY sort_order, id",
        (deal_id,),
    ).fetchall()
    conn.close()

    if just_created and deal:
        log_activity(
            client_id=deal["client_id"],
            type="quote_created",
            notes=f"{deal['company']}: {len(items)} line item(s)",
            done_by=deal["owner"],
        )

    return jsonify({
        "deal_id": deal_id,
        "discount": discount,
        "status": status,
        "items": [dict(i) for i in saved],
    })


@quotes_bp.route("/api/db/quote/<int:deal_id>/send", methods=["POST"])
@require_write_access
def send_quote(deal_id):
    conn = get_conn()
    c = conn.cursor()
    row = c.execute("SELECT quote_discount, company, client_id, owner FROM pipeline_deals WHERE id = ?", (deal_id,)).fetchone()
    discount = row["quote_discount"] if row and row["quote_discount"] is not None else 0
    subtotal, total, _ = quote_total_for(c, deal_id, discount)
    now = datetime.utcnow().strftime("%Y-%m-%d")
    c.execute(
        "UPDATE pipeline_deals SET value = ?, stage = ?, stage_updated_at = ?, status = ?, quote_status = ?, quote_sent_at = ? WHERE id = ?",
        (total, "Quote sent", now, "open", "sent", now, deal_id),
    )
    conn.commit()
    conn.close()

    if row:
        log_activity(
            client_id=row["client_id"],
            type="quote_sent",
            notes=f"{row['company']}: total ${total:,.0f}",
            done_by=row["owner"],
        )

    return jsonify({
        "deal_id": deal_id,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "stage": "Quote sent",
        "quote_status": "sent",
    })


@quotes_bp.route("/api/db/quotes", methods=["GET"])
@require_auth
def quotes_list():
    """List quotes. With ?company=X, scoped to that company (used by the
    Clients drawer). Without it, returns every quote across every deal
    (used by the standalone Quotes page)."""
    company = (request.args.get("company") or "").strip()
    conn = get_conn()
    c = conn.cursor()
    if company:
        deals = c.execute(
            "SELECT id, company, stage, value, quote_discount, quote_status, quote_sent_at, expected_close_date, owner "
            "FROM pipeline_deals WHERE LOWER(TRIM(company)) = LOWER(TRIM(?))",
            (company,),
        ).fetchall()
    else:
        deals = c.execute(
            "SELECT id, company, stage, value, quote_discount, quote_status, quote_sent_at, expected_close_date, owner "
            "FROM pipeline_deals"
        ).fetchall()
    out = []
    for d in deals:
        discount = d["quote_discount"] or 0
        subtotal, total, item_count = quote_total_for(c, d["id"], discount)
        status = d["quote_status"] or "none"
        if status == "none" and item_count == 0:
            continue  # no quote on this deal yet
        out.append({
            "deal_id": d["id"],
            "company": d["company"],
            "stage": d["stage"],
            "status": status,
            "discount": discount,
            "subtotal": subtotal,
            "total": total,
            "item_count": item_count,
            "expected_close_date": d["expected_close_date"],
            "sent_at": d["quote_sent_at"],
            "owner": d["owner"],
        })
    conn.close()
    return jsonify(out)
