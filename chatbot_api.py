import os, json, re, sqlite3
import httpx
from flask import Blueprint, request, jsonify, current_app
from activities_api import log_activity

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "retainiq.db")

chatbot_bp = Blueprint("chatbot_bp", __name__)

STAGES = ["New Leads", "Qualified", "Demo", "Quote sent", "Negotiation", "Closed-Won", "Closed-Lost"]

SYSTEM_PROMPT = """You are the RetainIQ assistant, embedded in a CRM for Digital Move IT & Telecom.
Answer questions using ONLY the CRM context provided below -- don't invent client names, numbers,
or activity that isn't in it. If the context doesn't have what's needed to answer, say so plainly.

Keep answers short and concrete (a few sentences, or a short list) -- this is a floating chat
widget, not a report.

You can also take actions (log_activity, move_deal_stage, draft_email) via the tools provided,
but ONLY call a tool when the user has clearly and explicitly asked for that action. A passing
mention of a client or a deal is not a request to act. If a request is ambiguous about which
client or deal it refers to, ask a clarifying question instead of guessing and calling a tool.

You also have a web_search tool for real-world grounding (news, funding, leadership changes,
layoffs, or general "what does this company do" questions) that the CRM context can't answer.
It's read-only, so no confirmation is needed to use it -- but default to the CRM context above
first. Only search when a question genuinely needs information the CRM doesn't have; don't
search for things already answered by the context or by prior turns in this conversation."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "log_activity",
            "description": "Log a call or meeting that already happened, for a specific client. Only call this when the user explicitly asks to log or record a call/meeting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string", "description": "The client's company name, exactly as the user referred to it."},
                    "type": {"type": "string", "enum": ["call", "meeting"]},
                    "notes": {"type": "string", "description": "A short summary of what happened on the call/meeting."},
                },
                "required": ["company", "type", "notes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_deal_stage",
            "description": "Move a company's open pipeline deal to a different stage. Only call this when the user explicitly asks to move/advance/update a deal's stage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string", "description": "The company whose deal should move."},
                    "stage": {"type": "string", "enum": STAGES},
                },
                "required": ["company", "stage"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draft_email",
            "description": "Draft a renewal/follow-up email for a specific client. Only call this when the user explicitly asks to draft, write, or generate an email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string", "description": "The client's company name to draft the email for."},
                },
                "required": ["company"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the live web for real-world information the CRM's own data can't provide -- "
                "recent news, funding rounds, layoffs, leadership changes for an at-risk client, or general "
                "background on a company (e.g. what it does). Only call this when the CRM context already "
                "given to you genuinely doesn't answer the question -- do not call it for anything about "
                "clients, deals, activity, or KPIs that the CRM context already covers."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query, e.g. 'Acme Corp layoffs 2026' or 'what does Acme Corp do'."},
                },
                "required": ["query"],
            },
        },
    },
]


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def resolve_client_by_company(conn, company):
    if not company:
        return None
    return conn.execute(
        "SELECT id, company_name FROM clients WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(?))",
        (str(company),),
    ).fetchone()


def resolve_open_deals_by_company(conn, company):
    if not company:
        return []
    return conn.execute(
        "SELECT id, company, stage, product FROM pipeline_deals WHERE LOWER(TRIM(company)) = LOWER(TRIM(?)) AND status = 'open' ORDER BY id",
        (str(company),),
    ).fetchall()


def build_context():
    client = current_app.test_client()

    stats = client.get("/api/db/stats").get_json() or {}
    all_clients = client.get("/api/db/clients").get_json() or []
    activities = client.get("/api/db/activities").get_json() or []

    at_risk = [c for c in all_clients if c.get("journey_stage") in ("Critical", "At-Risk", "Expired")]
    at_risk.sort(key=lambda c: (c.get("days_until_expiry") if c.get("days_until_expiry") is not None else 9999))
    at_risk = at_risk[:8]

    lines = [
        f"KPIs: {stats.get('total_customers', '?')} clients, "
        f"{stats.get('medium_risk_count', '?')} at risk, "
        f"{stats.get('high_risk_count', '?')} critical/expired, "
        f"${stats.get('total_value_at_risk', 0):,.0f} total value at risk.",
        "",
        "At-risk clients (soonest expiry first):",
    ]
    if at_risk:
        for c in at_risk:
            lines.append(
                f"- {c.get('client_name')} — {c.get('journey_stage')}, "
                f"expires in {c.get('days_until_expiry')} days, "
                f"${(c.get('contract_value') or 0):,.0f}, owner: {c.get('account_manager') or 'unassigned'}"
            )
    else:
        lines.append("- none right now")

    lines += ["", "Recent activity (most recent first):"]
    if activities:
        for a in activities[:8]:
            lines.append(f"- [{a.get('date')}] {a.get('title')}: {a.get('description') or ''}".rstrip(": "))
    else:
        lines.append("- none yet")

    return "\n".join(lines)


def _groq_client():
    from groq import Groq
    from dotenv import load_dotenv
    load_dotenv()
    return Groq(api_key=os.environ.get("GROQ_API_KEY"), timeout=10.0, max_retries=1)


def _tavily_search(query):
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key or not query:
        return None

    payload = {
        "query": query,
        "search_depth": "basic",
        "max_results": 5,
        "include_answer": True,
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    for attempt in range(2):
        try:
            resp = httpx.post("https://api.tavily.com/search", json=payload, headers=headers, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            results = [
                {"title": r.get("title") or r.get("url"), "url": r.get("url"), "content": r.get("content") or ""}
                for r in (data.get("results") or [])
                if r.get("url")
            ]
            return {"answer": data.get("answer") or "", "results": results}
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            if attempt == 0:
                continue
            print("[chatbot] Tavily search failed:", e)
            return None
        except Exception as e:
            print("[chatbot] Tavily search failed:", e)
            return None


_RAW_TOOL_CALL_RE = re.compile(r'</?function\b|function_call|"tool_calls"', re.IGNORECASE)


def _looks_like_raw_tool_call(text):
    return bool(text) and bool(_RAW_TOOL_CALL_RE.search(text))


def _sanitize_history(history):
    out = []
    for m in (history or [])[-10:]:
        role = m.get("role")
        content = m.get("content")
        if role in ("user", "assistant") and isinstance(content, str) and content.strip():
            out.append({"role": role, "content": content})
    return out


@chatbot_bp.route("/api/chatbot", methods=["POST"])
def chatbot():
    data = request.get_json(force=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    messages = (
        [{"role": "system", "content": SYSTEM_PROMPT + "\n\n" + build_context()}]
        + _sanitize_history(data.get("history"))
        + [{"role": "user", "content": message}]
    )

    client = _groq_client()
    msg = None
    tool_calls = None
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=600,
            )
        except Exception as e:
            print("[chatbot] Groq call failed:", e)
            # tool_use_failed is Llama 3.3 mangling a tool call, not a real outage --
            # worth the one retry already budgeted here rather than failing immediately.
            if attempt == 0 and "tool_use_failed" in str(e):
                continue
            msg = None
            break
        msg = response.choices[0].message
        tool_calls = getattr(msg, "tool_calls", None)
        # Llama 3.3 occasionally hallucinates function-call syntax as plain text
        # instead of a real tool call -- retry once rather than leaking it to the user.
        if tool_calls or not _looks_like_raw_tool_call(msg.content):
            break

    if msg is None:
        return jsonify({
            "type": "answer",
            "content": "I'm having trouble reaching the AI service right now -- try again in a moment.",
        })

    if not tool_calls:
        content = msg.content or "I don't have an answer for that."
        if _looks_like_raw_tool_call(content):
            content = "I ran into trouble putting that answer together -- try rephrasing your question."
        return jsonify({"type": "answer", "content": content})

    call = tool_calls[0]
    try:
        args = json.loads(call.function.arguments or "{}")
    except json.JSONDecodeError:
        args = {}
    name = call.function.name
    company = (args.get("company") or "").strip()

    conn = get_conn()
    try:
        if name == "draft_email":
            row = resolve_client_by_company(conn, company)
            if not row:
                return jsonify({"type": "answer", "content": f"I couldn't find a client called \"{company}\"."})
            client_row = next((c for c in current_app.test_client().get("/api/db/clients").get_json() if c["id"] == row["id"]), {})
            resp = current_app.test_client().post("/api/email", json={
                "customer_name": row["company_name"],
                "risk_score": client_row.get("churn_risk_score"),
                "spend": client_row.get("contract_value"),
                "days_since_contact": client_row.get("days_since_contact"),
            })
            email = resp.get_json() or {}
            content = f"Subject: {email.get('subject', '')}\n\n{email.get('body', '')}"
            return jsonify({"type": "action_result", "tool": "draft_email", "content": content})

        if name == "log_activity":
            row = resolve_client_by_company(conn, company)
            if not row:
                return jsonify({"type": "answer", "content": f"I couldn't find a client called \"{company}\"."})
            activity_type = args.get("type") if args.get("type") in ("call", "meeting") else "call"
            return jsonify({
                "type": "action_proposal",
                "tool": "log_activity",
                "args": {"client_id": row["id"], "company": row["company_name"], "type": activity_type, "notes": args.get("notes") or ""},
                "summary": f"Log a {activity_type} with {row['company_name']}: “{args.get('notes') or ''}”",
            })

        if name == "web_search":
            query = (args.get("query") or "").strip()
            if not query:
                return jsonify({"type": "answer", "content": "I wasn't sure what to search for -- can you rephrase?"})

            search = _tavily_search(query)
            if not search or (not search["answer"] and not search["results"]):
                return jsonify({
                    "type": "answer",
                    "content": "Web search isn't available right now, so I can only answer from what's in the CRM.",
                })

            sources = search["results"][:5]
            tool_result_text = (search["answer"] + "\n\n" if search["answer"] else "") + "\n".join(
                f"- {r['title']} ({r['url']}): {r['content'][:400]}" for r in sources
            )

            follow_up_messages = messages + [
                {
                    "role": "assistant",
                    "content": msg.content,
                    "tool_calls": [
                        {"id": call.id, "type": "function", "function": {"name": "web_search", "arguments": call.function.arguments}}
                    ],
                },
                {"role": "tool", "tool_call_id": call.id, "content": tool_result_text},
            ]

            try:
                groq_client = _groq_client()
                follow_up = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=follow_up_messages,
                    max_tokens=600,
                )
                summary = follow_up.choices[0].message.content or tool_result_text
            except Exception as e:
                print("[chatbot] Groq follow-up call failed:", e)
                summary = tool_result_text

            return jsonify({
                "type": "answer",
                "content": summary,
                "searched_for": query,
                "sources": [{"title": r["title"], "url": r["url"]} for r in sources],
            })

        if name == "move_deal_stage":
            deals = resolve_open_deals_by_company(conn, company)
            if not deals:
                return jsonify({"type": "answer", "content": f"I couldn't find an open deal for \"{company}\"."})
            stage = args.get("stage")
            if stage not in STAGES:
                return jsonify({"type": "answer", "content": f"\"{stage}\" isn't a valid deal stage."})
            if len(deals) > 1:
                listing = "; ".join(f"{d['product'] or 'deal #' + str(d['id'])} (currently {d['stage']})" for d in deals)
                return jsonify({"type": "answer", "content": f"{company} has more than one open deal: {listing}. Which one do you mean?"})
            deal = deals[0]
            return jsonify({
                "type": "action_proposal",
                "tool": "move_deal_stage",
                "args": {"deal_id": deal["id"], "company": deal["company"], "stage": stage},
                "summary": f"Move {deal['company']}'s deal from {deal['stage']} to {stage}",
            })

        return jsonify({"type": "answer", "content": "I tried to do something I don't know how to do yet."})
    finally:
        conn.close()


@chatbot_bp.route("/api/chatbot/confirm", methods=["POST"])
def chatbot_confirm():
    data = request.get_json(force=True) or {}
    tool = data.get("tool")
    args = data.get("args") or {}

    conn = get_conn()
    try:
        if tool == "log_activity":
            client_id = args.get("client_id")
            row = conn.execute("SELECT id, company_name FROM clients WHERE id = ?", (client_id,)).fetchone()
            if not row:
                return jsonify({"success": False, "message": "Couldn't find that client anymore."})
            activity_type = args.get("type") if args.get("type") in ("call", "meeting") else "call"
            log_activity(client_id=row["id"], type=activity_type, notes=args.get("notes") or "")
            return jsonify({"success": True, "message": f"Logged a {activity_type} with {row['company_name']}."})

        if tool == "move_deal_stage":
            deal_id = args.get("deal_id")
            deal = conn.execute("SELECT id, company, stage FROM pipeline_deals WHERE id = ?", (deal_id,)).fetchone()
            if not deal:
                return jsonify({"success": False, "message": "Couldn't find that deal anymore."})
            stage = args.get("stage")
            if stage not in STAGES:
                return jsonify({"success": False, "message": f"\"{stage}\" isn't a valid deal stage."})
            resp = current_app.test_client().patch(f"/api/db/deals/{deal['id']}", json={"stage": stage})
            if resp.status_code != 200:
                return jsonify({"success": False, "message": "Couldn't update that deal."})
            return jsonify({"success": True, "message": f"Moved {deal['company']}'s deal to {stage}."})

        return jsonify({"success": False, "message": "Unknown action."}), 400
    finally:
        conn.close()
