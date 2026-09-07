from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        SELECT 
            b.actor_entity_id as entity_id,
            ARRAY_AGG(DISTINCT b.id) as event_ids,
            ARRAY_AGG(DISTINCT b.source_file_id) as source_file_ids,
            ARRAY_AGG(DISTINCT b.source_row) as source_rows
        FROM canonical_events b
        JOIN canonical_events c ON b.case_id = c.case_id 
            AND b.actor_entity_id = c.actor_entity_id
        WHERE b.case_id = :case_id 
          AND b.event_type = 'BANK_TRANSFER'
          AND c.event_type IN ('CALL', 'SMS')
          AND b.actor_entity_id IS NOT NULL
        GROUP BY b.actor_entity_id
        HAVING EXTRACT(EPOCH FROM MIN(b.ts_start)::timestamptz) - EXTRACT(EPOCH FROM MIN(c.ts_start)::timestamptz) <= 7 * 24 * 3600
           AND EXTRACT(EPOCH FROM MIN(b.ts_start)::timestamptz) - EXTRACT(EPOCH FROM MIN(c.ts_start)::timestamptz) >= 0
    """)
    
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        findings.append(FindingResult(
            rule_id="FSM-005",
            severity="MEDIUM",
            weight=18,
            confidence=0.85,
            entity_ids=[r.entity_id] if r.entity_id else [],
            event_ids=list(r.event_ids)[:10],
            source_file_ids=list(r.source_file_ids)[:10],
            source_rows=list(r.source_rows)[:10],
            explanation="SIM card activity started less than 7 days prior to initiation of funds transfer."
        ))
        
    return findings
