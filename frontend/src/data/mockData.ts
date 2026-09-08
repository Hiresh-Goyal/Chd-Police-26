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

// ----------------------------------------------------
// Central Primary Case #2847
// ----------------------------------------------------
export const CASE_2847: CaseSummary = {
  id: '2847',
  title: 'Investment Scam — User 1',
  subject: 'User 1',
  type: 'Investment Scam',
  status: 'Active',
  priority: 'Critical',
  openedDate: '14 Aug 2026',
  assignedIO: 'Investigator 1',
  ioRole: 'Senior Inspector / Lead Investigator',
  ioStation: 'Sector 17, Chandigarh UT Police',
  fraudScore: 89,
  estimatedLoss: '₹4,82,000',
  entitiesCount: 6,
  lastActivity: '2 min ago',
  stats: {
    cdr: 147,
    bank: 23,
    social: 4,
    ipdr: 18,
    anomalies: 7,
    evidence: 6
  },
  entities: [
    {
      id: 'ent_01',
      name: 'User 1',
      type: 'PERSON',
      identifier: 'RAJESH-VERMA-992',
      role: 'PRIMARY SUBJECT / TARGET P1',
      riskScore: 92,
      riskLevel: 'CRITICAL',
      domain: 'NCRP',
      details: {
        'Aliases': 'User 1 Alias, User1_Alias',
        'National ID': 'XXXX-XXXX-4819',
        'Last Known Location': 'Sector 17, Chandigarh'
      }
    },
    {
      id: 'ent_02',
      name: '+91 9812345678',
      type: 'PHONE',
      identifier: '+91 9812345678',
      role: 'PRIMARY CONTACT (AIRTEL)',
      riskScore: 88,
      riskLevel: 'CRITICAL',
      domain: 'CDR',
      details: {
        'Carrier': 'Bharti Airtel UT',
        'IMSI': '404450981234567',
        'Registered To': 'User 1'
      }
    },
    {
      id: 'ent_03',
      name: 'HDFC XXXXXXX4521',
      type: 'BANK',
      identifier: 'HDFC-0004521-SAV',
      role: 'BENEFICIARY ACC (LAYER 1 MULE)',
      riskScore: 95,
      riskLevel: 'CRITICAL',
      domain: 'BANK',
      details: {
        'Bank': 'HDFC Bank Ltd',
        'IFSC': 'HDFC0001245',
        'Branch': 'Sector 22, Chandigarh',
        'Current Balance': '₹48,000'
      }
    },
    {
      id: 'ent_04',
      name: 'IMEI 864359012345219',
      type: 'IMEI',
      identifier: '864359012345219',
      role: 'HANDSET (ONEPLUS NORD)',
      riskScore: 64,
      riskLevel: 'MEDIUM',
      domain: 'CDR',
      details: {
        'Model': 'OnePlus Nord CE 3',
        'Associated SIMs': '3 SIM cards detected',
        'Prior Association': 'Case #1892'
      }
    },
    {
      id: 'ent_05',
      name: '103.76.234.12',
      type: 'IP',
      identifier: '103.76.234.12',
      role: 'LAST KNOWN IP (PORT 443)',
      riskScore: 78,
      riskLevel: 'HIGH',
      domain: 'IPDR',
      details: {
        'ISP': 'FastNet Broadband UT',
        'Location': 'Cyber Cafe, Sector 17',
        'VPN Detected': 'Suspected Proxy Node'
      }
    },
    {
      id: 'ent_06',
      name: '@rajesh_invest_profit',
      type: 'SOCIAL',
      identifier: '@rajesh_invest_profit',
      role: 'TELEGRAM / RECRUITMENT CHANNEL',
      riskScore: 82,
      riskLevel: 'HIGH',
      domain: 'SOCIAL',
      details: {
        'Platform': 'Telegram & WhatsApp',
        'Campaign': 'Crypto Double Returns Scam',
        'Victim Reach': '1,400+ members'
      }
    }
  ],
  notes: [
    {
      id: 'note_01',
      timestamp: '15 Aug 16:45 IST',
      author: 'Insp. Investigator 1 (Lead IO)',
      text: 'Suspect coordinates swift financial transfers right after voice communication events. Subpoenaed bank records for HDFC account 4521 to freeze outflow and trace Layer 2 mule node 7832.'
    },
    {
      id: 'note_02',
      timestamp: '15 Aug 14:40 IST',
      author: 'Analyst V. Patel',
      text: 'IPDR session confirms active connection from Sector 17 Cyber Cafe 4 minutes prior to IMPS initiation. Geo-correlation match score: 96%.'
    }
  ],
  alerts: [
    {
      id: 'alt_01',
      title: 'NEXUS DETECTED',
      description: 'Call→Data→Transfer sequence matches organized syndicate modus operandi.',
      severity: 'CRITICAL',
      timeAgo: 'Just now'
    },
    {
      id: 'alt_02',
      title: 'SUSPICIOUS TXN VELOCITY',
      description: 'Rapid splitting of ₹4,82,000 deposits across 3 mule accounts within 12 minutes.',
      severity: 'HIGH',
      timeAgo: '2h ago'
    },
    {
      id: 'alt_03',
      title: 'SIM CORRELATION',
      description: 'Target IMEI previously flagged in SIM swap incident (Case #1892).',
      severity: 'MEDIUM',
      timeAgo: '1d ago'
    }
  ]
};

