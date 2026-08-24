# SmartMandateRetry — Deployment & Infrastructure Specification

> **Document ID:** DOC-OPS-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Multi-Container Docker Compose Topology

SmartMandateRetry runs as a set of coordinated containerized services for local development and cloud deployment:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-smartmandate_db}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    command: gunicorn -w 2 -b 0.0.0.0:5000 "app.main:create_app()"
    ports:
      - "5000:5000"
    environment:
      - APP_ENV=development
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@postgres:5432/smartmandate_db
      - REDIS_URL=redis://redis:6379/0
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID:-rzp_test_placeholder}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET:-secret_placeholder}
      - RAZORPAY_WEBHOOK_SECRET=${RAZORPAY_WEBHOOK_SECRET:-whsec_placeholder}
      - LLM_PROVIDER=${LLM_PROVIDER:-openrouter}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-placeholder}
      - OPENROUTER_MODEL=${OPENROUTER_MODEL:-google/gemini-2.0-flash-001}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  celery_worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    environment:
      - APP_ENV=development
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@postgres:5432/smartmandate_db
      - REDIS_URL=redis://redis:6379/0
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-placeholder}
      - OPENROUTER_MODEL=${OPENROUTER_MODEL:-google/gemini-2.0-flash-001}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: docker/Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## 2. Webhook Tunneling for Local Integration Testing

When testing inbound Razorpay webhooks locally, use an HTTPS tunnel (e.g. `zrok`, `cloudflared`, or standard reverse proxy) to expose `http://localhost:5000/api/v1/webhooks/razorpay` to Razorpay Test Mode.
