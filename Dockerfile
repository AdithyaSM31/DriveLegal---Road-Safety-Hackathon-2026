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

# Make scripts executable
RUN chmod +x scripts/entrypoint.sh

# Expose the application port
EXPOSE 8000

# Use entrypoint script to handle seeding/building and startup
ENTRYPOINT ["/bin/bash", "scripts/entrypoint.sh"]
