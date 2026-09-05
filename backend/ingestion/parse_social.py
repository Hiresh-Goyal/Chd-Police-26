"""
backend/ingestion/parse_social.py

Parses Social media CSV files into CanonicalEvent objects.

Expected CSV columns:
    platform, user_id, phone, content, ts, interaction_type

Conventions:
    - interaction_type SOCIAL_POST → EventType.SOCIAL_POST
    - interaction_type SOCIAL_INTERACTION → EventType.SOCIAL_INTERACTION
    - actor_raw = normalised 10-digit phone number.
    - payload stores platform, user_id, content, interaction_type.
"""

from datetime import datetime

import polars as pl

from backend.ingestion.parse_cdr import normalize_phone
from backend.shared.schema import CanonicalEvent, EventType


def _parse_ts(raw: str) -> str:
    """Parse timestamp to UTC ISO-8601."""
    raw = str(raw).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).isoformat()
        except ValueError:
            continue
    return raw


def parse_social(
    file_path: str, file_id: str, case_id: str
) -> tuple[list[CanonicalEvent], list[str]]:
    """Parse a Social media CSV file into CanonicalEvent objects.

    Args:
        file_path: Path to the social CSV file.
        file_id:   UUID of the raw_files row for this file.
        case_id:   UUID of the parent case.

    Returns:
        Tuple of (events, parse_errors).
    """
    df = pl.read_csv(file_path, try_parse_dates=False, infer_schema_length=0)
    events: list[CanonicalEvent] = []
    errors: list[str] = []

    for row_idx in range(len(df)):
        try:
            row = df.row(row_idx, named=True)

            platform = str(row.get("platform", "")).strip()
            user_id = str(row.get("user_id", "")).strip()
            phone_raw = str(row.get("phone", "")).strip()
            phone = normalize_phone(phone_raw) if phone_raw else ""
            content = str(row.get("content", "")).strip()
            ts = _parse_ts(str(row["ts"]))
            interaction_type = str(row.get("interaction_type", "")).strip().upper()

            if interaction_type == "SOCIAL_POST":
                event_type = EventType.SOCIAL_POST
            else:
                event_type = EventType.SOCIAL_INTERACTION

            events.append(
                CanonicalEvent(
                    case_id=case_id,
                    event_type=event_type,
                    ts_start=ts,
                    ts_end=None,
                    actor_raw=phone,
                    peer_raw=None,
                    device_id=None,
                    location_raw=None,
                    amount=None,
                    payload={
                        "platform": platform,
                        "user_id": user_id,
                        "content": content,
                        "interaction_type": interaction_type,
                    },
                    source_file_id=file_id,
                    source_row=row_idx,
                    confidence=1.0,
                )
            )
        except Exception as exc:
            errors.append(f"Row {row_idx}: {exc}")

    return events, errors
