"""Shared, schema-aligned helpers for deterministic entity resolution."""

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.engine import Connection

from backend.shared.schema import canonical_events_table, entities_table, entity_links_table

PHONE_EVENTS = ("CALL", "SMS", "IPDR_SESSION", "LOCATION_PING", "SOCIAL_POST", "SOCIAL_INTERACTION")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def reset_case_resolution(conn: Connection, case_id: str) -> None:
    """Clear only regenerable case resolution output in FK-safe order."""
    conn.execute(entity_links_table.delete().where(entity_links_table.c.case_id == case_id))
    conn.execute(update(canonical_events_table).where(canonical_events_table.c.case_id == case_id).values(
        actor_entity_id=None, peer_entity_id=None))
    conn.execute(entities_table.delete().where(entities_table.c.case_id == case_id))


def entities_by_key(conn: Connection, case_id: str) -> dict[tuple[str, str], str]:
    rows = conn.execute(select(entities_table.c.id, entities_table.c.entity_type, entities_table.c.canonical_id).where(
        entities_table.c.case_id == case_id)).fetchall()
    return {(row.entity_type, row.canonical_id): row.id for row in rows}


def create_entity(conn: Connection, case_id: str, entity_type: str, canonical_id: str, label: str, metadata: dict) -> str:
    existing = entities_by_key(conn, case_id).get((entity_type, canonical_id))
    if existing:
        return existing
    entity_id = str(uuid.uuid4())
    conn.execute(entities_table.insert().values(
        id=entity_id, case_id=case_id, entity_type=entity_type, canonical_id=canonical_id,
        label=label, metadata_json=json.dumps(metadata, sort_keys=True), created_at=now_iso()))
    return entity_id


def insert_link(conn: Connection, case_id: str, entity_a: str, entity_b: str, link_type: str,
                confidence: float, confidence_tier: str, event_ids: list[str]) -> bool:
    if entity_a == entity_b or not event_ids:
        return False
    conn.execute(entity_links_table.insert().values(
        id=str(uuid.uuid4()), case_id=case_id, entity_a=entity_a, entity_b=entity_b,
        link_type=link_type, confidence=confidence, confidence_tier=confidence_tier,
        evidence_event_ids=json.dumps(sorted(set(event_ids))), created_at=now_iso()))
    return True
