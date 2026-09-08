"""Resolve phone identifiers and attach them to canonical events."""

from sqlalchemy import select, update
from sqlalchemy.engine import Connection

from backend.resolution.phone_norm import normalize_phone
from backend.resolution.strategies.common import PHONE_EVENTS, create_entity
from backend.shared.schema import canonical_events_table


def execute(conn: Connection, case_id: str) -> dict:
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        canonical_events_table.c.event_type.in_(PHONE_EVENTS),
    )).fetchall()
    ids: dict[str, str] = {}
    for row in rows:
        for raw in (row.actor_raw, row.peer_raw):
            value = normalize_phone(raw or "")
            if value and value.isdigit() and len(value) == 10 and value not in ids:
                ids[value] = create_entity(conn, case_id, "PHONE", value, f"Phone {value}", {
                    "source": "msisdn_match", "raw_values": [value],
                })
    for row in rows:
        conn.execute(update(canonical_events_table).where(canonical_events_table.c.id == row.id).values(
            actor_entity_id=ids.get(normalize_phone(row.actor_raw or "")),
            peer_entity_id=ids.get(normalize_phone(row.peer_raw or "")),
        ))
    return {"entities_created": len(ids), "links_created": 0}
