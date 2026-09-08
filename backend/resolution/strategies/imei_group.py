"""Create DEVICE entities and evidence-backed phone-to-device links."""

from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.engine import Connection

from backend.resolution.strategies.common import create_entity, insert_link
from backend.shared.schema import canonical_events_table


def execute(conn: Connection, case_id: str) -> dict:
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        canonical_events_table.c.device_id.is_not(None),
        canonical_events_table.c.actor_entity_id.is_not(None),
    )).fetchall()
    by_device = defaultdict(list)
    for row in rows:
        if row.device_id:
            by_device[row.device_id].append(row)
    created_entities = created_links = 0
    for device, events in by_device.items():
        device_entity = create_entity(conn, case_id, "IMEI", device, f"IMEI {device}", {"source": "imei_group"})
        created_entities += 1
        by_phone = defaultdict(list)
        for event in events:
            by_phone[event.actor_entity_id].append(event.id)
        for phone_id, event_ids in by_phone.items():
            created_links += int(insert_link(conn, case_id, phone_id, device_entity, "SAME_DEVICE", 0.95,
                "CONFIRMED" if len(event_ids) > 1 else "PROBABLE", event_ids))
    return {"entities_created": created_entities, "links_created": created_links}
