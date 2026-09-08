from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult


def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        SELECT
            peer_raw,
            COUNT(DISTINCT actor_raw) AS num_sources,
            ARRAY_AGG(DISTINCT id) AS event_ids,
            ARRAY_AGG(DISTINCT source_file_id) AS source_file_ids,
            ARRAY_AGG(DISTINCT source_row) AS source_rows,
            ARRAY_AGG(DISTINCT peer_entity_id) AS peer_entities
        FROM canonical_events
        WHERE case_id = :case_id
          AND event_type = 'BANK_TRANSFER'
          AND peer_raw IS NOT NULL
        GROUP BY peer_raw
        HAVING COUNT(DISTINCT actor_raw) >= 3
           AND MAX(ts_start::timestamptz) - MIN(ts_start::timestamptz) <= INTERVAL '1 hour'
    """)
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    return [FindingResult(
        rule_id="MUL-003", severity="CRITICAL", weight=30, confidence=0.95,
        entity_ids=[e for e in r.peer_entities if e], event_ids=list(r.event_ids)[:10],
        source_file_ids=list(r.source_file_ids)[:10], source_rows=list(r.source_rows)[:10],
        explanation=f"Account {r.peer_raw} received funds from {r.num_sources} distinct sources within one hour, indicating a rapid mule-account dispersal pattern."
    ) for r in rows]
