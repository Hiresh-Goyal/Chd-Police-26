"""Create evidence-backed communication and financial graph edges from events."""

from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.engine import Connection

from backend.resolution.strategies.common import insert_link
from backend.shared.schema import canonical_events_table


def execute(conn: Connection, case_id: str) -> dict:
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        canonical_events_table.c.actor_entity_id.is_not(None),
        canonical_events_table.c.peer_entity_id.is_not(None),
    )).fetchall()
    grouped = defaultdict(list)
    for row in rows:
        if row.actor_entity_id == row.peer_entity_id:
            continue
        kind = "FINANCIAL" if row.event_type == "BANK_TRANSFER" else "COMMS"
        key = (row.actor_entity_id, row.peer_entity_id, kind)
        grouped[key].append(row.id)
    links = 0
    for (a, b, kind), ids in grouped.items():
        links += int(insert_link(conn, case_id, a, b, kind, 0.90,
            "CONFIRMED" if len(ids) > 1 else "PROBABLE", ids))
    return {"entities_created": 0, "links_created": links}
