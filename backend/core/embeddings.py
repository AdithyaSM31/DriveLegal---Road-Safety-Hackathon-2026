import os
from typing import Optional

import chromadb
from chromadb.utils import embedding_functions

# Dynamically calculate directories relative to this file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DB_DIR = os.path.join(BASE_DIR, "data", "chroma_db")
COLLECTION_NAME = "traffic_laws"

# Lazy-loaded singletons (avoid loading model on every API startup)
_chroma_client: Optional[chromadb.PersistentClient] = None
_collection = None


def get_vector_store():
    """Lazy-load persistent Chroma collection using the default embedding function."""
    global _chroma_client, _collection

    if _collection is None:
        os.makedirs(DB_DIR, exist_ok=True)
        print("🔄 Loading ChromaDB with default embedding model...")
        _chroma_client = chromadb.PersistentClient(path=DB_DIR)
        _ef = embedding_functions.DefaultEmbeddingFunction()
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=_ef,
        )
        print(f"✅ ChromaDB collection '{COLLECTION_NAME}' ready ({_collection.count()} docs).")
    return _collection


def similarity_search(query: str, top_k: int = 5) -> list[str]:
    """Return raw document strings for best-matching chunks."""
    try:
        collection = get_vector_store()
        if collection.count() == 0:
            return []
        results = collection.query(query_texts=[query], n_results=min(top_k, collection.count()))
        return results["documents"][0] if results["documents"] else []
    except Exception as e:
        print(f"❌ Error during similarity search: {e}")
        return []


if __name__ == "__main__":
    # Sanity check test
    print(f"ChromaDB persistent storage located at: {DB_DIR}")
    get_vector_store()
    print("Vector store ready.")
