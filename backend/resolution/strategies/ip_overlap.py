"""Create IP entities from IPDR destinations and link their phone users."""

from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.engine import Connection

from backend.resolution.strategies.common import create_entity, insert_link
from backend.shared.schema import canonical_events_table


def execute(conn: Connection, case_id: str) -> dict:
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        canonical_events_table.c.event_type == "IPDR_SESSION",
        canonical_events_table.c.actor_entity_id.is_not(None),
        canonical_events_table.c.peer_raw.is_not(None),
    )).fetchall()
    by_ip = defaultdict(list)
    for row in rows:
        if row.peer_raw:
            by_ip[row.peer_raw].append(row)
    entities = links = 0
    for ip, events in by_ip.items():
        ip_entity = create_entity(conn, case_id, "IP", ip, f"IP {ip}", {"source": "ip_overlap"})
        entities += 1
        by_phone = defaultdict(list)
        for event in events:
            by_phone[event.actor_entity_id].append(event.id)
        for phone, event_ids in by_phone.items():
            links += int(insert_link(conn, case_id, phone, ip_entity, "COMMS", 0.80,
                "PROBABLE" if len(event_ids) == 1 else "CONFIRMED", event_ids))
    return {"entities_created": entities, "links_created": links}
