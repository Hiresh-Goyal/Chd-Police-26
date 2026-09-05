import { useState, useEffect } from 'react';
import { getAlertDetail } from '../api/client';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const mockAlertDetail = {
  id: 'alt_01',
  title: 'NEXUS DETECTED',
  description: 'Call→Data→Transfer sequence matches organized syndicate modus operandi.',
  severity: 'CRITICAL',
  timeAgo: 'Just now',
  findings: [
    {
      id: 'f_01',
      title: 'Call followed by IP connection',
      description: '14 min call directly precedes netbanking login from cyber cafe.',
      episodes: [
        {
          id: 'ep_01',
          title: 'Communication & Login Event',
          events: [
            {
              id: 'evt_02',
              title: 'Voice Call',
              description: 'Outgoing voice call from suspect to victim.',
              rawRecord: { source_file: 'Airtel_CDR_Oct.csv', source_row: 142, keyFields: { caller: '+91 9812345678', receiver: '+91 9988776655' } }
            },
            {
              id: 'evt_03',
              title: 'Active Banking Data Session',
              description: 'Data packet transfer to HDFC NetBanking server from IP 103.76.234.12.',
              rawRecord: { source_file: 'IPDR_Logs_FastNet.csv', source_row: 88, keyFields: { ip: '103.76.234.12', dst: 'HDFC NetBanking' } }
            }
          ]
        }
      ]
    }
  ]
};

export const useAlertDetail = (alertId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        if (USE_MOCK) {
          await new Promise(r => setTimeout(r, 400));
          if (isMounted) setData({ ...mockAlertDetail, id: alertId });
        } else {
          const res = await getAlertDetail(alertId);
          if (isMounted) setData(res);
        }
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
