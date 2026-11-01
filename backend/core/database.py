"""
DriveLegal — SQLite database layer.
Handles schema creation, connection management, and all query functions
used by the API endpoints.
"""

from __future__ import annotations
import aiosqlite
import sqlite3
from pathlib import Path
from typing import Optional

from backend.config import DATABASE_PATH

# ────────────────────────── Schema Definition ───────────────────────────────

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    legal_system TEXT,
    currency TEXT,
    currency_symbol TEXT
);

CREATE TABLE IF NOT EXISTS jurisdictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER NOT NULL REFERENCES countries(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('national','state','city','emirate','province','territory')),
    parent_id INTEGER REFERENCES jurisdictions(id),
    effective_date TEXT,
    source_url TEXT
);

CREATE TABLE IF NOT EXISTS vehicle_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS violation_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT
);

CREATE TABLE IF NOT EXISTS violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES violation_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    section_reference TEXT,
    severity TEXT CHECK(severity IN ('minor','moderate','major','critical'))
);

CREATE TABLE IF NOT EXISTS fine_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    violation_id INTEGER NOT NULL REFERENCES violations(id),
    jurisdiction_id INTEGER NOT NULL REFERENCES jurisdictions(id),
    vehicle_class_id INTEGER REFERENCES vehicle_classes(id),
    first_offence_fine REAL,
    subsequent_offence_fine REAL,
    compounding_fee REAL,
    max_fine REAL,
    imprisonment_text TEXT,
    license_action TEXT,
    points_deducted INTEGER,
    additional_penalties TEXT,
    notes TEXT,
    effective_date TEXT,
    source TEXT
);

CREATE TABLE IF NOT EXISTS law_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jurisdiction_id INTEGER NOT NULL REFERENCES jurisdictions(id),
    title TEXT NOT NULL,
    content TEXT,
    document_type TEXT CHECK(document_type IN ('act','amendment','notification','rule','guideline')),
    effective_date TEXT,
    source_url TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS violations_fts USING fts5(
    name,
    description,
    section_reference,
    content='violations',
    content_rowid='id'
);
"""


# ────────────────────────── Initialization ──────────────────────────────────

def init_db_sync() -> None:
    """Create the database and tables synchronously (called once at startup)."""
    db_path = Path(DATABASE_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.executescript(SCHEMA_SQL)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.commit()
    conn.close()


async def get_db() -> aiosqlite.Connection:
    """Get an async database connection (use as a dependency or context manager)."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys=ON;")
    return db


# ────────────────────────── Location Queries ────────────────────────────────

async def get_all_countries() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, name, code, currency, currency_symbol FROM countries ORDER BY name"
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def get_jurisdictions(country_id: Optional[int] = None) -> list[dict]:
    db = await get_db()
    try:
        if country_id:
            cursor = await db.execute(
                """SELECT j.id, j.country_id, c.name AS country_name,
                          j.name, j.type, j.parent_id, j.effective_date, j.source_url
                   FROM jurisdictions j
                   JOIN countries c ON c.id = j.country_id
                   WHERE j.country_id = ?
                   ORDER BY j.type, j.name""",
                (country_id,),
            )
        else:
            cursor = await db.execute(
                """SELECT j.id, j.country_id, c.name AS country_name,
                          j.name, j.type, j.parent_id, j.effective_date, j.source_url
                   FROM jurisdictions j
                   JOIN countries c ON c.id = j.country_id
                   ORDER BY c.name, j.type, j.name"""
            )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# ────────────────────────── Violation / Category Queries ────────────────────

async def get_violation_categories() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, name, icon FROM violation_categories ORDER BY name"
        )
        return [dict(r) for r in await cursor.fetchall()]
    finally:
        await db.close()


async def get_violations(category_id: Optional[int] = None) -> list[dict]:
    db = await get_db()
    try:
        if category_id:
            cursor = await db.execute(
                """SELECT v.id, v.category_id, vc.name AS category_name,
                          v.name, v.description, v.section_reference, v.severity
                   FROM violations v
                   JOIN violation_categories vc ON vc.id = v.category_id
                   WHERE v.category_id = ?
                   ORDER BY v.name""",
                (category_id,),
            )
        else:
            cursor = await db.execute(
                """SELECT v.id, v.category_id, vc.name AS category_name,
                          v.name, v.description, v.section_reference, v.severity
                   FROM violations v
                   JOIN violation_categories vc ON vc.id = v.category_id
                   ORDER BY vc.name, v.name"""
            )
        return [dict(r) for r in await cursor.fetchall()]
    finally:
        await db.close()


