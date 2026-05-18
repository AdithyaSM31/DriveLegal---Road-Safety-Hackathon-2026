import os
import sys
import uuid

# 1. Path patching to ensure 'backend' can be found regardless of where you execute from
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.core.embeddings import get_vector_store

# Use the standardized data directory
DOCS_DIR = os.path.join(PROJECT_ROOT, "data", "documents")
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

def split_text(text: str, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP) -> list[str]:
    """Simple sliding-window text splitter — no external dependencies."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def build_vector_database():
    # Ensure source directory exists
    if not os.path.exists(DOCS_DIR):
        print(f"Error: Document folder not found at {DOCS_DIR}. Creating it now...")
        os.makedirs(DOCS_DIR, exist_ok=True)
        print("💡 Place your .txt files inside data/documents/ and rerun.")
        return

    chunks_text = []
    chunks_ids = []
    chunks_metadata = []

    print(f"Reading target files from: {DOCS_DIR}")

    for filename in os.listdir(DOCS_DIR):
        if filename.endswith(".txt"):
            file_path = os.path.join(DOCS_DIR, filename)
            
            # Check for PDF header even if named .txt
            with open(file_path, "rb") as f:
                head = f.read(8)
                if head.startswith(b"%PDF"):
                    print(f"⚠️ Skipping '{filename}' (PDF content detected). Use a text extractor first.")
                    continue
                f.seek(0)
                raw_bytes = f.read()

            try:
                raw_text = raw_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raw_text = raw_bytes.decode("utf-8", errors="ignore")

            source_tag = filename.replace(".txt", "").upper()
            
            # Best-effort jurisdiction tagging
            fn_upper = filename.upper()
            if "MAHARASHTRA" in fn_upper: jurisdiction_tag = "Maharashtra"
            elif "KERALA" in fn_upper: jurisdiction_tag = "Kerala"
            elif "KARNATAKA" in fn_upper: jurisdiction_tag = "Karnataka"
            elif "TAMIL" in fn_upper: jurisdiction_tag = "Tamil Nadu"
            elif "DELHI" in fn_upper: jurisdiction_tag = "Delhi"
            else: jurisdiction_tag = "National"

            individual_chunks = split_text(raw_text)
            print(f"📄 Parsed '{filename}' ({jurisdiction_tag}) -> {len(individual_chunks)} chunks.")

            for chunk in individual_chunks:
                chunks_text.append(chunk)
                chunks_ids.append(str(uuid.uuid4()))
                chunks_metadata.append({
                    "source": source_tag, 
                    "jurisdiction": jurisdiction_tag
                })

    if chunks_text:
        print(f"\n📤 Writing {len(chunks_text)} entries to ChromaDB collection...")
        collection = get_vector_store()
        # Add in batches of 100
        batch_size = 100
        for i in range(0, len(chunks_text), batch_size):
            collection.add(
                documents=chunks_text[i:i+batch_size],
                ids=chunks_ids[i:i+batch_size],
                metadatas=chunks_metadata[i:i+batch_size],
            )
            print(f"  Batch {i//batch_size + 1} committed ({min(i+batch_size, len(chunks_text))}/{len(chunks_text)})")
        print("🏆 ChromaDB successfully populated and saved locally!")
    else:
        print("⚠️ No valid .txt documents found to build indices from.")

if __name__ == "__main__":
    build_vector_database()
