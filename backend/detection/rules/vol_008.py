from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        WITH user_counts AS (
            SELECT actor_raw, COUNT(*) as call_count,
                   ARRAY_AGG(DISTINCT id) as event_ids,
                   ARRAY_AGG(DISTINCT source_file_id) as source_file_ids,
                   ARRAY_AGG(DISTINCT source_row) as source_rows,
                   ARRAY_AGG(DISTINCT actor_entity_id) as actor_entities
            FROM canonical_events
            WHERE case_id = :case_id AND event_type = 'CALL'
            GROUP BY actor_raw
        ),
        stats AS (
            SELECT AVG(call_count) as avg_count, STDDEV(call_count) as std_count
            FROM user_counts
        )
        SELECT u.*, s.avg_count, s.std_count, 
               (u.call_count - s.avg_count) / NULLIF(s.std_count, 0) as z_score
        FROM user_counts u, stats s
        WHERE s.std_count > 0 AND (u.call_count - s.avg_count) / s.std_count > 2.5
    """)
    
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        ent_ids = [e for e in r.actor_entities if e]
        findings.append(FindingResult(
            rule_id="VOL-008",
            severity="MEDIUM",
            weight=15,
            confidence=0.9,
            entity_ids=ent_ids,
            event_ids=list(r.event_ids)[:10],
            source_file_ids=list(r.source_file_ids)[:10],
            source_rows=list(r.source_rows)[:10],
            explanation=f"Entity {r.actor_raw} exhibits abnormally high call volume (Z-score: {r.z_score:.2f})."
        ))
        
    return findings
