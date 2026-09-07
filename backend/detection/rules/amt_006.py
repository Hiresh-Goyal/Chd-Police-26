from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        SELECT 
            actor_raw,
            COUNT(*) as num_transfers,
            ARRAY_AGG(DISTINCT id) as event_ids,
            ARRAY_AGG(DISTINCT source_file_id) as source_file_ids,
            ARRAY_AGG(DISTINCT source_row) as source_rows,
            ARRAY_AGG(DISTINCT actor_entity_id) as actor_entities
        FROM canonical_events
        WHERE case_id = :case_id 
          AND event_type = 'BANK_TRANSFER'
          AND amount >= 9000 AND amount <= 10000
        GROUP BY actor_raw
        HAVING COUNT(*) >= 3
    """)
    
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        ent_ids = [e for e in r.actor_entities if e]
        findings.append(FindingResult(
            rule_id="AMT-006",
            severity="MEDIUM",
            weight=15,
            confidence=0.9,
            entity_ids=ent_ids,
            event_ids=list(r.event_ids)[:10],
            source_file_ids=list(r.source_file_ids)[:10],
            source_rows=list(r.source_rows)[:10],
            explanation=f"Account {r.actor_raw} made {r.num_transfers} transfers just under the 10k reporting threshold."
        ))
        
    return findings
