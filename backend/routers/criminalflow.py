"""CriminalFlow money-trail API derived from bank evidence."""

import json
from collections import defaultdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from backend.db.connection import get_connection
from backend.shared.schema import canonical_events_table, cases_table, entities_table

router = APIRouter(prefix="/cases", tags=["CriminalFlow"])


class CriminalFlowNode(BaseModel):
    id: str
    label: str
    type: str = "ACCOUNT"
    role: str
    account_number: Optional[str] = None
    total_inflow: float = 0.0
    total_outflow: float = 0.0
    owner: Optional[str] = None
    status: Optional[str] = None
    retained_balance: Optional[float] = None
    freeze_priority: Optional[str] = None
    ip_address: Optional[str] = None
    source_provenance: Optional[str] = None
    details: Dict[str, str] = Field(default_factory=dict)


class CriminalFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    timestamp: Optional[str] = None
    event_id: Optional[str] = None
    method: Optional[str] = None
    source_file_id: Optional[str] = None
    source_row: Optional[int] = None


class CriminalFlowResponse(BaseModel):
    nodes: List[CriminalFlowNode]
    edges: List[CriminalFlowEdge]


def _payload(row: Any) -> dict:
    if isinstance(row.payload, dict): return row.payload
    try:
        parsed = json.loads(row.payload or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _source_fields(payload: dict) -> dict:
    fields = payload.get("source_fields", {})
    return fields if isinstance(fields, dict) else {}


def _value(fields: dict, *names: str) -> Optional[str]:
    lowered = {str(k).lower(): v for k, v in fields.items()}
    for name in names:
        value = lowered.get(name.lower())
        if value not in (None, "", "null", "None"):
            return str(value)
    return None


@router.get("/{case_id}/criminalflow", response_model=CriminalFlowResponse)
async def get_criminal_flow(case_id: str):
    """Return directed bank transfers, including ATM/cash-out metadata when present."""
    with get_connection() as conn:
        if not conn.execute(select(cases_table.c.id).where(cases_table.c.id == case_id)).fetchone():
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        rows = conn.execute(
            select(canonical_events_table).where(
                canonical_events_table.c.case_id == case_id,
                canonical_events_table.c.event_type == "BANK_TRANSFER",
            ).order_by(canonical_events_table.c.ts_start.asc())
        ).fetchall()
        if not rows:
            return {"nodes": [], "edges": []}

        inflows: Dict[str, float] = defaultdict(float)
        outflows: Dict[str, float] = defaultdict(float)
        edges: List[dict] = []
        node_meta: Dict[str, dict] = defaultdict(dict)

        for row in rows:
            payload = _payload(row)
            fields = _source_fields(payload)
            txn_type = str(payload.get("txn_type") or _value(fields, "txn_type", "transaction_type", "type") or "TRANSFER").upper()
            src = row.actor_raw or "UNKNOWN_SRC"
            dst = row.peer_raw or _value(fields, "atm_id", "terminal_id", "beneficiary", "peer_account") or "UNKNOWN_DST"
            if txn_type in {"ATM_WITHDRAWAL", "CASH_WITHDRAWAL", "ATM", "CASHOUT", "CASH_OUT"} and not row.peer_raw:
                dst = _value(fields, "atm_id", "terminal_id", "atm", "cashout_id") or dst
            amt = float(row.amount or 0.0)
            outflows[src] += amt
            inflows[dst] += amt
            method = txn_type.replace("_", " ")
            edges.append({
                "id": f"flow-{row.id}",
                "source": src,
                "target": dst,
                "amount": amt,
                "timestamp": row.ts_start,
                "event_id": row.id,
                "method": method,
                "source_file_id": row.source_file_id,
                "source_row": row.source_row,
            })
            node_meta[src].update({
                "owner": _value(fields, "sender_name", "account_holder", "owner"),
                "ip_address": _value(fields, "src_ip", "ip_address", "ip"),
            })
            node_meta[dst].update({
                "owner": _value(fields, "beneficiary_name", "receiver_name", "account_holder", "owner"),
                "ip_address": _value(fields, "dst_ip", "ip_address", "ip"),
                "status": "Cash withdrawal" if "CASH" in txn_type or "ATM" in txn_type else None,
                "freeze_priority": "P1" if inflows[dst] > 0 and outflows[dst] > 0 else None,
                "source_provenance": f"{row.source_file_id} row {row.source_row}",
            })

        all_nodes = set(inflows) | set(outflows)
        nodes = []
        for identifier in sorted(all_nodes):
            incoming = inflows.get(identifier, 0.0)
            outgoing = outflows.get(identifier, 0.0)
            meta = node_meta.get(identifier, {})
            if meta.get("status") == "Cash withdrawal" or identifier.upper().startswith("ATM"):
                role, node_type = "TERMINAL_ATM", "ATM"
            elif incoming > 0 and outgoing > 0:
                role, node_type = "MULE", "ACCOUNT"
            elif outgoing > 0 and incoming == 0:
                role, node_type = "VICTIM", "ACCOUNT"
            elif incoming > 0:
                role, node_type = "AGGREGATOR", "ACCOUNT"
            else:
                role, node_type = "UNKNOWN", "ACCOUNT"
            nodes.append({
                "id": identifier,
                "label": identifier,
                "type": node_type,
                "role": role,
                "account_number": identifier,
                "total_inflow": round(incoming, 2),
                "total_outflow": round(outgoing, 2),
                "owner": meta.get("owner"),
                "status": meta.get("status"),
                "freeze_priority": meta.get("freeze_priority"),
                "ip_address": meta.get("ip_address"),
                "source_provenance": meta.get("source_provenance"),
            })
        return {"nodes": nodes, "edges": edges}
