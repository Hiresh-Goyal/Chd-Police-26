"""
backend/routers/geospatial.py

Geospatial endpoint returning events with location_raw parsed to coordinates via tower lookup.
"""

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from backend.tower_lookup import lookup_tower

router = APIRouter(prefix="/cases", tags=["Geospatial"])


class GeospatialEvent(BaseModel):
    id: str
    event_type: str
    ts_start: str
    actor_raw: str
    peer_raw: Optional[str] = None
    location_raw: Optional[str] = None
    lat: float
    lng: float
    location_name: str


class GeospatialResponse(BaseModel):
    events: List[GeospatialEvent]


# Fallback mock geospatial events within Chandigarh area
_MOCK_GEOSPATIAL: List[dict] = [
    {
        "id": "geo-001",
        "event_type": "CALL",
        "ts_start": "2026-08-15T09:12:00Z",
        "actor_raw": "9876543210",
        "peer_raw": "9812345678",
        "location_raw": "TOW-17-01",
        "lat": 30.7398,
        "lng": 76.7827,
        "location_name": "Sector 17 City Centre, Chandigarh",
    },
    {
        "id": "geo-002",
        "event_type": "SMS",
        "ts_start": "2026-08-15T09:18:10Z",
        "actor_raw": "9876543210",
        "peer_raw": "9812345678",
        "location_raw": "TOW-17-01",
        "lat": 30.7398,
        "lng": 76.7827,
        "location_name": "Sector 17 City Centre, Chandigarh",
    },
    {
        "id": "geo-003",
        "event_type": "LOCATION_PING",
        "ts_start": "2026-08-15T09:40:00Z",
        "actor_raw": "9876543210",
        "peer_raw": None,
        "location_raw": "TOW-22-01",
        "lat": 30.7350,
        "lng": 76.7680,
        "location_name": "Sector 22 Market, Chandigarh",
    },
    {
        "id": "geo-004",
        "event_type": "IPDR_SESSION",
        "ts_start": "2026-08-15T10:10:00Z",
        "actor_raw": "9812345678",
        "peer_raw": "198.51.100.42",
        "location_raw": "TOW-35-01",
        "lat": 30.7220,
        "lng": 76.7680,
        "location_name": "Sector 35 Commercial Plaza, Chandigarh",
    },
    {
        "id": "geo-005",
        "event_type": "CALL",
        "ts_start": "2026-08-15T10:45:00Z",
        "actor_raw": "9876543210",
        "peer_raw": "9822334455",
        "location_raw": "TOW-43-01",
        "lat": 30.7180,
        "lng": 76.7530,
        "location_name": "ISBT Sector 43, Chandigarh",
    },
]


@router.get("/{case_id}/geospatial", response_model=GeospatialResponse)
async def get_geospatial(case_id: str):
    """Retrieve canonical events with location_raw translated to latitude/longitude coordinates."""
    try:
        from sqlalchemy import and_, select
        from backend.db.connection import get_connection
        from backend.shared.schema import canonical_events_table

        with get_connection() as conn:
            rows = conn.execute(
                select(canonical_events_table).where(
                    and_(
                        canonical_events_table.c.case_id == case_id,
                        canonical_events_table.c.location_raw.isnot(None),
                    )
                ).order_by(canonical_events_table.c.ts_start.asc())
            ).fetchall()

            if rows:
                geo_events = []
                for r in rows:
                    coords = lookup_tower(r.location_raw)
                    if coords:
                        geo_events.append({
                            "id": r.id,
                            "event_type": str(r.event_type),
                            "ts_start": r.ts_start,
                            "actor_raw": r.actor_raw,
                            "peer_raw": r.peer_raw,
                            "location_raw": r.location_raw,
                            "lat": coords["lat"],
                            "lng": coords["lng"],
                            "location_name": coords["location_name"],
                        })

                if geo_events:
                    return {"events": geo_events}
    except Exception as e:
        print(f"Geospatial query failed or DB uninitialized: {e}")

    return {"events": _MOCK_GEOSPATIAL}
