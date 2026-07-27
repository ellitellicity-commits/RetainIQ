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
GUEST_JWT_TTL = timedelta(hours=2)

# One-line flip for once real company data is in the system.
GUEST_MODE_ENABLED = os.environ.get("GUEST_MODE_ENABLED", "true").strip().lower() not in ("false", "0", "no")
GUEST_EMAIL = "guest@retainiq.demo"
GUEST_NAME = "Guest"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Sane upper bounds so a pathological payload can't hang password hashing or
# get shoved into the DB -- not real-world email/password lengths, just a
# ceiling well above them.
MAX_EMAIL_LEN = 254
MAX_PASSWORD_LEN = 128


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


def _issue_token(user_id, guest=False):
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + (GUEST_JWT_TTL if guest else JWT_TTL)}
    if guest:
        payload["guest"] = True
    return jwt.encode(payload, _secret_key(), algorithm=JWT_ALGO)


def _public_user(row, guest=False):
    return {"id": row["id"], "email": row["email"], "created_at": row["created_at"], "guest": guest}


def _get_bearer_token():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return header[len("Bearer "):].strip()


def _authenticate():
    """Verifies the bearer token and loads the user it names.

    Returns (user_row, is_guest) on success. Returns (None, None) on
    failure, after having already set `request._auth_error` to the
    (response, status) tuple the caller should return -- every failure
    path (missing token, malformed/expired/tampered signature, or a
    since-deleted account) answers identically so nothing about *why*
    it failed leaks. Re-checking the DB on every call (not just trusting
    the signature) is what makes a deleted account's outstanding token
    stop working immediately instead of just at delete time.
    """
    token = _get_bearer_token()
    if not token:
        request._auth_error = (jsonify({"error": "Authentication required"}), 401)
        return None, None
    try:
        payload = jwt.decode(token, _secret_key(), algorithms=[JWT_ALGO])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        request._auth_error = (jsonify({"error": "Invalid or expired session"}), 401)
        return None, None

    conn = get_conn()
    try:
        user = conn.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    finally:
        conn.close()

    if not user:
        request._auth_error = (jsonify({"error": "Invalid or expired session"}), 401)
        return None, None

    return user, bool(payload.get("guest"))


def require_auth(f):
    """Any valid session -- real user or guest. Use on routes that only
    read data; a guest is allowed to browse everything."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user, is_guest = _authenticate()
        if user is None:
            return request._auth_error
        request.user = user
        request.is_guest = is_guest
        return f(*args, **kwargs)

    return wrapper


def require_write_access(f):
    """A valid session belonging to a real (non-guest) user. Use on any
    route that creates/updates/deletes data: 401 with no/invalid token,
    403 for an authenticated-but-guest token, regardless of what the
    frontend does or doesn't show/disable."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user, is_guest = _authenticate()
        if user is None:
            return request._auth_error
        if is_guest:
            return jsonify({"error": "Guest accounts are read-only"}), 403
        request.user = user
        request.is_guest = False
        return f(*args, **kwargs)

    return wrapper


def ensure_guest_user():
    """Idempotently seeds the fixed demo account guest tokens point at.
    A no-op once it exists; skipped entirely if guest mode is disabled."""
    if not GUEST_MODE_ENABLED:
        return
    conn = get_conn()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (GUEST_EMAIL,)).fetchone()
        if existing:
            return
        import secrets
        # Guests never authenticate with a password -- this hash is unusable
        # (no signup/login path ever compares against it), just satisfies the
        # NOT NULL column.
        unusable_hash = generate_password_hash(secrets.token_hex(32))
        conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (GUEST_NAME, GUEST_EMAIL, unusable_hash),
        )
        conn.commit()
    finally:
        conn.close()


@auth_bp.route("/api/auth/config", methods=["GET"])
def config():
    return jsonify({"guestModeEnabled": GUEST_MODE_ENABLED})


@auth_bp.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or len(email) > MAX_EMAIL_LEN or not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if len(password) > MAX_PASSWORD_LEN:
        return jsonify({"error": f"Password must be {MAX_PASSWORD_LEN} characters or fewer"}), 400

    name = email.split("@")[0]
    password_hash = generate_password_hash(password)

    conn = get_conn()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"error": "An account with that email already exists"}), 409

        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, password_hash),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            # Two concurrent signups for the same email both passed the
            # SELECT above before either committed -- the table's UNIQUE
            # constraint is the real race guard; this just turns the DB's
            # rejection into the same clean 409 instead of a 500.
            return jsonify({"error": "An account with that email already exists"}), 409

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

    generic_error = jsonify({"error": "Invalid email or password"}), 401

    # Bail before touching the DB or hashing anything -- avoids wasting a
    # scrypt hash comparison on a multi-megabyte payload, but still answers
    # with the exact same generic message so nothing is revealed.
    if len(email) > MAX_EMAIL_LEN or len(password) > MAX_PASSWORD_LEN:
        return generic_error

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
        return generic_error

    token = _issue_token(row["id"])
    return jsonify({"token": token, "user": _public_user(row)})


@auth_bp.route("/api/auth/guest", methods=["POST"])
def guest_login():
    if not GUEST_MODE_ENABLED:
        return jsonify({"error": "Guest mode is disabled"}), 403

    ensure_guest_user()
    conn = get_conn()
    try:
        row = conn.execute("SELECT id, email, created_at FROM users WHERE email = ?", (GUEST_EMAIL,)).fetchone()
    finally:
        conn.close()

    if not row:
        return jsonify({"error": "Guest mode is unavailable right now"}), 503

    token = _issue_token(row["id"], guest=True)
    return jsonify({"token": token, "user": _public_user(row, guest=True)})


@auth_bp.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    return jsonify({"user": _public_user(request.user, guest=request.is_guest)})


@auth_bp.route("/api/auth/account", methods=["DELETE"])
@require_write_access
def delete_account():
    conn = get_conn()
    try:
        conn.execute("DELETE FROM users WHERE id = ?", (request.user["id"],))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"ok": True})


try:
    ensure_guest_user()
except Exception as e:
    print("auth_api ensure_guest_user warning:", e)
