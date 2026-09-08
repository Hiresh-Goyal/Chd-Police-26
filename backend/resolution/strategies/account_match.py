"""Resolve bank account identifiers and evidence-backed owner links."""

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


def _owners(payload: dict) -> tuple[str | None, str | None]:
    fields = payload.get("source_fields", {})
    if not isinstance(fields, dict): return None, None
    lowered = {str(k).lower(): v for k, v in fields.items()}
    def first(keys):
        for key in keys:
            value = lowered.get(key)
            if value not in (None, "", "null", "None"):
                return str(value).strip()
        return None
    common = first(("account_holder", "account_owner", "owner", "customer_name", "name"))
    return (first(("sender_name", "sender_holder", "sender_owner")) or common,
            first(("beneficiary_name", "receiver_name", "beneficiary_holder", "beneficiary_owner")) or common)


def execute(conn: Connection, case_id: str) -> dict:
    rows = conn.execute(select(canonical_events_table).where(
        canonical_events_table.c.case_id == case_id,
        canonical_events_table.c.event_type == "BANK_TRANSFER",
    )).fetchall()
    account_ids: dict[str, str] = {}
    owners: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        for raw in (row.actor_raw, row.peer_raw):
            value = (raw or "").strip()
            if value and value not in account_ids:
                account_ids[value] = create_entity(
                    conn, case_id, "ACCOUNT", value, f"Account {value}",
                    {"source": "account_match", "raw_values": [value]},
                )
        sender_owner, beneficiary_owner = _owners(_payload(row.payload))
        if sender_owner and row.actor_raw:
            owners[row.actor_raw.strip()].append(sender_owner)
        if beneficiary_owner and row.peer_raw:
            owners[row.peer_raw.strip()].append(beneficiary_owner)

    for row in rows:
        conn.execute(update(canonical_events_table).where(canonical_events_table.c.id == row.id).values(
            actor_entity_id=account_ids.get((row.actor_raw or "").strip()),
            peer_entity_id=account_ids.get((row.peer_raw or "").strip()),
        ))

    links = 0
    for account, names in owners.items():
        # Only create an owner entity when the evidence identifies a stable name.
        unique_names = sorted({n for n in names if n})
        if len(unique_names) != 1 or account not in account_ids:
            continue
        name = unique_names[0]
        person_id = create_entity(
            conn, case_id, "PERSON", name, name,
            {"source": "bank_evidence", "evidence_account": account},
        )
        event_ids = [r.id for r in rows if account in {r.actor_raw, r.peer_raw}]
        links += int(insert_link(conn, case_id, account_ids[account], person_id, "SAME_PERSON", 0.95, "CONFIRMED", event_ids))
    return {"entities_created": len(account_ids), "links_created": links}
