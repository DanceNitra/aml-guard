FROM python:3.11-slim

WORKDIR /app

# System dependencies for reportlab, weasyprint
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 8222

# Default environment variables
ENV APP_NAME="AML Guard API"
ENV APP_VERSION="1.0.0"
ENV DEBUG=false
ENV DATABASE_URL="sqlite+aiosqlite:///./data/aml_guard.db"
ENV CORS_ORIGINS="http://localhost:8000,https://dancenitra.github.io"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8222/api/health')" || exit 1

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8222"]
