"""
DriveLegal — Dynamic seed script.
Reads all JSON files from data/seed/ and populates the SQLite database.
Run:  python scripts/seed_database.py
Run (dry run):  python scripts/seed_database.py --dry-run
"""

import os
import json
import re
import sqlite3
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.config import DATABASE_PATH
from backend.core.database import SCHEMA_SQL

SEED_DIR = project_root / "data" / "seed"

LAW_MAP = {
    "194D":  "Riding without helmet",
    "194B":  "Driving without seat belt",
    "194C":  "Triple riding on a two-wheeler",
    "181":   "Driving without a valid driving license",
    "183":   "Over-speeding",
    "184":   "Using a mobile phone while driving",
    "185":   "Drunk driving (Driving under the influence)",
    "190":   "Driving without a valid PUC certificate",
    "194E":  "Not giving way to emergency vehicles",
    "196":   "Driving an uninsured vehicle",
    "146":   "Driving an uninsured vehicle",
}


def extract_primary_section(s):
    parts = re.findall(r'\d+[A-Z]?', s.upper().replace(" ", ""))
    return parts[-1] if parts else ""


def get_or_create(db, table, name, extra_cols=None, extra_vals=None):
    """Return the id of an existing row by name, or insert and return new id."""
    row = db.execute(f"SELECT id FROM {table} WHERE name = ?", (name,)).fetchone()
    if row:
        return row["id"]
    if extra_cols and extra_vals:
        cols = "name, " + ", ".join(extra_cols)
        placeholders = ", ".join(["?"] * (1 + len(extra_vals)))
        db.execute(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})", (name, *extra_vals))
    else:
        db.execute(f"INSERT INTO {table} (name) VALUES (?)", (name,))
    return db.execute(f"SELECT id FROM {table} WHERE name = ?", (name,)).fetchone()["id"]


