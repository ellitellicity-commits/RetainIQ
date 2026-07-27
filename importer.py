import pandas as pd
import json
import os
from groq import Groq
from dotenv import load_dotenv
from database import get_db, init_db
from datetime import datetime, date

load_dotenv()

# Explicit, tight bound instead of the SDK's defaults -- see the matching
# comment in app.py's generate_template_email for why this matters: each
# gunicorn worker (see Procfile) only handles one request at a time.
client = Groq(api_key=os.environ.get("GROQ_API_KEY"), timeout=10.0, max_retries=1)

KNOWN_FIELDS = {
    "company_name": ["company", "client", "organization", "account", "business", "firm", "company name", "client name"],
    "industry": ["industry", "sector", "vertical", "business type"],
    "country": ["country", "region", "location", "territory"],
    "contact_name": ["contact", "person", "rep", "contact name", "person of contact", "point of contact"],
    "contact_role": ["role", "title", "position", "job title"],
    "contact_email": ["email", "email address", "e-mail"],
    "contact_phone": ["phone", "telephone", "mobile", "cell"],
    "software": ["software", "product", "solution", "service", "tool"],
    "vendor": ["vendor", "supplier", "manufacturer", "provider", "partner"],
    "expiry_date": ["expiry", "expiration", "renewal", "end date", "contract end", "renewal date", "expected date"],
    "start_date": ["start", "start date", "contract start", "begin date"],
    "contract_value": ["value", "amount", "price", "revenue", "deal value", "contract value", "arr", "mrr", "$"],
    "assigned_to": ["assigned", "owner", "rep", "account manager", "sales rep", "team member", "responsible"],
    "last_contact": ["last contact", "last call", "last touch", "last interaction", "last meeting"],
    "status": ["status", "stage", "state"],
    "notes": ["notes", "comments", "description", "remarks"],
}

