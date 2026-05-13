import os
import sys
import json
from typing import Any

# Ensure project root is importable (DriveLegal/)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.core.embeddings import vector_store

SEED_DIR = os.path.join(PROJECT_ROOT, "data", "seed")


def _json_to_text_and_metadata(payload: dict[str, Any], filename: str) -> tuple[str, dict[str, Any]]:
    """Convert one state's JSON payload into a text block + metadata."""

    state = payload.get("jurisdiction") or filename.replace(".json", "")
    country = payload.get("country")
    jurisdiction_type = payload.get("jurisdiction_type")
    effective_date = payload.get("effective_date")

    act = payload.get("act")
    source_title = payload.get("source_title")
    source_url = payload.get("source_url")

    header_lines = [
        f"Country: {country}",
        f"Jurisdiction: {state}",
        f"Jurisdiction Type: {jurisdiction_type}",
        f"Effective Date: {effective_date}",
        f"Act: {act}",
        f"Source: {source_title} ({source_url})",
    ]

    lines: list[str] = ["\n".join(header_lines)]

    violations = payload.get("violations") or []
    for v in violations:
        name = v.get("name")
        description = v.get("description")
        category = v.get("category")
        severity = v.get("severity")

        section_ref = v.get("section_reference") or {}
        act_section = section_ref.get("act_section")
        related_section = section_ref.get("related_section")

        fines = v.get("fines") or {}
        first_offence = fines.get("first_offence")
        subsequent_offence = fines.get("subsequent_offence")
        minimum_fine = fines.get("minimum_fine")
        maximum_fine = fines.get("maximum_fine")
        compounding_fee = fines.get("compounding_fee")

        license_action = v.get("license_action") or {}
        license_type = license_action.get("type")
        license_duration = license_action.get("duration")

        notes = v.get("notes")

        lines.append(
            "\n---\n".join(
                [
                    f"Violation: {name}",
                    f"Description: {description}",
                    f"Category: {category}",
                    f"Severity: {severity}",
                    f"Section Reference: {act_section} (Related: {related_section})",
                    "Fines:",
                    f"- First offence: {first_offence}",
                    f"- Subsequent offence: {subsequent_offence}",
                    f"- Minimum fine: {minimum_fine}",
                    f"- Maximum fine: {maximum_fine}",
                    f"- Compounding fee: {compounding_fee}",
                    f"License action: {license_type} ({license_duration})",
                    f"Notes: {notes}",
                ]
            )
        )

    metadata: dict[str, Any] = {
        "source": filename.replace(".json", "").upper(),
        "jurisdiction": state,
        "country": country,
        "jurisdiction_type": jurisdiction_type,
        "effective_date": effective_date,
        "act": act,
    }

    return "\n".join(lines), metadata


def build_vector_database() -> None:
    if not os.path.exists(SEED_DIR):
        print(f"❌ Seed folder not found at {SEED_DIR}. Creating it now...")
        os.makedirs(SEED_DIR, exist_ok=True)
        print("📁 Place your state JSON files inside backend/data/seed/ and rerun.")
        return

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

    chunks_text: list[str] = []
    chunks_metadata: list[dict[str, Any]] = []

    print(f"Reading target files from: {SEED_DIR}")

    json_files = sorted([f for f in os.listdir(SEED_DIR) if f.endswith(".json")])
    if not json_files:
        print("⚠️ No .json files found in backend/data/seed/.")
        return

    for filename in json_files:
        file_path = os.path.join(SEED_DIR, filename)

        with open(file_path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        raw_text, base_metadata = _json_to_text_and_metadata(payload, filename)

        individual_chunks = splitter.split_text(raw_text)
        print(f"📄 Parsed '{filename}' -> Generated {len(individual_chunks)} chunks")

        for chunk in individual_chunks:
            chunks_text.append(chunk)
            chunks_metadata.append(base_metadata)

    if chunks_text:
        print(f"\n📤 Writing {len(chunks_text)} entries to local ChromaDB collection...")
        vector_store.add_texts(texts=chunks_text, metadatas=chunks_metadata)
        print("🏆 ChromaDB successfully populated and saved locally!")
    else:
        print("⚠️ No valid JSON documents found to build indices from.")


if __name__ == "__main__":
    build_vector_database()

