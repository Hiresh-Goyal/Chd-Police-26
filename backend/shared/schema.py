"""
backend/shared/schema.py

Single source of truth for the DigitalSentinel database schema.
Defines SQLAlchemy Core tables and Pydantic models for all 8 tables.

IMPORT RULES:
    - This module has ZERO imports from any other backend module.
    - Every other backend module imports FROM here.
    - Members 2, 3, 4 treat this file as READ ONLY.

TABLE OVERVIEW:
    cases              – top-level investigation container
    raw_files          – uploaded evidence files with SHA-256 hash
    canonical_events   – normalised events from all data sources
    entities           – resolved entities (Member 2)
    entity_links       – graph edges between entities (Member 2)
    episodes           – temporal clusters of related events (Member 3)
    findings           – rule-triggered forensic findings (Member 3)
    fraud_scores       – per-case aggregate risk score (Member 3)

CONVENTIONS:
    - All primary keys are TEXT storing uuid4() strings.
    - All timestamps are TEXT storing UTC ISO-8601 strings.
    - All JSON arrays / objects are TEXT columns storing JSON strings.
    - All API responses use snake_case JSON keys.
    - Phone numbers are normalised to 10-digit Indian mobile strings.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

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
    """Fraud-score risk levels (mirrors Severity values)."""
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

cases_table = Table(
    "cases",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("name", Text, nullable=False),
    Column("description", Text),
    Column("status", Text, nullable=False, server_default="OPEN"), # CaseStatus
    Column("created_at", Text, nullable=False),                    # UTC ISO-8601
)

raw_files_table = Table(
    "raw_files",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("filename", Text, nullable=False),
    Column("file_type", Text, nullable=False),                     # FileType
    Column("sha256", Text, nullable=False),
    Column("row_count", Integer),
    Column("uploaded_at", Text, nullable=False),                   # UTC ISO-8601
)

canonical_events_table = Table(
    "canonical_events",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("event_type", Text, nullable=False),                    # EventType
    Column("ts_start", Text, nullable=False),                      # UTC ISO-8601
    Column("ts_end", Text),                                        # nullable
    Column("actor_raw", Text, nullable=False),                     # normalised MSISDN / account / IP
    Column("peer_raw", Text),                                      # nullable
    Column("device_id", Text),                                     # IMEI or device fingerprint
    Column("location_raw", Text),                                  # tower_id or lat,lng
    Column("amount", Float),                                       # for BANK_TRANSFER
    Column("payload", Text, nullable=False),                       # JSON string — source-specific fields
    Column("source_file_id", Text, ForeignKey("raw_files.id"), nullable=False),
    Column("source_row", Integer, nullable=False),                 # 0-indexed row in CSV
    Column("confidence", Float, nullable=False, server_default="1.0"),
    # Fix 5: nullable FK columns — set by Member 2's entity resolver
    Column("actor_entity_id", Text, ForeignKey("entities.id")),
    Column("peer_entity_id", Text, ForeignKey("entities.id")),
)

entities_table = Table(
    "entities",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("entity_type", Text, nullable=False),                   # e.g. PERSON, DEVICE, ACCOUNT
    Column("canonical_id", Text, nullable=False),                  # de-duplicated identifier
    Column("label", Text),                                         # human-readable label
    Column("metadata_json", Text),                                 # JSON string
    Column("created_at", Text, nullable=False),                    # UTC ISO-8601
)

# Fix 1: entity_links — graph-edge model (entity_a ↔ entity_b)
entity_links_table = Table(
    "entity_links",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("entity_a", Text, ForeignKey("entities.id"), nullable=False),
    Column("entity_b", Text, ForeignKey("entities.id"), nullable=False),
    Column("link_type", Text, nullable=False),                     # LinkType
    Column("confidence", Float, nullable=False),                   # 0.0 – 1.0
    Column("confidence_tier", Text, nullable=False),               # ConfidenceTier
    Column("evidence_event_ids", Text, nullable=False),            # JSON array of canonical_event IDs
    Column("created_at", Text, nullable=False),                    # UTC ISO-8601
)

# Fix 2: episodes — temporal clusters, no pattern_code / score
episodes_table = Table(
    "episodes",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("ts_start", Text, nullable=False),                      # UTC ISO-8601
    Column("ts_end", Text, nullable=False),                        # UTC ISO-8601
    Column("entity_ids", Text, nullable=False),                    # JSON array of entity IDs
    Column("event_ids", Text, nullable=False),                     # JSON array of canonical_event IDs
    Column("label", Text),                                         # auto-generated label
    Column("summary", Text),                                       # narrative summary
    Column("created_at", Text, nullable=False),                    # UTC ISO-8601
)

# Fix 3: findings — full provenance chain
findings_table = Table(
    "findings",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("episode_id", Text, ForeignKey("episodes.id")),         # nullable
    Column("rule_id", Text, nullable=False),                       # e.g. CTN-001
    Column("severity", Text, nullable=False),                      # Severity
    Column("fraud_weight", Integer, nullable=False),               # 0 – 30
    Column("confidence", Float, nullable=False),                   # 0.0 – 1.0
    Column("entity_ids", Text, nullable=False),                    # JSON array
    Column("event_ids", Text, nullable=False),                     # JSON array
    Column("source_file_ids", Text, nullable=False),               # JSON array of raw_file IDs
    Column("source_rows", Text, nullable=False),                   # JSON array of row numbers
    Column("explanation", Text, nullable=False),                   # human-readable
    Column("rule_version", Text, nullable=False, server_default="1.0"),
    Column("created_at", Text, nullable=False),                    # UTC ISO-8601
)

# Fix 4: fraud_scores — per-case, NOT per-entity
fraud_scores_table = Table(
    "fraud_scores",
    metadata,
    Column("id", Text, primary_key=True),                          # uuid4
    Column("case_id", Text, ForeignKey("cases.id"), nullable=False),
    Column("score", Integer, nullable=False),                      # 0 – 100
    Column("risk_level", Text, nullable=False),                    # RiskLevel
    Column("findings_breakdown", Text, nullable=False),            # JSON: {rule_id: weight, …}
    Column("top_findings", Text, nullable=False),                  # JSON array of top finding IDs
    Column("total_findings", Integer, nullable=False),
    Column("computed_at", Text, nullable=False),                   # UTC ISO-8601
)

audit_logs = Table("audit_logs", metadata,
    Column("id",         Text, primary_key=True),
    Column("case_id",    Text, ForeignKey("cases.id"), nullable=True),
    Column("user",       Text, nullable=False),
    Column("action",     Text, nullable=False),   # LOGIN | UPLOAD | ANALYZE | VIEW_ALERTS | VIEW_REPORT | VIEW_GRAPH
    Column("target",     Text, nullable=True),    # file_id, page name, or entity_id
    Column("detail",     Text, nullable=True),    # JSON string with extra context
    Column("ip_address", Text, nullable=True),
    Column("ts",         Text, nullable=False),   # UTC ISO8601
)


# ──────────────────────────────────────────────
#  Pydantic Models
# ──────────────────────────────────────────────

class Case(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: str = CaseStatus.OPEN.value
    created_at: Optional[str] = None


class RawFile(BaseModel):
    id: Optional[str] = None
    case_id: str
    filename: str
    file_type: str  # FileType value
    sha256: str
    row_count: Optional[int] = None
    uploaded_at: Optional[str] = None


class CanonicalEvent(BaseModel):
    id: Optional[str] = None
    case_id: str
    event_type: EventType
    ts_start: str                           # UTC ISO-8601
    ts_end: Optional[str] = None
    actor_raw: str                          # normalised 10-digit MSISDN / account / IP
    peer_raw: Optional[str] = None
    device_id: Optional[str] = None         # IMEI or device fingerprint
    location_raw: Optional[str] = None      # tower_id or lat,lng
    amount: Optional[float] = None          # for BANK_TRANSFER
    payload: dict                           # source-specific extra fields (JSON-serialised for DB)
    source_file_id: str                     # FK → raw_files
    source_row: int                         # 0-indexed row in original CSV
    confidence: float = 1.0
    actor_entity_id: Optional[str] = None   # FK → entities (set by Member 2)
    peer_entity_id: Optional[str] = None    # FK → entities (set by Member 2)


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
    entity_a: str                           # FK → entities
    entity_b: str                           # FK → entities
    link_type: str                          # LinkType value
    confidence: float                       # 0.0 – 1.0
    confidence_tier: str                    # ConfidenceTier value
    evidence_event_ids: list[str]           # serialised as JSON array for DB
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
    rule_id: str                            # e.g. CTN-001
    severity: str                           # Severity value
    fraud_weight: int                       # 0 – 30
    confidence: float                       # 0.0 – 1.0
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
    score: int                              # 0 – 100
    risk_level: str                         # RiskLevel value
    findings_breakdown: dict                # {rule_id: weight, …}
    top_findings: list[str]                 # top finding IDs
    total_findings: int
    computed_at: Optional[str] = None
