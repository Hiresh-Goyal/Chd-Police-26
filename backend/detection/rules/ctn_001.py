from sqlalchemy.engine import Connection
from sqlalchemy import select
from typing import List
from backend.detection.engine import FindingResult
from backend.shared.schema import canonical_events, entity_links, entities

def evaluate(conn: Connection, case_id: str) -> List[FindingResult]:
    """
    Rule CTN-001: Call-Transfer Nexus
    For each CALL event, check if any BANK_TRANSFER event exists within 30 minutes, 
    where the call's peer_raw matches (via entity_links) the transfer's actor_raw or peer_raw. 
    Weight: 25. Severity: HIGH.
    """
    query = text("""
        SELECT 
            c.id as call_id,
            b.id as bank_id,
            c.actor_entity_id as call_actor_ent,
            c.peer_entity_id as call_peer_ent,
            b.actor_entity_id as bank_actor_ent,
            b.peer_entity_id as bank_peer_ent,
            c.source_file_id as c_file,
            c.source_row as c_row,
            b.source_file_id as b_file,
            b.source_row as b_row
        FROM canonical_events c
        JOIN canonical_events b ON c.case_id = b.case_id
        WHERE c.case_id = :case_id 
          AND c.event_type = 'CALL'
          AND b.event_type = 'BANK_TRANSFER'
          AND b.ts_start >= c.ts_start
          AND EXTRACT(EPOCH FROM b.ts_start::timestamptz) - EXTRACT(EPOCH FROM c.ts_start::timestamptz) <= 1800
          AND (
              (c.actor_entity_id = b.actor_entity_id AND c.actor_entity_id IS NOT NULL) OR
              (c.actor_entity_id = b.peer_entity_id AND c.actor_entity_id IS NOT NULL) OR
              (c.peer_entity_id = b.actor_entity_id AND c.peer_entity_id IS NOT NULL) OR
              (c.peer_entity_id = b.peer_entity_id AND c.peer_entity_id IS NOT NULL)
          )
    """)
    
    rows = conn.execute(query, {"case_id": case_id}).fetchall()
    
    findings = []
    for r in rows:
        ent_ids = list(set(filter(None, [r.call_actor_ent, r.call_peer_ent, r.bank_actor_ent, r.bank_peer_ent])))
        findings.append(FindingResult(
            rule_id="CTN-001",
            severity="HIGH",
            weight=25,
            confidence=0.95,
            entity_ids=ent_ids,
            event_ids=[r.call_id, r.bank_id],
            source_file_ids=[r.c_file, r.b_file],
            source_rows=[r.c_row, r.b_row],
            explanation="Call immediately preceding a bank transfer within 30 min window"
        ))
        
    return findings
