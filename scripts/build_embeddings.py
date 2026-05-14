import os
import sys

# 1. Path patching to ensure 'backend' can be found regardless of where you execute from
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.core.embeddings import get_vector_store


# IMPORTANT: documents live under backend/data/documents in this repo.
DOCS_DIR = os.path.join(PROJECT_ROOT, "backend", "data", "documents")


def build_vector_database():
    # Ensure source directory exists
    if not os.path.exists(DOCS_DIR):
        print(f"Error: Document folder not found at {DOCS_DIR}. Creating it now...")
        os.makedirs(DOCS_DIR, exist_ok=True)
        print("💡 Place your 'motor_vehicles_act_2019.txt' inside data/documents/ and rerun.")
        return

    # 2. Configure Text Splitter as specified
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    chunks_text = []
    chunks_metadata = []

    print(f"Reading target files from: {DOCS_DIR}")
    
    # Iterate through law source documents
    for filename in os.listdir(DOCS_DIR):
        if filename.endswith(".txt"):
            file_path = os.path.join(DOCS_DIR, filename)
            
            # Some “.txt” files may actually be PDFs renamed with .txt.
            # Attempt UTF-8 read first; if it looks like a PDF header, skip for now.
            with open(file_path, "rb") as f:
                head = f.read(8)
                if head.startswith(b"%PDF"):
                    print(f"⚠️ Skipping '{filename}' because it appears to be a PDF (despite .txt extension).")
                    continue

                f.seek(0)
                raw_bytes = f.read()

            raw_text = raw_bytes.decode("utf-8", errors="ignore")


            # Dynamic structural metadata generation
            source_tag = filename.replace(".txt", "").upper()

            # Best-effort jurisdiction tagging from filename.
            # Central laws remain National; state-specific docs can be tagged by name.
            fn_upper = filename.upper()
            if "MAHARASHTRA" in fn_upper:
                jurisdiction_tag = "Maharashtra"
            elif "KERALA" in fn_upper:
                jurisdiction_tag = "Kerala"
            elif "KARNATAKA" in fn_upper:
                jurisdiction_tag = "Karnataka"
            elif "TAMIL" in fn_upper:
                jurisdiction_tag = "Tamil Nadu"
            elif "TELANGANA" in fn_upper:
                jurisdiction_tag = "Telangana"
            elif "UTTARPRADESH" in fn_upper or "UTTAR PRADESH" in fn_upper:
                jurisdiction_tag = "Uttar Pradesh"
            elif "WESTBENGAL" in fn_upper or "WEST BENGAL" in fn_upper:
                jurisdiction_tag = "West Bengal"
            elif "PUNJAB" in fn_upper:
                jurisdiction_tag = "Punjab"
            elif "RAJASTHAN" in fn_upper:
                jurisdiction_tag = "Rajasthan"
            elif "HARYANA" in fn_upper:
                jurisdiction_tag = "Haryana"
            elif "GUJARAT" in fn_upper:
                jurisdiction_tag = "Gujarat"
            else:
                # Central acts/rules/amendments are treated as National.
                jurisdiction_tag = "National"


            # Split document text into windows
            individual_chunks = splitter.split_text(raw_text)
            print(f"📄 Parsed '{filename}' -> Generated {len(individual_chunks)} structural chunks.")

            for chunk in individual_chunks:
                chunks_text.append(chunk)
                chunks_metadata.append({
                    "source": source_tag,
                    "jurisdiction": jurisdiction_tag
                })

    # 3. Batch commit to persistent database layer
    if chunks_text:
        print(f"\n📤 Writing {len(chunks_text)} entries to local ChromaDB collection...")
        vector_store = get_vector_store()
        vector_store.add_texts(texts=chunks_text, metadatas=chunks_metadata)
        print("🏆 ChromaDB successfully populated and saved locally!")

    else:
        print("⚠️ No valid text documents found in data/documents/ to build indices from.")

if __name__ == "__main__":
    build_vector_database()