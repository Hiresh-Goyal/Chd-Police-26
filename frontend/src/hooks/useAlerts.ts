import { useState, useEffect } from 'react';
import { getAlerts } from '../api/client';
import { CASE_2847 } from '../data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const useAlerts = (caseId: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        if (USE_MOCK) {
          await new Promise(r => setTimeout(r, 400));
          // Mock data alerts don't have rule_id / fraudScore contribution originally, adding here
          const mockedAlerts = CASE_2847.alerts.map(a => ({
            ...a,
            rule_id: `RULE_${Math.floor(Math.random() * 1000)}`,
            fraudScoreContribution: Math.floor(Math.random() * 20) + 10
          }));
          if (isMounted) setData(mockedAlerts);
        } else {
          const res = await getAlerts(caseId);
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
