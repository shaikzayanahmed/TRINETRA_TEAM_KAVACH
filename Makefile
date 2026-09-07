# TRINETRA — Makefile
# Development workflow commands

.PHONY: up down build migrate seed test logs clean

# Start all services
up:
	docker compose up -d --build

# Stop all services
down:
	docker compose down

# Build without starting
build:
	docker compose build

# Run database migrations
migrate:
	docker exec trinetra-backend alembic upgrade head

# Seed the database
seed:
	docker exec trinetra-backend python ../scripts/seed.py

# Run backend tests
test:
	docker exec trinetra-backend pytest tests/ -v

# View logs
logs:
	docker compose logs -f

# View specific service logs
logs-backend:
	docker compose logs -f backend

logs-edge:
	docker compose logs -f edge-engine

logs-frontend:
	docker compose logs -f frontend

# Clean everything (including volumes)
clean:
	docker compose down -v --remove-orphans

# Copy .env from example
init:
	cp .env.example .env
	@echo "✓ Created .env from .env.example"
	@echo "  Edit .env if you need to customize settings"

# Quick start (one command)
start: init up
	@echo ""
	@echo "═══════════════════════════════════════"
	@echo "  TRINETRA is starting..."
	@echo "═══════════════════════════════════════"
	@echo ""
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:8000"
	@echo "  API Docs:  http://localhost:8000/docs"
	@echo "  MinIO:     http://localhost:9001"
	@echo ""
	@echo "  Default credentials (DEV ONLY):"
	@echo "    admin    / admin123"
	@echo "    operator / operator123"
	@echo "    viewer   / viewer123"
	@echo ""