def seed(dry_run=False):
    if dry_run:
        print("DRY RUN MODE - nothing will be written to the database\n")

    db = sqlite3.connect(DATABASE_PATH)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA_SQL)

    # ── Summary counters ───────────────────────────────────────────────
    countries_seeded     = set()
    jurisdictions_seeded = set()
    violations_seeded    = set()
    fine_count           = 0

    for filename in sorted(os.listdir(SEED_DIR)):
        if not filename.endswith(".json"):
            continue

        filepath = SEED_DIR / filename
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"Processing {filename}...")

        country_name = data["country"]
        country_code = data["country_code"]
        jur_name     = data["jurisdiction"]

        if dry_run:
            print(f"  [DRY RUN] Would insert country: {country_name} ({country_code})")
            print(f"  [DRY RUN] Would insert jurisdiction: {jur_name}")
            for v in data.get("violations", []):
                sec_ref = v.get("section_reference", {})
                section_str = sec_ref.get("act_section", "") if isinstance(sec_ref, dict) else str(sec_ref)
                primary_section = extract_primary_section(section_str)
                canonical_name = LAW_MAP.get(primary_section, v["name"])
                fines = v.get("fines", {})
                print(f"  [DRY RUN] Would insert violation: '{canonical_name}' | fines: {fines}")
            print()
            continue

        # ── 1. Country ─────────────────────────────────────────────────
        row = db.execute("SELECT id FROM countries WHERE code = ?", (country_code,)).fetchone()
        if row:
            country_id = row["id"]
        else:
            db.execute(
                "INSERT INTO countries (name, code, legal_system, currency, currency_symbol) VALUES (?,?,?,?,?)",
                (country_name, country_code, "federal", "INR", "₹")
            )
            country_id = db.execute("SELECT id FROM countries WHERE code = ?", (country_code,)).fetchone()["id"]
        countries_seeded.add(country_code)

        # ── 2. Jurisdiction ────────────────────────────────────────────
        row = db.execute("SELECT id FROM jurisdictions WHERE name = ?", (jur_name,)).fetchone()
        if row:
            jurisdiction_id = row["id"]
        else:
            db.execute(
                "INSERT INTO jurisdictions (country_id, name, type, effective_date, source_url) VALUES (?,?,?,?,?)",
                (country_id, jur_name, data["jurisdiction_type"], data["effective_date"], data["source_url"])
            )
            jurisdiction_id = db.execute("SELECT id FROM jurisdictions WHERE name = ?", (jur_name,)).fetchone()["id"]
        jurisdictions_seeded.add(jur_name)

        # ── 3. Violations ──────────────────────────────────────────────
        for v in data.get("violations", []):

            # 3a. Category
            category_id = get_or_create(db, "violation_categories", v.get("category", "General"), ["icon"], [""])

            # 3b. Section reference
            sec_ref = v.get("section_reference", {})
            section_str = sec_ref.get("act_section", "") if isinstance(sec_ref, dict) else str(sec_ref)

            # 3c. Canonical name from LAW_MAP
            primary_section = extract_primary_section(section_str)
            canonical_name = LAW_MAP.get(primary_section, v["name"])

            row = db.execute("SELECT id FROM violations WHERE name = ?", (canonical_name,)).fetchone()
            if row:
                violation_id = row["id"]
            else:
                db.execute(
                    "INSERT INTO violations (category_id, name, description, section_reference, severity) VALUES (?,?,?,?,?)",
                    (category_id, canonical_name, v.get("description", ""), section_str, v.get("severity", "minor"))
                )
                violation_id = db.execute("SELECT id FROM violations WHERE name = ?", (canonical_name,)).fetchone()["id"]
            violations_seeded.add(canonical_name)

            # 3d. License action
            lic = v.get("license_action")
            if isinstance(lic, dict):
                lic_str = f"{lic.get('type', '')} - {lic.get('duration', '')}".strip(" -")
            elif isinstance(lic, str):
                lic_str = lic
            else:
                lic_str = None

            # 3e. Additional penalties
            additional = v.get("additional_penalties", [])
            additional_str = ", ".join(additional) if additional else None

            # 3f. Source
            source_info = v.get("source", {})
            source_str = source_info.get("title", data.get("source_title", "")) if isinstance(source_info, dict) else str(source_info)

            # 3g. Fines
            fines           = v.get("fines", {})
            first_fine      = fines.get("first_offence")
            subsequent_fine = fines.get("subsequent_offence")
            compounding_fee = fines.get("compounding_fee")
            max_fine        = fines.get("maximum_fine")

            # 3h. Imprisonment
            imprisonment = v.get("imprisonment")
            if isinstance(imprisonment, dict):
                imprisonment_str = f"{imprisonment.get('duration', '')} {imprisonment.get('type', '')}".strip()
            elif isinstance(imprisonment, str):
                imprisonment_str = imprisonment
            else:
                imprisonment_str = None

            # 3i. Fine schedule per vehicle class
            vehicle_classes = v.get("vehicle_classes", [None])
            for vc_name in vehicle_classes:
                vc_id = get_or_create(db, "vehicle_classes", vc_name) if vc_name else None

                db.execute(
                    """INSERT INTO fine_schedules
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
                        additional_str, v.get("notes"),
                        data["effective_date"], source_str
                    )
                )
                fine_count += 1

    db.commit()
    print()
    print("=" * 40)
    print("        SEED SUMMARY REPORT")
    print("=" * 40)
    print(f"  Countries:      {len(countries_seeded)}")
    print(f"  Jurisdictions:  {len(jurisdictions_seeded)}")
    print(f"  Violations:     {len(violations_seeded)}")
    print(f"  Fine schedules: {fine_count}")
    print("=" * 40)
    print(f"\n[OK] Database seeded successfully!")
    print(f"     Path: {DATABASE_PATH}")
    # ── Rebuild FTS5 index ─────────────────────────────────────────────
    db.execute("INSERT INTO violations_fts(violations_fts) VALUES('rebuild')")
    db.commit()
    print("  FTS5 index rebuilt.")
    db.close()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    seed(dry_run=dry_run)