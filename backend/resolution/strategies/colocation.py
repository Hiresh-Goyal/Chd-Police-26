"""Link distinct phone entities observed at the same tower in a 30-minute window."""

from collections import defaultdict
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.engine import Connection

from backend.resolution.strategies.common import insert_link
from backend.shared.schema import canonical_events_table


def execute(conn: Connection, case_id: str) -> dict:
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        canonical_events_table.c.location_raw.is_not(None),
        canonical_events_table.c.actor_entity_id.is_not(None),
    )).fetchall()
    by_location = defaultdict(list)
    for row in rows:
        try:
            by_location[row.location_raw].append((datetime.fromisoformat(row.ts_start), row))
        except ValueError:
            continue
    pairs = defaultdict(list)
    for observations in by_location.values():
        observations.sort(key=lambda item: item[0])
        for index, (when, first) in enumerate(observations):
            for other_when, second in observations[index + 1:]:
                if (other_when - when).total_seconds() > 1800:
                    break
                if first.actor_entity_id != second.actor_entity_id:
                    key = tuple(sorted((first.actor_entity_id, second.actor_entity_id)))
                    pairs[key].extend((first.id, second.id))
    links = sum(int(insert_link(conn, case_id, a, b, "LOCATION", 0.70, "CANDIDATE", ids))
                for (a, b), ids in pairs.items())
    return {"entities_created": 0, "links_created": links}
