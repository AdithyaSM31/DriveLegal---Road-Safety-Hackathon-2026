"""
DriveLegal — Quick seed script with sample data for API testing.
Marion will replace this with the full dataset from curated JSON files.
Run:  python -m scripts.seed_sample
"""

import sqlite3
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.config import DATABASE_PATH
from backend.core.database import SCHEMA_SQL

def seed():
    db = sqlite3.connect(DATABASE_PATH)
    db.executescript(SCHEMA_SQL)

    # ── Countries ──
    db.executemany(
        "INSERT OR IGNORE INTO countries (name, code, legal_system, currency, currency_symbol) VALUES (?,?,?,?,?)",
        [
            ("India", "IN", "federal", "INR", "\u20b9"),
            ("United States", "US", "federal", "USD", "$"),
            ("United Kingdom", "GB", "unitary", "GBP", "\u00a3"),
            ("United Arab Emirates", "AE", "federal", "AED", "AED"),
            ("Germany", "DE", "federal", "EUR", "\u20ac"),
            ("Australia", "AU", "federal", "AUD", "A$"),
        ],
    )

    # ── Jurisdictions ──
    db.executemany(
        "INSERT OR IGNORE INTO jurisdictions (country_id, name, type, effective_date, source_url) VALUES (?,?,?,?,?)",
        [
            (1, "India - National", "national", "2019-09-01", "https://parivahan.gov.in"),
            (1, "Delhi", "state", "2019-09-01", "https://delhitrafficpolice.nic.in"),
            (1, "Karnataka", "state", "2019-10-01", "https://ksp.karnataka.gov.in"),
            (1, "Tamil Nadu", "state", "2019-09-01", "https://tnpolice.gov.in"),
            (1, "Maharashtra", "state", "2019-09-01", "https://mahatrafficpolice.gov.in"),
            (2, "United States - Federal", "national", "2020-01-01", "https://www.nhtsa.gov"),
            (2, "California", "state", "2024-01-01", "https://www.dmv.ca.gov"),
            (3, "United Kingdom - National", "national", "2024-01-01", "https://www.gov.uk"),
            (4, "UAE - Federal", "national", "2023-07-01", "https://www.moi.gov.ae"),
            (5, "Germany - National", "national", "2024-01-01", "https://www.bmvi.de"),
            (6, "New South Wales", "state", "2024-01-01", "https://www.nsw.gov.au"),
        ],
    )

    # ── Vehicle Classes ──
    db.executemany(
        "INSERT OR IGNORE INTO vehicle_classes (name, description) VALUES (?,?)",
        [
            ("Two-wheeler", "Motorcycles, scooters, mopeds"),
            ("LMV", "Light Motor Vehicle — cars, jeeps, vans up to 7,500 kg"),
            ("HMV", "Heavy Motor Vehicle — trucks, buses over 7,500 kg"),
            ("Commercial", "Taxis, auto-rickshaws, goods carriers"),
            ("E-Vehicle", "Electric vehicles including e-scooters"),
        ],
    )

    # ── Violation Categories ──
    db.executemany(
        "INSERT OR IGNORE INTO violation_categories (name, icon) VALUES (?,?)",
        [
            ("Speeding", "\U0001f3ce\ufe0f"),
            ("Safety Equipment", "\U0001f6e1\ufe0f"),
            ("Documentation", "\U0001f4c4"),
            ("Dangerous Driving", "\u26a0\ufe0f"),
            ("Alcohol & Drugs", "\U0001f6ab"),
            ("Parking & Obstruction", "\U0001f17f\ufe0f"),
            ("Passenger & Loading", "\U0001f69a"),
            ("Emergency & Special", "\U0001f6d1"),
        ],
    )

    # ── Violations (India MV Act 2019 - key ones) ──
    violations = [
        (1, "Over-speeding", "Exceeding the prescribed speed limit", "Section 183, MV Act 2019", "moderate"),
        (2, "Riding without helmet", "Riding a two-wheeler without a protective headgear", "Section 194D, MV Act 2019", "moderate"),
        (2, "Not wearing seat belt", "Driving without wearing a seat belt", "Section 194B, MV Act 2019", "minor"),
        (3, "Driving without licence", "Driving a vehicle without a valid driving licence", "Section 181, MV Act 2019", "major"),
        (3, "Driving without insurance", "Driving without valid vehicle insurance", "Section 196, MV Act 2019", "major"),
        (3, "Driving without registration", "Driving an unregistered vehicle", "Section 192, MV Act 2019", "major"),
        (4, "Dangerous driving", "Driving in a manner dangerous to the public", "Section 184, MV Act 2019", "critical"),
        (4, "Using mobile phone while driving", "Using a handheld phone while operating a vehicle", "Section 184, MV Act 2019", "moderate"),
        (5, "Drunk driving", "Driving under the influence of alcohol or drugs", "Section 185, MV Act 2019", "critical"),
        (1, "Racing / speeding on public roads", "Unauthorized racing or competitive speeding", "Section 189, MV Act 2019", "critical"),
        (6, "Illegal parking", "Parking in a no-parking zone or obstructing traffic", "Section 177, MV Act 2019", "minor"),
        (7, "Overloading passengers", "Carrying passengers exceeding the permitted limit", "Section 194A, MV Act 2019", "moderate"),
        (7, "Overloading of two-wheelers", "Triple-riding or exceeding two-wheeler passenger limit", "Section 194C, MV Act 2019", "moderate"),
        (8, "Not giving way to emergency vehicles", "Failing to give passage to ambulance/fire brigade", "Section 194E, MV Act 2019", "critical"),
        (3, "Driving despite disqualification", "Driving when licence has been suspended/revoked", "Section 182, MV Act 2019", "critical"),
        (8, "Offences by juveniles", "Underage person driving a motor vehicle", "Section 199A, MV Act 2019", "critical"),
        (2, "No rear-view mirror", "Two-wheeler without rear-view mirror", "Section 177, MV Act 2019", "minor"),
        (3, "No PUC certificate", "Vehicle without valid Pollution Under Control certificate", "Section 190(2), MV Act 2019", "minor"),
    ]
    db.executemany(
        "INSERT OR IGNORE INTO violations (category_id, name, description, section_reference, severity) VALUES (?,?,?,?,?)",
        violations,
    )

    # ── Fine Schedules — India National ──
    india_national = 1  # jurisdiction_id
    fine_data_national = [
        # (violation_id, jurisdiction_id, vehicle_class_id, first, subsequent, compounding, max, imprisonment, license, points, additional, notes, effective, source)
        (1, india_national, 2, 1000, 2000, 1000, 2000, None, None, None, None, "LMV fine", "2019-09-01", "MV Amendment Act 2019, Section 183"),
        (1, india_national, 3, 2000, 4000, 2000, 4000, None, None, None, None, "HMV fine", "2019-09-01", "MV Amendment Act 2019, Section 183"),
        (2, india_national, 1, 1000, 1500, 1000, 1500, None, "Disqualification for 3 months", None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 194D"),
        (3, india_national, None, 1000, 1500, 1000, 1500, None, None, None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 194B"),
        (4, india_national, None, 5000, 10000, 5000, 10000, None, None, None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 181"),
        (5, india_national, None, 2000, 4000, 2000, 4000, "3 months and/or fine", None, None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 196"),
        (6, india_national, None, 5000, 10000, 5000, 10000, "Up to 1 year", None, None, "Vehicle may be impounded", None, "2019-09-01", "MV Amendment Act 2019, Section 192"),
        (7, india_national, None, 5000, 10000, None, 10000, "Up to 6 months", "Revocation if serious", None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 184"),
        (9, india_national, None, 10000, 15000, None, 15000, "Up to 6 months", "Revocation", None, "Vehicle may be impounded", None, "2019-09-01", "MV Amendment Act 2019, Section 185"),
        (10, india_national, None, 5000, 10000, None, 10000, "Up to 3 months", "Revocation", None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 189"),
        (11, india_national, None, 500, 1500, 500, 1500, None, None, None, None, "General offence", "2019-09-01", "MV Amendment Act 2019, Section 177"),
        (12, india_national, None, 1000, 2000, 1000, 2000, None, None, None, None, "Per extra passenger", "2019-09-01", "MV Amendment Act 2019, Section 194A"),
        (13, india_national, 1, 2000, 4000, 2000, 4000, None, "Disqualification for 3 months", None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 194C"),
        (14, india_national, None, 10000, 10000, None, 10000, None, None, None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 194E"),
        (15, india_national, None, 10000, 10000, None, 10000, None, None, None, None, None, "2019-09-01", "MV Amendment Act 2019, Section 182"),
        (16, india_national, None, 25000, 25000, None, 25000, "Up to 3 years", "Registration cancelled", None, "Guardian/owner deemed guilty", None, "2019-09-01", "MV Amendment Act 2019, Section 199A"),
    ]
    db.executemany(
        """INSERT OR IGNORE INTO fine_schedules
           (violation_id, jurisdiction_id, vehicle_class_id,
            first_offence_fine, subsequent_offence_fine, compounding_fee, max_fine,
            imprisonment_text, license_action, points_deducted, additional_penalties,
            notes, effective_date, source)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        fine_data_national,
    )

    # ── Fine Schedules — Karnataka (reduced fines) ──
    karnataka = 3  # jurisdiction_id
    fine_data_karnataka = [
        (2, karnataka, 1, 500, 1000, 500, 1000, None, "Disqualification for 3 months", None, None, "Reduced from national Rs 1000", "2019-10-01", "Karnataka Transport Dept Notification, 2019"),
        (3, karnataka, None, 500, 1000, 500, 1000, None, None, None, None, "Reduced from national Rs 1000", "2019-10-01", "Karnataka Transport Dept Notification, 2019"),
        (1, karnataka, 2, 500, 1500, 500, 1500, None, None, None, None, "Reduced from national Rs 1000", "2019-10-01", "Karnataka Transport Dept Notification, 2019"),
        (9, karnataka, None, 10000, 15000, None, 15000, "Up to 6 months", "Revocation", None, "Vehicle may be impounded", "Same as national", "2019-10-01", "MV Amendment Act 2019, Section 185"),
    ]
    db.executemany(
        """INSERT OR IGNORE INTO fine_schedules
           (violation_id, jurisdiction_id, vehicle_class_id,
            first_offence_fine, subsequent_offence_fine, compounding_fee, max_fine,
            imprisonment_text, license_action, points_deducted, additional_penalties,
            notes, effective_date, source)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        fine_data_karnataka,
    )

    # ── Fine Schedules — Delhi (follows national rates) ──
    delhi = 2  # jurisdiction_id
    fine_data_delhi = [
        (2, delhi, 1, 1000, 1500, 1000, 1500, None, "Disqualification for 3 months", None, None, "Follows national rate", "2019-09-01", "Delhi Traffic Police, MV Act 2019"),
        (9, delhi, None, 10000, 15000, None, 15000, "Up to 6 months", "Revocation", None, "Vehicle may be impounded", "Strictly enforced with breath analyzers", "2019-09-01", "Delhi Traffic Police, MV Act 2019"),
        (4, delhi, None, 5000, 10000, 5000, 10000, None, None, None, None, "Digital enforcement via CCTV", "2019-09-01", "Delhi Traffic Police, MV Act 2019"),
        (11, delhi, None, 500, 1500, 500, 1500, None, None, None, "Towing charges extra", None, "2019-09-01", "Delhi Traffic Police, MV Act 2019"),
    ]
    db.executemany(
        """INSERT OR IGNORE INTO fine_schedules
           (violation_id, jurisdiction_id, vehicle_class_id,
            first_offence_fine, subsequent_offence_fine, compounding_fee, max_fine,
            imprisonment_text, license_action, points_deducted, additional_penalties,
            notes, effective_date, source)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        fine_data_delhi,
    )

    db.commit()
    db.close()
    print("[OK] Sample database seeded successfully!")
    print(f"     Path: {DATABASE_PATH}")


if __name__ == "__main__":
    seed()
