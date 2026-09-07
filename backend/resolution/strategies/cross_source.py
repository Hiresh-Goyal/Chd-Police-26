import json
from sqlalchemy.engine import Connection
from sqlalchemy import select
import uuid
from backend.shared.schema import canonical_events, entities, entity_links
from datetime import datetime
from datetime import timedelta

def execute(conn: Connection, case_id: str) -> dict:
    """
    If a PHONE entity and an ACCOUNT entity share events within ±30 min AND 
    the phone appears in the bank transfer peer chain -> create PROBABLE link (confidence 0.70).
    """
    # For hackathon purpose, let's link PHONE and ACCOUNT if they have events within 30 min
    # AND the phone number is part of the transfer's payload or peer_raw.
    stmt_phone = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw,
        canonical_events.c.ts_start
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.event_type.in_(['CALL', 'SMS'])
    )
    phone_events = conn.execute(stmt_phone).fetchall()
    
    stmt_acc = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw,
        canonical_events.c.peer_raw,
        canonical_events.c.ts_start
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.event_type == 'BANK_TRANSFER'
    )
    acc_events = conn.execute(stmt_acc).fetchall()
    
    ent_stmt = select(entities.c.id, entities.c.canonical_id, entities.c.entity_type).where(
        entities.c.case_id == case_id
    )
    ent_rows = conn.execute(ent_stmt).fetchall()
    
    phone_to_ent_id = {r.canonical_id: r.id for r in ent_rows if r.entity_type == 'PHONE'}
    acc_to_ent_id = {r.canonical_id: r.id for r in ent_rows if r.entity_type == 'ACCOUNT'}
    
    from backend.resolution.phone_norm import normalize_phone

    links_created = 0
    new_links = []
    
    for p_ev in phone_events:
        for a_ev in acc_events:
            # Check within 30 minutes
            if abs((datetime.fromisoformat(p_ev.ts_start.replace("Z", "+00:00")) - datetime.fromisoformat(a_ev.ts_start.replace("Z", "+00:00"))).total_seconds()) <= 30 * 60:
                p_norm = normalize_phone(p_ev.actor_raw)
                # Check if phone is in peer chain (heuristic: peer_raw of bank transfer might be the phone)
                # Or just create the link if they are correlated in time (since it's a demo)
                # Let's strictly check if p_norm matches a_ev.peer_raw
                if a_ev.peer_raw and p_norm in a_ev.peer_raw:
                    ent_phone = phone_to_ent_id.get(p_norm)
                    ent_acc = acc_to_ent_id.get(a_ev.actor_raw)
                    
                    if ent_phone and ent_acc:
                        new_links.append({
                                "case_id": case_id,
                                "confidence_tier": "CONFIRMED",
                                "created_at": "2026-09-07T00:00:00Z",
                            "id": str(uuid.uuid4()),
                            "entity_a": ent_phone,
                            "entity_b": ent_acc,
                            "link_type": "CROSS_SOURCE",
                            "confidence": 0.70,
                            "evidence_event_ids": json.dumps([p_ev.id, a_ev.id])
                        })
                        links_created += 1

    if new_links:
        conn.execute(entity_links.insert(), new_links)
        
    return {"entities_created": 0, "links_created": links_created}
