import { useState, useEffect } from 'react';
import { getCriminalFlow } from '../api/client';
import { MONEY_TRAIL_NODES } from '../data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const useCriminalFlow = (caseId: string) => {
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
          if (isMounted) setData([...MONEY_TRAIL_NODES]);
        } else {
          const res = await getCriminalFlow(caseId);
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
