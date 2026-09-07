from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        SELECT 
            actor_raw,
            COUNT(DISTINCT peer_raw) as num_victims,
            ARRAY_AGG(DISTINCT id) as event_ids,
            ARRAY_AGG(DISTINCT source_file_id) as source_file_ids,
            ARRAY_AGG(DISTINCT source_row) as source_rows,
            ARRAY_AGG(DISTINCT actor_entity_id) as actor_entities
        FROM canonical_events
        WHERE case_id = :case_id 
          AND event_type = 'CALL'
        GROUP BY actor_raw
        HAVING COUNT(DISTINCT peer_raw) >= 3
    """)
    
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        ent_ids = [e for e in r.actor_entities if e]
        findings.append(FindingResult(
            rule_id="COO-004",
            severity="HIGH",
            weight=25,
            confidence=0.88,
            entity_ids=ent_ids,
            event_ids=list(r.event_ids)[:10],
            source_file_ids=list(r.source_file_ids)[:10],
            source_rows=list(r.source_rows)[:10],
            explanation=f"Entity {r.actor_raw} identified in CDR call logs communicating with {r.num_victims} distinct numbers."
        ))
        
    return findings
