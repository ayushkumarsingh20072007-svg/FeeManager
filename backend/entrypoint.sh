#!/bin/sh
# =============================================================================
# Agent 40 — Backend Docker Entrypoint Script
# Waits for Postgres → runs migrations → seeds demo data → starts server
# =============================================================================
set -e

echo "============================================="
echo "  Agent 40 — Fee Management System"
echo "  Environment: ${ENVIRONMENT:-development}"
echo "============================================="

# ── 1. Wait for PostgreSQL to be ready ────────────────────────────────────────
if echo "${DATABASE_URL}" | grep -q "postgresql"; then
  echo "[*] Waiting for PostgreSQL to be available..."
  # Extract host and port from DATABASE_URL
  DB_HOST=$(echo "${DATABASE_URL}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  DB_PORT=$(echo "${DATABASE_URL}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_PORT="${DB_PORT:-5432}"

  until python -c "
import socket, sys
try:
    s = socket.create_connection(('${DB_HOST}', ${DB_PORT}), timeout=2)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    echo "   PostgreSQL not ready yet — retrying in 2s..."
    sleep 2
  done
  echo "[✓] PostgreSQL is ready at ${DB_HOST}:${DB_PORT}"
fi

# ── 2. Run database migrations ─────────────────────────────────────────────────
echo "[*] Running Alembic database migrations..."
if [ -f "alembic.ini" ]; then
  alembic upgrade head && echo "[✓] Migrations applied." || echo "[!] No pending migrations."
else
  echo "[!] No alembic.ini found — skipping migrations (SQLite / schema auto-created)."
fi

# ── 3. Seed demo data (idempotent — safe to run on every startup) ─────────────
echo "[*] Seeding demonstration data (28-student dataset)..."
python seed.py && echo "[✓] Seed data applied." || echo "[!] Seed already up-to-date."

# ── 4. Start the production server ────────────────────────────────────────────
WORKERS="${UVICORN_WORKERS:-2}"
echo "[*] Starting Gunicorn with ${WORKERS} Uvicorn worker(s) on 0.0.0.0:8000..."
exec gunicorn app.main:app \
  --workers "${WORKERS}" \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keepalive 5 \
  --log-level info \
  --access-logfile - \
  --error-logfile -
