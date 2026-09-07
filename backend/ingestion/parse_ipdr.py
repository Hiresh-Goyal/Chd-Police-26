"""
backend/ingestion/parse_ipdr.py

Parses IPDR (Internet Protocol Detail Record) CSV files into CanonicalEvent objects.

Expected CSV columns:
    msisdn, src_ip, dst_ip, ts_start, ts_end, bytes_up, bytes_down

Conventions:
    - event_type is always EventType.IPDR_SESSION.
    - actor_raw = normalised 10-digit MSISDN.
    - peer_raw = dst_ip (destination IP address).
    - payload stores src_ip, dst_ip, bytes_up, bytes_down.
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


def parse_ipdr(
    file_path: str, file_id: str, case_id: str
) -> tuple[list[CanonicalEvent], list[str]]:
    """Parse an IPDR CSV file into CanonicalEvent objects.

    Args:
        file_path: Path to the IPDR CSV file.
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
            src_ip = str(row.get("src_ip", "")).strip()
            dst_ip = str(row.get("dst_ip", "")).strip()
            ts_start = _parse_ts(str(row["ts_start"]))
            ts_end_raw = str(row.get("ts_end", "")).strip()
            ts_end = _parse_ts(ts_end_raw) if ts_end_raw else None
            bytes_up = int(float(row.get("bytes_up", 0) or 0))
            bytes_down = int(float(row.get("bytes_down", 0) or 0))

            events.append(
                CanonicalEvent(
                    case_id=case_id,
                    event_type=EventType.IPDR_SESSION,
                    ts_start=ts_start,
                    ts_end=ts_end,
                    actor_raw=msisdn,
                    peer_raw=dst_ip,
                    device_id=None,
                    location_raw=None,
                    amount=None,
                    payload={
                        "src_ip": src_ip,
                        "dst_ip": dst_ip,
                        "bytes_up": bytes_up,
                        "bytes_down": bytes_down,
                    },
                    source_file_id=file_id,
                    source_row=row_idx,
                    confidence=1.0,
                )
            )
        except Exception as exc:
            errors.append(f"Row {row_idx}: {exc}")

    return events, errors