// ----------------------------------------------------
// Timeline Events (15 Aug 2026 Core Flow)
// ----------------------------------------------------
export const CASE_2847_TIMELINE: TimelineEvent[] = [
  {
    id: 'evt_01',
    timestamp: '2026-08-15 09:15:00',
    timeDisplay: '09:15',
    domain: 'SOCIAL',
    title: 'Initial Social Recruitment Contact',
    description: 'WhatsApp message & Telegram investment promo link dispatched to victim from +44 7700 900077.',
    source: 'WhatsApp Export / Social Monitor',
    provenance: 'Source: Social_Batch_#1, Record #419',
    metadata: {
      'Sender': '+44 7700 900077',
      'Platform': 'WhatsApp / Telegram',
      'Message Type': 'High Return Crypto Lure',
      'Hash': '7f2a1b9c8d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a'
    }
  },
  {
    id: 'evt_02',
    timestamp: '2026-08-15 14:00:12',
    timeDisplay: '14:00',
    domain: 'CDR',
    title: 'Voice Call (CDR Correlation)',
    description: 'Outgoing voice call from suspect +91 9812345678 to victim. Call duration: 14m 23s.',
    source: 'Airtel CDR Logs Oct 2026',
    provenance: 'Source: CDR Batch #1, Row 142',
    isCritical: true,
    metadata: {
      'Caller': '+91 9812345678',
      'Receiver': '+91 9988776655 (Victim)',
      'Duration': '14 mins 23 secs',
      'Cell Tower': 'Cell ID 45892 (Sector 17 Tower A)',
      'Azimuth': '120° (Signal Coverage Sector 17/22)'
    }
  },
  {
    id: 'evt_03',
    timestamp: '2026-08-15 14:28:44',
    timeDisplay: '14:28',
    domain: 'IPDR',
    title: 'Active Banking Data Session',
    description: 'Data packet transfer to HDFC NetBanking server from IP 103.76.234.12.',
    source: 'IPDR Log Batch #2',
    provenance: 'Source: IPDR Batch #2, Stream #88',
    isCritical: true,
    metadata: {
      'IP Address': '103.76.234.12',
      'Destination Port': '443 (HTTPS Secure)',
      'Volume': '2.4 MB (64 packets)',
      'ISP': 'FastNet Broadband UT',
      'Location': 'Cyber Cafe, Sector 17 Chandigarh'
    }
  },
  {
    id: 'evt_04',
    timestamp: '2026-08-15 14:32:05',
    timeDisplay: '14:32',
    domain: 'BANK',
    title: 'Fraudulent IMPS Fund Transfer',
    description: 'Unauthorized IMPS transfer of ₹48,000 credited to HDFC XXXXXXX4521 (User 1). Part of ₹4,82,000 total scam flow.',
    source: 'HDFC Core Banking Gateway',
    provenance: 'Source: Bank Batch #3, Row 991',
    isCritical: true,
    metadata: {
      'Txn ID': 'IMPS608151432059',
      'Amount': '₹48,000 (Loss pool ₹4,82,000)',
      'Sender Acc': 'SBI XXXXXXX1190 (Victim)',
      'Beneficiary Acc': 'HDFC XXXXXXX4521 (User 1)',
      'Status': 'CLEARED / FLAGGED P1'
    }
  },
  {
    id: 'evt_05',
    timestamp: '2026-08-15 15:10:18',
    timeDisplay: '15:10',
    domain: 'BANK',
    title: 'ATM Cash-Out Withdrawal',
    description: 'Physical cash withdrawal of ₹47,500 at Sector 22 ATM booth.',
    source: 'Bank Switch & CCTV Camera #4',
    provenance: 'Source: ATM Switch Logs ID SIB8922',
    isCritical: true,
    metadata: {
      'ATM ID': 'ATM ID SIB8922',
      'Location': 'Sector 22 Market, Chandigarh',
      'Withdrawn Amount': '₹47,500',
      'Remaining Balance': '₹500',
      'CCTV Footage': 'Requested (Ref: CCTV-SEC22-0815)'
    }
  },
  {
    id: 'evt_06',
    timestamp: '2026-08-15 16:20:00',
    timeDisplay: '16:20',
    domain: 'NCRP',
    title: 'National Cyber Crime Portal Complaint Logged',
    description: 'Victim submitted financial cyber fraud complaint on 1930 / NCRP portal.',
    source: 'NCRP National Repository',
    provenance: 'NCRP Acknowledgment #2026/UT/08912',
    metadata: {
      'Complaint ID': 'NCRP-2026-89128',
      'Reported Loss': '₹4,82,000',
      'Priority': 'Emergency Freeze Triggered'
    }
  }
];

