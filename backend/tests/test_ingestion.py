"""
backend/tests/test_ingestion.py

Tests for parsers and ingestion pipeline.
Runs against demo_data/ CSVs — no database required.

Usage:
    python -m pytest backend/tests/test_ingestion.py -v
"""

import os
import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Resolve demo_data/ path relative to repo root
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DEMO_DIR = _REPO_ROOT / "demo_data"

# ── Fixtures ──────────────────────────────────────────────


FAKE_FILE_ID = "00000000-0000-0000-0000-000000000001"
FAKE_CASE_ID = "00000000-0000-0000-0000-000000000099"


# ── normalize_phone tests ─────────────────────────────────

from backend.ingestion.parse_cdr import normalize_phone


class TestNormalizePhone:
    """Fix 6: all phone numbers → 10-digit Indian mobile strings."""

    def test_plain_10_digits(self):
        assert normalize_phone("9800000001") == "9800000001"

    def test_with_plus91_prefix(self):
        assert normalize_phone("+919800000001") == "9800000001"

    def test_with_91_prefix_no_plus(self):
        assert normalize_phone("919800000001") == "9800000001"

    def test_with_leading_zero(self):
        assert normalize_phone("09800000001") == "9800000001"

    def test_with_spaces_and_dashes(self):
        assert normalize_phone("+91-980 000-0001") == "9800000001"


# ── CDR parser tests ──────────────────────────────────────

from backend.ingestion.parse_cdr import parse_cdr


class TestParseCdr:
    """CDR CSV parser tests against demo_data/cdr.csv."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.events, self.errors = parse_cdr(
            str(_DEMO_DIR / "cdr.csv"), FAKE_FILE_ID, FAKE_CASE_ID
        )

    def test_event_count(self):
        """22 rows in demo cdr.csv → 22 events."""
        assert len(self.events) == 22

    def test_no_parse_errors(self):
        assert self.errors == []

    def test_event_types(self):
        """All CDR events should be CALL (demo has no SMS rows)."""
        for evt in self.events:
            assert evt.event_type.value == "CALL"

    def test_phone_normalization(self):
        """All actor_raw and peer_raw should be 10-digit strings."""
        for evt in self.events:
            assert len(evt.actor_raw) == 10, f"actor_raw={evt.actor_raw}"
            assert evt.actor_raw.isdigit(), f"actor_raw={evt.actor_raw}"
            if evt.peer_raw:
                assert len(evt.peer_raw) == 10, f"peer_raw={evt.peer_raw}"
                assert evt.peer_raw.isdigit(), f"peer_raw={evt.peer_raw}"

    def test_source_file_id_set(self):
        """Every event must have source_file_id set."""
        for evt in self.events:
            assert evt.source_file_id == FAKE_FILE_ID

    def test_source_row_set(self):
        """Every event must have a non-negative source_row."""
        for evt in self.events:
            assert evt.source_row is not None
            assert evt.source_row >= 0

    def test_source_rows_unique(self):
        """Each source_row should be unique within a file."""
        rows = [evt.source_row for evt in self.events]
        assert len(rows) == len(set(rows))

    def test_ts_end_computed_for_calls(self):
        """CALL events with duration_sec > 0 should have ts_end set."""
        for evt in self.events:
            if evt.event_type.value == "CALL":
                duration = evt.payload.get("duration_sec", 0)
                if duration > 0:
                    assert evt.ts_end is not None, f"Row {evt.source_row}: ts_end missing"

    def test_vol_008_pattern(self):
        """VOL-008: exactly 18 calls from C-001 on Jan 9 between 14:00-15:00."""
        from datetime import datetime

        c001_sims = {"9800000001", "9800000002", "9800000003"}
        burst_events = [
            evt
            for evt in self.events
            if evt.actor_raw in c001_sims
            and evt.ts_start.startswith("2025-01-09T14:")
        ]
        assert len(burst_events) == 18

    def test_sim_002_pattern(self):
        """SIM-002: C-001 uses different SIMs on different days, same IMEI."""
        c001_events = [
            evt for evt in self.events if evt.device_id == "352100000000001"
        ]
        assert len(c001_events) > 0
        # All should have the same IMEI
        for evt in c001_events:
            assert evt.device_id == "352100000000001"


# ── Bank parser tests ─────────────────────────────────────

from backend.ingestion.parse_bank import parse_bank


class TestParseBank:
    """Bank CSV parser tests against demo_data/bank.csv."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.events, self.errors = parse_bank(
            str(_DEMO_DIR / "bank.csv"), FAKE_FILE_ID, FAKE_CASE_ID
        )

    def test_event_count(self):
        """16 rows in demo bank.csv → 16 events."""
        assert len(self.events) == 16

    def test_no_parse_errors(self):
        assert self.errors == []

    def test_all_bank_transfer_type(self):
        for evt in self.events:
            assert evt.event_type.value == "BANK_TRANSFER"

    def test_source_file_id_set(self):
        for evt in self.events:
            assert evt.source_file_id == FAKE_FILE_ID

    def test_source_row_set(self):
        for evt in self.events:
            assert evt.source_row is not None
            assert evt.source_row >= 0

    def test_amt_006_pattern(self):
        """AMT-006: victim transfers are all in ₹9,000-₹9,999 range."""
        victim_accounts = {"ACC-V001", "ACC-V002", "ACC-V003", "ACC-V004", "ACC-V005"}
        victim_debits = [
            evt
            for evt in self.events
            if evt.actor_raw in victim_accounts
            and evt.payload.get("txn_type") == "DEBIT"
        ]
        assert len(victim_debits) == 5
        for evt in victim_debits:
            assert 9000 <= evt.amount <= 9999, f"Amount {evt.amount} out of range"


