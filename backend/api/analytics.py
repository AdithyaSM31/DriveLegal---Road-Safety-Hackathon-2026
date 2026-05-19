"""
DriveLegal — /api/analytics endpoint.
Provides statistical data for Chart.js visualizations.
"""

from fastapi import APIRouter
from backend.core.database import get_analytics_summary

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
async def analytics_summary(jurisdiction_id: int = None):
    """Get summarized analytics for the dashboard charts."""
    return await get_analytics_summary(jurisdiction_id)
