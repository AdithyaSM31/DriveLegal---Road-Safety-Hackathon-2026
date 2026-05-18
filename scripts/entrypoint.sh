#!/bin/bash
set -e

echo "🚀 DriveLegal Boot Sequence..."

# 1. Initialize Database if not exists
if [ ! -f "/app/data/drivelegal.db" ]; then
    echo "📊 Database not found. Seeding initial traffic law data..."
    python scripts/seed_database.py
else
    echo "✅ SQLite database detected."
fi

# 2. Build Embeddings if Chroma collection is empty
# We check for the directory. In a real app, we might check collection count.
if [ ! -d "/app/data/chroma_db" ]; then
    echo "🧠 Vector index not found. Building legal knowledge embeddings (RAG)..."
    python scripts/build_embeddings.py
else
    echo "✅ ChromaDB vector index detected."
fi

echo "🛰️ Starting FastAPI Server..."
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
