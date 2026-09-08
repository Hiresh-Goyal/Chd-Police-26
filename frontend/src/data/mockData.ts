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
