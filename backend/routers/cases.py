"""
Case management, evidence uploading, case analysis pipeline, and report snapshot.

Cases are persisted in PostgreSQL and are the single source of truth for
case metadata and activity state.
"""

import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy import func

from backend.auth.audit import log_action
from backend.auth.jwt import get_current_user


# ──────────────────────────────────────────────
#  Environment / Router
# ──────────────────────────────────────────────

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "./data/evidence")

router = APIRouter(prefix="/cases", tags=["Cases"])


# ──────────────────────────────────────────────
#  Pydantic Request / Response Models
# ──────────────────────────────────────────────


class CreateCaseRequest(BaseModel):
    """
    Request body for creating a new investigation case.

    Priority and assigned_io are explicitly supplied by the investigator.
    """

    name: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    assigned_io: Optional[str] = None


class UpdateCaseRequest(BaseModel):
    """
    Fields that can be manually changed after case creation.

    created_at is intentionally absent because case creation time is immutable.
    """

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_io: Optional[str] = None


class CaseResponse(BaseModel):
    """
    API representation of a case.

    entities_count is calculated from the entities table.
    updated_at is exposed to the frontend as last_activity.
    """

    id: str
    name: str
    description: Optional[str] = None
    status: str
    priority: str
    assigned_io: Optional[str] = None
    entities_count: int
    created_at: str
    last_activity: str


class UploadResponse(BaseModel):
    file_id: str
    events_created: int
    filename: Optional[str] = None
    parse_errors: Optional[List[str]] = None
    status: str = "success"


class FindingResultItem(BaseModel):
    id: Optional[str] = None
    rule_id: str
    severity: str
    fraud_weight: int
    weight: Optional[int] = None
    confidence: float
    entity_ids: List[str]
    event_ids: List[str]
    source_file_ids: List[str]
    source_rows: List[int]
    explanation: str


class AnalyzeResponse(BaseModel):
    case_id: str
    findings: List[FindingResultItem]
    episodes_created: int
    fraud_score: int
    risk_level: str
    findings_created: Optional[int] = None


# ──────────────────────────────────────────────
#  Internal Helpers
# ──────────────────────────────────────────────


def _now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _validate_case_status(value: str) -> str:
    """Validate a case status against the supported status values."""
    from backend.shared.schema import CaseStatus

    value = value.strip().upper()

    valid_statuses = {item.value for item in CaseStatus}

    if value not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status: {value}. "
                f"Must be one of {sorted(valid_statuses)}"
            ),
        )

    return value


def _validate_case_priority(value: str) -> str:
    """Validate a case priority against the supported priority values."""
    from backend.shared.schema import CasePriority

    value = value.strip().upper()

    valid_priorities = {item.value for item in CasePriority}

    if value not in valid_priorities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid priority: {value}. "
                f"Must be one of {sorted(valid_priorities)}"
            ),
        )

    return value


def _get_case_with_entity_count(case_id: str) -> Dict[str, Any]:
    """
    Fetch a case and calculate its current resolved-entity count.

    entities_count is deliberately not stored in the cases table.
    """

    from backend.db.connection import get_connection
    from backend.shared.schema import cases_table, entities_table

    with get_connection() as conn:
        case_row = conn.execute(
            cases_table.select().where(cases_table.c.id == case_id)
        ).fetchone()

        if case_row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case {case_id} not found",
            )

        entity_count = conn.execute(
            func.count(entities_table.c.id)
        ).select_from(
            entities_table
        ).where(
            entities_table.c.case_id == case_id
        ).scalar_one()

        return {
            "id": case_row.id,
            "name": case_row.name,
            "description": case_row.description,
            "status": case_row.status,
            "priority": case_row.priority,
            "assigned_io": case_row.assigned_io,
            "entities_count": int(entity_count or 0),
            "created_at": case_row.created_at,
            "last_activity": case_row.updated_at,
        }


# ──────────────────────────────────────────────
#  Case Endpoints
# ──────────────────────────────────────────────


