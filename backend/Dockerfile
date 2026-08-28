# ── Stage 1: system dependencies ──────────────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install OS-level packages needed by OpenCV and Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
        # Tesseract OCR engine + English language data
        tesseract-ocr \
        tesseract-ocr-eng \
        # OpenCV runtime libs (headless build needs these)
        libglib2.0-0 \
        libsm6 \
        libxrender1 \
        libxext6 \
        libgl1 \
        # General utilities
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Python dependencies ──────────────────────────────────────────────
WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# ── Stage 3: Application code ─────────────────────────────────────────────────
COPY . .

# Railway injects $PORT at runtime; default to 8000 for local testing
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
