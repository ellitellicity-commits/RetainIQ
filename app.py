import os
import random
from flask import Flask, jsonify, request
from flask_cors import CORS
from model import load_and_train, get_dataframe, score_new_customer, _assign_stage
from database import get_db, init_db, seed_if_empty, ensure_todays_retention_snapshot

app = Flask(__name__)
from contacts_api import contacts_bp
app.register_blueprint(contacts_bp)
from quotes_api import quotes_bp, ensure_schema as ensure_quotes_schema
app.register_blueprint(quotes_bp)


from deals_api import deals_bp
app.register_blueprint(deals_bp)

from activities_api import activities_bp
app.register_blueprint(activities_bp)
from notifications_api import notifications_bp
app.register_blueprint(notifications_bp)

CORS(app, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "clients.csv")

model_loaded = False


def ensure_model_loaded():
    global model_loaded
    if not model_loaded:
        load_and_train(CSV_PATH)
        model_loaded = True
        print("Model trained and data loaded.")


def generate_template_email(name, plan, spend, days_no_contact, risk_score, days_until_expiry=None, software=None, contract_expiry=None, account_manager=None):
    from groq import Groq
    from dotenv import load_dotenv
    load_dotenv()

    first_name = name.split()[0] if name else "Client"
    sender = account_manager or random.choice(["Sarah Mitchell", "James Okafor", "Priya Sharma", "Marcus Chen"])

    try:
        # Explicit, tight bound instead of the SDK's defaults (connect=5s,
        # read/write/pool=60s each, retried up to 2x -- worst case ~195s of
        # a single-request block). Production runs one gunicorn sync worker,
        # so an unbounded external call here can stall every other endpoint
        # behind it for as long as Groq takes to respond or fail.
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"), timeout=10.0, max_retries=1)

        urgency = "CRITICAL - contract has expired" if days_until_expiry and days_until_expiry < 0 else f"expiring in {days_until_expiry} days" if days_until_expiry and days_until_expiry <= 30 else f"expiring in {days_until_expiry} days" if days_until_expiry else "approaching renewal"

        prompt = f"""You are {sender}, an account manager at Digital Move IT & Telecom.
Write a short, professional, personalized renewal email to {name}.

Client details:
- Company: {name}
- Software: {software or plan}
- Contract expiry: {contract_expiry or "soon"} ({urgency})
- Last contact: {days_no_contact} days ago
- Contract value: ${spend}

Rules:
- 3 short paragraphs max
- Mention the specific software and expiry date
- Be warm and professional, not robotic
- End with a clear call to action to schedule a call
- Sign off as {sender}, Digital Move IT & Telecom
- Higher urgency = more urgent tone

Respond in this exact format and nothing else:
SUBJECT: <subject line here, one line only>
BODY:
<email body here, do NOT repeat the subject line>"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )

        text = response.choices[0].message.content.strip()
        subject = ""
        body = ""
        if "BODY:" in text:
            parts = text.split("BODY:", 1)
            subject_part = parts[0]
            body = parts[1].strip()
            for line in subject_part.split("\n"):
                if line.strip().upper().startswith("SUBJECT:"):
                    subject = line.strip()[8:].strip()
                    break
        else:
            lines = text.split("\n")
            subject = lines[0].replace("SUBJECT:", "").strip()
            body = "\n".join(lines[1:]).strip()
        body_lines = body.split("\n")

        body = "\n".join(body_lines).strip()
        # Remove subject line if it appears in body
        if body.startswith("SUBJECT:"):
            body = "\n".join(body.split("\n")[1:]).strip()
        # Remove subject line if it appears in body
        if body.startswith("SUBJECT:"):
            body = "\n".join(body.split("\n")[1:]).strip()
        if not subject:
            subject = f"Contract Renewal — {software or 'Your License'} expiring soon"
        if not body:
            body = text

        return subject, body

    except Exception as e:
        print(f"Groq error: {e}")
        # fallback to template
        first_name = name.split()[0] if name else "Client"
        subject = f"Your {software or 'software'} contract renewal — action needed"
        body = (
            f"Hi {first_name},\n\n"
            f"I wanted to reach out regarding {name}'s {software or 'software license'} which is {urgency if days_until_expiry else 'coming up for renewal'}.\n\n"
            f"I'd love to schedule a quick call this week to discuss renewal options and ensure there's no interruption to your service.\n\n"
            f"Would you have 15 minutes this week?\n\n"
            f"Best,\n{sender}\nDigital Move IT & Telecom"
        )
        return subject, body

    senders = ["Sarah", "James", "Priya", "Marcus", "Elena", "David"]
    sender = random.choice(senders)

    titles = [
        "Customer Success Manager",
        "Account Manager",
        "Client Relations Specialist",
        "Customer Experience Lead",
    ]
    title = random.choice(titles)

    openers = [
        "I hope you're having a great week so far!",
        "I was just thinking about our customers and wanted to personally reach out.",
        "Quick note from me — I wanted to check in and see how things are going on your end.",
        "I noticed it's been a little while since we last connected and wanted to say hi.",
        "Hope things are going well! I wanted to take a moment to reach out personally.",
        "Just dropping a quick note to check in — we really value having you with us.",
    ]

    if days_no_contact > 30:
        opener = random.choice([
            "I realized it's been a while since we last touched base, and I didn't want too much more time to pass without checking in.",
            "I noticed we haven't connected in a bit — I hope everything has been going smoothly on your end!",
            f"Time flies! I can't believe it's been {days_no_contact} days since we last spoke. I wanted to reach out personally.",
        ])
    else:
        opener = random.choice(openers)

    if spend < 100:
        offers = [
            f"I'd love to walk you through some of the newer features on your {plan} plan that you might not have had a chance to explore yet.",
            "I think there might be a better fit for what you're trying to accomplish — would love to chat about your options.",
            "We've recently added some great new features that I think could make a real difference for you.",
        ]
    elif plan == "Enterprise":
        offers = [
            "As one of our Enterprise customers, I want to make sure you're getting the absolute most out of everything available to you.",
            "I wanted to personally check that your team has everything they need and that we're meeting your expectations.",
            "Your success is really important to us — I'd love to hear how things have been going and if there's anything we can improve.",
        ]
    else:
        offers = [
            f"I wanted to make sure you're getting the most out of your {plan} plan and that everything is running smoothly.",
            "We've been rolling out some improvements lately and I wanted to make sure you're aware of everything available to you.",
            "I'd love to hear how things have been going — your feedback really helps us improve.",
        ]
    offer = random.choice(offers)

    if risk_score > 85:
        ctas = [
            "Would you have 15 minutes this week for a quick call? I'd love to connect.",
            "If you ever have questions or concerns, please don't hesitate to reach out — I'm always happy to help.",
            "Could we find 10-15 minutes to catch up? I'd really value hearing your thoughts.",
        ]
    else:
        ctas = [
            "Feel free to reply here or book a quick call whenever works for you!",
            "My calendar is open — happy to jump on a call at your convenience.",
            "Don't hesitate to reach out anytime — I'm here whenever you need me.",
        ]
    cta = random.choice(ctas)

    closings = [
        "Looking forward to hearing from you!",
        "Hope to connect soon!",
        "Talk soon!",
        "Warmly,",
        "Best wishes,",
    ]
    closing = random.choice(closings)

    subjects = [
        f"Checking in, {first_name} — how's everything going?",
        f"Hey {first_name}, just wanted to touch base!",
        f"A quick note for you, {first_name}",
        f"{first_name} — how are things with Digital Move?",
        f"Thinking of you, {first_name} — let's catch up!",
    ]
    subject = random.choice(subjects)

    extras = [
        "\nWe've also got some exciting updates coming up that I think you'll really like — happy to share more on a call.",
        f"\nAs a valued {plan} customer, there may also be some exclusive options available to you that I'd love to walk you through.",
        "",
        "",
        "",
    ]
    extra = random.choice(extras)

    body = (
        f"Hi {first_name},\n\n"
        f"{opener}\n\n"
        f"{offer}{extra}\n\n"
        f"{cta}\n\n"
        f"{closing}\n"
        f"{sender}\n"
        f"{title}\n"
        f"Digital Move IT & Telecom"
    )

    return subject, body


@app.route("/")
def home():
    return "RetainIQ backend is running"


@app.route("/api/ping")
def ping():
    return jsonify({"status": "ok"})


@app.route("/api/render-test")
def render_test():
    return jsonify({"message": "new backend file is live"})


@app.route("/api/customers")
def get_customers():
    ensure_model_loaded()

    df = get_dataframe()
    sort_by = request.args.get("sort", "churn_risk_score")
    order = request.args.get("order", "desc")
    stage = request.args.get("stage", None)

    if sort_by not in df.columns:
        sort_by = "churn_risk_score"

    result = df.sort_values(sort_by, ascending=(order == "asc"))

    if stage and "journey_stage" in result.columns:
        result = result[result["journey_stage"] == stage]

    return jsonify(result.to_dict(orient="records"))


@app.route("/api/customers/<int:customer_id>")
def get_customer(customer_id):
    ensure_model_loaded()

    df = get_dataframe()
    row = df[df["id"] == customer_id]
    if row.empty:
        return jsonify({"error": "Customer not found"}), 404
    return jsonify(row.iloc[0].to_dict())


@app.route("/api/stats")
def get_stats():
    ensure_model_loaded()

    df = get_dataframe()
    by_stage = df.groupby("journey_stage").size().to_dict()


    by_vendor = (
        df.groupby("vendor")
        .agg(count=("id", "count"), avg_score=("churn_risk_score", "mean"))
        .round(1)
        .reset_index()
        .to_dict(orient="records")
    )

    expiring_30 = int((df["days_until_expiry"] <= 30).sum())
    expiring_90 = int((df["days_until_expiry"] <= 90).sum())
    total_value_at_risk = int(df[df["churn_risk_score"] > 50]["contract_value"].sum())

    return jsonify({
        "total_customers": int(len(df)),
        "avg_risk_score": round(float(df["churn_risk_score"].mean()), 1),
        "high_risk_count": int((df["churn_risk_score"] > 70).sum()),
        "medium_risk_count": int(((df["churn_risk_score"] >= 40) & (df["churn_risk_score"] <= 70)).sum()),
        "low_risk_count": int((df["churn_risk_score"] < 40).sum()),
        "by_stage": by_stage,
        "by_plan": by_vendor,
        "expiring_30": expiring_30,
        "expiring_90": expiring_90,
        "total_value_at_risk": total_value_at_risk,
    })


@app.route("/api/alerts")
def get_alerts():
    ensure_model_loaded()

    df = get_dataframe()
    alerts = df[df["churn_risk_score"] > 70].sort_values("churn_risk_score", ascending=False)
    return jsonify({
        "count": int(len(alerts)),
        "customers": alerts.to_dict(orient="records"),
    })


@app.route("/api/journey")
def get_journey():
    ensure_model_loaded()

    df = get_dataframe()
    stages = ["Active", "At-Risk", "Critical", "Expired"]
    result = []

    for stage in stages:
        stage_df = df[df["journey_stage"] == stage]
        result.append({
            "stage": stage,
            "count": int(len(stage_df)),
            "customers": stage_df[["id", "client_name", "vendor", "software", "churn_risk_score"]].to_dict(orient="records"),
        })

    return jsonify(result)


@app.route("/api/email", methods=["POST"])
def generate_email():
    ensure_model_loaded()

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    name = data.get("customer_name") or data.get("name", "Valued Customer")
    risk_score = data.get("risk_score") or data.get("churn_risk_score", 75)
    plan = data.get("plan", "Standard")
    spend = data.get("spend") or data.get("monthly_spend", 0)
    days_no_contact = data.get("days_since_contact") or data.get("days_since_last_contact", 30)

    subject, body = generate_template_email(name, plan, spend, days_no_contact, risk_score)

    return jsonify({
        "customer_name": name,
        "subject": subject,
        "body": body,
    })


@app.route("/api/score", methods=["POST"])
def score_customer():
    ensure_model_loaded()

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        score = score_new_customer(data)
        return jsonify({
            "churn_risk_score": score,
            "journey_stage": _assign_stage(score),
            "risk_level": "High" if score > 70 else ("Medium" if score >= 40 else "Low"),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route("/api/upload", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "File must be a CSV"}), 400
    try:
        import pandas as pd
        import io
        contents = file.read()
        df = pd.read_csv(io.BytesIO(contents))
        required = ["client_name", "software", "vendor", "contract_start", 
                    "contract_expiry", "contract_value", "last_contact", "account_manager"]
        missing = [col for col in required if col not in df.columns]
        if missing:
            return jsonify({"error": f"Missing columns: {', '.join(missing)}"}), 400
        df.to_csv(CSV_PATH, index=False)
        global model_loaded
        model_loaded = False
        ensure_model_loaded()
        return jsonify({"success": True, "message": "Data uploaded and analyzed!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/reset", methods=["POST"])
def reset_data():
    global model_loaded
    original = os.path.join(BASE_DIR, "customers_backup.csv")
    if os.path.exists(original):
        import shutil
        shutil.copy(original, CSV_PATH)
    model_loaded = False
    ensure_model_loaded()
    return jsonify({"success": True})

@app.route("/api/db/clients")
def get_db_clients():
    from datetime import datetime
    conn = get_db()
    try:
        c = conn.cursor()

        today = datetime.today()

        c.execute("""
            SELECT
                cl.id,
                cl.company_name,
                cl.industry,
                cl.country,
                co.software,
                co.vendor,
                co.start_date,
                co.expiry_date,
                co.value as contract_value,
                co.assigned_to,
                co.status,
                co.last_contact as lc
            FROM clients cl
            LEFT JOIN contracts co ON cl.id = co.client_id
            ORDER BY co.expiry_date ASC
        """)

        rows = c.fetchall()
    finally:
        conn.close()

    clients = []
    for row in rows:
        row = dict(row)
        row['client_name'] = row.get('company_name')
        row['contract_start'] = row.get('start_date')
        row['contract_expiry'] = row.get('expiry_date')
        row['account_manager'] = row.get('assigned_to')
        row['last_contact'] = row.get('lc')
        if row.get('last_contact'):
            try:
                last = datetime.strptime(row['last_contact'], '%Y-%m-%d')
                row['days_since_contact'] = (today - last).days
            except:
                row['days_since_contact'] = None
        else:
            row['days_since_contact'] = None

        if row['expiry_date']:
            try:
                expiry = datetime.strptime(row['expiry_date'], '%Y-%m-%d')
                days_until_expiry = (expiry - today).days
                row['days_until_expiry'] = days_until_expiry
                
                # Risk score
                if days_until_expiry < 0:
                    score = 80
                    stage = "Expired"
                elif days_until_expiry <= 30:
                    score = 70
                    stage = "Critical"
                elif days_until_expiry <= 90:
                    score = 50
                    stage = "At-Risk"
                else:
                    score = 20
                    stage = "Active"
                    
                row['churn_risk_score'] = score
                row['journey_stage'] = stage
            except:
                row['days_until_expiry'] = None
                row['churn_risk_score'] = 0
                row['journey_stage'] = "Unknown"
        
        clients.append(row)
    
    return jsonify(clients)


@app.route("/api/db/stats")
def get_db_stats():
    from datetime import datetime
    conn = get_db()
    try:
        c = conn.cursor()
        today = datetime.today()

        c.execute("SELECT COUNT(*) as total FROM clients")
        total = c.fetchone()['total']

        c.execute("SELECT COUNT(*) as total, SUM(value) as total_value FROM contracts")
        contracts = c.fetchone()

        c.execute("SELECT expiry_date, value FROM contracts WHERE expiry_date IS NOT NULL")
        all_contracts = c.fetchall()
    finally:
        conn.close()

    expired = critical = at_risk = active = 0
    value_at_risk = 0
    expiring_30 = 0
    expiring_90 = 0

    for contract in all_contracts:
        try:
            expiry = datetime.strptime(contract['expiry_date'], '%Y-%m-%d')
            days = (expiry - today).days
            val = contract['value'] or 0

            if days < 0:
                expired += 1
                value_at_risk += val
            elif days <= 30:
                critical += 1
                expiring_30 += 1
                expiring_90 += 1
                value_at_risk += val
            elif days <= 90:
                at_risk += 1
                expiring_90 += 1
                value_at_risk += val
            else:
                active += 1
        except:
            pass

    return jsonify({
        "total_customers": total,
        "high_risk_count": expired + critical,
        "medium_risk_count": at_risk,
        "low_risk_count": active,
        "expiring_30": expiring_30,
        "expiring_90": expiring_90,
        "total_value_at_risk": value_at_risk,
        "by_stage": {
            "Expired": expired,
            "Critical": critical,
            "At-Risk": at_risk,
            "Active": active
        }
    })


@app.route("/api/db/retention-history")
def get_retention_history():
    from datetime import datetime

    conn = get_db()
    try:
        # Defensive daily check: cheap no-op if today's row already exists,
        # otherwise records it. Covers the case where the process has been
        # warm since before midnight and no restart has happened to re-run
        # seed_if_empty()'s startup check.
        ensure_todays_retention_snapshot(conn)

        c = conn.cursor()
        c.execute("SELECT snapshot_date, retention_pct FROM retention_snapshots ORDER BY snapshot_date ASC")
        rows = c.fetchall()
    finally:
        conn.close()

    months_param = request.args.get("months", "3")
    n = {"3": 3, "6": 6, "12": 12}.get(months_param, 3)

    # Bucket by calendar month, keeping the latest snapshot per month
    # (rows are ASC by date, so the last write per key wins). This is how
    # a 'live' snapshot for the current month naturally supersedes that
    # month's 'seed' estimate with no extra branching.
    by_month = {}
    for row in rows:
        d = datetime.strptime(row["snapshot_date"], "%Y-%m-%d")
        by_month[(d.year, d.month)] = (d, row["retention_pct"])

    ordered_keys = sorted(by_month.keys())[-n:]
    result = [
        {"month": by_month[k][0].strftime("%b '%y"), "retention_pct": round(by_month[k][1], 1)}
        for k in ordered_keys
    ]
    return jsonify(result)


@app.route("/api/db/import", methods=["POST"])
def import_data():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        return jsonify({"error": "File must be CSV or Excel"}), 400
    
    try:
        import tempfile
        from importer import import_file
        
        # Save to temp file
        suffix = '.csv' if file.filename.endswith('.csv') else '.xlsx'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            result = import_file(tmp.name)
        
        os.unlink(tmp.name)
        return jsonify({"success": True, "imported": result['imported'], "mapping": result['mapping']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Render wipes the disk on every boot, so rebuild + reseed the DB on startup.
init_db()

# quotes_api.ensure_schema() also runs at import time (above), but that fires
# before pipeline_deals necessarily exists yet -- deals_api's own ensure_schema()
# (imported after quotes_api, line 15) can end up being what actually creates
# pipeline_deals first, with its own narrower schema that has no quote_discount/
# quote_status/quote_sent_at columns, leaving quotes_api's ALTER TABLE calls
# swallowed and the columns permanently missing. Re-run it now that init_db()
# has guaranteed the table exists, and before seed_if_empty() -- which writes
# to those columns -- runs.
ensure_quotes_schema()
seed_if_empty()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