// ----------------------------------------------------
// CriminalFlow / Money Trail Data
// ----------------------------------------------------
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

export const MONEY_TRAIL_NODES: FlowNode[] = [
  {
    id: 'node_victim',
    name: 'Victim Source Account',
    type: 'VICTIM',
    accountNo: 'SBI XXXXXXX1190',
    owner: 'G. S. Mehra (Victim)',
    amount: '₹4,82,000 Total Outflow',
    riskScore: 0,
    status: 'Defrauded',
    retainedBalance: '₹14,200',
    sourceProvenance: 'NCRP Complaint #NCRP-2026-89128'
  },
  {
    id: 'node_mule1',
    name: 'Layer 1 Primary Mule',
    type: 'MULE_L1',
    accountNo: 'HDFC XXXXXXX4521',
    owner: 'User 1',
    amount: '₹4,82,000 Received',
    riskScore: 91,
    status: 'Active Splitting',
    retainedBalance: '₹48,000',
    freezePriority: 'P1',
    ipAddress: '192.168.1.104 (VPN Suspected)',
    sourceProvenance: 'Bank_HDFC_Export_20241026.csv, Batch #3, Row 991'
  },
  {
    id: 'node_mule2',
    name: 'Layer 2 Secondary Mule',
    type: 'MULE_L2',
    accountNo: 'HDFC XXXXXXX7832',
    owner: 'Karan Malhotra',
    amount: '₹48,000 Received',
    riskScore: 86,
    status: 'Split & Forwarded',
    retainedBalance: '₹500',
    freezePriority: 'P1',
    ipAddress: '103.76.234.12',
    sourceProvenance: 'Bank_HDFC_Export_20241026.csv, Batch #3, Row 1042'
  },
  {
    id: 'node_upi',
    name: 'UPI Distribution Cluster',
    type: 'UPI_DISTRIBUTION',
    accountNo: '14 Distinct UPI Handles',
    owner: 'Syndicate Handlers',
    amount: '₹4,34,000 Dispersed',
    riskScore: 74,
    status: 'Distributed',
    retainedBalance: '₹12,400',
    freezePriority: 'P2',
    sourceProvenance: 'UPI_Switch_Log_Oct26.csv'
  },
  {
    id: 'node_atm',
    name: 'Terminal Cash-Out (ATM)',
    type: 'TERMINAL_ATM',
    accountNo: 'ATM SIB8922',
    owner: 'Sector 22 ATM Machine',
    amount: '₹47,500 Cash Extracted',
    riskScore: 95,
    status: 'Physical Withdrawal (15:10 IST)',
    retainedBalance: '₹0',
    freezePriority: 'P3',
    sourceProvenance: 'Bank Switch CCTV Ref: CCTV-SEC22-0815'
  }
];

