"""Build rich, backend-owned case views from persisted investigation data.

This module contains no demo records. Every value is derived from the case,
raw evidence metadata, canonical events, resolved entities, findings and
stored user/audit information.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.engine import Connection

from backend.shared.schema import (
    canonical_events_table,
    cases_table,
    entities_table,
    entity_links_table,
    findings_table,
    fraud_scores_table,
    raw_files_table,
    users_table,
)


EVENT_SOURCE = {
    "CALL": "CDR",
    "SMS": "CDR",
    "LOCATION_PING": "CDR",
    "BANK_TRANSFER": "BANK",
    "IPDR_SESSION": "IPDR",
    "SOCIAL_POST": "SOCIAL",
    "SOCIAL_INTERACTION": "SOCIAL",
}

ENTITY_DOMAIN = {
    "PERSON": "NCRP",
    "PHONE": "CDR",
    "IMEI": "CDR",
    "DEVICE": "CDR",
    "ACCOUNT": "BANK",
    "ATM": "BANK",
    "IP": "IPDR",
    "SOCIAL": "SOCIAL",
}


def json_value(value: Any, default: Any):
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed
        except Exception:
            return default
    return default


def parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def risk_level(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def _entity_role(entity_type: str, event_rows: list[Any], entity_id: str | None = None) -> str:
    if entity_type == "PERSON":
        return "PRIMARY SUBJECT / PERSON OF INTEREST"
    if entity_type == "PHONE":
        return "TELECOM IDENTIFIER"
    if entity_type in {"IMEI", "DEVICE"}:
        return "HANDSET / DEVICE IDENTIFIER"
    if entity_type == "IP":
        return "NETWORK ENDPOINT"
    if entity_type == "SOCIAL":
        return "SOCIAL MEDIA IDENTIFIER"
    if entity_type == "ATM":
        return "PHYSICAL CASH-OUT TERMINAL"
    if entity_type == "ACCOUNT":
        incoming = sum(float(r.amount or 0) for r in event_rows if entity_id and r.peer_entity_id == entity_id)
        outgoing = sum(float(r.amount or 0) for r in event_rows if entity_id and r.actor_entity_id == entity_id)
        if incoming > 0 and outgoing > 0:
            return "FINANCIAL ACCOUNT / MULE CANDIDATE"
        if incoming > 0:
            return "BENEFICIARY / RECEIVING ACCOUNT"
        return "SOURCE / SENDING ACCOUNT"
    return entity_type


def _entity_details(entity: Any, event_rows: list[Any], links: list[Any]) -> dict[str, str]:
    details = json_value(entity.metadata_json, {})
    if not isinstance(details, dict):
        details = {}
    details = {str(k): str(v) for k, v in details.items()}

    if event_rows:
        times = [parse_ts(r.ts_start) for r in event_rows]
        times = [t for t in times if t]
        if times:
            details.setdefault("First Seen", min(times).isoformat())
            details.setdefault("Last Seen", max(times).isoformat())
        details.setdefault("Linked Events", str(len(event_rows)))
        details.setdefault(
            "Source Domains",
            ", ".join(sorted({EVENT_SOURCE.get(str(r.event_type), "OTHER") for r in event_rows})),
        )

    details.setdefault("Canonical ID", str(entity.canonical_id))
    details.setdefault("Entity Type", str(entity.entity_type))
    details.setdefault("Relationships", str(len(links)))
    return details


def build_entity_views(conn: Connection, case_id: str) -> list[dict[str, Any]]:
    entities = conn.execute(
        select(entities_table).where(entities_table.c.case_id == case_id)
    ).fetchall()
    if not entities:
        return []

    events = conn.execute(
        select(canonical_events_table).where(canonical_events_table.c.case_id == case_id)
    ).fetchall()
    findings = conn.execute(
        select(findings_table).where(findings_table.c.case_id == case_id)
    ).fetchall()
    links = conn.execute(
        select(entity_links_table).where(entity_links_table.c.case_id == case_id)
    ).fetchall()

    events_by_entity: dict[str, list[Any]] = defaultdict(list)
    for event in events:
        for eid in (event.actor_entity_id, event.peer_entity_id):
            if eid:
                events_by_entity[eid].append(event)

    links_by_entity: dict[str, list[Any]] = defaultdict(list)
    for link in links:
        links_by_entity[link.entity_a].append(link)
        links_by_entity[link.entity_b].append(link)

    score_by_entity: dict[str, float] = defaultdict(float)
    for finding in findings:
        ids = json_value(finding.entity_ids, [])
        if not isinstance(ids, list):
            ids = []
        contribution = float(finding.fraud_weight or 0) * float(finding.confidence or 0)
        for eid in ids:
            score_by_entity[str(eid)] += contribution

    result = []
    for entity in entities:
        score = min(100.0, round(score_by_entity.get(entity.id, 0.0), 2))
        etype = str(entity.entity_type)
        result.append({
            "id": entity.id,
            "name": entity.label or entity.canonical_id,
            "type": "IMEI" if etype == "DEVICE" else etype,
            "identifier": entity.canonical_id,
            "role": _entity_role(etype, events_by_entity.get(entity.id, []), entity.id),
            "risk_score": int(round(score)),
            "risk_level": risk_level(score),
            "domain": ENTITY_DOMAIN.get(etype, "OTHER"),
            "confidence_tier": _entity_confidence_tier(entity.id, links_by_entity.get(entity.id, [])),
            "details": _entity_details(entity, events_by_entity.get(entity.id, []), links_by_entity.get(entity.id, [])),
        })
    return result


def _entity_confidence_tier(entity_id: str, links: list[Any]) -> str:
    if not links:
        return "CONFIRMED"
    order = {"CANDIDATE": 0, "PROBABLE": 1, "CONFIRMED": 2}
    return min(
        (str(link.confidence_tier) for link in links),
        key=lambda value: order.get(value, 0),
        default="CONFIRMED",
    )


def build_case_stats(conn: Connection, case_id: str) -> dict[str, int]:
    events = conn.execute(
        select(canonical_events_table.c.event_type).where(canonical_events_table.c.case_id == case_id)
    ).fetchall()
    findings = conn.execute(
        select(findings_table.c.id).where(findings_table.c.case_id == case_id)
    ).fetchall()
    files = conn.execute(
        select(raw_files_table.c.id).where(raw_files_table.c.case_id == case_id)
    ).fetchall()

    counts = {"cdr": 0, "bank": 0, "social": 0, "ipdr": 0}
    for row in events:
        source = EVENT_SOURCE.get(str(row.event_type))
        if source == "CDR": counts["cdr"] += 1
        elif source == "BANK": counts["bank"] += 1
        elif source == "SOCIAL": counts["social"] += 1
        elif source == "IPDR": counts["ipdr"] += 1
    counts["anomalies"] = len(findings)
    counts["evidence"] = len(files)
    return counts


def estimated_loss(conn: Connection, case_id: str) -> float:
    rows = conn.execute(
        select(canonical_events_table).where(
            canonical_events_table.c.case_id == case_id,
            canonical_events_table.c.event_type == "BANK_TRANSFER",
        )
    ).fetchall()
    incoming_accounts = {str(row.peer_raw).strip() for row in rows if row.peer_raw}
    total = 0.0
    for row in rows:
        payload = json_value(row.payload, {})
        txn_type = str(payload.get("txn_type", "")).upper() if isinstance(payload, dict) else ""
        # Prefer explicit debit/cash-out direction. Otherwise, count only
        # transfers originating from an account that never receives funds in
        # this case, avoiding double-counting downstream mule dispersals.
        explicit_outflow = txn_type in {"DEBIT", "ATM_WITHDRAWAL", "CASH_WITHDRAWAL", "CASH_OUT"}
        source_only = bool(row.actor_raw) and str(row.actor_raw).strip() not in incoming_accounts
        if explicit_outflow or source_only:
            total += float(row.amount or 0)
    return round(total, 2)


def build_fraud_score_view(conn: Connection, case_id: str) -> dict[str, Any]:
    row = conn.execute(
        select(fraud_scores_table).where(fraud_scores_table.c.case_id == case_id)
        .order_by(fraud_scores_table.c.computed_at.desc())
    ).fetchone()
    if not row:
        return {"score": 0, "risk_level": "LOW", "top_findings": [], "total_findings": 0, "findings_breakdown": {}}

    ids = json_value(row.top_findings, [])
    if not isinstance(ids, list): ids = []
    findings_by_id = {}
    if ids:
        rows = conn.execute(
            select(findings_table).where(
                findings_table.c.case_id == case_id,
                findings_table.c.id.in_([str(x) for x in ids]),
            )
        ).fetchall()
        findings_by_id = {r.id: r for r in rows}

    def finding_view(f: Any) -> dict[str, Any]:
        return {
            "id": f.id,
            "case_id": f.case_id,
            "rule_id": f.rule_id,
            "severity": f.severity,
            "fraud_weight": f.fraud_weight,
            "weight": f.fraud_weight,
            "confidence": float(f.confidence),
            "entity_ids": json_value(f.entity_ids, []),
            "event_ids": json_value(f.event_ids, []),
            "source_file_ids": json_value(f.source_file_ids, []),
            "source_rows": json_value(f.source_rows, []),
            "explanation": f.explanation,
            "episode_id": f.episode_id,
            "created_at": f.created_at,
        }

    top = [finding_view(findings_by_id[i]) for i in ids if i in findings_by_id]
    breakdown = json_value(row.findings_breakdown, {})
    if not isinstance(breakdown, dict): breakdown = {}
    return {
        "score": int(row.score),
        "risk_level": row.risk_level,
        "top_findings": top,
        "total_findings": int(row.total_findings),
        "findings_breakdown": breakdown,
        "computed_at": row.computed_at,
    }


def build_evidence_views(conn: Connection, case_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        select(raw_files_table).where(raw_files_table.c.case_id == case_id)
        .order_by(raw_files_table.c.uploaded_at.desc())
    ).fetchall()
    result = []
    for row in rows:
        size = getattr(row, "file_size_bytes", None)
        result.append({
            "id": row.id,
            "name": row.filename,
            "filename": row.filename,
            "size_bytes": int(size or 0),
            "size": _human_size(int(size or 0)),
            "domain": row.file_type,
            "status": getattr(row, "status", None) or "complete",
            "progress": 100,
            "hash": row.sha256,
            "upload_date": row.uploaded_at,
            "records_count": int(row.row_count or 0),
            "parse_errors": json_value(getattr(row, "parse_errors", None), []),
        })
    return result


def _human_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024**2:
        return f"{size / 1024:.1f} KB"
    if size < 1024**3:
        return f"{size / 1024**2:.1f} MB"
    return f"{size / 1024**3:.1f} GB"



def build_case_notes(conn: Connection, case_id: str) -> list[dict[str, Any]]:
    from backend.shared.schema import case_notes_table
    rows = conn.execute(
        select(case_notes_table).where(case_notes_table.c.case_id == case_id)
        .order_by(case_notes_table.c.created_at.desc())
    ).fetchall()
    return [
        {
            "id": row.id,
            "timestamp": row.created_at,
            "author": row.author,
            "text": row.text,
        }
        for row in rows
    ]


def build_case_alert_previews(conn: Connection, case_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        select(findings_table).where(findings_table.c.case_id == case_id)
        .order_by(findings_table.c.created_at.desc())
    ).fetchall()
    return [
        {
            "id": row.id,
            "title": row.rule_id,
            "description": row.explanation,
            "severity": row.severity,
            "time_ago": _relative_time(row.created_at),
            "rule_id": row.rule_id,
            "fraud_weight": row.fraud_weight,
            "confidence": float(row.confidence),
            "created_at": row.created_at,
        }
        for row in rows
    ]


def _relative_time(value: str | None) -> str:
    dt = parse_ts(value)
    if not dt:
        return ""
    seconds = max(0, int((datetime.now(timezone.utc) - dt).total_seconds()))
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"


def build_case_detail(conn: Connection, case_id: str) -> dict[str, Any]:
    row = conn.execute(select(cases_table).where(cases_table.c.id == case_id)).fetchone()
    if not row:
        return {}
    entities = build_entity_views(conn, case_id)
    score = build_fraud_score_view(conn, case_id)
    stats = build_case_stats(conn, case_id)
    loss = estimated_loss(conn, case_id)
    event_rows = conn.execute(
        select(canonical_events_table.c.ts_start).where(canonical_events_table.c.case_id == case_id)
        .order_by(canonical_events_table.c.ts_start.asc())
    ).fetchall()
    incident_date = event_rows[0].ts_start if event_rows else None
    io_profile = None
    if row.assigned_io:
        io_profile = conn.execute(select(users_table).where(users_table.c.username == row.assigned_io)).fetchone()
    return {
        "id": row.id,
        "name": row.name,
        "title": row.title,
        "case_type": getattr(row, "case_type", None),
        "description": row.description,
        "status": row.status,
        "priority": row.priority,
        "assigned_io": row.assigned_io,
        "assigned_io_name": io_profile.name if io_profile else row.assigned_io,
        "assigned_io_role": io_profile.role if io_profile else None,
        "assigned_io_station": io_profile.station if io_profile else None,
        "entities_count": len(entities),
        "created_at": row.created_at,
        "last_activity": row.updated_at,
        "fraud_score": score.get("score", 0),
        "risk_level": score.get("risk_level", "LOW"),
        "estimated_loss": loss,
        "incident_date": incident_date,
        "stats": stats,
        "entities": entities,
        "notes": build_case_notes(conn, case_id),
        "alerts": build_case_alert_previews(conn, case_id),
        "evidence": build_evidence_views(conn, case_id),
    }
