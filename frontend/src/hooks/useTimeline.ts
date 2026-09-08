import { useState, useEffect } from 'react';
import { getTimeline } from '../api/client';
import { CanonicalEventAPI } from '../types/api';

export const useTimeline = (caseId: string, filters?: any) => {
  const [data, setData] = useState<CanonicalEventAPI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const apiParams: Record<string, string> = {};
        if (filters?.eventType) apiParams.event_type = filters.eventType;
        if (filters?.entity_id) apiParams.entity_id = filters.entity_id;
        if (filters?.start) apiParams.start = filters.start;
        if (filters?.end) apiParams.end = filters.end;

        let res = await getTimeline(caseId, Object.keys(apiParams).length ? apiParams : undefined);

        // Backend has no free-text search param — filter client-side
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          res = res.filter((e: any) =>
            e.actor_raw?.toLowerCase().includes(q) ||
            e.peer_raw?.toLowerCase().includes(q) ||
            e.event_type?.toLowerCase().includes(q)
          );
        }
        if (isMounted) setData(res);
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
