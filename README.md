# DigitalSentinel

Investigative analytics platform for cyber-fraud investigation. Built for Chandigarh Police — SIH Hackathon 2026.

## What it does
- Ingests CDR, IPDR, bank transaction, and social media data
- Resolves entities across sources (phone/IMEI/account matching)
- Detects 8 fraud patterns with fully explainable, evidence-backed findings
- Generates FraudScore (0–100) with drill-down to original CSV rows
- Visualizes entity graph, timeline, money flow, and geospatial data

## Architecture
Raw CSV/PDF → Ingestion → Canonical Events → Entity Resolution →
Episode Builder → Detection Engine → FraudScore → FastAPI → React UI

## Stack
Backend: Python 3.11 · FastAPI · PostgreSQL · Polars · networkx · NumPy
Frontend: React 18 · TypeScript · Tailwind · Cytoscape.js · Leaflet

## Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 16 running locally
- Node.js 18+

### Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
createdb digital_sentinel
python -m backend.db.init_db
uvicorn main:app --reload --port 8000

### Frontend
cd frontend
npm install
npm run dev

## Demo
python verify_pipeline.py
Open: http://localhost:5173
Login: admin / sentinel_admin  or  investigator / sentinel_inv

## Team
Member 1 — DB Schema & Ingestion (feature/db-schema-ingestion)
Member 2 — Entity Resolution (feature/entity-resolution)
Member 3 — Detection Engine & FraudScore (feature/detection-engine)
Member 4 — FastAPI Layer (feature/api-layer)
Member 5 — Frontend Integration (feature/frontend-hooks)
Hiresh Goyal — Integration Lead
