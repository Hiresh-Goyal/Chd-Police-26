import { useState, useEffect } from 'react';
import { getCaseFiles } from '../api/client';
import type { UploadedFileRecord } from '../types/api';

export const useUploadedFiles = (caseId: string) => {
  const [data, setData] = useState<UploadedFileRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await getCaseFiles(caseId);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [caseId]);

  return { data, loading, error, refresh };
};
