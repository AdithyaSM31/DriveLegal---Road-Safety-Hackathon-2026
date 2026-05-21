"""
DriveLegal — /api/locations endpoint.
Provides country and jurisdiction data for the location picker.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import urllib.request
import urllib.parse
import json

from backend.core.database import (
    get_all_countries,
    get_jurisdictions,
)
from backend.models.schemas import (
    CountryOut,
    JurisdictionOut,
    LocationsResponse,
    ViolationCategoryOut,
    ViolationOut,
    VehicleClassOut,
)
from backend.core.database import (
    get_violation_categories,
    get_violations,
    get_vehicle_classes,
)

router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.get("", response_model=list[JurisdictionOut])
async def list_jurisdictions_root(
    country_id: Optional[int] = Query(None, description="Filter by country ID"),
):
    """Alias for /jurisdictions to support frontend shorthand."""
    return await get_jurisdictions(country_id)


@router.get("/countries", response_model=list[CountryOut])
async def list_countries():
    """Get all supported countries."""
    return await get_all_countries()


@router.get("/jurisdictions", response_model=list[JurisdictionOut])
async def list_jurisdictions(
    country_id: Optional[int] = Query(None, description="Filter by country ID"),
):
    """Get jurisdictions (states/regions), optionally filtered by country."""
    return await get_jurisdictions(country_id)


@router.get("/all", response_model=LocationsResponse)
async def get_all_location_data():
    """Get all countries and jurisdictions in one call (for offline caching)."""
    countries = await get_all_countries()
    jurisdictions = await get_jurisdictions()
    return LocationsResponse(countries=countries, jurisdictions=jurisdictions)


# ─── Also serve violation metadata here for the calculator dropdowns ───

@router.get("/violation-categories", response_model=list[ViolationCategoryOut])
async def list_violation_categories():
    """Get all violation categories (Speeding, Safety, Documentation, etc.)."""
    return await get_violation_categories()


@router.get("/violations", response_model=list[ViolationOut])
async def list_violations(
    category_id: Optional[int] = Query(None, description="Filter by category"),
):
    """Get violations, optionally filtered by category."""
    return await get_violations(category_id)


@router.get("/vehicle-classes", response_model=list[VehicleClassOut])
async def list_vehicle_classes():
    """Get all vehicle classes (Two-wheeler, LMV, HMV, Commercial)."""
    return await get_vehicle_classes()


@router.get("/speed-limit")
async def get_speed_limit(lat: float, lon: float):
    """Proxy for OpenStreetMap Overpass API to bypass browser CORS."""
    query = f"[out:json];way(around:80, {lat}, {lon})[maxspeed];out tags;"
    encoded_query = urllib.parse.quote(query)
    url = f"https://overpass-api.de/api/interpreter?data={encoded_query}"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'DriveLegal-App/1.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            speed_limit = 50 # Default
            if data and data.get("elements") and len(data["elements"]) > 0:
                speed_tag = data["elements"][0].get("tags", {}).get("maxspeed")
                if speed_tag:
                    # Extract numeric part (e.g., "50", "50 mph")
                    num_str = "".join(filter(str.isdigit, str(speed_tag)))
                    if num_str:
                        speed_limit = int(num_str)
            return {"speed_limit": speed_limit}
    except Exception as e:
        print(f"Overpass API proxy error: {e}")
        # Return fallback on error
        return {"speed_limit": 50, "error": str(e)}
