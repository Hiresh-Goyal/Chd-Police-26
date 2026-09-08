"""Geospatial evidence API with only evidence-backed coordinates."""

import json
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from backend.db.connection import get_connection
from backend.shared.schema import canonical_events_table, cases_table
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
    domain: Optional[str] = None
    time_display: Optional[str] = None
    address: Optional[str] = None
    radius_km: Optional[float] = None
    details: Optional[str] = None
    source_file_id: Optional[str] = None
    source_row: Optional[int] = None


class GeospatialResponse(BaseModel):
    events: List[GeospatialEvent] = Field(default_factory=list)


def _payload(value: Any) -> dict:
    if isinstance(value, dict): return value
    try:
        parsed = json.loads(value or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _fields(payload: dict) -> dict:
    value = payload.get("source_fields", {})
    return {str(k).lower(): v for k, v in value.items()} if isinstance(value, dict) else {}


def _source_for_event(event_type: str) -> str:
    return {
        "CALL": "CDR", "SMS": "CDR", "LOCATION_PING": "CDR",
        "BANK_TRANSFER": "BANK", "IPDR_SESSION": "IPDR",
        "SOCIAL_POST": "SOCIAL", "SOCIAL_INTERACTION": "SOCIAL",
    }.get(event_type, "OTHER")


def _coord_from_payload(fields: dict):
    lat = fields.get("lat") or fields.get("latitude")
    lng = fields.get("lng") or fields.get("lon") or fields.get("longitude")
    if lat not in (None, "") and lng not in (None, ""):
        try:
            return {"lat": float(lat), "lng": float(lng), "location_name": f"Coordinates ({float(lat):.4f}, {float(lng):.4f})"}
        except (TypeError, ValueError):
            pass
    return None


@router.get("/{case_id}/geospatial", response_model=GeospatialResponse)
async def get_geospatial(case_id: str):
    with get_connection() as conn:
        if not conn.execute(select(cases_table.c.id).where(cases_table.c.id == case_id)).fetchone():
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        rows = conn.execute(
            select(canonical_events_table).where(
                canonical_events_table.c.case_id == case_id,
                canonical_events_table.c.location_raw.is_not(None),
            ).order_by(canonical_events_table.c.ts_start.asc())
        ).fetchall()
        result = []
        for row in rows:
            payload = _payload(row.payload)
            fields = _fields(payload)
            coords = _coord_from_payload(fields) or lookup_tower(row.location_raw)
            if not coords:
                continue
            location_name = str(fields.get("location_name") or fields.get("address") or coords["location_name"])
            details = fields.get("details") or fields.get("description") or None
            radius = fields.get("radius_km") or fields.get("radius")
            try:
                radius = float(radius) if radius not in (None, "") else None
            except (TypeError, ValueError):
                radius = None
            result.append({
                "id": row.id,
                "event_type": str(row.event_type),
                "ts_start": row.ts_start,
                "actor_raw": row.actor_raw,
                "peer_raw": row.peer_raw,
                "location_raw": row.location_raw,
                "lat": float(coords["lat"]),
                "lng": float(coords["lng"]),
                "location_name": location_name,
                "domain": _source_for_event(str(row.event_type)),
                "time_display": row.ts_start,
                "address": fields.get("address") or location_name,
                "radius_km": radius,
                "details": details,
                "source_file_id": row.source_file_id,
                "source_row": row.source_row,
            })
        return {"events": result}