async def get_vehicle_classes() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, name, description FROM vehicle_classes ORDER BY name"
        )
        return [dict(r) for r in await cursor.fetchall()]
    finally:
        await db.close()


# ────────────────────────── Challan Calculator Query ────────────────────────

async def calculate_challan(
    jurisdiction_id: int,
    violation_id: int,
    vehicle_class_id: Optional[int] = None,
) -> Optional[dict]:
    """
    Look up the fine schedule for a specific violation in a jurisdiction.
    Returns None if no matching record found.
    Tries exact vehicle_class match first, then falls back to class-agnostic entry.
    """
    db = await get_db()
    try:
        # First try: exact vehicle class match
        if vehicle_class_id:
            cursor = await db.execute(
                """SELECT fs.*, 
                          v.name AS violation_name, v.section_reference, v.severity,
                          j.name AS jurisdiction_name,
                          c.name AS country_name, c.currency_symbol,
                          vc.name AS vehicle_class_name
                   FROM fine_schedules fs
                   JOIN violations v ON v.id = fs.violation_id
                   JOIN jurisdictions j ON j.id = fs.jurisdiction_id
                   JOIN countries c ON c.id = j.country_id
                   LEFT JOIN vehicle_classes vc ON vc.id = fs.vehicle_class_id
                   WHERE fs.jurisdiction_id = ?
                     AND fs.violation_id = ?
                     AND fs.vehicle_class_id = ?
                   LIMIT 1""",
                (jurisdiction_id, violation_id, vehicle_class_id),
            )
            row = await cursor.fetchone()
            if row:
                return dict(row)

        # Fallback: class-agnostic entry (vehicle_class_id IS NULL)
        cursor = await db.execute(
            """SELECT fs.*, 
                      v.name AS violation_name, v.section_reference, v.severity,
                      j.name AS jurisdiction_name,
                      c.name AS country_name, c.currency_symbol,
                      vc.name AS vehicle_class_name
               FROM fine_schedules fs
               JOIN violations v ON v.id = fs.violation_id
               JOIN jurisdictions j ON j.id = fs.jurisdiction_id
               JOIN countries c ON c.id = j.country_id
               LEFT JOIN vehicle_classes vc ON vc.id = fs.vehicle_class_id
               WHERE fs.jurisdiction_id = ?
                 AND fs.violation_id = ?
                 AND (fs.vehicle_class_id IS NULL OR fs.vehicle_class_id = ?)
               ORDER BY fs.vehicle_class_id IS NULL ASC
               LIMIT 1""",
            (jurisdiction_id, violation_id, vehicle_class_id),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


# ────────────────────────── Laws Browser Query ──────────────────────────────

async def browse_laws(
    jurisdiction_id: Optional[int] = None,
    country_id: Optional[int] = None,
    category_id: Optional[int] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """
    Browse and search fine schedules with filters and pagination.
    Returns { total, page, page_size, results: [...] }
    """
    db = await get_db()
    try:
        conditions = []
        params: list = []

        if jurisdiction_id:
            conditions.append("fs.jurisdiction_id = ?")
            params.append(jurisdiction_id)
        if country_id:
            conditions.append("j.country_id = ?")
            params.append(country_id)
        if category_id:
            conditions.append("v.category_id = ?")
            params.append(category_id)
        if severity:
            conditions.append("v.severity = ?")
            params.append(severity)
        if search:
            conditions.append(
                "(v.name LIKE ? OR v.description LIKE ? OR v.section_reference LIKE ?)"
            )
            like = f"%{search}%"
            params.extend([like, like, like])

        where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""

        base_query = f"""
            FROM fine_schedules fs
            JOIN violations v ON v.id = fs.violation_id
            JOIN violation_categories vc ON vc.id = v.category_id
            JOIN jurisdictions j ON j.id = fs.jurisdiction_id
            JOIN countries c ON c.id = j.country_id
            LEFT JOIN vehicle_classes vclass ON vclass.id = fs.vehicle_class_id
            {where_clause}
        """

        # Count total
        count_cursor = await db.execute(
            f"SELECT COUNT(*) as cnt {base_query}", params
        )
        total = (await count_cursor.fetchone())["cnt"]

        # Fetch page
        offset = (page - 1) * page_size
        data_cursor = await db.execute(
            f"""SELECT fs.id, fs.violation_id, fs.jurisdiction_id, j.country_id,
                       v.category_id, fs.vehicle_class_id, v.description, j.source_url,
                       v.name AS violation_name, vc.name AS category_name,
                       v.section_reference, v.severity,
                       j.name AS jurisdiction_name, c.name AS country_name,
                       vclass.name AS vehicle_class, c.currency_symbol,
                       fs.first_offence_fine, fs.subsequent_offence_fine,
                       fs.compounding_fee, fs.max_fine,
                       fs.imprisonment_text, fs.license_action,
                       fs.points_deducted, fs.additional_penalties,
                       fs.notes, fs.source, fs.effective_date
                {base_query}
                ORDER BY c.name, j.name, vc.name, v.name
                LIMIT ? OFFSET ?""",
            params + [page_size, offset],
        )
        rows = await data_cursor.fetchall()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "results": [dict(r) for r in rows],
        }
    finally:
        await db.close()


# ────────────────────────── Bulk Export (for offline sync) ──────────────────

async def export_all_fine_schedules() -> list[dict]:
    """Export all fine schedules for IndexedDB sync (offline mode)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT fs.id, fs.violation_id, v.category_id, v.description, j.source_url,
                      v.name AS violation_name, vc.name AS category_name,
                      v.section_reference, v.severity,
                      j.name AS jurisdiction_name, j.id AS jurisdiction_id,
                      c.name AS country_name, c.id AS country_id,
                      c.currency_symbol,
                      vclass.name AS vehicle_class,
                      vclass.id AS vehicle_class_id,
                      fs.first_offence_fine, fs.subsequent_offence_fine,
                      fs.compounding_fee, fs.max_fine,
                      fs.imprisonment_text, fs.license_action,
                      fs.points_deducted, fs.additional_penalties,
                      fs.notes, fs.source, fs.effective_date
               FROM fine_schedules fs
               JOIN violations v ON v.id = fs.violation_id
               JOIN violation_categories vc ON vc.id = v.category_id
               JOIN jurisdictions j ON j.id = fs.jurisdiction_id
               JOIN countries c ON c.id = j.country_id
               LEFT JOIN vehicle_classes vclass ON vclass.id = fs.vehicle_class_id
               ORDER BY c.name, j.name, vc.name, v.name"""
        )
        return [dict(r) for r in await cursor.fetchall()]
    finally:
        await db.close()


