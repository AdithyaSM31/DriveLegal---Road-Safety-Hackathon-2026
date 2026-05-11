"""
DriveLegal — /api/laws endpoint.
Browse and search traffic laws and fine schedules with filtering and pagination.
"""

from fastapi import APIRouter, Query
from typing import Optional

from backend.core.database import browse_laws, export_all_fine_schedules
from backend.models.schemas import LawsResponse, FineScheduleOut

router = APIRouter(prefix="/api/laws", tags=["Law Browser"])


@router.get("/browse", response_model=LawsResponse)
async def browse_traffic_laws(
    jurisdiction_id: Optional[int] = Query(None, description="Filter by jurisdiction"),
    country_id: Optional[int] = Query(None, description="Filter by country"),
    category_id: Optional[int] = Query(None, description="Filter by violation category"),
    severity: Optional[str] = Query(
        None,
        description="Filter by severity",
        regex="^(minor|moderate|major|critical)$",
    ),
    search: Optional[str] = Query(
        None, description="Search in violation name, description, or section reference"
    ),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(25, ge=1, le=100, description="Results per page"),
):
    """
    Browse and search all fine schedules with optional filters.

    Supports filtering by jurisdiction, country, category, severity,
    and free-text search. Results are paginated.
    """
    data = await browse_laws(
        jurisdiction_id=jurisdiction_id,
        country_id=country_id,
        category_id=category_id,
        severity=severity,
        search=search,
        page=page,
        page_size=page_size,
    )
    return LawsResponse(**data)


@router.get("/export", response_model=list[FineScheduleOut])
async def export_all_laws():
    """
    Export ALL fine schedules in a single response.
    Used by the frontend to sync data to IndexedDB for offline mode.
    """
    return await export_all_fine_schedules()
