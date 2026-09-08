from sqlalchemy.engine import Connection
from typing import List
from backend.detection.engine import FindingResult


def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    from sqlalchemy import text
    query = text("""
        WITH bursts AS (
            SELECT
                c1.actor_raw,
                c1.id AS anchor_id,
                COUNT(c2.id) AS burst_count
            FROM canonical_events c1
            JOIN canonical_events c2
              ON c2.case_id = c1.case_id
             AND c2.event_type = 'CALL'
             AND c2.actor_raw = c1.actor_raw
             AND c2.ts_start::timestamptz >= c1.ts_start::timestamptz
             AND c2.ts_start::timestamptz <= c1.ts_start::timestamptz + INTERVAL '1 hour'
            WHERE c1.case_id = :case_id
              AND c1.event_type = 'CALL'
            GROUP BY c1.actor_raw, c1.id
        ), best AS (
            SELECT actor_raw, MAX(burst_count) AS burst_count
            FROM bursts
            GROUP BY actor_raw
        )
        SELECT
            b.actor_raw,
            b.burst_count,
            ARRAY_AGG(DISTINCT c.id) AS event_ids,
            ARRAY_AGG(DISTINCT c.source_file_id) AS source_file_ids,
            ARRAY_AGG(DISTINCT c.source_row) AS source_rows,
            ARRAY_AGG(DISTINCT c.actor_entity_id) AS actor_entities
        FROM best b
        JOIN canonical_events c
          ON c.case_id = :case_id
         AND c.event_type = 'CALL'
         AND c.actor_raw = b.actor_raw
        WHERE b.burst_count >= 5
        GROUP BY b.actor_raw, b.burst_count
    """)
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    return [FindingResult(
        rule_id="VOL-008", severity="MEDIUM", weight=15, confidence=0.90,
        entity_ids=[e for e in r.actor_entities if e], event_ids=list(r.event_ids)[:10],
        source_file_ids=list(r.source_file_ids)[:10], source_rows=list(r.source_rows)[:10],
        explanation=f"Entity {r.actor_raw} generated {r.burst_count} calls within a one-hour burst window."
    ) for r in rows]
