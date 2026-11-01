"""A source-grounded assistant with a deterministic, key-free fallback."""
import json
import logging
import re
import uuid
from fastapi import APIRouter
from backend.core.database import export_all_fine_schedules, get_jurisdictions
from backend.config import GROQ_API_KEY
from backend.models.schemas import ChatRequest, ChatResponse, Citation

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])
logger = logging.getLogger(__name__)
ALIASES = {
    "helmet": ("headgear", "helmet"), "speed": ("speeding", "overspeed", "fast"),
    "license": ("licence", "license"), "drunk": ("alcohol", "drunk", "drink"),
    "seat": ("seatbelt", "belt"), "phone": ("mobile", "phone"),
    "insurance": ("uninsured", "insurance"), "pollution": ("puc", "pollution"),
}

def relevant_schedules(message, rows):
    tokens = set(re.findall(r"[a-z0-9]+", message.lower()))
    tokens -= {"what", "the", "for", "fine", "fines", "is", "a", "in", "of", "and", "my", "how", "much", "without", "driving", "riding", "are", "can", "i", "to", "me", "tell", "with", "under", "penalty"}
    for canonical, aliases in ALIASES.items():
        if any(t in tokens for t in aliases):
            tokens.add(canonical)
    ranked = []
    for row in rows:
        text = f'{row["violation_name"]} {row.get("description") or ""} {row.get("section_reference") or ""}'.lower()
        score = sum(token in text for token in tokens)
        if score:
            ranked.append((score, row))
    ranked.sort(key=lambda item: -item[0])
    return [row for score, row in ranked if score == ranked[0][0]][:5] if ranked else []

@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())
    jurisdictions = await get_jurisdictions()
    jurisdiction_id = req.jurisdiction_id
    named = [j for j in jurisdictions if re.search(r"\b" + re.escape(j["name"].lower()) + r"\b", req.message.lower())]
    if named:
        jurisdiction_id = max(named, key=lambda j: len(j["name"]))["id"]
    if not jurisdiction_id:
        return ChatResponse(reply="Choose a state or the national baseline so I can find the relevant records.", session_id=session_id)
    rows = [r for r in await export_all_fine_schedules() if r["jurisdiction_id"] == jurisdiction_id]
    matches = relevant_schedules(req.message, rows)
    if not matches:
        return ChatResponse(reply="I couldn't find a matching record for this question in the selected jurisdiction. Coverage is limited; try a violation name or section number, or check the relevant transport authority.", session_id=session_id)
    citations = [Citation(source=r["source"] or "Supplied project dataset", section=r["section_reference"], jurisdiction=r["jurisdiction_name"], url=r.get("source_url")) for r in matches]
    lines = ["Here is what the supplied dataset contains:"]
    for r in matches:
        amount = f'₹{r["first_offence_fine"]:,.0f}' if r["first_offence_fine"] is not None else "Not specified"
        lines.append(f'• {r["violation_name"]} — {r["jurisdiction_name"]}, section {r["section_reference"]}; first offence: {amount}; vehicle: {r["vehicle_class"] or "Any"}. Effective date: {r["effective_date"] or "Not recorded"}.')
    lines.append("These are existing project records, not a verification of current law. Open a source before relying on a penalty.")
    reply = "\n\n".join(lines)
    mode = "database"
    try:
        llm = None
        if GROQ_API_KEY:
            from backend.core.llm import get_llm
            from backend.core.prompts import SYSTEM_PROMPT
            llm = get_llm()
        if llm:
            response = await llm.ainvoke([
                ("system", SYSTEM_PROMPT.format(context=json.dumps(matches, ensure_ascii=False))),
                ("human", req.message),
            ])
            reply = response.content
            mode = "ai"
    except Exception:
        logger.exception("AI unavailable; returning retrieved database records")
    return ChatResponse(reply=reply, citations=citations, session_id=session_id, mode=mode)

@router.post("/ask", response_model=ChatResponse)
async def chat_ask(req: ChatRequest):
    return await chat(req)
