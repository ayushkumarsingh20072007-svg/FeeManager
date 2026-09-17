# =============================================================================
# Agent 40 — Backend Dockerfile (Multi-stage, Production-optimized)
# =============================================================================

# ── Stage 1: Dependency Builder ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools for compiled packages (psycopg, bcrypt, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements into /build/wheels
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM python:3.12-slim AS production

LABEL maintainer="Agent40-FeeManagement"
LABEL description="Agent 40 — AI-Powered Institutional Fee Management API"
LABEL version="0.1.0"

# Create a non-root application user for security
RUN useradd --no-create-home --shell /bin/false agent40

WORKDIR /app

# Install only runtime system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source code
COPY . .

# Copy entrypoint and ensure it is executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directory for SQLite file in case it's used (development fallback)
RUN mkdir -p /app/data && chown -R agent40:agent40 /app

# Switch to non-root user
USER agent40

# Expose FastAPI port
EXPOSE 8000

# Health check — hits the /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run entrypoint (handles migrations + seed + server start)
ENTRYPOINT ["/entrypoint.sh"]
