"""
DriveLegal — Dynamic seed script.
Reads all JSON files from data/seed/ and populates the SQLite database.
Run:  python scripts/seed_database.py
"""

import os
import json
import sqlite3
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.config import DATABASE_PATH
from backend.core.database import SCHEMA_SQL

SEED_DIR = project_root / "data" / "seed"


def seed():
    db = sqlite3.connect(DATABASE_PATH)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA_SQL)

    for filename in sorted(os.listdir(SEED_DIR)):
        if not filename.endswith(".json"):
            continue

        filepath = SEED_DIR / filename
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"Processing {filename}...")

        # ── 1. Insert country ──────────────────────────────────────────
        db.execute(
            """INSERT OR IGNORE INTO countries (name, code, legal_system, currency, currency_symbol)
               VALUES (?,?,?,?,?)""",
            (data["country"], data["country_code"], "federal", "INR", "₹")
        )
        country_row = db.execute(
            "SELECT id FROM countries WHERE code = ?", (data["country_code"],)
        ).fetchone()
        country_id = country_row["id"]

        # ── 2. Insert jurisdiction ─────────────────────────────────────
        db.execute(
            """INSERT OR IGNORE INTO jurisdictions (country_id, name, type, effective_date, source_url)
               VALUES (?,?,?,?,?)""",
            (country_id, data["jurisdiction"], data["jurisdiction_type"],
             data["effective_date"], data["source_url"])
        )
        jur_row = db.execute(
            "SELECT id FROM jurisdictions WHERE name = ?", (data["jurisdiction"],)
        ).fetchone()
        jurisdiction_id = jur_row["id"]

        # ── 3. Loop through violations ─────────────────────────────────
        for v in data.get("violations", []):

            # 3a. Insert violation category (derived from each violation)
            category_name = v.get("category", "General")
            db.execute(
                "INSERT OR IGNORE INTO violation_categories (name, icon) VALUES (?,?)",
                (category_name, "")
            )
            cat_row = db.execute(
                "SELECT id FROM violation_categories WHERE name = ?", (category_name,)
            ).fetchone()
            category_id = cat_row["id"]

            # 3b. Build section_reference string from object
            sec_ref = v.get("section_reference", {})
            if isinstance(sec_ref, dict):
                section_str = sec_ref.get("act_section", "")
            else:
                section_str = str(sec_ref)

            # 3c. Insert violation
            db.execute(
                """INSERT OR IGNORE INTO violations
                   (category_id, name, description, section_reference, severity)
                   VALUES (?,?,?,?,?)""",
                (category_id, v["name"], v.get("description", ""),
                 section_str, v.get("severity", "minor"))
            )
            vio_row = db.execute(
                "SELECT id FROM violations WHERE name = ?", (v["name"],)
            ).fetchone()
            violation_id = vio_row["id"]

            # 3d. Build license_action string from object
            lic = v.get("license_action")
            if isinstance(lic, dict):
                lic_str = f"{lic.get('type', '')} - {lic.get('duration', '')}".strip(" -")
            elif isinstance(lic, str):
                lic_str = lic
            else:
                lic_str = None

            # 3e. Additional penalties — join list to string
            additional = v.get("additional_penalties", [])
            additional_str = ", ".join(additional) if additional else None

            # 3f. Notes
            notes = v.get("notes")

            # 3g. Source
            source_info = v.get("source", {})
            if isinstance(source_info, dict):
                source_str = source_info.get("title", data.get("source_title", ""))
            else:
                source_str = str(source_info)

            # 3h. Fines block
            fines = v.get("fines", {})
            first_fine      = fines.get("first_offence")
            subsequent_fine = fines.get("subsequent_offence")
            compounding_fee = fines.get("compounding_fee")
            max_fine        = fines.get("maximum_fine")

            # 3i. Imprisonment
            imprisonment = v.get("imprisonment")
            if isinstance(imprisonment, dict):
                imprisonment_str = f"{imprisonment.get('duration', '')} {imprisonment.get('type', '')}".strip()
            elif isinstance(imprisonment, str):
                imprisonment_str = imprisonment
            else:
                imprisonment_str = None

            # 3j. Insert one fine_schedule row per vehicle class
            vehicle_classes = v.get("vehicle_classes", [None])
            for vc_name in vehicle_classes:
                vc_id = None
                if vc_name:
                    db.execute(
                        "INSERT OR IGNORE INTO vehicle_classes (name, description) VALUES (?,?)",
                        (vc_name, "")
                    )
                    vc_row = db.execute(
                        "SELECT id FROM vehicle_classes WHERE name = ?", (vc_name,)
                    ).fetchone()
                    vc_id = vc_row["id"]

                db.execute(
                    """INSERT OR IGNORE INTO fine_schedules
                       (violation_id, jurisdiction_id, vehicle_class_id,
                        first_offence_fine, subsequent_offence_fine, compounding_fee, max_fine,
                        imprisonment_text, license_action, points_deducted,
                        additional_penalties, notes, effective_date, source)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        violation_id, jurisdiction_id, vc_id,
                        first_fine, subsequent_fine, compounding_fee, max_fine,
                        imprisonment_str, lic_str,
                        v.get("points_deducted"),
                        additional_str, notes,
                        data["effective_date"], source_str
                    )
                )

    db.commit()
    db.close()
    print("[OK] Database seeded successfully from all JSON files!")
    print(f"     Path: {DATABASE_PATH}")


if __name__ == "__main__":
    seed()