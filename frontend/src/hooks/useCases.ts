import { useState, useEffect } from 'react';
import { getCases } from '../api/client';
import type { CaseAPI } from '../types/api';

export const useCases = () => {
  const [data, setData] = useState<CaseAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    getCases()
      .then(res => { if (isMounted) setData(res); })
      .catch(err => { if (isMounted) setError(err); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  return { data, loading, error };
};
