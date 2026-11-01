"""Generate the bundled offline snapshot from the same database as the API."""
import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.core.database import export_all_fine_schedules, get_jurisdictions, get_violations, get_vehicle_classes, get_violation_categories

async def main():
    snapshot = {
        "version": 1,
        "provenance": "Existing project seed data. Not independently verified as current law.",
        "laws": await export_all_fine_schedules(),
        "jurisdictions": await get_jurisdictions(),
        "violations": await get_violations(),
        "vehicles": await get_vehicle_classes(),
        "categories": await get_violation_categories(),
    }
    target = Path(__file__).resolve().parent.parent / 'frontend' / 'data' / 'snapshot.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {len(snapshot["laws"])} schedules to {target}')

if __name__ == '__main__':
    asyncio.run(main())
