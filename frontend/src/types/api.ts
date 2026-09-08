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
  id: string; case_id?: string; event_type: string; ts_start: string; ts_end: string | null;
  actor_entity_id: string | null; actor_raw: string; actor_confidence_tier: string;
  peer_entity_id?: string | null; peer_raw: string | null; amount: number | null; location_raw: string | null;
  source_file_id: string; source_row: number; domain?: string; title?: string | null; description?: string | null;
  time_display?: string | null; source?: string | null; provenance?: string | null; is_critical?: boolean; metadata?: Record<string,string>;
}

/**
 * Entity Graph Node
 */
export interface GraphNode {
  id: string; type: string; canonical_value: string; label?: string | null; role?: string | null; domain?: string | null;
  risk_score?: number; risk_level?: string; confidence_tier: string; fraud_score_contribution: number; details?: Record<string,string>;
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
  score: number; risk_level: string; top_findings: FindingAPI[]; total_findings: number;
  findings_breakdown: Record<string, number>; computed_at?: string | null;
}

/**
 * Node in CriminalFlow money trail
 */
export interface CriminalFlowNode {
  id: string; label: string; type?: string; role?: string; account_number?: string; total_inflow?: number; total_outflow?: number;
  owner?: string | null; status?: string | null; retained_balance?: number | null; freeze_priority?: string | null; ip_address?: string | null;
  source_provenance?: string | null; details?: Record<string,string>;
}

/**
 * Edge representing money transfer in CriminalFlow
 */
export interface CriminalFlowEdge {
  id: string; source: string; target: string; amount: number; timestamp?: string | null; event_id?: string | null; method?: string | null;
  source_file_id?: string | null; source_row?: number | null;
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
  id: string; event_type: string; ts_start: string; actor_raw: string; peer_raw: string | null; location_raw: string | null;
  lat: number; lng: number; location_name: string; domain?: string; time_display?: string | null; address?: string | null;
  radius_km?: number | null; details?: string | null; source_file_id?: string | null; source_row?: number | null;
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
export interface CaseEntityAPI { id:string; name:string; type:string; identifier:string; role:string; risk_score:number; risk_level:string; domain:string; confidence_tier:string; details:Record<string,string>; }
export interface CaseStatsAPI { cdr:number; bank:number; social:number; ipdr:number; anomalies:number; evidence:number; }
export interface CaseNoteAPI { id:string; timestamp:string; author:string; text:string; }
export interface CaseAlertPreviewAPI { id:string; title:string; description:string; severity:string; time_ago:string; rule_id?:string|null; fraud_weight?:number|null; confidence?:number|null; created_at?:string|null; }
export interface EvidenceFileAPI { id:string; name:string; filename:string; size_bytes:number; size:string; domain:string; status:string; progress:number; hash:string; upload_date:string; records_count:number; parse_errors:string[]; }
export interface CaseAPI {
  id:string; name:string; title:string; case_type?:string|null; description?:string|null; status:string; priority:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  assigned_io?:string|null; assigned_io_name?:string|null; assigned_io_role?:string|null; assigned_io_station?:string|null; entities_count:number;
  created_at:string; last_activity:string; fraud_score:number; risk_level:string; estimated_loss:number; incident_date?:string|null; stats:CaseStatsAPI;
  entities:CaseEntityAPI[]; notes:CaseNoteAPI[]; alerts:CaseAlertPreviewAPI[]; evidence:EvidenceFileAPI[];
}
export interface CreateCaseRequest {
  name: string;
  title?: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_io?: string | null;
}

/**
 * Upload file response
 */
export interface UploadResponse { file_id:string; events_created:number; filename?:string; parse_errors?:string[]; status:string; }

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

export interface DashboardOverview { agency_name:string; current_time:string; total_cases:number; active_cases:number; critical_alerts:number; total_entities:number; total_evidence:number; evidence_by_domain:Record<string,number>; }
export interface UserAPI { id:string; username:string; badge_id?:string|null; name:string; rank?:string|null; unit?:string|null; station?:string|null; email?:string|null; role:string; status:string; mfa_enabled:boolean; active_sessions:number; audit_count_24h:number; }