# ────────────────────────── FTS5 Search ─────────────────────────────────────

async def search_violations_fts(query: str) -> list[dict]:
    """
    Full-text search across violation name, description, and section reference.
    Returns ranked results using FTS5.
    """
    db = await get_db()
    try:
        # Append * for prefix matching (e.g. "helmet" matches "helmets")
        fts_query = f"{query}*"
        cursor = await db.execute(
            """SELECT v.id, v.name, v.description, v.section_reference, v.severity,
                      vc.name AS category_name,
                      rank
               FROM violations_fts
               JOIN violations v ON violations_fts.rowid = v.id
               JOIN violation_categories vc ON vc.id = v.category_id
               WHERE violations_fts MATCH ?
               ORDER BY rank
               LIMIT 20""",
            (fts_query,),
        )
        return [dict(r) for r in await cursor.fetchall()]
    finally:
        await db.close()


# ────────────────────────── Analytics ───────────────────────────────────────

async def get_analytics_summary(jurisdiction_id: int = None) -> dict:
    """Describe dataset coverage; schedules are not observed traffic incidents."""
    rows = await export_all_fine_schedules()
    if jurisdiction_id:
        rows = [r for r in rows if r["jurisdiction_id"] == jurisdiction_id]
    categories = {}
    severity = {}
    for row in rows:
        categories[row["category_name"]] = categories.get(row["category_name"], 0) + 1
        label = (row["severity"] or "unspecified").capitalize()
        severity[label] = severity.get(label, 0) + 1
    return {
        "data_type": "fine_schedule_coverage",
        "description": "Counts of records in the supplied dataset, not live traffic or crash statistics.",
        "summary": {
            "schedules": len(rows),
            "jurisdictions": len({r["jurisdiction_id"] for r in rows}),
            "violations": len({r["violation_id"] for r in rows}),
            "dated_records": sum(bool(r["effective_date"]) for r in rows),
        },
        "categories": {"labels": list(categories), "values": list(categories.values())},
        "severity": {"labels": list(severity), "values": list(severity.values())},
    }
