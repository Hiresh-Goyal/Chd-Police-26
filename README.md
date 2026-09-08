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

## Backend/frontend data contract

The API is the source of truth for all application data shown by the React investigation UI. The only frontend-only data surfaces intentionally excluded from this contract are Universal Search and Sentinel Watch.

Case detail responses include the core case metadata plus derived workspace data: resolved entities, risk levels, evidence inventory, activity statistics, findings/alerts, assigned-investigator profile fields, incident date, estimated loss, and fraud score summary.

Case analysis endpoints:

- `GET /api/cases/{case_id}` — complete case/workspace view
- `GET /api/cases/{case_id}/evidence` — evidence inventory, SHA-256, size, record count and ingestion status
- `GET /api/cases/{case_id}/timeline` — canonical events plus source/provenance/metadata
- `GET /api/cases/{case_id}/graph` — resolved entity nodes and evidence-backed links
- `GET /api/cases/{case_id}/alerts` — complete findings
- `GET /api/cases/{case_id}/alerts/{finding_id}` — finding + linked canonical events
- `GET /api/cases/{case_id}/fraudscore` — score plus fully expanded top finding details; IDs remain the persisted storage representation
- `GET /api/cases/{case_id}/criminalflow` — bank transfer graph with transaction provenance
- `GET /api/cases/{case_id}/geospatial` — evidence-backed coordinates only
- `GET /api/cases/{case_id}/correlation-matrix` — cross-source entity presence
- `GET /api/cases/{case_id}/report` — consolidated backend report snapshot
- `GET /api/cases/{case_id}/notes` / `POST /api/cases/{case_id}/notes` — investigator notes
- `GET /api/admin/users` — backend-owned personnel directory
- `GET /api/dashboard/overview` — operational dashboard summary
- `GET /api/audit/logs` — enriched audit records for the UI

Analysis is rebuilt deterministically on each run: resolution output, episodes, findings and the fraud score are replaced as one transaction. Re-running analysis therefore does not accumulate stale derived rows.

Unknown geospatial identifiers are not assigned synthetic coordinates. A location is mapped only when it is explicitly provided as coordinates or exists in the configured tower lookup.
