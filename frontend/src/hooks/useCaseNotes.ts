import { useState, useEffect } from 'react';
import { getCaseNotes } from '../api/client';
import type { CaseNote } from '../types/api';

export const useCaseNotes = (caseId: string) => {
  const [data, setData] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await getCaseNotes(caseId);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) refresh();
  }, [caseId]);

  return { data, loading, error, refresh };
};
