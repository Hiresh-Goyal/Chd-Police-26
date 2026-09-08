import { useEffect, useState } from 'react';
import { getCriminalFlow } from '../api/client';
import type { CriminalFlowData } from '../types/api';

export const useCriminalFlow = (caseId: string) => {
  const [data, setData] = useState<CriminalFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!caseId) { setData(null); setLoading(false); return; }
    setLoading(true); setError(null);
    getCriminalFlow(caseId).then(res => { if (mounted) setData(res); })
      .catch(err => { if (mounted) { setError(err instanceof Error ? err : new Error('Failed to load money trail.')); setData(null); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [caseId]);
  return { data, loading, error };
};
