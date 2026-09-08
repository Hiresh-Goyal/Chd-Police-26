"""Resolve social-media identifiers and link them to observed phone entities."""

import json
from collections import defaultdict

from sqlalchemy import select, update
from sqlalchemy.engine import Connection

from backend.resolution.strategies.common import create_entity, insert_link
from backend.shared.schema import canonical_events_table


def _payload(value):
    try:
        parsed = json.loads(value or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def execute(conn: Connection, case_id: str) -> dict:
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        canonical_events_table.c.event_type.in_(["SOCIAL_POST", "SOCIAL_INTERACTION"]),
    )).fetchall()
    created = links = 0
    by_social = defaultdict(list)
    for row in rows:
        payload = _payload(row.payload)
        platform = str(payload.get("platform") or "SOCIAL").strip()
        user_id = str(payload.get("user_id") or row.actor_raw or "").strip()
        if not user_id:
            continue
        key = f"{platform}:{user_id}"
        by_social[key].append(row)

    for key, events in by_social.items():
        platform, user_id = key.split(":", 1)
        entity_id = create_entity(
            conn, case_id, "SOCIAL", key, user_id,
            {"platform": platform, "user_id": user_id, "source": "social_match"},
        )
        persons = defaultdict(list)
        phones = defaultdict(list)
        for row in events:
            payload = _payload(row.payload)
            fields = payload.get("source_fields", {}) if isinstance(payload.get("source_fields", {}), dict) else {}
            name = fields.get("display_name") or fields.get("full_name") or fields.get("name")
            if name:
                persons[str(name).strip()].append(row.id)
            if row.actor_entity_id:
                phones[row.actor_entity_id].append(row.id)
            else:
                conn.execute(update(canonical_events_table).where(canonical_events_table.c.id == row.id).values(actor_entity_id=entity_id))
        for phone_id, event_ids in phones.items():
            links += int(insert_link(
                conn, case_id, phone_id, entity_id, "COMMS", 0.85,
                "CONFIRMED" if len(event_ids) > 1 else "PROBABLE", event_ids,
            ))
    return {"entities_created": created, "links_created": links}
