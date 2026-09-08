import { useEffect, useState } from 'react';
import { getFraudScore } from '../api/client';
import type { FraudScoreAPI } from '../types/api';

export interface FraudScoreView extends FraudScoreAPI {
  riskLevel: string;
  topFindings: Array<FraudScoreAPI['top_findings'][number] & { ruleName: string; evidenceSummary: string }>;
}

export const useFraudScore = (caseId: string) => {
  const [data, setData] = useState<FraudScoreView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!caseId) { setData(null); setLoading(false); return; }
    setLoading(true); setError(null);
    getFraudScore(caseId).then(res => {
      if (!mounted) return;
      setData({
        ...res,
        riskLevel: res.risk_level,
        topFindings: res.top_findings.map(f => ({
          ...f,
          ruleName: f.rule_id,
          evidenceSummary: f.explanation,
        })),
      });
    }).catch(err => {
      if (mounted) { setError(err instanceof Error ? err : new Error('Failed to load fraud score.')); setData(null); }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [caseId]);
  return { data, loading, error };
};
