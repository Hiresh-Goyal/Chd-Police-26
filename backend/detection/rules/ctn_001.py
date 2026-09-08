from sqlalchemy.engine import Connection
from sqlalchemy import text
from typing import List
from backend.detection.engine import FindingResult


def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    """Call-to-transfer temporal nexus: a call followed by a bank transfer within 30 minutes."""
    query = text("""
        SELECT
            c.id AS call_id,
            b.id AS bank_id,
            c.actor_entity_id AS call_actor_ent,
            c.peer_entity_id AS call_peer_ent,
            b.actor_entity_id AS bank_actor_ent,
            b.peer_entity_id AS bank_peer_ent,
            c.source_file_id AS c_file,
            c.source_row AS c_row,
            b.source_file_id AS b_file,
            b.source_row AS b_row
        FROM canonical_events c
        JOIN canonical_events b ON c.case_id = b.case_id
        WHERE c.case_id = :case_id
          AND c.event_type = 'CALL'
          AND b.event_type = 'BANK_TRANSFER'
          AND b.ts_start::timestamptz >= c.ts_start::timestamptz
          AND b.ts_start::timestamptz - c.ts_start::timestamptz <= INTERVAL '30 minutes'
    """)
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    return [FindingResult(
        rule_id="CTN-001", severity="HIGH", weight=25, confidence=0.95,
        entity_ids=list(set(filter(None, [r.call_actor_ent, r.call_peer_ent, r.bank_actor_ent, r.bank_peer_ent]))),
        event_ids=[r.call_id, r.bank_id], source_file_ids=[r.c_file, r.b_file],
        source_rows=[r.c_row, r.b_row],
        explanation="A call was immediately followed by a bank transfer within a 30-minute temporal nexus."
    ) for r in rows]
