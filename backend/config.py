"""
DriveLegal — Configuration module.
Loads environment variables and provides app-wide settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or root
_backend_dir = Path(__file__).resolve().parent
_root_dir = _backend_dir.parent

if (_backend_dir / ".env").exists():
    load_dotenv(_backend_dir / ".env")
elif (_root_dir / ".env").exists():
    load_dotenv(_root_dir / ".env")
else:
    load_dotenv() # Fallback to default

# --- Paths ---
BASE_DIR = _backend_dir.parent  # DriveLegal/
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "drivelegal.db"))
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(BASE_DIR / "data" / "chroma_db"))
FRONTEND_DIR = str(BASE_DIR / "frontend")

# --- API Keys ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# --- Server ---
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# --- App metadata ---
APP_TITLE = "DriveLegal API"
APP_DESCRIPTION = (
    "AI-powered chatbot providing location-specific information on "
    "traffic laws, violations, and fine schedules."
)
APP_VERSION = "2.0.0"
