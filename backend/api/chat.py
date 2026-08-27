"""
DriveLegal — /api/chat endpoint.
RAG-powered chatbot (stub for Day 1 — full implementation on Day 2 with Nitin).
"""

import uuid
from fastapi import APIRouter, HTTPException

from backend.models.schemas import ChatRequest, ChatResponse
from backend.core.llm import get_llm
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
        # 1. Format the system prompt with a generic context since we are bypassing
        # memory-heavy local vector embeddings for the free tier to prevent OOM kills.
        # Llama 3 70B natively understands the Indian Motor Vehicles Act extremely well.
        context_text = "Please answer based on your deep knowledge of the Indian Motor Vehicles Act, 1988."
        formatted_system_prompt = SYSTEM_PROMPT.format(context=context_text)

        messages = [
            ("system", formatted_system_prompt),
            ("human", req.message),
        ]

        # 2. Generate response via Groq
        response = llm.invoke(messages)

        # 3. Return structured citations (empty for now without RAG)
        citations = []

        return ChatResponse(
            reply=response.content,
            citations=citations,
            session_id=session_id,
        )

    except Exception as e:
        import requests, os
        api_key = os.environ.get("GROQ_API_KEY")
        avail_models = "unknown"
        if api_key:
            try:
                res = requests.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {api_key}"})
                avail_models = str([m.get("id") for m in res.json().get("data", [])])
            except Exception as inner_e:
                avail_models = f"fetch failed: {str(inner_e)}"
        raise HTTPException(status_code=500, detail=f"RAG Pipeline Error: {str(e)} | Valid Models: {avail_models}")


# Alias endpoint for backwards compatibility with any frontend code using /ask
@router.post("/ask", response_model=ChatResponse)
async def chat_ask(req: ChatRequest):
    """Alias for the main chat endpoint."""
    return await chat(req)
