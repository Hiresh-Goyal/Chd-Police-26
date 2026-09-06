import { useState, useEffect } from 'react';
import { api } from '../api/client';

export const useAuditLogs = (caseId?: string, limit = 100) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const params: Record<string, any> = { limit };
    if (caseId) params.case_id = caseId;

    api.get('/audit/logs', { params })
      .then(res => { if (isMounted) setData(res.data); })
      .catch(err => { if (isMounted) setError(err); })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [caseId, limit]);

  return { data, loading, error };
};
