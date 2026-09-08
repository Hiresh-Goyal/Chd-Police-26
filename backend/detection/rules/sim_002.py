from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult


def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        SELECT
            device_id,
            COUNT(DISTINCT actor_raw) AS num_msisdns,
            ARRAY_AGG(DISTINCT id) AS event_ids,
            ARRAY_AGG(DISTINCT source_file_id) AS source_file_ids,
            ARRAY_AGG(DISTINCT source_row) AS source_rows,
            ARRAY_AGG(DISTINCT actor_entity_id) AS actor_entities
        FROM canonical_events
        WHERE case_id = :case_id
          AND device_id IS NOT NULL
          AND device_id != ''
        GROUP BY device_id
        HAVING COUNT(DISTINCT actor_raw) >= 3
           AND MAX(ts_start::timestamptz) - MIN(ts_start::timestamptz) <= INTERVAL '7 days'
    """)
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    return [FindingResult(
        rule_id="SIM-002", severity="HIGH", weight=20, confidence=0.92,
        entity_ids=[e for e in r.actor_entities if e], event_ids=list(r.event_ids)[:10],
        source_file_ids=list(r.source_file_ids)[:10], source_rows=list(r.source_rows)[:10],
        explanation=f"Device IMEI {r.device_id} was associated with {r.num_msisdns} distinct MSISDNs within a 7-day window, indicating SIM swap activity."
    ) for r in rows]