@router.get("", response_model=List[CaseResponse])
async def list_cases():
    """List all investigation cases."""

    from backend.db.connection import get_connection
    from backend.shared.schema import cases_table, entities_table, fraud_scores_table

    with get_connection() as conn:
        rows = conn.execute(
            cases_table.select().order_by(cases_table.c.created_at.desc())
        ).fetchall()

        if not rows:
            return []

        # Count resolved entities for all cases in one query.
        entity_counts = conn.execute(
            entities_table.select()
        ).fetchall()

        counts_by_case: Dict[str, int] = {}
        for entity in entity_counts:
            counts_by_case[entity.case_id] = counts_by_case.get(entity.case_id, 0) + 1

        # Fetch fraud scores
        from sqlalchemy import select
        score_rows = conn.execute(
            select(fraud_scores_table.c.case_id, fraud_scores_table.c.score, fraud_scores_table.c.risk_level)
        ).fetchall()
        scores_by_case = {r.case_id: {"score": r.score, "risk_level": r.risk_level} for r in score_rows}

        return [
            {
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "status": row.status,
                "priority": row.priority,
                "assigned_io": row.assigned_io,
                "entities_count": counts_by_case.get(row.id, 0),
                "fraud_score": scores_by_case.get(row.id, {}).get("score"),
                "risk_level": scores_by_case.get(row.id, {}).get("risk_level"),
                "created_at": row.created_at,
                "last_activity": row.updated_at,
            }
            for row in rows
        ]


@router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_case(
    case_data: CreateCaseRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Create a new investigation case."""

    from backend.db.connection import get_connection
    from backend.shared.schema import CaseStatus, cases_table

    if not case_data.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case name cannot be empty",
        )

    priority = _validate_case_priority(case_data.priority)

    case_id = str(uuid.uuid4())
    now_iso = _now_iso()

    case_name = case_data.name.strip()
    description = case_data.description or ""

    with get_connection() as conn:
        conn.execute(
            cases_table.insert().values(
                id=case_id,
                name=case_name,
                description=description,
                status=CaseStatus.OPEN.value,
                priority=priority,
                assigned_io=case_data.assigned_io,
                created_at=now_iso,
                updated_at=now_iso,
            )
        )

    user_name = (
        current_user.get("username", "admin")
        if isinstance(current_user, dict)
        else str(current_user or "admin")
    )

    log_action(
        user=user_name,
        action="CREATE_CASE",
        case_id=case_id,
        target=case_id,
        detail={
            "priority": priority,
            "assigned_io": case_data.assigned_io,
        },
        ip_address=request.client.host if request.client else None,
    )

    return {
        "id": case_id,
        "name": case_name,
        "description": description,
        "status": CaseStatus.OPEN.value,
        "priority": priority,
        "assigned_io": case_data.assigned_io,
        "entities_count": 0,
        "created_at": now_iso,
        "last_activity": now_iso,
    }


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str):
    """Get details for a single case."""

    return _get_case_with_entity_count(case_id)


@router.put("/{case_id}", response_model=CaseResponse)
@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_data: UpdateCaseRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Update mutable case metadata.

    Any successful metadata change updates updated_at, which is exposed
    to the frontend as last_activity.

    created_at is never modified.
    """

    from backend.db.connection import get_connection
    from backend.shared.schema import cases_table

    # Ensure the case exists first.
    _get_case_with_entity_count(case_id)

    update_values: Dict[str, Any] = {}

    if "name" in case_data.model_fields_set:
        if case_data.name is None or not case_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Case name cannot be empty",
            )

        update_values["name"] = case_data.name.strip()

    if "description" in case_data.model_fields_set:
        update_values["description"] = case_data.description

    if "status" in case_data.model_fields_set:
        if case_data.status is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status cannot be null",
            )

        update_values["status"] = _validate_case_status(case_data.status)

    if "priority" in case_data.model_fields_set:
        if case_data.priority is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Priority cannot be null",
            )

        update_values["priority"] = _validate_case_priority(
            case_data.priority
        )

    if "assigned_io" in case_data.model_fields_set:
        update_values["assigned_io"] = case_data.assigned_io

    if not update_values:
        return _get_case_with_entity_count(case_id)

    now_iso = _now_iso()
    update_values["updated_at"] = now_iso

    with get_connection() as conn:
        conn.execute(
            cases_table.update()
            .where(cases_table.c.id == case_id)
            .values(**update_values)
        )

    user_name = (
        current_user.get("username", "admin")
        if isinstance(current_user, dict)
        else str(current_user or "admin")
    )

    log_action(
        user=user_name,
        action="UPDATE_CASE",
        case_id=case_id,
        target=case_id,
        detail={
            "changes": {
                key: value
                for key, value in update_values.items()
                if key != "updated_at"
            }
        },
        ip_address=request.client.host if request.client else None,
    )

    return _get_case_with_entity_count(case_id)


# ──────────────────────────────────────────────
#  Evidence Upload
# ──────────────────────────────────────────────