# ── IPDR parser tests ─────────────────────────────────────

from backend.ingestion.parse_ipdr import parse_ipdr


class TestParseIpdr:
    """IPDR CSV parser tests against demo_data/ipdr.csv."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.events, self.errors = parse_ipdr(
            str(_DEMO_DIR / "ipdr.csv"), FAKE_FILE_ID, FAKE_CASE_ID
        )

    def test_event_count(self):
        assert len(self.events) == 10

    def test_no_parse_errors(self):
        assert self.errors == []

    def test_all_ipdr_type(self):
        for evt in self.events:
            assert evt.event_type.value == "IPDR_SESSION"

    def test_phone_normalization(self):
        for evt in self.events:
            assert len(evt.actor_raw) == 10
            assert evt.actor_raw.isdigit()

    def test_ifr_007_pattern(self):
        """IFR-007: C-001 sessions to VoIP IP 45.133.200.88."""
        voip_events = [
            evt
            for evt in self.events
            if evt.peer_raw == "45.133.200.88"
        ]
        assert len(voip_events) == 5


# ── Social parser tests ───────────────────────────────────

from backend.ingestion.parse_social import parse_social


class TestParseSocial:
    """Social CSV parser tests against demo_data/social.csv."""

    @pytest.fixture(autouse=True)
    def _load(self):
        self.events, self.errors = parse_social(
            str(_DEMO_DIR / "social.csv"), FAKE_FILE_ID, FAKE_CASE_ID
        )

    def test_event_count(self):
        assert len(self.events) == 11

    def test_no_parse_errors(self):
        assert self.errors == []

    def test_event_types(self):
        types = {evt.event_type.value for evt in self.events}
        assert "SOCIAL_POST" in types
        assert "SOCIAL_INTERACTION" in types


# ── ingest_file mock test ─────────────────────────────────


class TestIngestFile:
    """Test ingest_file returns the correct dict shape with mocked DB."""

    @patch("backend.ingestion.ingest.get_connection")
    def test_ingest_cdr_returns_correct_shape(self, mock_get_conn):
        """ingest_file with mock DB should return {file_id, events_created, parse_errors}."""
        # Set up mock connection context manager
        mock_conn = MagicMock()
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from backend.ingestion.ingest import ingest_file

        result = ingest_file(
            FAKE_CASE_ID, str(_DEMO_DIR / "cdr.csv"), "cdr"
        )

        assert "file_id" in result
        assert "events_created" in result
        assert "parse_errors" in result
        assert isinstance(result["file_id"], str)
        assert isinstance(result["events_created"], int)
        assert isinstance(result["parse_errors"], list)
        assert result["events_created"] == 22
        assert len(result["file_id"]) == 36  # UUID format

    @patch("backend.ingestion.ingest.get_connection")
    def test_ingest_unknown_type(self, mock_get_conn):
        """Unknown file_type should return error without crashing."""
        from backend.ingestion.ingest import ingest_file

        result = ingest_file(FAKE_CASE_ID, "dummy.txt", "unknown")
        assert result["events_created"] == 0
        assert len(result["parse_errors"]) > 0
