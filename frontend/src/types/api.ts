/**
 * DigitalSentinel Shared API Contracts
 * Written by Member 4 — READ ONLY for Member 5
 * 
 * All backend API responses strictly use snake_case JSON keys.
 */

export type EventType =
  | 'CALL'
  | 'SMS'
  | 'IPDR_SESSION'
  | 'LOCATION_PING'
  | 'BANK_TRANSFER'
  | 'SOCIAL_POST'
  | 'SOCIAL_INTERACTION';

export type ConfidenceTier = 'CONFIRMED' | 'PROBABLE' | 'CANDIDATE';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EvidenceFileType = 'CDR' | 'BANK' | 'IPDR' | 'SOCIAL';

/**
 * Canonical Event representation returned by /api/cases/{case_id}/timeline
 */
export interface CanonicalEventAPI {
  id: string;
  event_type: string;
  ts_start: string;
  ts_end: string | null;
  actor_entity_id: string;
  actor_raw: string;
  actor_confidence_tier: string;
  peer_raw: string | null;
  amount: number | null;
  location_raw: string | null;
  source_file_id: string;
  source_row: number;
}

/**
 * Entity Graph Node
 */
export interface GraphNode {
  id: string;
  type: string;
  canonical_value: string;
  confidence_tier: string;
  fraud_score_contribution: number;
}

/**
 * Entity Graph Edge
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  link_type: string;
  confidence: number;
  confidence_tier: string;
  evidence_event_ids: string[];
}

/**
 * Entity Graph response payload
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Finding item in alerts list
 */
export interface FindingAPI {
  id: string;
  case_id?: string;
  rule_id: string;
  severity: string;
  fraud_weight: number;
  weight?: number;
  confidence: number;
  entity_ids: string[];
  event_ids: string[];
  source_file_ids: string[];
  source_rows: number[];
  explanation: string;
  episode_id?: string | null;
  episode_summary?: string | null;
  created_at?: string;
}

/**
 * Full detail for a single finding with associated canonical events
 */
export interface FindingDetailAPI extends FindingAPI {
  events: CanonicalEventAPI[];
  episode_id: string | null;
  episode_summary: string | null;
}

/**
 * Fraud score summary response
 */
export interface FraudScoreAPI {
  score: number;
  risk_level: string;
  top_findings: FindingAPI[];
  total_findings: number;
  findings_breakdown?: Record<string, number>;
}

/**
 * Node in CriminalFlow money trail
 */
export interface CriminalFlowNode {
  id: string;
  label: string;
  type?: string;
  role?: 'VICTIM' | 'MULE' | 'AGGREGATOR' | 'UNKNOWN';
  account_number?: string;
  total_inflow?: number;
  total_outflow?: number;
}

/**
 * Edge representing money transfer in CriminalFlow
 */
export interface CriminalFlowEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp?: string;
  event_id?: string;
}

/**
 * CriminalFlow directed graph response
 */
export interface CriminalFlowData {
  nodes: CriminalFlowNode[];
  edges: CriminalFlowEdge[];
}

/**
 * Geolocation event mapped via tower lookup table
 */
export interface GeospatialEvent {
  id: string;
  event_type: string;
  ts_start: string;
  actor_raw: string;
  peer_raw: string | null;
  location_raw: string | null;
  lat: number;
  lng: number;
  location_name: string;
}

/**
 * Geospatial response payload
 */
export interface GeospatialData {
  events: GeospatialEvent[];
}

/**
 * Cross-source correlation matrix row
 */
export interface CorrelationMatrixItem {
  entity_id: string;
  canonical_value: string;
  entity_type: string;
  confidence_tier: string;
  sources: string[];
  source_counts?: Record<string, number>;
}

/**
 * Correlation matrix response
 */
export interface CorrelationMatrixData {
  entities: CorrelationMatrixItem[];
}

/**
 * Case metadata record
 */
export interface CaseAPI {
  id: string;
  name: string;
  title?: string;
  description: string | null;
  status: string;
  created_at: string;
}

/**
 * Upload file response
 */
export interface UploadResponse {
  file_id: string;
  events_created: number;
  filename?: string;
  parse_errors?: string[];
  status?: string;
}

/**
 * Analyze endpoint response (HTTP 202)
 */
export interface AnalyzeResponse {
  case_id: string;
  findings: FindingAPI[];
  episodes_created: number;
  fraud_score: number;
  risk_level: string;
}

/**
 * Authentication response
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: string;
}
