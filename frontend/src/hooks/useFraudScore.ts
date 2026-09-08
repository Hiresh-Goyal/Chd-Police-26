import { useState, useEffect } from 'react';
import { getFraudScore } from '../api/client';



export const useFraudScore = (caseId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const res = await getFraudScore(caseId);
        // Normalize snake_case → camelCase to match mock shape
        const normalized = {
          score: res.score,
          riskLevel: res.risk_level,
          totalFindings: res.total_findings,
          topFindings: (res.top_findings ?? []).map((f: any) => ({
            ruleName: f.rule_id,
            weight: f.fraud_weight,
            confidence: f.severity,
            evidenceSummary: f.explanation,
            // keep originals too:
            rule_id: f.rule_id,
            fraud_weight: f.fraud_weight,
            severity: f.severity,
            explanation: f.explanation,
          })),
        };
        if (isMounted) setData(normalized);
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [caseId]);

  return { data, loading, error };
};

