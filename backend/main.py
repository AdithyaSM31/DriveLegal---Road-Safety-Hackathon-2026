"""
DriveLegal — FastAPI Application Entry Point.
Serves the backend API and the static frontend (PWA).
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure the project root is on the Python path so imports work
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from backend.config import (
    APP_TITLE,
    APP_DESCRIPTION,
    APP_VERSION,
    FRONTEND_DIR,
    DEBUG,
)
from backend.core.database import init_db_sync

# Import API routers
from backend.api.locations import router as locations_router
from backend.api.challan import router as challan_router
from backend.api.laws import router as laws_router
from backend.api.chat import router as chat_router
from backend.api.analytics import router as analytics_router


# ────────────────────────── Lifespan ────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Startup: ensure database exists with schema
    print("[DriveLegal] Initializing database...")
    init_db_sync()
    print("[DriveLegal] Database ready.")
    print(f"[DriveLegal] API docs at http://localhost:8000/docs")
    yield
    # Shutdown
    print("[DriveLegal] Shutting down.")


# ────────────────────────── App Creation ────────────────────────────────────

app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allowlist Vercel frontend + local dev origins
# Update VERCEL_URL once your Vercel deployment is live
ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://localhost",       # Capacitor Android (Legacy)
    "https://localhost",      # Capacitor Android (Capacitor v6+)
    "capacitor://localhost",  # Capacitor iOS
    "ionic://localhost",      # Ionic iOS legacy
    "https://drivelegal-road-safety-hackathon-2026.vercel.app", # Main Vercel deployment
]

import os
# In production, also allow origins from CORS_ORIGINS environment variable
extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins:
    ALLOWED_ORIGINS += [o.strip() for o in extra_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ────────────────────────── Register API Routers ────────────────────────────

app.include_router(locations_router)
app.include_router(challan_router)
app.include_router(laws_router)
app.include_router(chat_router)
app.include_router(analytics_router)


# ────────────────────────── Health Check ────────────────────────────────────

@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "app": APP_TITLE, "version": APP_VERSION}


# ────────────────────────── Serve Frontend ──────────────────────────────────

# Mount the frontend as static files (after API routes so they take priority)
frontend_path = Path(FRONTEND_DIR)
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


# ────────────────────────── Run with uvicorn ────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG,
    )
