FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY . .
ENV PYTHONPATH=/app
ENV PORT=8000
RUN python scripts/seed_database.py
EXPOSE 8000
ENTRYPOINT ["/bin/bash", "scripts/entrypoint.sh"]
