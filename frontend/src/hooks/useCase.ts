import { useCallback, useEffect, useState } from 'react';
import { getCase } from '../api/client';
import type { CaseAPI } from '../types/api';

export const useCase = (caseId: string) => {
  const [data, setData] = useState<CaseAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!caseId) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await getCase(caseId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load case.'));
      setData(null);
    } finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
};
