"""
Single source of truth for the DigitalSentinel database schema.

Defines SQLAlchemy Core tables and Pydantic models for all database tables.

IMPORT RULES:
    - This module has ZERO imports from any other backend module.
    - Every other backend module imports FROM here.
    - Members 2, 3, 4 treat this file as READ ONLY.

TABLE OVERVIEW:
    cases              – top-level investigation container
    raw_files          – uploaded evidence files with SHA-256 hash
    canonical_events   – normalised events from all data sources
    entities           – resolved entities
    entity_links       – graph edges between entities
    episodes           – temporal clusters of related events
    findings           – rule-triggered forensic findings
    fraud_scores       – per-case aggregate risk score
    audit_logs         – investigation audit trail

CONVENTIONS:
    - All primary keys are TEXT storing uuid4() strings.
    - All timestamps are TEXT storing UTC ISO-8601 strings.
    - All JSON arrays / objects are TEXT columns storing JSON strings.
    - All API responses use snake_case JSON keys.
    - Phone numbers are normalised to 10-digit Indian mobile strings.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import (
    Column,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    Table,
    Text,
)


# ──────────────────────────────────────────────
#  Enums
# ──────────────────────────────────────────────


class EventType(str, Enum):
    """Canonical event categories across all data sources."""

    CALL = "CALL"
    SMS = "SMS"
    IPDR_SESSION = "IPDR_SESSION"
    LOCATION_PING = "LOCATION_PING"
    BANK_TRANSFER = "BANK_TRANSFER"
    SOCIAL_POST = "SOCIAL_POST"
    SOCIAL_INTERACTION = "SOCIAL_INTERACTION"


class ConfidenceTier(str, Enum):
    """Three-level confidence classification for entity links."""

    CONFIRMED = "CONFIRMED"
    PROBABLE = "PROBABLE"
    CANDIDATE = "CANDIDATE"


class CaseStatus(str, Enum):
    """Lifecycle states for an investigation case."""

    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class CasePriority(str, Enum):
    """Manually assigned priority for an investigation case."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FileType(str, Enum):
    """Supported evidence file types."""

    CDR = "CDR"
    BANK = "BANK"
    IPDR = "IPDR"
    SOCIAL = "SOCIAL"


class Severity(str, Enum):
    """Finding severity levels."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RiskLevel(str, Enum):
    """Fraud-score risk levels."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class LinkType(str, Enum):
    """Edge types in the entity relationship graph."""

    SAME_PERSON = "SAME_PERSON"
    SAME_DEVICE = "SAME_DEVICE"
    FINANCIAL = "FINANCIAL"
    COMMS = "COMMS"
    LOCATION = "LOCATION"


# ──────────────────────────────────────────────
#  SQLAlchemy Core Tables
# ──────────────────────────────────────────────


metadata = MetaData()


# ──────────────────────────────────────────────
# Cases
# ──────────────────────────────────────────────

