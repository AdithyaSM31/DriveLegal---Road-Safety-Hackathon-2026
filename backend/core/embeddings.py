import os
from typing import Optional

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Dynamically calculate directories relative to this file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DB_DIR = os.path.join(BASE_DIR, "data", "chroma_db")
COLLECTION_NAME = "traffic_laws"

# Lazy-loaded singletons (avoid loading model on every API startup)
_embedding_model: Optional[HuggingFaceEmbeddings] = None
_vector_store: Optional[Chroma] = None


def get_vector_store() -> Chroma:
    """Lazy-load embedding model + persistent Chroma vector store."""
    global _embedding_model, _vector_store

    if _vector_store is None:
        print("🔄 Loading local embedding model (all-MiniLM-L6-v2)...")
        _embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        print("✅ Local embedding model loaded successfully.")

        _vector_store = Chroma(
            persist_directory=DB_DIR,
            embedding_function=_embedding_model,
            collection_name=COLLECTION_NAME,
        )
    return _vector_store


def similarity_search(
    query: str,
    top_k: int = 5,
    jurisdiction: Optional[str] = None,
) -> list[str]:
    """Return raw page_content strings for best-matching chunks.

    If jurisdiction is provided, filters Chroma by metadata['jurisdiction'].
    """
    try:
        vs = get_vector_store()
        if jurisdiction:
            # Chroma metadata filter
            results = vs.similarity_search(
                query,
                k=top_k,
                filter={"jurisdiction": jurisdiction},
            )
        else:
            results = vs.similarity_search(query, k=top_k)
        return [doc.page_content for doc in results]
    except Exception as e:
        print(f"❌ Error during similarity search: {e}")
        return []



if __name__ == "__main__":
    # Sanity check test
    print(f"ChromaDB persistent storage located at: {DB_DIR}")
    get_vector_store()
    print("Vector store ready.")

