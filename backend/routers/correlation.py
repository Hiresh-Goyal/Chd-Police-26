"""
backend/routers/correlation.py

Correlation Matrix endpoint showing cross-source presence (CDR, BANK, IPDR, SOCIAL) per entity.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/cases", tags=["Correlation"])


class CorrelationMatrixItem(BaseModel):
    entity_id: str
    canonical_value: str
    entity_type: str
    confidence_tier: str
    sources: List[str]
    source_counts: Optional[Dict[str, int]] = {}


class CorrelationMatrixResponse(BaseModel):
    entities: List[CorrelationMatrixItem]




_EVENT_TYPE_TO_SOURCE = {
    "CALL": "CDR",
    "SMS": "CDR",
    "LOCATION_PING": "CDR",
    "BANK_TRANSFER": "BANK",
    "IPDR_SESSION": "IPDR",
    "SOCIAL_POST": "SOCIAL",
    "SOCIAL_INTERACTION": "SOCIAL",
}


@router.get("/{case_id}/correlation-matrix", response_model=CorrelationMatrixResponse)
async def get_correlation_matrix(case_id: str):
    """Retrieve cross-source evidence presence matrix for each resolved entity."""
    from sqlalchemy import select
    from backend.db.connection import get_connection
    from backend.shared.schema import (
        canonical_events_table,
        entities_table,
        entity_links_table,
    )

    with get_connection() as conn:
        ent_rows = conn.execute(
            select(entities_table).where(entities_table.c.case_id == case_id)
        ).fetchall()

        ev_rows = conn.execute(
            select(canonical_events_table).where(canonical_events_table.c.case_id == case_id)
        ).fetchall()

        link_rows = conn.execute(
            select(entity_links_table).where(entity_links_table.c.case_id == case_id)
        ).fetchall()

        if ent_rows:
            ent_tier: Dict[str, str] = {}
            for l in link_rows:
                ent_tier[l.entity_a] = l.confidence_tier
                ent_tier[l.entity_b] = l.confidence_tier

            matrix_items = []
            for ent in ent_rows:
                counts: Dict[str, int] = {}
                for ev in ev_rows:
                    is_match = (
                        ev.actor_entity_id == ent.id
                        or ev.peer_entity_id == ent.id
                        or ev.actor_raw == ent.canonical_id
                        or ev.peer_raw == ent.canonical_id
                    )
                    if is_match:
                        src = _EVENT_TYPE_TO_SOURCE.get(str(ev.event_type), "OTHER")
                        counts[src] = counts.get(src, 0) + 1

                sources_list = sorted(list(counts.keys()))
                matrix_items.append({
                    "entity_id": ent.id,
                    "canonical_value": ent.canonical_id,
                    "entity_type": ent.entity_type,
                    "confidence_tier": ent_tier.get(ent.id, "CONFIRMED"),
                    "sources": sources_list,
                    "source_counts": counts,
                })

            return {"entities": matrix_items}

    return {"entities": []}
