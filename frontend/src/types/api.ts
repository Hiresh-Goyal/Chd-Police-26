export interface Case {
  id: string;
  title: string;
  status: string;
  updated_at: string;
}

export interface CaseDetail extends Case {
  files: RawFile[];
}

export interface RawFile {
  id: string;
  original_name: string;
  file_type: string;
  events_created: number;
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  ts_start: string | null;
  ts_end: string | null;
  actor_entity_id: string | null;
  actor_raw: string;
  actor_confidence_tier: string | null;
  peer_entity_id: string | null;
  peer_raw: string | null;
  peer_confidence_tier: string | null;
  amount: number | null;
  location_raw: string | null;
  device_id: string | null;
  source_file_id: string | null;
  source_file_name: string | null;
  source_row: number | null;
  episode_id: string | null;
  episode_label: string | null;
  payload: Record<string, any> | null;
}

export interface EntityNode {
  id: string;
  type: string;
  canonical_value: string;
  confidence_tier: string;
  fraud_score_contribution: number;
  role_signal: string;
  structural_anomaly_score: number;
  source_count: number;
  metadata: Record<string, any>;
}

export interface EntityEdge {
  id: string;
  source: string;
  target: string;
  link_type: string;
  confidence: number;
  confidence_tier: string;
  evidence_event_ids: string[];
}

export interface GraphData {
  nodes: EntityNode[];
  edges: EntityEdge[];
}

export interface Alert {
  id: string;
  rule_id: string;
  severity: string;
  fraud_weight: number;
  confidence: number;
  effective_weight: number;
  entity_count: number;
  event_count: number;
  explanation: string;
  ml_signal: number;
  created_at: string;
}

export interface AlertDetail extends Alert {
  ml_explanation: string | null;
  entities: any[];
  events: any[];
  source_files: any[];
  episode_summary: string | null;
}

export interface FraudScore {
  score: number;
  risk_level: string;
  top_findings: any[];
  total_findings: number;
  findings_breakdown: Record<string, any>;
  ml_anomaly_summary: Record<string, any>;
  computed_at: string | null;
}

export interface MoneyFlowNode {
  id: string;
  entity_type: string;
  role: string;
  canonical_value: string;
  total_received: number;
  total_sent: number;
}

export interface MoneyFlowEdge {
  source: string;
  target: string;
  amount: number;
  timestamp: string;
  canonical_event_id: string;
  source_file_id: string;
  source_row: number;
}

export interface MoneyFlowData {
  nodes: MoneyFlowNode[];
  edges: MoneyFlowEdge[];
}

export interface GeospatialEvent {
  event_id: string;
  event_type: string;
  ts_start: string | null;
  lat: number;
  lng: number;
  entity_id: string | null;
  confidence_tier: string | null;
  actor_raw: string;
}

export interface CorrelationMatrixData {
  entities: any[];
  sources: string[];
  matrix: (string | null)[][];
}

export interface ReportData {
  case: CaseDetail;
  summary: Record<string, any>;
  timeline: TimelineEvent[];
  entity_summary: any[];
  findings: AlertDetail[];
  money_flow: MoneyFlowData;
  ml_signals: Record<string, any>;
  chain_of_custody: any[];
  methodology: string;
}

export interface SearchResult {
  entities: any[];
  events: any[];
  findings: any[];
}
