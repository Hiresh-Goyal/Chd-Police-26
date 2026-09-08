import { useState, useEffect } from 'react';
import { getAlertDetail } from '../api/client';



export const useAlertDetail = (alertId: string, caseId: string = 'default-case') => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const res = await getAlertDetail(caseId, alertId);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [alertId]);

  return { data, loading, error };
};