cases_table = Table(
    "cases",
    metadata,
    Column("id", Text, primary_key=True),
    Column("name", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("description", Text),
    Column("status", Text, nullable=False, server_default=CaseStatus.OPEN.value),
    Column("priority", Text, nullable=False, server_default=CasePriority.MEDIUM.value),
    Column("assigned_io", Text),
    Column("case_type", Text),
    Column("created_at", Text, nullable=False),
    Column("updated_at", Text, nullable=False),
)


# ──────────────────────────────────────────────
# Raw evidence files
# ──────────────────────────────────────────────

raw_files_table = Table(
    "raw_files",
    metadata,
    Column("id", Text, primary_key=True),                              # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("filename", Text, nullable=False),
    Column("file_type", Text, nullable=False),                         # FileType
    Column("sha256", Text, nullable=False),
    Column("row_count", Integer),
    Column("uploaded_at", Text, nullable=False),                      # UTC ISO-8601
    Column("file_size_bytes", Integer),
    Column("status", Text, nullable=False, server_default="complete"),
    Column("parse_errors", Text),                                      # JSON array
)


# ──────────────────────────────────────────────
# Canonical events
# ──────────────────────────────────────────────

canonical_events_table = Table(
    "canonical_events",
    metadata,
    Column("id", Text, primary_key=True),                              # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("event_type", Text, nullable=False),                        # EventType
    Column("ts_start", Text, nullable=False),                          # UTC ISO-8601
    Column("ts_end", Text),                                            # nullable
    Column("actor_raw", Text, nullable=False),                         # normalised MSISDN / account / IP
    Column("peer_raw", Text),                                          # nullable
    Column("device_id", Text),                                         # IMEI or device fingerprint
    Column("location_raw", Text),                                      # tower_id or lat,lng
    Column("amount", Float),                                           # for BANK_TRANSFER
    Column("payload", Text, nullable=False),                           # JSON string — source-specific fields
    Column(
        "source_file_id",
        Text,
        ForeignKey("raw_files.id"),
        nullable=False,
    ),
    Column("source_row", Integer, nullable=False),                     # 0-indexed row in CSV
    Column("confidence", Float, nullable=False, server_default="1.0"),

    # Entity resolver output
    Column("actor_entity_id", Text, ForeignKey("entities.id")),
    Column("peer_entity_id", Text, ForeignKey("entities.id")),
)


# ──────────────────────────────────────────────
# Entities
# ──────────────────────────────────────────────

entities_table = Table(
    "entities",
    metadata,
    Column("id", Text, primary_key=True),                              # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("entity_type", Text, nullable=False),                       # PERSON, DEVICE, ACCOUNT, etc.
    Column("canonical_id", Text, nullable=False),                      # de-duplicated identifier
    Column("label", Text),                                             # human-readable label
    Column("metadata_json", Text),                                     # JSON string
    Column("created_at", Text, nullable=False),                        # UTC ISO-8601
)


# ──────────────────────────────────────────────
# Entity links / graph edges
# ──────────────────────────────────────────────

entity_links_table = Table(
    "entity_links",
    metadata,
    Column("id", Text, primary_key=True),                              # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("entity_a", Text, ForeignKey("entities.id"), nullable=False),
    Column("entity_b", Text, ForeignKey("entities.id"), nullable=False),
    Column("link_type", Text, nullable=False),                         # LinkType
    Column("confidence", Float, nullable=False),                       # 0.0 – 1.0
    Column("confidence_tier", Text, nullable=False),                   # ConfidenceTier
    Column("evidence_event_ids", Text, nullable=False),                # JSON array
    Column("created_at", Text, nullable=False),                        # UTC ISO-8601
)


# ──────────────────────────────────────────────
# Episodes
# ──────────────────────────────────────────────

episodes_table = Table(
    "episodes",
    metadata,
    Column("id", Text, primary_key=True),                              # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("ts_start", Text, nullable=False),                          # UTC ISO-8601
    Column("ts_end", Text, nullable=False),                            # UTC ISO-8601
    Column("entity_ids", Text, nullable=False),                        # JSON array
    Column("event_ids", Text, nullable=False),                         # JSON array
    Column("label", Text),                                             # auto-generated label
    Column("summary", Text),                                           # narrative summary
    Column("created_at", Text, nullable=False),                        # UTC ISO-8601
)


# ──────────────────────────────────────────────
# Findings
# ──────────────────────────────────────────────

findings_table = Table(
    "findings",
    metadata,
    Column("id", Text, primary_key=True),                              # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("episode_id", Text, ForeignKey("episodes.id")),             # nullable
    Column("rule_id", Text, nullable=False),                           # CTN-001 etc.
    Column("severity", Text, nullable=False),                          # Severity
    Column("fraud_weight", Integer, nullable=False),                   # 0 – 30
    Column("confidence", Float, nullable=False),                       # 0.0 – 1.0
    Column("entity_ids", Text, nullable=False),                        # JSON array
    Column("event_ids", Text, nullable=False),                         # JSON array
    Column("source_file_ids", Text, nullable=False),                   # JSON array
    Column("source_rows", Text, nullable=False),                       # JSON array
    Column("explanation", Text, nullable=False),                       # human-readable
    Column("rule_version", Text, nullable=False, server_default="1.0"),
    Column("created_at", Text, nullable=False),                        # UTC ISO-8601
)


# ──────────────────────────────────────────────
# Fraud scores
# ──────────────────────────────────────────────

fraud_scores_table = Table(
    "fraud_scores",
    metadata,
    Column("id", Text, primary_key=True),                              # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("score", Integer, nullable=False),                         # 0 – 100
    Column("risk_level", Text, nullable=False),                        # RiskLevel
    Column("findings_breakdown", Text, nullable=False),                # JSON object
    Column("top_findings", Text, nullable=False),                      # JSON array of finding IDs
    Column("total_findings", Integer, nullable=False),
    Column("computed_at", Text, nullable=False),                      # UTC ISO-8601
)


# ──────────────────────────────────────────────
# Audit logs
# ──────────────────────────────────────────────

audit_logs = Table(
    "audit_logs",
    metadata,
    Column("id", Text, primary_key=True),
    Column("case_id", Text, ForeignKey("cases.id"), nullable=True),
    Column("user", Text, nullable=False),
    Column("action", Text, nullable=False),
    Column("target", Text, nullable=True),
    Column("detail", Text, nullable=True),
    Column("ip_address", Text, nullable=True),
    Column("ts", Text, nullable=False),                               # UTC ISO-8601
)


# Case investigator notes
case_notes_table = Table(
    "case_notes",
    metadata,
    Column("id", Text, primary_key=True),
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("author", Text, nullable=False),
    Column("text", Text, nullable=False),
    Column("created_at", Text, nullable=False),
)


# Department personnel directory. Authentication credentials remain separate
# from directory metadata; passwords are never stored in this table.
users_table = Table(
    "users",
    metadata,
    Column("id", Text, primary_key=True),
    Column("username", Text, nullable=False, unique=True),
    Column("badge_id", Text),
    Column("name", Text, nullable=False),
    Column("rank", Text),
    Column("unit", Text),
    Column("station", Text),
    Column("email", Text),
    Column("role", Text, nullable=False),
    Column("status", Text, nullable=False, server_default="ACTIVE"),
    Column("mfa_enabled", Integer, nullable=False, server_default="1"),
    Column("created_at", Text, nullable=False),
)


# ──────────────────────────────────────────────
#  Pydantic Models
# ──────────────────────────────────────────────


class Case(BaseModel):
    """
    Complete case representation.

    entities_count is intentionally NOT stored in the cases table.
    It must be calculated from the entities table by the API/service layer.
    """

    id: Optional[str] = None
    name: str
    title: str
    description: Optional[str] = None
    status: str = CaseStatus.OPEN.value

    # Manually assigned case priority.
    priority: str = CasePriority.MEDIUM.value

    # Investigator assigned to this case.
    assigned_io: Optional[str] = None
    case_type: Optional[str] = None

    # Calculated from entities.case_id.
    entities_count: int = 0

    # Immutable case creation timestamp.
    created_at: Optional[str] = None

    # Latest meaningful modification/activity.
    updated_at: Optional[str] = None


class RawFile(BaseModel):
    id: Optional[str] = None
    case_id: str
    filename: str
    file_type: str
    sha256: str
    row_count: Optional[int] = None
    uploaded_at: Optional[str] = None
    file_size_bytes: Optional[int] = None
    status: str = "complete"
    parse_errors: list[str] = []


class CanonicalEvent(BaseModel):
    id: Optional[str] = None
    case_id: str
    event_type: EventType
    ts_start: str
    ts_end: Optional[str] = None
    actor_raw: str
    peer_raw: Optional[str] = None
    device_id: Optional[str] = None
    location_raw: Optional[str] = None
    amount: Optional[float] = None
    payload: dict
    source_file_id: str
    source_row: int
    confidence: float = 1.0
    actor_entity_id: Optional[str] = None
    peer_entity_id: Optional[str] = None


class Entity(BaseModel):
    id: Optional[str] = None
    case_id: str
    entity_type: str
    canonical_id: str
    label: Optional[str] = None
    metadata_json: Optional[dict] = None
    created_at: Optional[str] = None


class EntityLink(BaseModel):
    id: Optional[str] = None
    case_id: str
    entity_a: str
    entity_b: str
    link_type: str
    confidence: float
    confidence_tier: str
    evidence_event_ids: list[str]
    created_at: Optional[str] = None


class Episode(BaseModel):
    id: Optional[str] = None
    case_id: str
    ts_start: str
    ts_end: str
    entity_ids: list[str]
    event_ids: list[str]
    label: Optional[str] = None
    summary: Optional[str] = None
    created_at: Optional[str] = None


class Finding(BaseModel):
    id: Optional[str] = None
    case_id: str
    episode_id: Optional[str] = None
    rule_id: str
    severity: str
    fraud_weight: int
    confidence: float
    entity_ids: list[str]
    event_ids: list[str]
    source_file_ids: list[str]
    source_rows: list[int]
    explanation: str
    rule_version: str = "1.0"
    created_at: Optional[str] = None


class FraudScore(BaseModel):
    id: Optional[str] = None
    case_id: str
    score: int
    risk_level: str
    findings_breakdown: dict
    top_findings: list[str]
    total_findings: int
    computed_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Backward-compatible table aliases
# ---------------------------------------------------------------------------

canonical_events = canonical_events_table
entities = entities_table
entity_links = entity_links_table
findings = findings_table
episodes = episodes_table
fraud_scores = fraud_scores_table