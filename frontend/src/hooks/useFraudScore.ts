import { useState, useEffect } from 'react';
import { getFraudScore } from '../api/client';
import { CASE_2847 } from '../data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const mockFraudScore = {
  score: CASE_2847.fraudScore,
  riskLevel: 'CRITICAL',
  topFindings: [
    { ruleName: 'Rapid Mule Transfer', weight: 40, confidence: 'HIGH', evidenceSummary: '₹48,000 transferred to HDFC immediately after call' },
    { ruleName: 'Suspicious IP Login', weight: 30, confidence: 'HIGH', evidenceSummary: 'Login from Cyber Cafe proxy node' },
    { ruleName: 'SIM/IMEI Correlation', weight: 19, confidence: 'MEDIUM', evidenceSummary: 'Target IMEI previously flagged' }
  ]
};

export const useFraudScore = (caseId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        if (USE_MOCK) {
          await new Promise(r => setTimeout(r, 400));
          if (isMounted) setData(mockFraudScore);
        } else {
          const res = await getFraudScore(caseId);
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