@router.post("/{case_id}/upload", response_model=UploadResponse)
async def upload_evidence(
    case_id: str,
    request: Request,
    file: UploadFile = File(...),
    file_type: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload an evidence file and ingest it into canonical_events.

    last_activity is updated only after successful ingestion.
    """

    from backend.db.connection import get_connection
    from backend.shared.schema import cases_table

    # Ensure the case exists.
    _get_case_with_entity_count(case_id)

    valid_types = {"CDR", "BANK", "IPDR", "SOCIAL"}

    file_type_upper = file_type.strip().upper()

    if file_type_upper not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid file_type: {file_type}. "
                f"Must be one of {sorted(valid_types)}"
            ),
        )

    file_uuid = str(uuid.uuid4())
    safe_filename = Path(file.filename or "evidence.csv").name

    target_dir = Path(EVIDENCE_DIR) / case_id
    target_dir.mkdir(parents=True, exist_ok=True)

    target_path = target_dir / f"{file_uuid}_{safe_filename}"

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user_name = (
        current_user.get("username", "admin")
        if isinstance(current_user, dict)
        else str(current_user or "admin")
    )

    try:
        from backend.ingestion.ingest import ingest_file

        ingest_res = ingest_file(
            case_id,
            str(target_path),
            file_type_upper.lower(),
        )

        result = {
            "file_id": ingest_res.get("file_id", file_uuid),
            "events_created": ingest_res.get("events_created", 0),
            "filename": safe_filename,
            "parse_errors": ingest_res.get("parse_errors", []),
            "status": "success",
        }

        # Ingestion succeeded: this is meaningful case activity.
        now_iso = _now_iso()

        with get_connection() as conn:
            conn.execute(
                cases_table.update()
                .where(cases_table.c.id == case_id)
                .values(updated_at=now_iso)
            )

        log_action(
            user=user_name,
            action="UPLOAD",
            case_id=case_id,
            target=result["file_id"],
            detail={
                "events_created": result["events_created"],
                "file_type": file_type_upper,
            },
            ip_address=request.client.host if request.client else None,
        )

        return result

    except Exception as e:
        # Do not report fake success.
        # Remove the uploaded file if ingestion failed.
        try:
            if target_path.exists():
                target_path.unlink()
        except OSError:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence ingestion failed: {str(e)}",
        ) from e


# ──────────────────────────────────────────────
#  Case Analysis
# ──────────────────────────────────────────────


@router.post(
    "/{case_id}/analyze",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=AnalyzeResponse,
)
async def analyze_case(
    case_id: str,
    response: Response,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Trigger entity resolution and detection engine pipeline.

    A successful analysis updates the case's last_activity timestamp.
    """

    from backend.db.connection import get_connection
    from backend.detection.engine import run_detection
    from backend.resolution.resolver import resolve
    from backend.shared.schema import cases_table

    response.status_code = status.HTTP_202_ACCEPTED

    # Ensure the case exists.
    _get_case_with_entity_count(case_id)

    user_name = (
        current_user.get("username", "admin")
        if isinstance(current_user, dict)
        else str(current_user or "admin")
    )

    # 1. Entity resolution
    resolve(case_id)

    # 2. Detection engine
    det_res = run_detection(case_id)

    findings_list = []

    for finding in det_res.findings:
        finding_weight = getattr(
            finding,
            "weight",
            getattr(finding, "fraud_weight", 20),
        )

        findings_list.append(
            {
                "id": getattr(finding, "id", None),
                "rule_id": finding.rule_id,
                "severity": finding.severity,
                "fraud_weight": finding_weight,
                "weight": finding_weight,
                "confidence": finding.confidence,
                "entity_ids": finding.entity_ids,
                "event_ids": finding.event_ids,
                "source_file_ids": finding.source_file_ids,
                "source_rows": finding.source_rows,
                "explanation": finding.explanation,
            }
        )

    # Analysis completed successfully: update last_activity.
    now_iso = _now_iso()

    with get_connection() as conn:
        conn.execute(
            cases_table.update()
            .where(cases_table.c.id == case_id)
            .values(updated_at=now_iso)
        )

    log_action(
        user=user_name,
        action="ANALYZE",
        case_id=case_id,
        detail={
            "findings_created": len(det_res.findings),
            "fraud_score": det_res.fraud_score,
        },
        ip_address=request.client.host if request.client else None,
    )

    return {
        "case_id": case_id,
        "findings": findings_list,
        "episodes_created": det_res.episodes_created,
        "fraud_score": det_res.fraud_score,
        "risk_level": det_res.risk_level,
        "findings_created": len(findings_list),
    }


# ──────────────────────────────────────────────
#  Case Report
# ──────────────────────────────────────────────


@router.get("/{case_id}/report")
async def get_case_report(
    case_id: str,
    request: Request = None,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Generate a complete JSON snapshot of the case results."""

    user_name = (
        current_user.get("username", "admin")
        if isinstance(current_user, dict)
        else str(current_user or "admin")
    )

    # get_case also verifies that the case exists.
    case = await get_case(case_id)

    log_action(
        user=user_name,
        action="VIEW_REPORT",
        case_id=case_id,
        ip_address=request.client.host
        if request and request.client
        else None,
    )

    # Gather data from sister endpoints.
    from backend.routers.alerts import get_alerts
    from backend.routers.criminalflow import get_criminal_flow
    from backend.routers.geospatial import get_geospatial
    from backend.routers.graph import get_case_graph
    from backend.routers.score import get_fraud_score
    from backend.routers.timeline import get_timeline

    from backend.shared.schema import raw_files_table, findings_table
    from sqlalchemy import select
    from backend.db.connection import get_connection

    # Fetch raw files explicitly
    with get_connection() as conn:
        files_rows = conn.execute(
            select(raw_files_table).where(raw_files_table.c.case_id == case_id)
        ).fetchall()
        
        findings_rows = conn.execute(
            select(findings_table).where(findings_table.c.case_id == case_id)
        ).fetchall()

    files = [dict(r._mapping) for r in files_rows]
    findings = [dict(f._mapping) for f in findings_rows]

    alerts = await get_alerts(case_id)
    score = await get_fraud_score(case_id)
    graph = await get_case_graph(case_id)
    timeline = await get_timeline(case_id)
    flow = await get_criminal_flow(case_id)
    geo = await get_geospatial(case_id)

    return {
        "case": case,
        "fraud_score": score,
        "findings": findings,
        "entities": graph.get("nodes", []),
        "timeline": timeline,
        "files": files,
        "generated_at": _now_iso(),
    }

# ──────────────────────────────────────────────
#  Case Files Endpoints
# ──────────────────────────────────────────────

@router.get("/{case_id}/files")
async def list_case_files(case_id: str):
    from backend.db.connection import get_connection
    from backend.shared.schema import raw_files_table
    from sqlalchemy import select
    
    with get_connection() as conn:
        rows = conn.execute(
            select(raw_files_table).where(raw_files_table.c.case_id == case_id)
        ).fetchall()
        return [
            {
                "id": row.id,
                "case_id": row.case_id,
                "filename": row.filename,
                "file_type": row.file_type,
                "sha256": row.sha256,
                "events_created": row.row_count or 0,
                "parse_errors": [],
                "uploaded_at": row.uploaded_at
            } for row in rows
        ]

# ──────────────────────────────────────────────
#  Case Notes Endpoints
# ──────────────────────────────────────────────

class NoteCreate(BaseModel):
    text: str

@router.get("/{case_id}/notes")
async def list_case_notes(case_id: str):
    from backend.db.connection import get_connection
    from backend.shared.schema import case_notes_table
    from sqlalchemy import select
    
    with get_connection() as conn:
        rows = conn.execute(
            select(case_notes_table).where(case_notes_table.c.case_id == case_id).order_by(case_notes_table.c.created_at.desc())
        ).fetchall()
        return [dict(r._mapping) for r in rows]

@router.post("/{case_id}/notes")
async def add_case_note(case_id: str, note: NoteCreate, current_user: dict = Depends(get_current_user)):
    from backend.db.connection import get_connection
    from backend.shared.schema import case_notes_table
    from sqlalchemy import select
    
    new_id = str(uuid.uuid4())
    now = _now_iso()
    
    with get_connection() as conn:
        conn.execute(case_notes_table.insert().values(
            id=new_id,
            case_id=case_id,
            author=current_user.get("full_name") or current_user.get("username", "Unknown"),
            text=note.text,
            created_at=now
        ))
        conn.commit()
        row = conn.execute(select(case_notes_table).where(case_notes_table.c.id == new_id)).fetchone()
        return dict(row._mapping)

@router.delete("/{case_id}/notes/{note_id}")
async def delete_case_note(case_id: str, note_id: str, current_user: dict = Depends(get_current_user)):
    from backend.db.connection import get_connection
    from backend.shared.schema import case_notes_table
    from sqlalchemy import delete
    
    with get_connection() as conn:
        conn.execute(delete(case_notes_table).where((case_notes_table.c.case_id == case_id) & (case_notes_table.c.id == note_id)))
        conn.commit()
    return {"status": "ok"}