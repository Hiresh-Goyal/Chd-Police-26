"""
backend/ingestion/parse_bank.py

Parses Bank transaction CSV (and PDF via pdfplumber fallback) into CanonicalEvent objects.

Expected CSV columns:
    account, peer_account, amount, ts, txn_type, ref_id

Conventions:
    - event_type is always EventType.BANK_TRANSFER.
    - amount is stored as float (INR).
    - txn_type: CREDIT or DEBIT (stored in payload).
    - source_row is 0-indexed.
"""

import csv
import io
from datetime import datetime

import polars as pl

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


def _parse_rows(
    rows: list[dict], file_id: str, case_id: str
) -> tuple[list[CanonicalEvent], list[str]]:
    """Parse a list of row dicts into CanonicalEvent objects."""
    events: list[CanonicalEvent] = []
    errors: list[str] = []

    for row_idx, row in enumerate(rows):
        try:
            account = str(row["account"]).strip()
            peer_account = str(row.get("peer_account", "")).strip() or None
            amount = float(row["amount"])
            ts = _parse_ts(str(row["ts"]))
            txn_type = str(row.get("txn_type", "")).strip().upper()
            ref_id = str(row.get("ref_id", "")).strip() or None

            events.append(
                CanonicalEvent(
                    case_id=case_id,
                    event_type=EventType.BANK_TRANSFER,
                    ts_start=ts,
                    ts_end=None,
                    actor_raw=account,
                    peer_raw=peer_account,
                    device_id=None,
                    location_raw=None,
                    amount=amount,
                    payload={
                        "txn_type": txn_type,
                        "ref_id": ref_id,
                    },
                    source_file_id=file_id,
                    source_row=row_idx,
                    confidence=1.0,
                )
            )
        except Exception as exc:
            errors.append(f"Row {row_idx}: {exc}")

    return events, errors


def parse_bank(
    file_path: str, file_id: str, case_id: str
) -> tuple[list[CanonicalEvent], list[str]]:
    """Parse a Bank CSV or PDF file into CanonicalEvent objects.

    Detects file type by extension:
        .csv → Polars CSV reader
        .pdf → pdfplumber table extraction → same parse logic
    """
    file_lower = file_path.lower()

    if file_lower.endswith(".pdf"):
        return _parse_bank_pdf(file_path, file_id, case_id)

    # Default: CSV
    df = pl.read_csv(file_path, try_parse_dates=False, infer_schema_length=0)
    rows = [df.row(i, named=True) for i in range(len(df))]
    return _parse_rows(rows, file_id, case_id)


def _parse_bank_pdf(
    file_path: str, file_id: str, case_id: str
) -> tuple[list[CanonicalEvent], list[str]]:
    """Extract tables from a bank PDF statement and parse them."""
    try:
        import pdfplumber
    except ImportError:
        return [], ["pdfplumber not installed — cannot parse PDF"]

    all_rows: list[dict] = []
    errors: list[str] = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                table = page.extract_table()
                if not table or len(table) < 2:
                    continue
                headers = [h.strip().lower() for h in table[0]]
                for data_row in table[1:]:
                    all_rows.append(dict(zip(headers, data_row)))
    except Exception as exc:
        errors.append(f"PDF extraction failed: {exc}")
        return [], errors

    events, parse_errors = _parse_rows(all_rows, file_id, case_id)
    errors.extend(parse_errors)
    return events, errors
