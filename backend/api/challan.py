"""
DriveLegal — /api/challan endpoint.
Deterministic Challan Calculator — pure database lookup, zero AI hallucination risk.
"""

from fastapi import APIRouter

from backend.core.database import calculate_challan
from backend.models.schemas import ChallanRequest, ChallanResponse, ChallanResult

router = APIRouter(prefix="/api/challan", tags=["Challan Calculator"])


@router.post("/calculate", response_model=ChallanResponse)
async def compute_challan(req: ChallanRequest):
    """
    Calculate the fine for a specific violation in a specific jurisdiction.

    This is a deterministic database lookup — no AI is involved.
    Returns the exact fine amount, compounding fee, imprisonment risk,
    license implications, and the legal source citation.
    """
    row = await calculate_challan(
        jurisdiction_id=req.jurisdiction_id,
        violation_id=req.violation_id,
        vehicle_class_id=req.vehicle_class_id,
    )

    if not row:
        return ChallanResponse(
            success=False,
            message=(
                "No fine schedule found for this combination of "
                "jurisdiction, violation, and vehicle class. "
                "The data may not yet be available for this region."
            ),
        )

    # Determine the applicable fine based on repeat offence status
    if req.is_repeat_offence and row.get("subsequent_offence_fine"):
        fine_amount = row["subsequent_offence_fine"]
    else:
        fine_amount = row.get("first_offence_fine")

    result = ChallanResult(
        violation_name=row["violation_name"],
        section_reference=row.get("section_reference"),
        severity=row.get("severity"),
        jurisdiction_name=row["jurisdiction_name"],
        country_name=row["country_name"],
        vehicle_class=row.get("vehicle_class_name"),
        currency_symbol=row.get("currency_symbol", ""),
        fine_amount=fine_amount,
        compounding_fee=row.get("compounding_fee"),
        max_fine=row.get("max_fine"),
        is_repeat_offence=req.is_repeat_offence,
        imprisonment=row.get("imprisonment_text"),
        license_action=row.get("license_action"),
        points_deducted=row.get("points_deducted"),
        additional_penalties=row.get("additional_penalties"),
        notes=row.get("notes"),
        source=row.get("source"),
        effective_date=row.get("effective_date"),
    )

    return ChallanResponse(success=True, result=result)
