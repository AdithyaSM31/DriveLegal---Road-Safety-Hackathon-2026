"""
DriveLegal — Pydantic request / response schemas.
Defines the data contracts for all API endpoints.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ───────────────────────────── Location schemas ─────────────────────────────

class CountryOut(BaseModel):
    id: int
    name: str
    code: str
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None

class JurisdictionOut(BaseModel):
    id: int
    country_id: int
    country_name: Optional[str] = None
    name: str
    type: str
    parent_id: Optional[int] = None
    effective_date: Optional[str] = None
    source_url: Optional[str] = None

class LocationsResponse(BaseModel):
    countries: list[CountryOut]
    jurisdictions: list[JurisdictionOut]


# ───────────────────────────── Violation schemas ────────────────────────────

class ViolationCategoryOut(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None

class ViolationOut(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    section_reference: Optional[str] = None
    severity: Optional[str] = None

class VehicleClassOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


# ──────────────────────────── Challan Calculator ────────────────────────────

class ChallanRequest(BaseModel):
    """Request body for the Challan Calculator."""
    jurisdiction_id: int = Field(..., description="ID of the state/region")
    violation_id: int = Field(..., description="ID of the specific violation")
    vehicle_class_id: Optional[int] = Field(
        None, description="ID of the vehicle class (None = any)"
    )
    is_repeat_offence: bool = Field(
        False, description="True if this is a subsequent offence"
    )

class ChallanResult(BaseModel):
    """Fine breakdown returned by the Challan Calculator."""
    violation_name: str
    section_reference: Optional[str] = None
    severity: Optional[str] = None
    jurisdiction_name: str
    country_name: str
    vehicle_class: Optional[str] = None
    currency_symbol: str = ""

    # Fine details
    fine_amount: Optional[float] = None
    compounding_fee: Optional[float] = None
    max_fine: Optional[float] = None
    is_repeat_offence: bool = False

    # Additional consequences
    imprisonment: Optional[str] = None
    license_action: Optional[str] = None
    points_deducted: Optional[int] = None
    additional_penalties: Optional[str] = None
    notes: Optional[str] = None

    # Source
    source: Optional[str] = None
    effective_date: Optional[str] = None

class ChallanResponse(BaseModel):
    success: bool
    result: Optional[ChallanResult] = None
    message: Optional[str] = None


# ──────────────────────────── Law Browser ───────────────────────────────────

class FineScheduleOut(BaseModel):
    """A single fine schedule entry for the law browser."""
    id: int
    violation_name: str
    category_name: Optional[str] = None
    section_reference: Optional[str] = None
    severity: Optional[str] = None
    jurisdiction_name: str
    country_name: str
    vehicle_class: Optional[str] = None
    currency_symbol: str = ""

    first_offence_fine: Optional[float] = None
    subsequent_offence_fine: Optional[float] = None
    compounding_fee: Optional[float] = None
    max_fine: Optional[float] = None
    imprisonment_text: Optional[str] = None
    license_action: Optional[str] = None
    points_deducted: Optional[int] = None
    additional_penalties: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    effective_date: Optional[str] = None

class LawsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: list[FineScheduleOut]


# ──────────────────────────── Chat (stub for Day 2) ─────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., description="User's question about traffic laws")
    jurisdiction_id: Optional[int] = Field(
        None, description="Optional jurisdiction context"
    )
    session_id: Optional[str] = Field(
        None, description="Session ID for conversation memory"
    )

class Citation(BaseModel):
    source: str
    section: Optional[str] = None
    jurisdiction: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    citations: list[Citation] = []
    session_id: str
