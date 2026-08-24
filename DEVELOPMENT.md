# SmartMandateRetry — Local Development Guide

> **Document ID:** DOC-DEV-001  
> **Status:** APPROVED BASELINE  

---

## 1. Local Setup Workflow

### 1.1 Backend Setup (Python 3.11+)
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
# Activate on Windows:
.\venv\Scripts\activate
# Activate on Unix:
source venv/bin/activate

# Install dependencies
pip install -r requirements/dev.txt

# Run test suite
pytest
```

### 1.2 Frontend Setup (Node.js 18+)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run local development server
npm run dev

# Check TypeScript types and build
npm run build
```

---

## 2. Running Full Stack via Docker Compose

```bash
# Copy template and customize if needed
cp .env.example .env

# Start all containers in development mode
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
