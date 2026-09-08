from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        SELECT 
            device_id,
            COUNT(DISTINCT actor_raw) as num_msisdns,
            ARRAY_AGG(DISTINCT id) as event_ids,
            ARRAY_AGG(DISTINCT source_file_id) as source_file_ids,
            ARRAY_AGG(DISTINCT source_row) as source_rows,
            ARRAY_AGG(DISTINCT actor_entity_id) as actor_entities
        FROM canonical_events
        WHERE case_id = :case_id 
          AND device_id IS NOT NULL 
          AND device_id != ''
        GROUP BY device_id
        HAVING COUNT(DISTINCT actor_raw) >= 3
    """)
    
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        ent_ids = [e for e in r.actor_entities if e]
        # limit event lists to avoid giant arrays
        ev_ids = list(r.event_ids)[:10]
        sf_ids = list(r.source_file_ids)[:10]
        sr_rows = list(r.source_rows)[:10]
        
        findings.append(FindingResult(
            rule_id="SIM-002",
            severity="HIGH",
            weight=20,
            confidence=0.92,
            entity_ids=ent_ids,
            event_ids=ev_ids,
            source_file_ids=sf_ids,
            source_rows=sr_rows,
            explanation=f"Device IMEI {r.device_id} associated with {r.num_msisdns} distinct MSISDNs indicating SIM swap activity."
        ))
        
    return findings
