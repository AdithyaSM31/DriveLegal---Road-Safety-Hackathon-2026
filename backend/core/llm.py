"""
DriveLegal — LLM Integration
Provides the initialized ChatGroq client for high-speed inference using Llama 3.
"""

import os
from langchain_groq import ChatGroq
from backend.config import GROQ_API_KEY
import logging

logger = logging.getLogger(__name__)

def get_llm():
    """
    Returns an initialized ChatGroq instance using the Llama 3 70B model.
    Falls back to a warning if the API key is not configured.
    """
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        logger.warning("GROQ_API_KEY is not set. Chat features will fail or return stubs.")
        return None
        
    try:
        # Llama 3 70B Versatile is currently one of the best speed/quality ratios on Groq
        llm = ChatGroq(
            groq_api_key=GROQ_API_KEY,
            model_name=os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b"),
            temperature=0.0,
            max_tokens=1024,
            request_timeout=15,
            max_retries=1,
        )
        return llm
    except Exception as e:
        logger.error(f"Failed to initialize Groq LLM: {e}")
        return None
