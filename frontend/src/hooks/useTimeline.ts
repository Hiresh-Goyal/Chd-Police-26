import { useState, useEffect } from 'react';
import { getTimeline } from '../api/client';
import { CASE_2847_TIMELINE } from '../data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const useTimeline = (caseId: string, filters?: any) => {
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
          let filtered = [...CASE_2847_TIMELINE];
          if (filters) {
            if (filters.domain) filtered = filtered.filter(e => e.domain === filters.domain);
            if (filters.search) filtered = filtered.filter(e => 
              e.title.toLowerCase().includes(filters.search.toLowerCase()) || 
              e.description.toLowerCase().includes(filters.search.toLowerCase())
            );
          }
          if (isMounted) setData(filtered);
        } else {
          // In real API, pass filters as query params
          const res = await getTimeline(caseId);
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
  }, [caseId, JSON.stringify(filters)]);

  return { data, loading, error };
};
