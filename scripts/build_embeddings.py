import os
import sys

# 1. Path patching to ensure 'backend' can be found regardless of where you execute from
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.core.embeddings import vector_store

DOCS_DIR = os.path.join(PROJECT_ROOT, "data", "documents")

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
            
            with open(file_path, "r", encoding="utf-8") as f:
                raw_text = f.read()

            # Dynamic structural metadata generation 
            source_tag = filename.replace(".txt", "").upper()
            jurisdiction_tag = "National" # Default fallback string

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
        vector_store.add_texts(texts=chunks_text, metadatas=chunks_metadata)
        print("🏆 ChromaDB successfully populated and saved locally!")
    else:
        print("⚠️ No valid text documents found in data/documents/ to build indices from.")

if __name__ == "__main__":
    build_vector_database()