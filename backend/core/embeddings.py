import os
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# 1. Dynamically calculate directories relative to this file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DB_DIR = os.path.join(BASE_DIR, "data", "chroma_db")
COLLECTION_NAME = "traffic_laws"

print("⏳ Loading local embedding model (all-MiniLM-L6-v2)...")
# Initialize the model specified in requirements
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
print("✅ Local embedding model loaded successfully.")

# 2. Initialize persistent ChromaDB Client
vector_store = Chroma(
    persist_directory=DB_DIR,
    embedding_function=embedding_model,
    collection_name=COLLECTION_NAME
)

def similarity_search(query: str, top_k: int = 5):
    """
    Helper function for Adithya to call inside the /api/chat endpoint.
    Returns a list of matching context documents.
    """
    try:
        results = vector_store.similarity_search(query, k=top_k)
        # Returns raw text string snippets from the best matching chunks
        return [doc.page_content for doc in results]
    except Exception as e:
        print(f"❌ Error during similarity search: {e}")
        return []

if __name__ == "__main__":
    # Sanity check test
    print(f"ChromaDB persistent storage located at: {DB_DIR}")