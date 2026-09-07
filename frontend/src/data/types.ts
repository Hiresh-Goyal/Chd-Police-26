export interface CaseEntity {
  id: string;
  name: string;
  type: 'PERSON' | 'PHONE' | 'BANK' | 'IMEI' | 'IP' | 'SOCIAL' | 'ATM';
  identifier: string;
  role: string;
  riskScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  domain: 'CDR' | 'IPDR' | 'BANK' | 'SOCIAL' | 'NCRP';
  details?: Record<string, string>;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  timeDisplay: string;
  domain: 'CDR' | 'IPDR' | 'BANK' | 'SOCIAL' | 'NCRP' | 'EPISODES';
  title: string;
  description: string;
  source: string;
  provenance: string;
  isCritical?: boolean;
  metadata: Record<string, string>;
}

export interface CaseSummary {
  id: string;
  title: string;
  subject: string;
  type: string;
  status: 'Active' | 'Under Review' | 'Pending' | 'Closed';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  openedDate: string;
  assignedIO: string;
  ioRole: string;
  ioStation: string;
  fraudScore: number;
  estimatedLoss: string;
  entitiesCount: number;
  lastActivity: string;
  stats: {
    cdr: number;
    bank: number;
    social: number;
    ipdr: number;
    anomalies: number;
    evidence: number;
  };
  entities: CaseEntity[];
  notes: Array<{
    id: string;
    timestamp: string;
    author: string;
    text: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    timeAgo: string;
  }>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  officerName: string;
  officerId: string;
  officerRole: string;
  officerStation: string;
  action: string;
  targetEntity: string;
  domain: 'CDR' | 'IPDR' | 'BANK' | 'SOCIAL' | 'SYS';
  ipAddress: string;
  deviceId: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  rawMetadata: {
    event_id: string;
    timestamp: string;
    action: string;
    resource: {
      type: string;
      id: string;
      case_id: string;
    };
    actor: {
      user_id: string;
      auth_method: string;
    };
    audit_context: {
      justification_provided: boolean;
      justification_code: string;
    };
  };
}

export interface EvidenceFile {
  id: string;
  name: string;
  size: string;
  domain: 'CDR' | 'BANK' | 'IPDR' | 'SOCIAL' | 'NCRP';
  status: 'validating' | 'parsing' | 'complete' | 'failed';
  progress: number;
  hash: string;
  uploadDate: string;
  recordsCount?: number;
}

export interface FlowNode {
  id: string;
  name: string;
  type: 'VICTIM' | 'MULE_L1' | 'MULE_L2' | 'UPI_DISTRIBUTION' | 'TERMINAL_ATM';
  accountNo: string;
  owner: string;
  amount: string;
  riskScore: number;
  status: string;
  retainedBalance: string;
  freezePriority?: 'P1' | 'P2' | 'P3';
  ipAddress?: string;
  sourceProvenance: string;
}

export interface SentinelWatchItem {
  id: string;
  identifier: string;
  name: string;
  streamType: 'CDR' | 'BANK' | 'IPDR' | 'ALL';
  threshold: 'Any Activity' | 'High Volume' | 'Flagged Contacts';
  riskScore: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'STANDBY';
  lastActivity: string;
  caseRef: string;
  expiryDate: string;
}

export interface UserOfficer {
  id: string;
  badgeId: string;
  name: string;
  rank: string;
  unit: string;
  station: string;
  email: string;
  role: 'Admin' | 'Lead Investigator' | 'Investigator' | 'Analyst';
  status: 'ACTIVE' | 'PENDING' | 'REVOKED';
  mfaEnabled: boolean;
  activeSessions: number;
  auditCount24h: number;
}
