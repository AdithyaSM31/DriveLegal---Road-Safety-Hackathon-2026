FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for some Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the entire project
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000
ENV CHROMA_TELEMETRY=FALSE

# ── PRE-BUILD STEP: Run at Docker BUILD time (not container startup) ──────────
# This avoids hitting Render's 512MB free-tier RAM limit at runtime.
# Heavy ops (ONNX model download, Chroma indexing) happen once during image build.

# Step 1: Seed the SQLite database with all traffic law data
RUN python scripts/seed_database.py

# Step 2: Pre-download the Chroma ONNX embedding model into the image cache
# so it doesn't download at container startup (saves ~80MB network + RAM spike)
RUN python -c "\
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction; \
print('Pre-warming Chroma embedding model...'); \
fn = DefaultEmbeddingFunction(); \
fn(['warm up']); \
print('ONNX model cached.')"

# Step 3: Build ChromaDB vector index from legal documents
RUN python scripts/build_embeddings.py

# Make scripts executable
RUN chmod +x scripts/entrypoint.sh

# Expose the application port
EXPOSE 8000

# Minimal entrypoint — data already exists, just start the server
ENTRYPOINT ["/bin/bash", "scripts/entrypoint.sh"]
