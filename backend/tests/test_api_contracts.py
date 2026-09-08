"""Contract tests that do not require PostgreSQL or ingestion dependencies."""

import json

from sqlalchemy import create_engine

from backend.shared.schema import (
    canonical_events_table,
    cases_table,
    entities_table,
    findings_table,
    fraud_scores_table,
    metadata,
    raw_files_table,
)
from backend.services.case_views import build_case_detail, build_fraud_score_view
from backend.routers.score import FraudScoreResponse


def _db():
    engine = create_engine("sqlite:///:memory:")
    metadata.create_all(engine)
    return engine


def test_case_detail_is_backend_owned():
    engine = _db()
    with engine.begin() as conn:
        conn.execute(cases_table.insert().values(
            id="case-1", name="Subject", title="Case Title", description="desc",
            status="OPEN", priority="HIGH", assigned_io=None, case_type=None,
            created_at="2026-09-07T10:00:00+00:00", updated_at="2026-09-07T10:00:00+00:00",
        ))
        conn.execute(raw_files_table.insert().values(
            id="file-1", case_id="case-1", filename="cdr.csv", file_type="CDR",
            sha256="abc", row_count=1, uploaded_at="2026-09-07T10:01:00+00:00",
            file_size_bytes=12, status="complete", parse_errors="[]",
        ))
        conn.execute(entities_table.insert().values(
            id="entity-1", case_id="case-1", entity_type="PHONE", canonical_id="9812345678",
            label="Phone 9812345678", metadata_json="{}", created_at="2026-09-07T10:02:00+00:00",
        ))
        conn.execute(canonical_events_table.insert().values(
            id="event-1", case_id="case-1", event_type="CALL",
            ts_start="2026-09-07T10:03:00+00:00", ts_end=None,
            actor_raw="9812345678", peer_raw="9988776655", device_id=None,
            location_raw=None, amount=None, payload=json.dumps({}), source_file_id="file-1",
            source_row=0, confidence=1.0, actor_entity_id="entity-1", peer_entity_id=None,
        ))
        detail = build_case_detail(conn, "case-1")
        assert detail["entities_count"] == 1
        assert detail["stats"]["cdr"] == 1
        assert detail["evidence"][0]["hash"] == "abc"


def test_fraud_score_expands_persisted_finding_ids():
    engine = _db()
    with engine.begin() as conn:
        conn.execute(cases_table.insert().values(
            id="case-1", name="Subject", title="Case Title", description="desc",
            status="OPEN", priority="HIGH", assigned_io=None, case_type=None,
            created_at="2026-09-07T10:00:00+00:00", updated_at="2026-09-07T10:00:00+00:00",
        ))
        conn.execute(findings_table.insert().values(
            id="finding-1", case_id="case-1", episode_id=None, rule_id="CTN-001",
            severity="HIGH", fraud_weight=25, confidence=0.95, entity_ids="[]",
            event_ids="[]", source_file_ids="[]", source_rows="[]", explanation="Call nexus",
            rule_version="1.0", created_at="2026-09-07T10:04:00+00:00",
        ))
        conn.execute(fraud_scores_table.insert().values(
            id="score-1", case_id="case-1", score=23, risk_level="LOW",
            findings_breakdown=json.dumps({"CTN-001": 23}), top_findings=json.dumps(["finding-1"]),
            total_findings=1, computed_at="2026-09-07T10:05:00+00:00",
        ))
        view = build_fraud_score_view(conn, "case-1")
        validated = FraudScoreResponse.model_validate(view)
        assert validated.top_findings[0].id == "finding-1"
        assert validated.top_findings[0].confidence == 0.95
