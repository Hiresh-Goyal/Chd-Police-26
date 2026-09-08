"""Canonical event timeline API."""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, select

from backend.db.connection import get_connection
from backend.shared.schema import canonical_events_table, cases_table, entity_links_table, findings_table, raw_files_table

router = APIRouter(prefix="/cases", tags=["Timeline"])


class CanonicalEventResponse(BaseModel):
    id: str
    event_type: str
    ts_start: str
    ts_end: Optional[str] = None
    actor_entity_id: Optional[str] = ""
    actor_raw: str
    actor_confidence_tier: str
    peer_entity_id: Optional[str] = None
    peer_raw: Optional[str] = None
    amount: Optional[float] = None
    location_raw: Optional[str] = None
    source_file_id: str
    source_row: int
    domain: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    time_display: Optional[str] = None
    source: Optional[str] = None
    provenance: Optional[str] = None
    is_critical: bool = False
    metadata: Dict[str, str] = Field(default_factory=dict)


def _payload(value: Any) -> dict:
    if isinstance(value, dict): return value
    try:
        parsed = json.loads(value or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _tier(conn, case_id: str, entity_id: str | None) -> str:
    if not entity_id: return "CANDIDATE"
    rows = conn.execute(select(entity_links_table.c.confidence_tier).where(
        entity_links_table.c.case_id == case_id,
        (entity_links_table.c.entity_a == entity_id) | (entity_links_table.c.entity_b == entity_id),
    )).fetchall()
    order = {"CANDIDATE": 0, "PROBABLE": 1, "CONFIRMED": 2}
    return min((str(r.confidence_tier) for r in rows), key=lambda x: order.get(x, 0), default="CONFIRMED")


def _domain(event_type: str) -> str:
    return {"CALL":"CDR","SMS":"CDR","LOCATION_PING":"CDR","BANK_TRANSFER":"BANK","IPDR_SESSION":"IPDR","SOCIAL_POST":"SOCIAL","SOCIAL_INTERACTION":"SOCIAL"}.get(event_type, "OTHER")


def _title(event_type: str) -> str:
    return {"CALL":"Voice Call","SMS":"SMS Message","LOCATION_PING":"Location Ping","BANK_TRANSFER":"Bank Transfer","IPDR_SESSION":"IP Data Session","SOCIAL_POST":"Social Media Post","SOCIAL_INTERACTION":"Social Media Interaction"}.get(event_type, event_type)


@router.get("/{case_id}/timeline", response_model=List[CanonicalEventResponse])
async def get_timeline(
    case_id: str,
    entity_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
):
    with get_connection() as conn:
        if not conn.execute(select(cases_table.c.id).where(cases_table.c.id == case_id)).fetchone():
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        conditions = [canonical_events_table.c.case_id == case_id]
        if entity_id:
            conditions.append(
                (canonical_events_table.c.actor_entity_id == entity_id)
                | (canonical_events_table.c.peer_entity_id == entity_id)
                | (canonical_events_table.c.actor_raw == entity_id)
                | (canonical_events_table.c.peer_raw == entity_id)
            )
        if event_type:
            conditions.append(canonical_events_table.c.event_type == event_type.upper())
        if start: conditions.append(canonical_events_table.c.ts_start >= start)
        if end: conditions.append(canonical_events_table.c.ts_start <= end)

        rows = conn.execute(select(canonical_events_table).where(and_(*conditions)).order_by(canonical_events_table.c.ts_start.asc())).fetchall()
        file_rows = conn.execute(select(raw_files_table).where(raw_files_table.c.case_id == case_id)).fetchall()
        file_names = {r.id: r.filename for r in file_rows}
        critical_events = set()
        for f in conn.execute(select(findings_table).where(findings_table.c.case_id == case_id)).fetchall():
            if str(f.severity).upper() == "CRITICAL":
                ids = _payload(f.event_ids) if isinstance(f.event_ids, dict) else None
                try: ids = json.loads(f.event_ids or "[]")
                except Exception: ids = []
                critical_events.update(ids if isinstance(ids, list) else [])

        result = []
        for row in rows:
            payload = _payload(row.payload)
            fields = payload.get("source_fields", {}) if isinstance(payload.get("source_fields", {}), dict) else {}
            metadata = {str(k): str(v) for k, v in fields.items()}
            metadata.update({k: str(v) for k, v in payload.items() if k != "source_fields" and v is not None and not isinstance(v, (dict, list))})
            source = file_names.get(row.source_file_id, row.source_file_id)
            result.append({
                "id": row.id,
                "event_type": str(row.event_type),
                "ts_start": row.ts_start,
                "ts_end": row.ts_end,
                "actor_entity_id": row.actor_entity_id or "",
                "actor_raw": row.actor_raw,
                "actor_confidence_tier": _tier(conn, case_id, row.actor_entity_id),
                "peer_entity_id": row.peer_entity_id,
                "peer_raw": row.peer_raw,
                "amount": row.amount,
                "location_raw": row.location_raw,
                "source_file_id": row.source_file_id,
                "source_row": row.source_row,
                "domain": _domain(str(row.event_type)),
                "title": fields.get("title") or _title(str(row.event_type)),
                "description": fields.get("description") or fields.get("content") or None,
                "time_display": row.ts_start,
                "source": source,
                "provenance": f"{source}, row {row.source_row}",
                "is_critical": row.id in critical_events,
                "metadata": metadata,
            })
        return result
