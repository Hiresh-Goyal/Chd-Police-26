"""Entity graph API derived from resolved entities and evidence-backed links."""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from backend.db.connection import get_connection
from backend.services.case_views import build_entity_views
from backend.shared.schema import cases_table, entity_links_table

router = APIRouter(prefix="/cases", tags=["Graph"])


class GraphNode(BaseModel):
    id: str
    type: str
    canonical_value: str
    label: Optional[str] = None
    role: Optional[str] = None
    domain: Optional[str] = None
    risk_score: int = 0
    risk_level: str = "LOW"
    confidence_tier: str
    fraud_score_contribution: float
    details: Dict[str, str] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    link_type: str
    confidence: float
    confidence_tier: str
    evidence_event_ids: List[str] = Field(default_factory=list)


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


def _json_list(value: Any) -> list:
    if isinstance(value, list): return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


@router.get("/{case_id}/graph", response_model=GraphResponse)
async def get_case_graph(case_id: str):
    """Return every resolved entity and every evidence-backed relationship."""
    with get_connection() as conn:
        exists = conn.execute(select(cases_table.c.id).where(cases_table.c.id == case_id)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        entity_views = {item["id"]: item for item in build_entity_views(conn, case_id)}
        link_rows = conn.execute(
            select(entity_links_table).where(entity_links_table.c.case_id == case_id)
        ).fetchall()

        nodes = []
        for item in entity_views.values():
            nodes.append({
                "id": item["id"],
                "type": "IMEI" if item["type"] == "DEVICE" else item["type"],
                "canonical_value": item["identifier"],
                "label": item["name"],
                "role": item["role"],
                "domain": item["domain"],
                "risk_score": item["risk_score"],
                "risk_level": item["risk_level"],
                "confidence_tier": item["confidence_tier"],
                "fraud_score_contribution": float(item["risk_score"]),
                "details": item["details"],
            })

        edges = [{
            "id": row.id,
            "source": row.entity_a,
            "target": row.entity_b,
            "link_type": row.link_type,
            "confidence": float(row.confidence),
            "confidence_tier": row.confidence_tier,
            "evidence_event_ids": _json_list(row.evidence_event_ids),
        } for row in link_rows]

        return {"nodes": nodes, "edges": edges}
