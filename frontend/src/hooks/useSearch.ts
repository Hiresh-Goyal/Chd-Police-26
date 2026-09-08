import { useState, useEffect } from 'react';
import { searchAll } from '../api/client';
import type { SearchResultItem } from '../types/api';

export const useSearch = (q: string, types?: string) => {
  const [data, setData] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const executeSearch = async () => {
    if (!q || q.length < 2) {
      setData([]);
      return;
    }
    try {
      setLoading(true);
      const res = await searchAll(q, types);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // debounce search
    const timer = setTimeout(() => {
      executeSearch();
    }, 500);
    return () => clearTimeout(timer);
  }, [q, types]);

  return { data, loading, error, executeSearch };
};
