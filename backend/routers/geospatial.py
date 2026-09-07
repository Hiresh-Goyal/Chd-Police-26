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


# Mock Geospatial removed.

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

    return {"events": []}
