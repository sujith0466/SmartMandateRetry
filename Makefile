.PHONY: help install test test-backend test-frontend build up down clean audit

help:
	@echo "SmartMandateRetry — Monorepo Development Commands"
	@echo "================================================="
	@echo "make install       Install backend & frontend dependencies"
	@echo "make test          Run full test suite (backend & frontend)"
	@echo "make test-backend  Run backend pytest suite"
	@echo "make test-frontend Run frontend TypeScript and build checks"
	@echo "make up            Start full stack with Docker Compose"
	@echo "make down          Stop and clean up containers"
	@echo "make audit         Run documentation consistency audit"

install:
	cd backend && pip install -r requirements/dev.txt
	cd frontend && npm install

test: test-backend test-frontend

test-backend:
	cd backend && pytest -v

test-frontend:
	cd frontend && npm run build

up:
	docker compose up --build

down:
	docker compose down

audit:
	python scripts/audit_docs.py
