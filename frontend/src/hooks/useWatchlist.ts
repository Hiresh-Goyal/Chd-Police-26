import { useState, useEffect } from 'react';
import { getWatches } from '../api/client';
import type { SentinelWatch } from '../types/api';

export const useWatchlist = (status?: string) => {
  const [data, setData] = useState<SentinelWatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await getWatches(status);
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
  }, [status]);

  return { data, loading, error, refresh };
};