// ----------------------------------------------------
// All Cases for "My Cases" & "Dashboard"
// ----------------------------------------------------
export const ALL_CASES: CaseSummary[] = [
  CASE_2847,
  {
    id: '2846',
    title: 'Cyber Intrusion — Gateway Server',
    subject: 'Unknown (IP: 104.28.19.44)',
    type: 'Cyber Intrusion',
    status: 'Pending',
    priority: 'High',
    openedDate: '14 Aug 2026',
    assignedIO: 'R. Kumar',
    ioRole: 'Sub-Inspector',
    ioStation: 'Cyber Cell HQ',
    fraudScore: 76,
    estimatedLoss: '₹1,20,000',
    entitiesCount: 4,
    lastActivity: '18 min ago',
    stats: { cdr: 42, bank: 4, social: 1, ipdr: 89, anomalies: 3, evidence: 3 },
    entities: [],
    notes: [],
    alerts: []
  },
  {
    id: '2845',
    title: 'Mule Account Syndicate Ring',
    subject: 'User 2',
    type: 'Mule Account',
    status: 'Active',
    priority: 'High',
    openedDate: '13 Aug 2026',
    assignedIO: 'Investigator 1',
    ioRole: 'Senior Inspector',
    ioStation: 'Sector 17, Chandigarh UT',
    fraudScore: 84,
    estimatedLoss: '₹18,50,000',
    entitiesCount: 9,
    lastActivity: '1 hr ago',
    stats: { cdr: 210, bank: 64, social: 8, ipdr: 45, anomalies: 12, evidence: 8 },
    entities: [],
    notes: [],
    alerts: []
  },
  {
    id: '2844',
    title: 'Targeted SIM Swap Fraud',
    subject: 'Unknown Subject',
    type: 'SIM Swap',
    status: 'Under Review',
    priority: 'Medium',
    openedDate: '12 Aug 2026',
    assignedIO: 'S. Patel',
    ioRole: 'Inspector',
    ioStation: 'Sector 34 Police Station',
    fraudScore: 58,
    estimatedLoss: '₹85,000',
    entitiesCount: 3,
    lastActivity: '4 hrs ago',
    stats: { cdr: 88, bank: 6, social: 2, ipdr: 14, anomalies: 2, evidence: 2 },
    entities: [],
    notes: [],
    alerts: []
  },
  {
    id: '2843',
    title: 'Digital Arrest Extortion Scheme',
    subject: 'Rohan Mehta',
    type: 'Digital Arrest',
    status: 'Closed',
    priority: 'Low',
    openedDate: '08 Aug 2026',
    assignedIO: 'R. Kumar',
    ioRole: 'Sub-Inspector',
    ioStation: 'Cyber Cell HQ',
    fraudScore: 32,
    estimatedLoss: '₹3,00,000',
    entitiesCount: 2,
    lastActivity: '1 day ago',
    stats: { cdr: 35, bank: 8, social: 3, ipdr: 12, anomalies: 0, evidence: 5 },
    entities: [],
    notes: [],
    alerts: []
  }
];

