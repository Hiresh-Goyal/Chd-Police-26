import { useEffect, useState } from 'react';
import { getAlerts } from '../api/client';
import type { FindingAPI } from '../types/api';

export const useAlerts = (caseId: string) => {
  const [data, setData] = useState<FindingAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!caseId) { setData([]); setLoading(false); return; }
    setLoading(true); setError(null);
    getAlerts(caseId).then(res => { if (mounted) setData(res); })
      .catch(err => { if (mounted) { setError(err instanceof Error ? err : new Error('Failed to load alerts.')); setData([]); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [caseId]);
  return { data, loading, error };
};
