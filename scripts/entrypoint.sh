#!/bin/bash
set -e

echo "🚀 DriveLegal Boot Sequence..."

# Database and Chroma index are pre-built during Docker image build.
# Only re-seed if somehow missing (e.g. persistent disk was wiped).
if [ ! -f "/app/data/drivelegal.db" ]; then
    echo "📊 Database not found. Re-seeding..."
    python scripts/seed_database.py
else
    echo "✅ SQLite database detected."
fi

if [ ! -d "/app/data/chroma_db" ]; then
    echo "🧠 Vector index not found. Re-building..."
    python scripts/build_embeddings.py
else
    echo "✅ ChromaDB vector index detected."
fi

echo "🛰️ Starting FastAPI Server..."
exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
