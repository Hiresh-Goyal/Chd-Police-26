"""
backend/routers/timeline.py

Timeline endpoint for retrieving chronological canonical events with entity confidence tiers.
"""

from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/cases", tags=["Timeline"])


class CanonicalEventResponse(BaseModel):
    id: str
    event_type: str
    ts_start: str
    ts_end: Optional[str] = None
    actor_entity_id: Optional[str] = ""
    actor_raw: str
    actor_confidence_tier: str
    peer_raw: Optional[str] = None
    amount: Optional[float] = None
    location_raw: Optional[str] = None
    source_file_id: str
    source_row: int





@router.get("/{case_id}/timeline", response_model=List[CanonicalEventResponse])
async def get_timeline(
    case_id: str,
    entity_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
):
    """Retrieve canonical events sorted chronologically by ts_start with optional filtering."""
    if not isinstance(entity_id, str):
        entity_id = None
    if not isinstance(event_type, str):
        event_type = None
    if not isinstance(start, str):
        start = None
    if not isinstance(end, str):
        end = None

    from sqlalchemy import and_, select
    from backend.db.connection import get_connection
    from backend.shared.schema import canonical_events_table, entity_links_table

    with get_connection() as conn:
        # Build filters
        conditions = [canonical_events_table.c.case_id == case_id]
        if entity_id:
            conditions.append(
                (canonical_events_table.c.actor_entity_id == entity_id)
                | (canonical_events_table.c.peer_entity_id == entity_id)
                | (canonical_events_table.c.actor_raw == entity_id)
            )
        if event_type:
            conditions.append(canonical_events_table.c.event_type == event_type.upper())
        if start:
            conditions.append(canonical_events_table.c.ts_start >= start)
        if end:
            conditions.append(canonical_events_table.c.ts_start <= end)

        stmt = (
            select(canonical_events_table)
            .where(and_(*conditions))
            .order_by(canonical_events_table.c.ts_start.asc())
        )
        rows = conn.execute(stmt).fetchall()

        if not rows:
            return []

        # Query entity confidence tiers from entity_links if present
        link_rows = conn.execute(
            select(
                entity_links_table.c.entity_a,
                entity_links_table.c.confidence_tier,
            ).where(entity_links_table.c.case_id == case_id)
        ).fetchall()
        tier_lookup = {r[0]: r[1] for r in link_rows}

        result = []
        for row in rows:
            actor_ent = row.actor_entity_id or ""
            tier = tier_lookup.get(actor_ent, "CONFIRMED")
            result.append({
                "id": row.id,
                "event_type": str(row.event_type),
                "ts_start": row.ts_start,
                "ts_end": row.ts_end,
                "actor_entity_id": actor_ent,
                "actor_raw": row.actor_raw,
                "actor_confidence_tier": tier,
                "peer_raw": row.peer_raw,
                "amount": row.amount,
                "location_raw": row.location_raw,
                "source_file_id": row.source_file_id,
                "source_row": row.source_row,
            })
        return result
