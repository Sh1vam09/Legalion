FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer-cached)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
COPY . .

# Render injects $PORT at runtime — default to 10000
ENV PORT=10000

EXPOSE $PORT

# Start the FastAPI server
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
