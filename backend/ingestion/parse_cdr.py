"""
backend/ingestion/parse_cdr.py

Parses CDR (Call Detail Record) CSV files into CanonicalEvent objects.

Expected CSV columns:
    msisdn, peer_msisdn, imei, tower_id, ts_start, duration_sec, call_type

Conventions:
    - Phone numbers normalised to 10-digit Indian mobile strings (Fix 6).
    - call_type: CALL → EventType.CALL, SMS → EventType.SMS
    - ts_end = ts_start + duration_sec for CALL events.
    - source_row is 0-indexed (header not counted).
"""

import re
from datetime import datetime, timedelta

import polars as pl

from backend.shared.schema import CanonicalEvent, EventType


def normalize_phone(raw: str) -> str:
    """Normalise a raw phone string to a 10-digit Indian mobile number.

    Rules:
        1. Strip all non-digit characters.
        2. Remove country code 91 if 12 digits starting with 91.
        3. Remove leading 0 if 11 digits.
        4. Return as-is if not 10 digits after normalisation (unexpected format).
    """
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits if len(digits) == 10 else digits


def _parse_ts(raw: str) -> str:
    """Parse a timestamp string into UTC ISO-8601. Handles ISO8601 and DD-MM-YYYY HH:MM:SS."""
    raw = str(raw).strip()
    # Try ISO 8601 first
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).isoformat()
        except ValueError:
            continue
    # Try DD-MM-YYYY HH:MM:SS
    try:
        return datetime.strptime(raw, "%d-%m-%Y %H:%M:%S").isoformat()
    except ValueError:
        pass
    # Fallback — return as-is
    return raw


def parse_cdr(
    file_path: str, file_id: str, case_id: str
) -> tuple[list[CanonicalEvent], list[str]]:
    """Parse a CDR CSV file into CanonicalEvent objects.

    Args:
        file_path: Path to the CDR CSV file.
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

            msisdn = normalize_phone(row["msisdn"])
            peer_msisdn = normalize_phone(row["peer_msisdn"]) if row.get("peer_msisdn") else None
            imei = str(row.get("imei", "")).strip() or None
            tower_id = str(row.get("tower_id", "")).strip() or None
            ts_start_raw = str(row["ts_start"]).strip()
            duration_sec = int(float(row.get("duration_sec", 0) or 0))
            call_type = str(row.get("call_type", "CALL")).strip().upper()

            ts_start = _parse_ts(ts_start_raw)

            # Compute ts_end for calls
            ts_end = None
            if call_type == "CALL" and duration_sec > 0:
                start_dt = datetime.fromisoformat(ts_start)
                end_dt = start_dt + timedelta(seconds=duration_sec)
                ts_end = end_dt.isoformat()

            event_type = EventType.SMS if call_type == "SMS" else EventType.CALL

            events.append(
                CanonicalEvent(
                    case_id=case_id,
                    event_type=event_type,
                    ts_start=ts_start,
                    ts_end=ts_end,
                    actor_raw=msisdn,
                    peer_raw=peer_msisdn,
                    device_id=imei,
                    location_raw=tower_id,
                    amount=None,
                    payload={
                        "duration_sec": duration_sec,
                        "call_type": call_type,
                    },
                    source_file_id=file_id,
                    source_row=row_idx,
                    confidence=1.0,
                )
            )
        except Exception as exc:
            errors.append(f"Row {row_idx}: {exc}")

    return events, errors