def ai_map_columns(columns, sample_rows):
    """Use Groq to intelligently map Excel columns to our database fields"""
    sample_str = "\n".join([str(row) for row in sample_rows[:3]])
    prompt = f"""You are a data mapping expert. Map these Excel columns to CRM database fields.

Excel columns: {columns}

Sample data rows:
{sample_str}

Available database fields:
- company_name: the company/client name
- industry: business sector
- country: location/country
- contact_name: person of contact name
- contact_role: their job title/role
- contact_email: their email
- contact_phone: their phone number
- software: software/product sold
- vendor: software vendor/supplier
- expiry_date: contract expiry/renewal date
- start_date: contract start date
- contract_value: monetary value of contract
- assigned_to: team member responsible
- last_contact: date of last contact/interaction
- status: current status of account
- notes: any notes or comments
- ignore: column is not relevant

Respond ONLY with a valid JSON object mapping each column to a field.
Example: {{"Company Name": "company_name", "Phone": "contact_phone", "Internal ID": "ignore"}}

JSON:"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
    )
    text = response.choices[0].message.content.strip()
    if "```" in text:
        text = text.split("```")[1].replace("json", "").strip()
    try:
        return json.loads(text)
    except:
        return {}

def harden_schema(c):
    """Make sure columns/tables we rely on exist, even on an older DB."""
    try:
        c.execute("ALTER TABLE contracts ADD COLUMN last_contact TEXT")
    except Exception:
        pass
    c.execute("""CREATE TABLE IF NOT EXISTS client_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER, name TEXT, title TEXT, email TEXT, phone TEXT,
        is_primary INTEGER DEFAULT 0, created_at TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS pipeline_deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT, value REAL, stage TEXT, owner TEXT,
        next_action TEXT, next_action_date TEXT, lead_source TEXT,
        product TEXT, stage_updated_at TEXT, created_at TEXT, status TEXT,
        expected_close_date TEXT
    )""")
    cols = {r["name"] for r in c.execute("PRAGMA table_info(pipeline_deals)").fetchall()}
    if "client_id" not in cols:
        c.execute("ALTER TABLE pipeline_deals ADD COLUMN client_id INTEGER")

def generate_renewal_deals(c):
    """Create/refresh a renewal opportunity in the pipeline for each expiring contract."""
    today = date.today()
    WINDOW = 150
    made = 0
    rows = c.execute("""
        SELECT co.client_id, co.software, co.value, co.expiry_date, co.assigned_to, cl.company_name
        FROM contracts co JOIN clients cl ON cl.id = co.client_id
        WHERE co.expiry_date IS NOT NULL
    """).fetchall()
    for r in rows:
        try:
            exp = datetime.strptime(str(r["expiry_date"])[:10], "%Y-%m-%d").date()
        except Exception:
            continue
        days = (exp - today).days
        if days > WINDOW:
            continue
        if days <= 0:
            stage = "Negotiation"
        elif days <= 30:
            stage = "Quote sent"
        elif days <= 90:
            stage = "Qualified"
        else:
            stage = "New Leads"
        product = (r["software"] or "Contract") + " renewal"
        company = r["company_name"]
        value = r["value"] or 0
        owner = r["assigned_to"]
        ecd = exp.isoformat()
        nowiso = today.isoformat()
        existing = c.execute(
            "SELECT id FROM pipeline_deals WHERE client_id=? AND product=? AND lead_source='Renewal'",
            (r["client_id"], product)
        ).fetchone()
        if existing:
            c.execute(
                "UPDATE pipeline_deals SET value=?, stage=?, expected_close_date=?, owner=?, company=? WHERE id=?",
                (value, stage, ecd, owner, company, existing["id"])
            )
        else:
            c.execute(
                "INSERT INTO pipeline_deals (company,client_id,value,stage,owner,next_action,next_action_date,lead_source,product,stage_updated_at,created_at,status,expected_close_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (company, r["client_id"], value, stage, owner, "Reach out about renewal", nowiso, "Renewal", product, nowiso, nowiso, "open", ecd)
            )
            made += 1
    return made

def import_file(filepath):
    """Import CSV or Excel file into database"""
    if filepath.endswith('.csv'):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)

    columns = list(df.columns)
    sample_rows = df.head(3).to_dict('records')

    print(f"Found columns: {columns}")
    print("Asking AI to map columns...")
    mapping = ai_map_columns(columns, sample_rows)
    print(f"AI mapping: {mapping}")

    init_db()
    conn = get_db()
    c = conn.cursor()
    harden_schema(c)

    imported = 0
    contacts_added = 0

    for _, row in df.iterrows():
        data = {}
        extra = {}
        for col, field in mapping.items():
            if col in row and field != "ignore":
                data[field] = row[col]
            elif col in row and field == "ignore":
                pass
            elif col in row:
                extra[col] = row[col]

        company = data.get("company_name", "Unknown")

        c.execute("SELECT id FROM clients WHERE company_name = ?", (company,))
        existing = c.fetchone()
        if existing:
            client_id = existing[0]
        else:
            c.execute("INSERT INTO clients (company_name, industry, country) VALUES (?, ?, ?)",
                      (company, data.get("industry"), data.get("country")))
            client_id = c.lastrowid

        # Contact -> client_contacts (the table the UI reads), de-duped by name
        if data.get("contact_name"):
            nm = data.get("contact_name")
            ex_contact = c.execute("SELECT id FROM client_contacts WHERE client_id=? AND name=?", (client_id, nm)).fetchone()
            if not ex_contact:
                c.execute(
                    "INSERT INTO client_contacts (client_id,name,title,email,phone,is_primary,created_at) VALUES (?,?,?,?,?,1,?)",
                    (client_id, nm, data.get("contact_role"), data.get("contact_email"), data.get("contact_phone"), date.today().isoformat())
                )
                contacts_added += 1

        # Contract (insert or update by client + software)
        if data.get("expiry_date") or data.get("software"):
            c.execute("SELECT id FROM contracts WHERE client_id = ? AND software = ?", (client_id, data.get("software")))
            existing_contract = c.fetchone()
            if existing_contract:
                c.execute("""UPDATE contracts SET vendor=?, start_date=?, expiry_date=?,
                    value=?, assigned_to=?, status=?, last_contact=? WHERE id=?""",
                    (data.get("vendor"), data.get("start_date"), data.get("expiry_date"),
                     data.get("contract_value"), data.get("assigned_to"), data.get("status", "active"),
                     data.get("last_contact"), existing_contract[0]))
            else:
                c.execute("""INSERT INTO contracts (client_id, software, vendor, start_date, expiry_date, value, assigned_to, status, last_contact)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (client_id, data.get("software"), data.get("vendor"), data.get("start_date"),
                     data.get("expiry_date"), data.get("contract_value"), data.get("assigned_to"),
                     data.get("status", "active"), data.get("last_contact")))

        for field_name, field_value in extra.items():
            c.execute("INSERT INTO extra_fields (client_id, field_name, field_value) VALUES (?, ?, ?)",
                      (client_id, field_name, str(field_value)))

        imported += 1

    renewals = generate_renewal_deals(c)
    conn.commit()
    conn.close()

    print(f"Imported {imported} rows | contacts: {contacts_added} | renewal deals: {renewals}")
    return {"imported": imported, "contacts": contacts_added, "renewals": renewals, "mapping": mapping}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(import_file(sys.argv[1]))
    else:
        print("Usage: python3 importer.py <filepath>")