// ----------------------------------------------------
// System Audit Logs
// ----------------------------------------------------
export const AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'evt_8f92a4bc719',
    timestamp: '2026-08-15 14:32:05 IST',
    officerName: 'Insp. Investigator 1',
    officerId: '1042',
    officerRole: 'Lead Investigator',
    officerStation: 'Sector 17, Chandigarh',
    action: 'Viewed Bank Records',
    targetEntity: 'Case #2847 (HDFC_Stmnt_Oct)',
    domain: 'BANK',
    ipAddress: '192.168.1.45',
    deviceId: 'DEV-8A2F9B',
    status: 'SUCCESS',
    rawMetadata: {
      event_id: 'evt_8f92a4bc719',
      timestamp: '2026-08-15T09:02:05Z',
      action: 'read',
      resource: {
        type: 'bank_record',
        id: 'doc_9921_hdfc',
        case_id: 'case_2847'
      },
      actor: {
        user_id: '1042',
        auth_method: 'mfa_token'
      },
      audit_context: {
        justification_provided: true,
        justification_code: 'active_investigation'
      }
    }
  },
  {
    id: 'evt_7b19a0ee231',
    timestamp: '2026-08-15 14:28:11 IST',
    officerName: 'Sub-Insp. R. Kumar',
    officerId: '0891',
    officerRole: 'Investigator',
    officerStation: 'Cyber Cell HQ',
    action: 'Failed Authentication',
    targetEntity: 'System Login',
    domain: 'SYS',
    ipAddress: '10.0.4.112',
    deviceId: 'DEV-UNKNOWN',
    status: 'FAILED',
    rawMetadata: {
      event_id: 'evt_7b19a0ee231',
      timestamp: '2026-08-15T08:58:11Z',
      action: 'auth_attempt',
      resource: {
        type: 'system_auth',
        id: 'auth_gateway',
        case_id: 'global'
      },
      actor: {
        user_id: '0891',
        auth_method: 'password_fail'
      },
      audit_context: {
        justification_provided: false,
        justification_code: 'invalid_credentials'
      }
    }
  },
  {
    id: 'evt_4a88c1dd904',
    timestamp: '2026-08-15 14:15:44 IST',
    officerName: 'DSP Neha Jain',
    officerId: '0144',
    officerRole: 'Supervisory Officer',
    officerStation: 'UT Police HQ',
    action: 'Exported Data (CDR CSV)',
    targetEntity: 'Suspect_9982.csv',
    domain: 'CDR',
    ipAddress: '192.168.1.12',
    deviceId: 'DEV-3C1A44',
    status: 'SUCCESS',
    rawMetadata: {
      event_id: 'evt_4a88c1dd904',
      timestamp: '2026-08-15T08:45:44Z',
      action: 'export_csv',
      resource: {
        type: 'cdr_dossier',
        id: 'cdr_export_9982',
        case_id: 'case_2847'
      },
      actor: {
        user_id: '0144',
        auth_method: 'biometric_piv'
      },
      audit_context: {
        justification_provided: true,
        justification_code: 'court_subpoena_prep'
      }
    }
  },
  {
    id: 'evt_3d55e2ff718',
    timestamp: '2026-08-15 13:59:02 IST',
    officerName: 'Insp. Investigator 1',
    officerId: '1042',
    officerRole: 'Lead Investigator',
    officerStation: 'Sector 17, Chandigarh',
    action: 'Modified Case Details',
    targetEntity: 'Case #2847 (Status: Active)',
    domain: 'SYS',
    ipAddress: '192.168.1.45',
    deviceId: 'DEV-8A2F9B',
    status: 'SUCCESS',
    rawMetadata: {
      event_id: 'evt_3d55e2ff718',
      timestamp: '2026-08-15T08:29:02Z',
      action: 'update_case',
      resource: {
        type: 'case_metadata',
        id: 'case_2847',
        case_id: 'case_2847'
      },
      actor: {
        user_id: '1042',
        auth_method: 'mfa_token'
      },
      audit_context: {
        justification_provided: true,
        justification_code: 'priority_escalation'
      }
    }
  },
  {
    id: 'evt_1c22b9aa045',
    timestamp: '2026-08-15 13:45:18 IST',
    officerName: 'Analyst V. Patel',
    officerId: '3092',
    officerRole: 'Forensic Analyst',
    officerStation: 'Cyber Forensics Lab',
    action: 'Queried Database (IPDR Session)',
    targetEntity: 'Node_Alpha_7 (103.76.234.12)',
    domain: 'IPDR',
    ipAddress: '10.0.2.88',
    deviceId: 'DEV-9F22E1',
    status: 'SUCCESS',
    rawMetadata: {
      event_id: 'evt_1c22b9aa045',
      timestamp: '2026-08-15T08:15:18Z',
      action: 'query_ipdr',
      resource: {
        type: 'network_session',
        id: 'ip_103_76_234_12',
        case_id: 'case_2847'
      },
      actor: {
        user_id: '3092',
        auth_method: 'cert_token'
      },
      audit_context: {
        justification_provided: true,
        justification_code: 'pattern_matching'
      }
    }
  }
];

// ----------------------------------------------------
// SentinelWatch Target Items
// ----------------------------------------------------
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

export const SENTINEL_WATCH_ITEMS: SentinelWatchItem[] = [
  {
    id: 'watch_01',
    identifier: '+91 9812345678',
    name: 'User 1 Handset SIM',
    streamType: 'CDR',
    threshold: 'Any Activity',
    riskScore: 92,
    status: 'TRIGGERED',
    lastActivity: '2 min ago (Call detected)',
    caseRef: 'Case #2847',
    expiryDate: '2026-11-30'
  },
  {
    id: 'watch_02',
    identifier: 'HDFC XXXXXXX4521',
    name: 'Primary Mule Account',
    streamType: 'BANK',
    threshold: 'Any Activity',
    riskScore: 95,
    status: 'TRIGGERED',
    lastActivity: '14:32:05 (IMPS ₹48,000)',
    caseRef: 'Case #2847',
    expiryDate: '2026-12-15'
  },
  {
    id: 'watch_03',
    identifier: '103.76.234.12',
    name: 'Cyber Cafe Proxy IP',
    streamType: 'IPDR',
    threshold: 'High Volume',
    riskScore: 78,
    status: 'ACTIVE',
    lastActivity: '18 min ago (Port 443)',
    caseRef: 'Case #2847',
    expiryDate: '2026-10-31'
  },
  {
    id: 'watch_04',
    identifier: 'IMEI 864359012345219',
    name: 'Target_Alpha_99 Handset',
    streamType: 'ALL',
    threshold: 'Flagged Contacts',
    riskScore: 84,
    status: 'ACTIVE',
    lastActivity: '15 min ago (Tower Sector 17)',
    caseRef: 'Case #2842',
    expiryDate: '2026-11-15'
  }
];

