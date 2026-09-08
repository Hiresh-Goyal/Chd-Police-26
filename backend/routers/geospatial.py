"""Geospatial evidence API with evidence-backed location resolution."""

import json
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from backend.db.connection import get_connection
from backend.shared.schema import canonical_events_table, cases_table
from backend.tower_lookup import lookup_bank_location, lookup_ip, lookup_tower

router = APIRouter(prefix="/cases", tags=["Geospatial"])


class GeospatialEvent(BaseModel):
    id: str
    event_type: str
    ts_start: str
    actor_raw: str
    peer_raw: Optional[str] = None
    location_raw: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_name: Optional[str] = None
    domain: Optional[str] = None
    time_display: Optional[str] = None
    address: Optional[str] = None
    radius_km: Optional[float] = None
    details: Optional[str] = None
    source_file_id: Optional[str] = None
    source_row: Optional[int] = None
    location_status: str = "UNRESOLVED"
    resolution_source: Optional[str] = None


class GeospatialResponse(BaseModel):
    events: List[GeospatialEvent] = Field(default_factory=list)


def _payload(value: Any) -> dict:
    if isinstance(value, dict):
        return value
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
        "BANK_TRANSFER": "BANK", "BANK_CASHOUT": "BANK",
        "CASHOUT": "BANK", "ATM_WITHDRAWAL": "BANK",
        "IPDR_SESSION": "IPDR",
        "SOCIAL_POST": "SOCIAL", "SOCIAL_INTERACTION": "SOCIAL",
    }.get(event_type, "OTHER")


def _coord_from_payload(fields: dict):
    lat = fields.get("lat") or fields.get("latitude")
    lng = fields.get("lng") or fields.get("lon") or fields.get("longitude")
    if lat not in (None, "") and lng not in (None, ""):
        try:
            lat_f = float(lat)
            lng_f = float(lng)
            return {
                "lat": lat_f,
                "lng": lng_f,
                "location_name": f"Coordinates ({lat_f:.4f}, {lng_f:.4f})",
                "address": fields.get("address"),
                "resolution_source": "event_data",
            }
        except (TypeError, ValueError):
            pass
    return None


def _resolve_event(event_type: str, location_raw: Optional[str], payload: dict, fields: dict):
    # Explicit coordinates contained in the evidence take precedence.
    coords = _coord_from_payload(fields)
    if coords:
        return coords

    # CDR/tower identifiers are resolved only from the replaceable tower dataset.
    coords = lookup_tower(location_raw)
    if coords:
        return coords

    event_type = event_type.upper()

    if event_type == "IPDR_SESSION":
        return lookup_ip(payload.get("src_ip")) or lookup_ip(payload.get("dst_ip"))

    if event_type in {"BANK_TRANSFER", "BANK_CASHOUT", "CASHOUT", "ATM_WITHDRAWAL"}:
        candidates = [
            location_raw,
            fields.get("location_id"),
            fields.get("branch_id"),
            fields.get("atm_id"),
            fields.get("location"),
            fields.get("branch"),
            fields.get("atm"),
        ]
        for candidate in candidates:
            coords = lookup_bank_location(candidate)
            if coords:
                return coords

    return None


@router.get("/{case_id}/geospatial", response_model=GeospatialResponse)
async def get_geospatial(case_id: str):
    with get_connection() as conn:
        if not conn.execute(select(cases_table.c.id).where(cases_table.c.id == case_id)).fetchone():
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        rows = conn.execute(
            select(canonical_events_table)
            .where(canonical_events_table.c.case_id == case_id)
            .order_by(canonical_events_table.c.ts_start.asc())
        ).fetchall()

    result = []
    for row in rows:
        payload = _payload(row.payload)
        fields = _fields(payload)
        event_type = str(row.event_type)

        has_candidate = bool(row.location_raw)
        if event_type.upper() == "IPDR_SESSION":
            has_candidate = bool(payload.get("src_ip") or payload.get("dst_ip"))
        elif event_type.upper() in {"BANK_TRANSFER", "BANK_CASHOUT", "CASHOUT", "ATM_WITHDRAWAL"}:
            has_candidate = has_candidate or any(
                fields.get(k) for k in (
                    "location_id", "branch_id", "atm_id", "location", "branch", "atm",
                    "lat", "latitude", "lng", "lon", "longitude",
                )
            )
        else:
            has_candidate = has_candidate or any(
                fields.get(k) for k in ("lat", "latitude", "lng", "lon", "longitude")
            )

        if not has_candidate:
            continue

        coords = _resolve_event(event_type, row.location_raw, payload, fields)
        location_name = str(
            fields.get("location_name")
            or fields.get("address")
            or (coords.get("location_name") if coords else None)
            or row.location_raw
            or "Unresolved location"
        )

        details = fields.get("details") or fields.get("description") or None
        radius = fields.get("radius_km") or fields.get("radius")
        try:
            radius = float(radius) if radius not in (None, "") else None
        except (TypeError, ValueError):
            radius = None

        result.append({
            "id": row.id,
            "event_type": event_type,
            "ts_start": row.ts_start,
            "actor_raw": row.actor_raw,
            "peer_raw": row.peer_raw,
            "location_raw": row.location_raw,
            "lat": float(coords["lat"]) if coords else None,
            "lng": float(coords["lng"]) if coords else None,
            "location_name": location_name,
            "domain": _source_for_event(event_type),
            "time_display": row.ts_start,
            "address": fields.get("address") or (coords.get("address") if coords else None) or location_name,
            "radius_km": radius,
            "details": details,
            "source_file_id": row.source_file_id,
            "source_row": row.source_row,
            "location_status": "RESOLVED" if coords else "UNRESOLVED",
            "resolution_source": coords.get("resolution_source") if coords else None,
        })

    return {"events": result}
