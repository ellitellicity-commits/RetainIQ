import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from dotenv import load_dotenv
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

auth_bp = Blueprint("auth_bp", __name__)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "retainiq.db")

JWT_ALGO = "HS256"
JWT_TTL = timedelta(days=7)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _secret_key():
    # Falls back to an in-process random key so local dev never hard-crashes
    # without a .env, but this means tokens issued before a restart won't
    # verify after one -- production must set SECRET_KEY explicitly.
    key = os.environ.get("SECRET_KEY")
    if not key:
        import secrets
        key = secrets.token_hex(32)
        print("WARNING: SECRET_KEY not set -- using an ephemeral key for this process only.")
        os.environ["SECRET_KEY"] = key
    return key


def _issue_token(user_id):
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + JWT_TTL}
    return jwt.encode(payload, _secret_key(), algorithm=JWT_ALGO)


def _public_user(row):
    return {"id": row["id"], "email": row["email"], "created_at": row["created_at"]}


def _get_bearer_token():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return header[len("Bearer "):].strip()


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = _get_bearer_token()
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        try:
            payload = jwt.decode(token, _secret_key(), algorithms=[JWT_ALGO])
            user_id = int(payload["sub"])
        except (jwt.PyJWTError, ValueError, KeyError):
            return jsonify({"error": "Invalid or expired session"}), 401

        conn = get_conn()
        try:
            user = conn.execute(
                "SELECT id, email, created_at FROM users WHERE id = ?", (user_id,)
            ).fetchone()
        finally:
            conn.close()

        # Re-checking against the DB (not just trusting the token) means a
        # deleted account's outstanding token stops working immediately.
        if not user:
            return jsonify({"error": "Invalid or expired session"}), 401

        request.user = user
        return f(*args, **kwargs)

    return wrapper


@auth_bp.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    name = email.split("@")[0]
    password_hash = generate_password_hash(password)

    conn = get_conn()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"error": "An account with that email already exists"}), 409

        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, password_hash),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    finally:
        conn.close()

    token = _issue_token(row["id"])
    return jsonify({"token": token, "user": _public_user(row)}), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT id, email, created_at, password_hash FROM users WHERE email = ?", (email,)
        ).fetchone()
    finally:
        conn.close()

    # Same generic message whether the email doesn't exist or the password
    # is wrong -- never reveal which one it was.
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = _issue_token(row["id"])
    return jsonify({"token": token, "user": _public_user(row)})


@auth_bp.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    return jsonify({"user": _public_user(request.user)})


@auth_bp.route("/api/auth/account", methods=["DELETE"])
@require_auth
def delete_account():
    conn = get_conn()
    try:
        conn.execute("DELETE FROM users WHERE id = ?", (request.user["id"],))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"ok": True})
