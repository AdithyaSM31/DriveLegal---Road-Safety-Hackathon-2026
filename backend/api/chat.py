"""
DriveLegal — /api/chat endpoint.
RAG-powered chatbot (stub for Day 1 — full implementation on Day 2 with Nitin).
"""

import uuid
from fastapi import APIRouter

from backend.models.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    AI-powered chat about traffic laws.

    Day 1: Returns a placeholder response.
    Day 2: Will integrate Nitin's RAG pipeline with Gemini Flash.
    """
    session_id = req.session_id or str(uuid.uuid4())

    # TODO (Day 2): Replace with RAG pipeline integration
    # from backend.core.rag_pipeline import get_rag_response
    # reply, citations = await get_rag_response(
    #     message=req.message,
    #     jurisdiction_id=req.jurisdiction_id,
    #     session_id=session_id,
    # )

    return ChatResponse(
        reply=(
            "DriveLegal AI is being set up. In the meantime, please use the "
            "Challan Calculator for exact fine lookups, or browse the Law Browser "
            "for comprehensive traffic law information."
        ),
        citations=[],
        session_id=session_id,
    )
