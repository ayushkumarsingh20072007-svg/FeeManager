# =============================================================================
# Agent 40 — Makefile
# One-command shortcuts for Docker Compose operations
# Usage: make <target>
# =============================================================================

.PHONY: up down restart logs build clean test seed shell-backend shell-db status

# ── Build & Start ─────────────────────────────────────────────────────────────
up:
	@echo "🚀 Building and starting Agent 40 (all services)..."
	docker compose up --build -d
	@echo ""
	@echo "✅ Agent 40 is running!"
	@echo "   Frontend  → http://localhost:80"
	@echo "   API Docs  → http://localhost:80/docs"
	@echo "   Health    → http://localhost:80/health"
	@echo ""
	@echo "Run 'make logs' to watch live logs."

# ── Start without rebuilding ──────────────────────────────────────────────────
start:
	@echo "▶️  Starting Agent 40 (no rebuild)..."
	docker compose up -d

# ── Stop all services ─────────────────────────────────────────────────────────
down:
	@echo "🛑 Stopping Agent 40..."
	docker compose down

# ── Restart all services ──────────────────────────────────────────────────────
restart:
	@echo "🔄 Restarting Agent 40..."
	docker compose down
	docker compose up --build -d

# ── Follow live logs (all services) ──────────────────────────────────────────
logs:
	docker compose logs -f

# ── Follow backend logs only ──────────────────────────────────────────────────
logs-backend:
	docker compose logs -f backend

# ── Follow frontend logs only ─────────────────────────────────────────────────
logs-frontend:
	docker compose logs -f frontend

# ── Show container status ─────────────────────────────────────────────────────
status:
	docker compose ps

# ── Run the full test suite inside the backend container ─────────────────────
test:
	@echo "🧪 Running Agent 40 test suite (134 tests)..."
	docker compose exec backend python -m pytest tests/ -v --tb=short

# ── Manually run seed inside running backend container ───────────────────────
seed:
	@echo "🌱 Running seed data script..."
	docker compose exec backend python seed.py

# ── Open a shell inside the backend container ────────────────────────────────
shell-backend:
	docker compose exec backend /bin/sh

# ── Open a psql shell inside the database container ──────────────────────────
shell-db:
	docker compose exec postgres psql -U agent40_user -d agent40_db

# ── Build only (no start) ─────────────────────────────────────────────────────
build:
	@echo "🔨 Building Docker images..."
	docker compose build

# ── Stop and remove containers, networks, and volumes (DESTRUCTIVE) ──────────
clean:
	@echo "⚠️  WARNING: This will delete all containers AND the database volume!"
	@read -p "Type 'yes' to confirm: " CONFIRM && [ "$$CONFIRM" = "yes" ] || (echo "Aborted." && exit 1)
	docker compose down -v --remove-orphans
	docker image rm agent40_backend agent40_frontend 2>/dev/null || true
	@echo "🧹 Clean complete."

# ── Generate a strong JWT secret ─────────────────────────────────────────────
gen-secret:
	@python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_hex(48))"
