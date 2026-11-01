#!/bin/bash
set -e
# Refresh the supplied records idempotently, including on a mounted data volume.
python scripts/seed_database.py
exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
