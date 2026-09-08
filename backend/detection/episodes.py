"""Build schema-valid temporal clusters from resolved canonical events."""

import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.engine import Connection

from backend.shared.schema import canonical_events_table


def _parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def build_episodes(conn: Connection, case_id: str) -> list[dict]:
    """Cluster entity-connected events separated by no more than four hours.

    The table stores JSON as TEXT, so returned rows are ready for direct insert.
    """
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        (canonical_events_table.c.actor_entity_id.is_not(None)) |
        (canonical_events_table.c.peer_entity_id.is_not(None)),
    ).order_by(canonical_events_table.c.ts_start)).fetchall()
    clusters: list[dict] = []
    active: list[tuple[datetime, object]] = []
    active_entities: set[str] = set()

    def flush() -> None:
        nonlocal active, active_entities
        if not active:
            return
        start = active[0][0]
        end = max(item[0] for item in active)
        event_ids = [item[1].id for item in active]
        entity_ids = sorted(active_entities)
        clusters.append({
            "id": str(uuid.uuid4()), "case_id": case_id,
            "ts_start": start.isoformat(), "ts_end": end.isoformat(),
            "entity_ids": json.dumps(entity_ids), "event_ids": json.dumps(event_ids),
            "label": f"Resolved activity episode ({len(event_ids)} events)",
            "summary": f"Temporal cluster involving {len(entity_ids)} resolved entities and {len(event_ids)} events.",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        active, active_entities = [], set()

    for row in rows:
        try:
            when = _parse_time(row.ts_start)
        except (TypeError, ValueError):
            continue
        row_entities = {value for value in (row.actor_entity_id, row.peer_entity_id) if value}
        if active:
            last = active[-1][0]
            connected = bool(active_entities & row_entities)
            if not connected or when - last > timedelta(hours=4) or when - active[0][0] > timedelta(hours=48):
                flush()
        active.append((when, row))
        active_entities.update(row_entities)
    flush()
    return clusters