// ----------------------------------------------------
// User Management Directory
// ----------------------------------------------------
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

export const SYSTEM_USERS: UserOfficer[] = [
  {
    id: 'usr_1042',
    badgeId: 'ID: 1042',
    name: 'Investigator 1',
    rank: 'Senior Inspector',
    unit: 'Cyber Crime Investigation Unit',
    station: 'Sector 17, Chandigarh UT',
    email: 'amrit.singh@chdpolice.gov.in',
    role: 'Lead Investigator',
    status: 'ACTIVE',
    mfaEnabled: true,
    activeSessions: 1,
    auditCount24h: 38
  },
  {
    id: 'usr_0891',
    badgeId: 'ID: 0891',
    name: 'R. Kumar',
    rank: 'Sub-Inspector',
    unit: 'Technical Surveillance Wing',
    station: 'Cyber Cell HQ',
    email: 'r.kumar@chdpolice.gov.in',
    role: 'Investigator',
    status: 'ACTIVE',
    mfaEnabled: true,
    activeSessions: 1,
    auditCount24h: 24
  },
  {
    id: 'usr_0144',
    badgeId: 'ID: 0144',
    name: 'Neha Jain',
    rank: 'DSP (Cyber Operations)',
    unit: 'Headquarters Command',
    station: 'UT Police HQ',
    email: 'neha.jain@chdpolice.gov.in',
    role: 'Admin',
    status: 'ACTIVE',
    mfaEnabled: true,
    activeSessions: 2,
    auditCount24h: 15
  },
  {
    id: 'usr_3092',
    badgeId: 'ID: 3092',
    name: 'V. Patel',
    rank: 'Senior Analyst',
    unit: 'Digital Forensics Laboratory',
    station: 'Forensics Wing',
    email: 'v.patel@chdpolice.gov.in',
    role: 'Analyst',
    status: 'ACTIVE',
    mfaEnabled: true,
    activeSessions: 1,
    auditCount24h: 62
  },
  {
    id: 'usr_1102',
    badgeId: 'ID: 1102',
    name: 'S. Patel',
    rank: 'Inspector',
    unit: 'Field Investigation Unit',
    station: 'Sector 34 Police Station',
    email: 's.patel@chdpolice.gov.in',
    role: 'Investigator',
    status: 'ACTIVE',
    mfaEnabled: true,
    activeSessions: 0,
    auditCount24h: 11
  }
];

// ----------------------------------------------------
// Initial Upload Queue & Evidence Items
// ----------------------------------------------------
export const INITIAL_EVIDENCE_FILES: EvidenceFile[] = [
  {
    id: 'ev_01',
    name: 'target_number_cdr_oct.csv',
    size: '45 MB',
    domain: 'CDR',
    status: 'parsing',
    progress: 65,
    hash: 'a3f89921b7c84410e19a0d819921b4458f22e811c0021b34e56a78b901234567',
    uploadDate: '15 Aug 2026 14:10 IST',
    recordsCount: 147
  },
  {
    id: 'ev_02',
    name: 'suspect_sbi_statement_q3.pdf',
    size: '12 MB',
    domain: 'BANK',
    status: 'validating',
    progress: 30,
    hash: 'b78811d044921cae991208bf332a901844ef1172a819b90c1284567119023456',
    uploadDate: '15 Aug 2026 14:15 IST',
    recordsCount: 23
  },
  {
    id: 'ev_03',
    name: 'assoc_telecom_tower_logs.xlsx',
    size: '8.2 MB',
    domain: 'CDR',
    status: 'complete',
    progress: 100,
    hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    uploadDate: '15 Aug 2026 13:40 IST',
    recordsCount: 1240
  },
  {
    id: 'ev_04',
    name: 'ipdr_fastnet_cybercafe_session.csv',
    size: '18.6 MB',
    domain: 'IPDR',
    status: 'complete',
    progress: 100,
    hash: '9012345678abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    uploadDate: '15 Aug 2026 13:50 IST',
    recordsCount: 419
  }
];
