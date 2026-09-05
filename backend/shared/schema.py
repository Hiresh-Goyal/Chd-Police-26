import uuid
from enum import Enum
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import (
    MetaData, Table, Column, String, Float, Integer, Numeric,
    DateTime, JSON, ForeignKey, Enum as SQLEnum, text, Boolean
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP

metadata = MetaData()

class EventType(str, Enum):
    CALL = 'CALL'
    SMS = 'SMS'
    IPDR_SESSION = 'IPDR_SESSION'
    LOCATION_PING = 'LOCATION_PING'
    BANK_TRANSFER = 'BANK_TRANSFER'
    SOCIAL_POST = 'SOCIAL_POST'
    SOCIAL_INTERACTION = 'SOCIAL_INTERACTION'

class ConfidenceTier(str, Enum):
    CONFIRMED = 'CONFIRMED'
    PROBABLE = 'PROBABLE'
    CANDIDATE = 'CANDIDATE'
    IMPOSSIBLE = 'IMPOSSIBLE'

class Severity(str, Enum):
    CRITICAL = 'CRITICAL'
    HIGH = 'HIGH'
    MEDIUM = 'MEDIUM'
    LOW = 'LOW'

class RiskLevel(str, Enum):
    CRITICAL = 'CRITICAL'
    HIGH = 'HIGH'
    MEDIUM = 'MEDIUM'
    LOW = 'LOW'

# --- SQLAlchemy Core Tables ---

cases = Table(
    'cases', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('title', String, nullable=False),
    Column('description', String),
    Column('status', String, server_default='OPEN'),
    Column('created_by', String, server_default='system'),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text('now()')),
    Column('updated_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

users = Table(
    'users', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('username', String, unique=True, nullable=False),
    Column('hashed_password', String, nullable=False),
    Column('role', String, server_default='investigator'),
    Column('is_active', Boolean, server_default='true'),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

raw_files = Table(
    'raw_files', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('case_id', UUID(as_uuid=True), ForeignKey('cases.id')),
    Column('filename', String),
    Column('original_name', String),
    Column('file_type', String),
    Column('sha256', String(64)),
    Column('file_size', Integer),
    Column('path', String),
    Column('events_created', Integer, server_default='0'),
    Column('parse_errors', JSONB, server_default='[]'),
    Column('uploaded_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

audit_logs = Table(
    'audit_logs', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), nullable=True),
    Column('action', String, nullable=False),
    Column('entity', String),
    Column('entity_id', String),
    Column('details', JSONB, server_default='{}'),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

watchlist = Table(
    'watchlist', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('entity_type', String, nullable=False),
    Column('entity_value', String, nullable=False, unique=True),
    Column('reason', String),
    Column('added_by', UUID(as_uuid=True), ForeignKey('users.id'), nullable=True),
    Column('is_active', Boolean, server_default='true'),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

entities = Table(
    'entities', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('case_id', UUID(as_uuid=True), ForeignKey('cases.id')),
    Column('type', String),
    Column('canonical_value', String),
    Column('confidence_tier', String),
    Column('first_seen', TIMESTAMP(timezone=True)),
    Column('last_seen', TIMESTAMP(timezone=True)),
    Column('source_ids', JSONB),
    Column('metadata', JSONB, server_default='{}'),
    Column('fraud_score_contribution', Float, server_default='0.0')
)

episodes = Table(
    'episodes', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('case_id', UUID(as_uuid=True), ForeignKey('cases.id')),
    Column('ts_start', TIMESTAMP(timezone=True)),
    Column('ts_end', TIMESTAMP(timezone=True)),
    Column('duration_hours', Float),
    Column('entity_ids', JSONB),
    Column('event_ids', JSONB),
    Column('label', String),
    Column('summary', String),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

canonical_events = Table(
    'canonical_events', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('case_id', UUID(as_uuid=True), ForeignKey('cases.id')),
    Column('event_type', String),
    Column('ts_start', TIMESTAMP(timezone=True), nullable=False),
    Column('ts_end', TIMESTAMP(timezone=True)),
    Column('actor_raw', String),
    Column('peer_raw', String),
    Column('device_id', String),
    Column('location_raw', String),
    Column('amount', Numeric(15, 2)),
    Column('payload', JSONB, server_default='{}'),
    Column('source_file_id', UUID(as_uuid=True), ForeignKey('raw_files.id')),
    Column('source_row', Integer),
    Column('confidence', Float, server_default='1.0'),
    Column('actor_entity_id', UUID(as_uuid=True), ForeignKey('entities.id'), nullable=True),
    Column('peer_entity_id', UUID(as_uuid=True), ForeignKey('entities.id'), nullable=True),
    Column('episode_id', UUID(as_uuid=True), ForeignKey('episodes.id'), nullable=True)
)

entity_links = Table(
    'entity_links', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('case_id', UUID(as_uuid=True), ForeignKey('cases.id')),
    Column('entity_a', UUID(as_uuid=True), ForeignKey('entities.id')),
    Column('entity_b', UUID(as_uuid=True), ForeignKey('entities.id')),
    Column('link_type', String),
    Column('confidence', Float),
    Column('confidence_tier', String),
    Column('evidence_event_ids', JSONB),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

findings = Table(
    'findings', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('case_id', UUID(as_uuid=True), ForeignKey('cases.id')),
    Column('episode_id', UUID(as_uuid=True), ForeignKey('episodes.id'), nullable=True),
    Column('rule_id', String),
    Column('severity', String),
    Column('fraud_weight', Integer),
    Column('confidence', Float),
    Column('entity_ids', JSONB),
    Column('event_ids', JSONB),
    Column('source_file_ids', JSONB),
    Column('source_rows', JSONB),
    Column('explanation', String),
    Column('rule_version', String, server_default='1.0'),
    Column('ml_signal', Float, server_default='0.0'),
    Column('created_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

fraud_scores = Table(
    'fraud_scores', metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('case_id', UUID(as_uuid=True), ForeignKey('cases.id'), unique=True),
    Column('score', Integer),
    Column('risk_level', String),
    Column('findings_breakdown', JSONB),
    Column('top_findings', JSONB),
    Column('total_findings', Integer),
    Column('ml_anomaly_summary', JSONB),
    Column('computed_at', TIMESTAMP(timezone=True), server_default=text('now()'))
)

# --- Pydantic Models ---

class CaseModel(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RawFileModel(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    filename: str
    original_name: str
    file_type: str
    sha256: str
    file_size: int
    path: str
    events_created: int
    parse_errors: List[Any]
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EntityModel(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    type: str
    canonical_value: str
    confidence_tier: str
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    source_ids: List[str]
    metadata: Dict[str, Any]
    fraud_score_contribution: float
    model_config = ConfigDict(from_attributes=True)

class CanonicalEventModel(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    event_type: str
    ts_start: datetime
    ts_end: Optional[datetime] = None
    actor_raw: str
    peer_raw: Optional[str] = None
    device_id: Optional[str] = None
    location_raw: Optional[str] = None
    amount: Optional[float] = None
    payload: Dict[str, Any]
    source_file_id: uuid.UUID
    source_row: int
    confidence: float
    actor_entity_id: Optional[uuid.UUID] = None
    peer_entity_id: Optional[uuid.UUID] = None
    episode_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)

class FindingModel(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    episode_id: Optional[uuid.UUID] = None
    rule_id: str
    severity: str
    fraud_weight: int
    confidence: float
    entity_ids: List[str]
    event_ids: List[str]
    source_file_ids: List[str]
    source_rows: List[Dict[str, Any]]
    explanation: str
    rule_version: str
    ml_signal: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FraudScoreModel(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    score: int
    risk_level: str
    findings_breakdown: Dict[str, Any]
    top_findings: List[Dict[str, Any]]
    total_findings: int
    ml_anomaly_summary: Dict[str, Any]
    computed_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AuditLogModel(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    action: str
    entity: Optional[str] = None
    entity_id: Optional[str] = None
    details: Dict[str, Any]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WatchlistModel(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_value: str
    reason: Optional[str] = None
    added_by: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
