"""
backend/routers/graph.py

Entity Graph endpoint returning nodes and edges with confidence tiers and fraud score contributions.
"""

import json
from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/cases", tags=["Graph"])


class GraphNode(BaseModel):
    id: str
    type: str
    canonical_value: str
    confidence_tier: str
    fraud_score_contribution: float


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    link_type: str
    confidence: float
    confidence_tier: str
    evidence_event_ids: List[str]


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# Mock Graph for fallback / standalone testing
_MOCK_GRAPH: Dict[str, list] = {
    "nodes": [
        {
            "id": "ent-coord-01",
            "type": "PHONE",
            "canonical_value": "9876543210",
            "confidence_tier": "CONFIRMED",
            "fraud_score_contribution": 45.0,
        },
        {
            "id": "ent-dev-01",
            "type": "DEVICE",
            "canonical_value": "IMEI-354987019283746",
            "confidence_tier": "CONFIRMED",
            "fraud_score_contribution": 20.0,
        },
        {
            "id": "ent-vic-01",
            "type": "ACCOUNT",
            "canonical_value": "ACC-992011234",
            "confidence_tier": "CONFIRMED",
            "fraud_score_contribution": 0.0,
        },
        {
            "id": "ent-mule-01",
            "type": "ACCOUNT",
            "canonical_value": "ACC-554109876",
            "confidence_tier": "CONFIRMED",
            "fraud_score_contribution": 30.0,
        },
        {
            "id": "ent-mule-02",
            "type": "PHONE",
            "canonical_value": "9812345678",
            "confidence_tier": "PROBABLE",
            "fraud_score_contribution": 18.0,
        },
        {
            "id": "ent-agg-01",
            "type": "ACCOUNT",
            "canonical_value": "ACC-778899001",
            "confidence_tier": "PROBABLE",
            "fraud_score_contribution": 25.0,
        },
    ],
    "edges": [
        {
            "id": "edge-01",
            "source": "ent-coord-01",
            "target": "ent-dev-01",
            "link_type": "DEVICE_USAGE",
            "confidence": 0.95,
            "confidence_tier": "CONFIRMED",
            "evidence_event_ids": ["evt-001", "evt-002"],
        },
        {
            "id": "edge-02",
            "source": "ent-vic-01",
            "target": "ent-mule-01",
            "link_type": "BANK_TRANSFER",
            "confidence": 0.95,
            "confidence_tier": "CONFIRMED",
            "evidence_event_ids": ["evt-003"],
        },
        {
            "id": "edge-03",
            "source": "ent-coord-01",
            "target": "ent-mule-02",
            "link_type": "CALL_INTERACTION",
            "confidence": 0.70,
            "confidence_tier": "PROBABLE",
            "evidence_event_ids": ["evt-001"],
        },
        {
            "id": "edge-04",
            "source": "ent-mule-01",
            "target": "ent-agg-01",
            "link_type": "FUND_AGGREGATION",
            "confidence": 0.75,
            "confidence_tier": "PROBABLE",
            "evidence_event_ids": ["evt-005"],
        },
    ],
}


@router.get("/{case_id}/graph", response_model=GraphResponse)
async def get_case_graph(case_id: str):
    """Retrieve entity graph for case with confidence-colored edge attributes."""
    try:
        from sqlalchemy import select
        from backend.db.connection import get_connection
        from backend.shared.schema import (
            entities_table,
            entity_links_table,
            findings_table,
        )

        with get_connection() as conn:
            ent_rows = conn.execute(
                select(entities_table).where(entities_table.c.case_id == case_id)
            ).fetchall()

            link_rows = conn.execute(
                select(entity_links_table).where(entity_links_table.c.case_id == case_id)
            ).fetchall()

            finding_rows = conn.execute(
                select(findings_table).where(findings_table.c.case_id == case_id)
            ).fetchall()

            if ent_rows:
                # Compute fraud score contribution per entity
                contributions: Dict[str, float] = {}
                for f in finding_rows:
                    ent_ids = f.entity_ids
                    if isinstance(ent_ids, str):
                        try:
                            ent_ids = json.loads(ent_ids)
                        except Exception:
                            ent_ids = []
                    score_val = (f.fraud_weight or 20) * (f.confidence or 1.0)
                    for eid in ent_ids:
                        contributions[eid] = contributions.get(eid, 0.0) + score_val

                # Map confidence tiers from links
                ent_tier: Dict[str, str] = {}
                for l in link_rows:
                    tier = l.confidence_tier
                    ent_tier[l.entity_a] = tier
                    ent_tier[l.entity_b] = tier

                nodes = []
                for row in ent_rows:
                    nodes.append({
                        "id": row.id,
                        "type": row.entity_type,
                        "canonical_value": row.canonical_id,
                        "confidence_tier": ent_tier.get(row.id, "CONFIRMED"),
                        "fraud_score_contribution": round(contributions.get(row.id, 0.0), 2),
                    })

                edges = []
                for l in link_rows:
                    ev_ids = l.evidence_event_ids
                    if isinstance(ev_ids, str):
                        try:
                            ev_ids = json.loads(ev_ids)
                        except Exception:
                            ev_ids = []
                    edges.append({
                        "id": l.id,
                        "source": l.entity_a,
                        "target": l.entity_b,
                        "link_type": l.link_type,
                        "confidence": l.confidence,
                        "confidence_tier": l.confidence_tier,
                        "evidence_event_ids": ev_ids,
                    })

                return {"nodes": nodes, "edges": edges}
    except Exception as e:
        print(f"Graph query failed or database not ready: {e}")

    return _MOCK_GRAPH
