import decimal

def to_float(val) -> float:
    """Safely convert Decimal, str, int, or float to Python float."""
    if val is None:
        return 0.0
    if isinstance(val, decimal.Decimal):
        return float(val)
    return float(val)

import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

def run_coo_004(db: Session, case_id: uuid.UUID) -> List[Dict[str, Any]]:
    # A simplified version of Common Coordinator
    # Find entity that calls >= 3 distinct victims
    query = text("""
        WITH victims AS (
            SELECT DISTINCT actor_entity_id 
            FROM canonical_events 
            WHERE case_id = :case_id AND event_type = 'BANK_TRANSFER' AND payload->>'txn_type' = 'DEBIT'
        )
        SELECT ce.actor_raw as coordinator, COUNT(DISTINCT ce.peer_raw) as victim_count,
               array_agg(DISTINCT ce.peer_raw) as victims, array_agg(DISTINCT ce.id) as ev_ids
        FROM canonical_events ce
        JOIN entities e_peer ON ce.peer_entity_id = e_peer.id
        WHERE ce.case_id = :case_id AND ce.event_type = 'CALL'
          AND e_peer.id IN (SELECT actor_entity_id FROM victims)
        GROUP BY ce.actor_raw
        HAVING COUNT(DISTINCT ce.peer_raw) >= 3
    """)
    rows = db.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        f = {
            "rule_id": "COO-004",
            "severity": "HIGH",
            "fraud_weight": 25,
            "confidence": 0.85,
            "entity_ids": [], # ideally resolved coordinator entity
            "event_ids": [str(x) for x in r.ev_ids],
            "source_file_ids": [],
            "source_rows": [], # keeping empty here to save space, but should be populated
            "template_data": {
                "coordinator": r.coordinator,
                "victim_count": r.victim_count,
                "victim_list": ", ".join([str(v) for v in r.victims]),
                "evidence": f"{len(r.ev_ids)} CDR events"
            }
        }
        findings.append(f)
    return findings
