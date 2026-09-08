"""
backend/ingestion/ingest.py

Orchestrates file ingestion: hash → raw_files record → parse → bulk-insert canonical_events.

Usage (called by Member 4's API):
    result = ingest_file(case_id, file_path, file_type)
    # result = {"file_id": "...", "events_created": 42, "parse_errors": []}
"""

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone

from backend.db.connection import get_connection
from backend.ingestion.parse_bank import parse_bank
from backend.ingestion.parse_cdr import parse_cdr
from backend.ingestion.parse_ipdr import parse_ipdr
from backend.ingestion.parse_social import parse_social
from backend.shared.schema import (
    CanonicalEvent,
    canonical_events_table,
    raw_files_table,
)

# Parser dispatch table
_PARSERS = {
    "cdr": parse_cdr,
    "bank": parse_bank,
    "ipdr": parse_ipdr,
    "social": parse_social,
}


def _sha256(file_path: str) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def ingest_file(case_id: str, file_path: str, file_type: str) -> dict:
    """Ingest an evidence file into the database.

    Steps:
        1. Compute SHA-256 hash of the file.
        2. Insert a row into raw_files.
        3. Call the appropriate parser.
        4. Bulk-insert canonical_events with source_file_id set.
        5. Return summary dict.

    Args:
        case_id:   UUID of the parent case.
        file_path: Absolute path to the evidence file.
        file_type: One of: cdr, bank, ipdr, social.

    Returns:
        {"file_id": str, "events_created": int, "parse_errors": list[str]}
    """
    file_type_lower = file_type.strip().lower()
    if file_type_lower not in _PARSERS:
        return {
            "file_id": "",
            "events_created": 0,
            "parse_errors": [f"Unknown file_type: {file_type}"],
        }

    # Step 1: hash
    file_hash = _sha256(file_path)
    file_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Step 2: raw_files row
    raw_file_row = {
        "id": file_id,
        "case_id": case_id,
        "filename": os.path.basename(file_path),
        "file_type": file_type_lower.upper(),
        "sha256": file_hash,
        "row_count": None,  # updated after parsing
        "uploaded_at": now,
    }

    # Step 3: parse
    parser = _PARSERS[file_type_lower]
    events, parse_errors = parser(file_path, file_id, case_id)

    # Update row_count
    raw_file_row["row_count"] = len(events)

    # Step 4: assign UUIDs to events and prepare insert dicts
    event_rows = []
    for evt in events:
        evt.id = str(uuid.uuid4())
        event_rows.append({
            "id": evt.id,
            "case_id": evt.case_id,
            "event_type": evt.event_type.value,
            "ts_start": evt.ts_start,
            "ts_end": evt.ts_end,
            "actor_raw": evt.actor_raw,
            "peer_raw": evt.peer_raw,
            "device_id": evt.device_id,
            "location_raw": evt.location_raw,
            "amount": evt.amount,
            "payload": json.dumps(evt.payload),
            "source_file_id": evt.source_file_id,
            "source_row": evt.source_row,
            "confidence": evt.confidence,
            "actor_entity_id": None,
            "peer_entity_id": None,
        })

    # Step 5: DB inserts
    with get_connection() as conn:
        conn.execute(raw_files_table.insert().values(**raw_file_row))
        if event_rows:
            conn.execute(canonical_events_table.insert(), event_rows)

    return {
        "file_id": file_id,
        "events_created": len(events),
        "parse_errors": parse_errors,
    }
