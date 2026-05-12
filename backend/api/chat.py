"""
DriveLegal — /api/chat endpoint.
RAG-powered chatbot (stub for Day 1 — full implementation on Day 2 with Nitin).
"""

import uuid
from fastapi import APIRouter, HTTPException

from backend.models.schemas import ChatRequest, ChatResponse
from backend.core.llm import get_llm

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    AI-powered chat about traffic laws.
    Day 1: Uses Groq LLM directly for general answers (No RAG yet).
    Day 2: Will integrate Nitin's RAG pipeline with ChromaDB.
    """
    session_id = req.session_id or str(uuid.uuid4())

    llm = get_llm()
    
    if not llm:
        # Fallback if API key is not configured
        return ChatResponse(
            reply=(
                "DriveLegal AI is currently offline (API key not configured). "
                "Please use the Challan Calculator for exact fine lookups, or browse "
                "the Law Browser for comprehensive traffic law information."
            ),
            citations=[],
            session_id=session_id,
        )
        
    try:
        # Basic LLM call (Day 1) - No RAG injected yet
        # We add a basic system prompt to keep it focused
        system_prompt = (
            "You are DriveLegal AI, a helpful assistant specializing in Indian traffic laws and road safety. "
            "Keep your answers concise, accurate, and professional."
        )
        
        messages = [
            ("system", system_prompt),
            ("human", req.message)
        ]
        
        response = llm.invoke(messages)
        
        return ChatResponse(
            reply=response.content,
            citations=[],  # Citations will be added when RAG is implemented
            session_id=session_id,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")
