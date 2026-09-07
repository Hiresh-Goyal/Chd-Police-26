from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        SELECT 
            c.actor_raw,
            c.id as call_id,
            i.id as ipdr_id,
            c.source_file_id as c_file,
            c.source_row as c_row,
            i.source_file_id as i_file,
            i.source_row as i_row,
            c.actor_entity_id as actor_entity
        FROM canonical_events c
        JOIN canonical_events i ON c.case_id = i.case_id 
            AND c.actor_raw = i.actor_raw
        WHERE c.case_id = :case_id 
          AND c.event_type = 'CALL'
          AND i.event_type = 'IPDR_SESSION'
          AND ABS(EXTRACT(EPOCH FROM i.ts_start::timestamptz) - EXTRACT(EPOCH FROM c.ts_start::timestamptz)) <= 900
    """)
    
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        findings.append(FindingResult(
            rule_id="IFR-007",
            severity="HIGH",
            weight=20,
            confidence=0.88,
            entity_ids=[r.actor_entity] if r.actor_entity else [],
            event_ids=[r.call_id, r.ipdr_id],
            source_file_ids=[r.c_file, r.i_file],
            source_rows=[r.c_row, r.i_row],
            explanation=f"IPDR session mapped to {r.actor_raw} within 15 minutes of a CALL event."
        ))
        
    return findings
