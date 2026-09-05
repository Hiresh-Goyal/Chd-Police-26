"""
backend/main.py

FastAPI application entry point for DigitalSentinel.
Mounts all REST routers, configures CORS, and exposes health check endpoints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import (
    alerts,
    auth,
    cases,
    correlation,
    criminalflow,
    geospatial,
    graph,
    score,
    timeline,
)

app = FastAPI(
    title="DigitalSentinel API",
    description="Intelligence and REST API layer for DigitalSentinel forensic investigation platform.",
    version="1.0.0",
)

# CORS configuration per specification: allow localhost:3000 and localhost:5173
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers.audit import router as audit_router

# Mount all routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(score.router, prefix="/api")
app.include_router(criminalflow.router, prefix="/api")
app.include_router(geospatial.router, prefix="/api")
app.include_router(correlation.router, prefix="/api")
app.include_router(audit_router, prefix="/api")


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint for integration testing."""
    return {"status": "ok"}


@app.get("/", tags=["Root"])
async def root():
    """Root metadata endpoint."""
    return {
        "name": "DigitalSentinel API",
        "status": "running",
        "version": "1.0.0",
        "health": "/api/health",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
