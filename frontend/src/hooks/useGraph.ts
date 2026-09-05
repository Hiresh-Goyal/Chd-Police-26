import { useState, useEffect } from 'react';
import { getGraph } from '../api/client';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Pulled from EntityGraph.tsx
const mockGraphData = {
  nodes: [
    {
      id: 'node_rajesh', name: 'Rajesh Verma', sub: 'TARGET: P1', type: 'PERSON', domain: 'NCRP',
      x: 460, y: 280, riskScore: 92, riskLevel: 'CRITICAL', role: 'Primary Subject / Syndicate Coordinator',
      confidence_tier: 'CONFIRMED',
      details: { 'Full Name': 'Rajesh Verma', 'National ID': 'XXXX-XXXX-4819', 'Flagged Count': '3 Related NCRP complaints', 'Status': 'ACTIVE SURVEILLANCE' }
    },
    {
      id: 'node_phone1', name: '+91 9812345678', sub: 'PRIMARY CONTACT', type: 'PHONE', domain: 'CDR',
      x: 230, y: 170, riskScore: 88, riskLevel: 'CRITICAL', role: 'Primary SIM (Airtel UT)',
      confidence_tier: 'CONFIRMED',
      details: { 'Carrier': 'Bharti Airtel UT', 'IMSI': '404450981234567', 'Tower Registration': 'Sector 17 Tower A (Cell ID 45892)' }
    },
    {
      id: 'node_phone2', name: '+91 9988776655', sub: 'VICTIM CONTACT', type: 'PHONE', domain: 'CDR',
      x: 130, y: 330, riskScore: 10, riskLevel: 'LOW', role: 'Complainant Phone',
      confidence_tier: 'CONFIRMED',
      details: { 'Carrier': 'Jio Telecom', 'Call Duration Received': '14m 23s at 14:00 IST' }
    },
    {
      id: 'node_bank1', name: 'HDFC XXXXXXX4521', sub: 'MULE ACC (L1)', type: 'BANK', domain: 'BANK',
      x: 310, y: 450, riskScore: 95, riskLevel: 'CRITICAL', role: 'Layer 1 Mule Account (HDFC Bank)',
      confidence_tier: 'CONFIRMED',
      details: { 'Account Owner': 'Rajesh Verma', 'IFSC': 'HDFC0001245', 'Received Amount': '₹48,000 IMPS', 'Freeze Status': 'PRIORITY P1 FREEZE ISSUED' }
    },
    {
      id: 'node_imei', name: 'IMEI 864359012345219', sub: 'HANDSET', type: 'IMEI', domain: 'CDR',
      x: 690, y: 410, riskScore: 64, riskLevel: 'MEDIUM', role: 'Handset Hardware ID',
      confidence_tier: 'PROBABLE',
      details: { 'Model': 'OnePlus Nord CE 3', 'Multiple SIMs Detected': '3 SIM activations detected in last 30 days', 'Prior Association': 'Case #1892' }
    },
    {
      id: 'node_ip', name: '103.76.234.12', sub: 'LAST KNOWN IP', type: 'IP', domain: 'IPDR',
      x: 680, y: 190, riskScore: 78, riskLevel: 'HIGH', role: 'Cyber Cafe Proxy IP (Port 443)',
      confidence_tier: 'PROBABLE',
      details: { 'ISP': 'FastNet Broadband UT', 'Physical Address': 'Sector 17 Market, Cyber Cafe Node Alpha', 'Session Duration': '2.4 MB at 14:28 IST' }
    },
    {
      id: 'node_social', name: '@rajesh_invest_profit', sub: 'TELEGRAM CHANNEL', type: 'SOCIAL', domain: 'SOCIAL',
      x: 460, y: 100, riskScore: 82, riskLevel: 'HIGH', role: 'Recruitment Funnel Channel',
      confidence_tier: 'CANDIDATE',
      details: { 'Platform': 'Telegram & WhatsApp Group', 'Subscribers': '1,420 members', 'Initial WhatsApp Link': '+44 7700 900077' }
    },
    {
      id: 'node_atm', name: 'Sector 22 ATM', sub: 'CASH-OUT NODE', type: 'ATM', domain: 'BANK',
      x: 180, y: 530, riskScore: 90, riskLevel: 'CRITICAL', role: 'Physical Withdrawal Terminal',
      confidence_tier: 'CONFIRMED',
      details: { 'ATM ID': 'SIB8922', 'Amount Withdrawn': '₹47,500 at 15:10 IST', 'CCTV Footage': 'Ref: CCTV-SEC22-0815' }
    }
  ],
  edges: [
    { id: 'e1', from: 'node_rajesh', to: 'node_phone1', label: 'OWNS', color: '#0891B2', confidence_tier: 'CONFIRMED' },
    { id: 'e2', from: 'node_phone1', to: 'node_phone2', label: 'CALLED (14m)', color: '#0891B2', animated: true, confidence_tier: 'CONFIRMED' },
    { id: 'e3', from: 'node_rajesh', to: 'node_bank1', label: 'BENEFICIARY', color: '#F97316', confidence_tier: 'CONFIRMED' },
    { id: 'e4', from: 'node_bank1', to: 'node_atm', label: 'CASH_OUT (₹47.5k)', color: '#DC2626', animated: true, confidence_tier: 'CONFIRMED' },
    { id: 'e5', from: 'node_rajesh', to: 'node_imei', label: 'USES_DEVICE', color: '#64748B', confidence_tier: 'PROBABLE' },
    { id: 'e6', from: 'node_rajesh', to: 'node_ip', label: 'ACCESSED_FROM', color: '#7C3AED', animated: true, confidence_tier: 'PROBABLE' },
    { id: 'e7', from: 'node_rajesh', to: 'node_social', label: 'ADMINS', color: '#16A34A', confidence_tier: 'CANDIDATE' }
  ]
};

export const useGraph = (caseId: string) => {
  const [data, setData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        if (USE_MOCK) {
          await new Promise(r => setTimeout(r, 400));
          if (isMounted) setData(mockGraphData);
        } else {
          const res = await getGraph(caseId);
          if (isMounted) setData(res);
        }
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [caseId]);

  return { data, loading, error };
};
