import { useEffect, useState } from 'react';
import { getAlertDetail } from '../api/client';
import type { FindingDetailAPI } from '../types/api';

export const useAlertDetail = (alertId: string | null, caseId: string) => {
  const [data, setData] = useState<FindingDetailAPI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!alertId || !caseId) { setData(null); setLoading(false); return; }
    setLoading(true); setError(null);
    getAlertDetail(caseId, alertId).then(res => { if (mounted) setData(res); })
      .catch(err => { if (mounted) { setError(err instanceof Error ? err : new Error('Failed to load alert detail.')); setData(null); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [alertId, caseId]);
  return { data, loading, error };
};
