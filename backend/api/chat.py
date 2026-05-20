"""
DriveLegal — /api/chat endpoint.
RAG-powered chatbot (stub for Day 1 — full implementation on Day 2 with Nitin).
"""

import uuid
from fastapi import APIRouter, HTTPException

from backend.models.schemas import ChatRequest, ChatResponse
from backend.core.llm import get_llm
from backend.core.embeddings import similarity_search
from backend.core.prompts import SYSTEM_PROMPT

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """RAG-powered AI chat about traffic laws.

    Combines ChromaDB vector search with Groq LLM.
    """
    session_id = req.session_id or str(uuid.uuid4())

    llm = get_llm()

    if not llm:
        return ChatResponse(
            reply=(
                "DriveLegal AI is currently offline (Groq API key not configured). "
                "Please check your .env settings."
            ),
            citations=[],
            session_id=session_id,
        )

    try:
        # 1. Retrieve relevant law context from ChromaDB
        # Optional jurisdiction filtering is best-effort: ChatRequest provides
        # jurisdiction_id (numeric), but Chroma metadata stores jurisdiction name.
        # We still allow passing jurisdiction_id as a string to match if your metadata
        # uses numeric strings.
        # Chroma metadata stores jurisdiction as a human-readable name (e.g., "Maharashtra").
        # The API request provides jurisdiction_id (numeric). Map id -> jurisdiction name.
        jurisdiction_filter = None
        if req.jurisdiction_id is not None:
            try:
                # Local import to avoid circular dependencies at import-time
                from backend.core.database import get_db
                db = await get_db()
                try:
                    row = await db.execute(
                        "SELECT name FROM jurisdictions WHERE id = ?",
                        (req.jurisdiction_id,),
                    )
                    r = await row.fetchone()
                    jurisdiction_filter = r[0] if r else None
                finally:
                    await db.close()
            except Exception:
                jurisdiction_filter = str(req.jurisdiction_id)

        context_docs = similarity_search(
            req.message,
            top_k=3,
            jurisdiction=jurisdiction_filter,
        )

        context_text = "\n---\n".join(context_docs) if context_docs else "No specific legal context found."

        # 2. Format the system prompt with context
        formatted_system_prompt = SYSTEM_PROMPT.format(context=context_text)

        messages = [
            ("system", formatted_system_prompt),
            ("human", req.message),
        ]

        # 3. Generate response via Groq
        response = llm.invoke(messages)

        # 4. Return structured citations
        citations = [
            {"source": snippet, "section": None, "jurisdiction": None}
            for snippet in context_docs
        ]

        return ChatResponse(
            reply=response.content,
            citations=citations,
            session_id=session_id,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG Pipeline Error: {str(e)}")


# Alias endpoint for backwards compatibility with any frontend code using /ask
@router.post("/ask", response_model=ChatResponse)
async def chat_ask(req: ChatRequest):
    """Alias for the main chat endpoint."""
    return await chat(req)
