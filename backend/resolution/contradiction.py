from dataclasses import dataclass
from typing import List

from sqlalchemy.engine import Connection
from sqlalchemy import select

from backend.shared.schema import canonical_events, entities


@dataclass
class ContradictionResult:
    entity_id: str
    event_id_a: str
    event_id_b: str
    reason: str
    downgrade_to: str  # 'IMPOSSIBLE' or 'CANDIDATE'


def detect_contradictions(
    conn: Connection,
    case_id: str,
) -> List[ContradictionResult]:
    """
    Detect contradictions for a case.

    A contradiction occurs when the same phone/entity has two events
    whose time ranges overlap while the events use different devices.

    The current schema stores:
        entities.entity_type
        entities.canonical_id

    Phone numbers are expected to be stored as normalised 10-digit
    Indian mobile numbers.
    """

    # ------------------------------------------------------------------
    # 1. Fetch case events that have a device ID
    # ------------------------------------------------------------------

    stmt = select(
        canonical_events.c.id,
        canonical_events.c.actor_raw,
        canonical_events.c.ts_start,
        canonical_events.c.ts_end,
        canonical_events.c.device_id,
    ).where(
        canonical_events.c.case_id == case_id,
        canonical_events.c.device_id.is_not(None),
    )

    rows = conn.execute(stmt).fetchall()

    # ------------------------------------------------------------------
    # 2. Fetch PHONE entities
    # ------------------------------------------------------------------

    ent_stmt = select(
        entities.c.id,
        entities.c.canonical_id,
    ).where(
        entities.c.case_id == case_id,
        entities.c.entity_type == "PHONE",
    )

    ent_rows = conn.execute(ent_stmt).fetchall()

    # Map normalised phone number -> entity ID
    phone_to_ent_id = {
        row.canonical_id: row.id
        for row in ent_rows
    }

    from backend.resolution.phone_norm import normalize_phone

    results: List[ContradictionResult] = []

    # ------------------------------------------------------------------
    # 3. Compare events belonging to the same phone/entity
    # ------------------------------------------------------------------

    # O(N^2) comparison within the case.
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            r1 = rows[i]
            r2 = rows[j]

            p1 = normalize_phone(r1.actor_raw)
            p2 = normalize_phone(r2.actor_raw)

            # Events must belong to the same resolved phone entity.
            if p1 != p2:
                continue

            if p1 not in phone_to_ent_id:
                continue

            # Same device is not a contradiction.
            if r1.device_id == r2.device_id:
                continue

            # ----------------------------------------------------------
            # Check whether the event time ranges overlap.
            # ----------------------------------------------------------

            end1 = r1.ts_end or r1.ts_start
            end2 = r2.ts_end or r2.ts_start

            if max(r1.ts_start, r2.ts_start) <= min(end1, end2):
                results.append(
                    ContradictionResult(
                        entity_id=phone_to_ent_id[p1],
                        event_id_a=r1.id,
                        event_id_b=r2.id,
                        reason=(
                            "Overlapping events on different devices "
                            f"({r1.device_id} vs {r2.device_id})"
                        ),
                        downgrade_to="CANDIDATE",
                    )
                )

    return results