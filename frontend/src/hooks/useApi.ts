import { useQuery } from '@tanstack/react-query';
import {
  getCase,
  getTimeline,
  getAlerts,
  getFraudScore,
  getGraph,
  getCriminalFlow,
  getGeospatial,
  getCorrelationMatrix,
  getAlertDetail,
  getSystemUsers,
  getAuditLogs,
  getSentinelItems,
  getCaseFiles,
  getCases
} from '../api/client';

export const useAllCases = () => {
  return useQuery({
    queryKey: ['cases'],
    queryFn: getCases,
  });
};

export const useCase = (caseId: string) => {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: () => getCase(caseId),
    enabled: !!caseId,
  });
};

export const useTimeline = (caseId: string, eventType?: string, entityId?: string) => {
  return useQuery({
    queryKey: ['timeline', caseId, eventType, entityId],
    queryFn: () => getTimeline(caseId, { event_type: eventType, entity_id: entityId }),
    enabled: !!caseId,
  });
};

export const useAlerts = (caseId: string, minSeverity?: string) => {
  return useQuery({
    queryKey: ['alerts', caseId, minSeverity],
    queryFn: () => getAlerts(caseId),
    enabled: !!caseId,
  });
};

export const useAlertDetail = (caseId: string, findingId: string) => {
  return useQuery({
    queryKey: ['alertDetail', caseId, findingId],
    queryFn: () => getAlertDetail(caseId, findingId),
    enabled: !!caseId && !!findingId,
  });
};

export const useAllAlerts = (cases: {id: string, title?: string}[]) => {
  return useQuery({
    queryKey: ['allAlerts', cases.map(c => c.id)],
    queryFn: async () => {
      const allPromises = cases.map(async (c) => {
        const findings = await getAlerts(c.id);
        return findings.map(f => ({ ...f, caseName: c.title || c.id }));
      });
      const nestedAlerts = await Promise.all(allPromises);
      return nestedAlerts.flat().sort((a, b) => {
        const scoreA = (a.fraud_weight || 0) * (a.confidence || 0);
        const scoreB = (b.fraud_weight || 0) * (b.confidence || 0);
        return scoreB - scoreA;
      });
    },
    enabled: cases.length > 0,
  });
};

export const useFraudScore = (caseId: string) => {
  return useQuery({
    queryKey: ['fraudScore', caseId],
    queryFn: () => getFraudScore(caseId),
    enabled: !!caseId,
  });
};

export const useGraph = (caseId: string) => {
  return useQuery({
    queryKey: ['graph', caseId],
    queryFn: () => getGraph(caseId),
    enabled: !!caseId,
  });
};

export const useCriminalFlow = (caseId: string) => {
  return useQuery({
    queryKey: ['criminalFlow', caseId],
    queryFn: () => getCriminalFlow(caseId),
    enabled: !!caseId,
  });
};

export const useGeospatial = (caseId: string) => {
  return useQuery({
    queryKey: ['geospatial', caseId],
    queryFn: () => getGeospatial(caseId),
    enabled: !!caseId,
  });
};

export const useCorrelationMatrix = (caseId: string) => {
  return useQuery({
    queryKey: ['correlationMatrix', caseId],
    queryFn: () => getCorrelationMatrix(caseId),
    enabled: !!caseId,
  });
};

export const useCaseFiles = (caseId: string) => {
  return useQuery({
    queryKey: ['caseFiles', caseId],
    queryFn: () => getCaseFiles(caseId),
    enabled: !!caseId,
  });
};

export const useSystemUsers = () => {
  return useQuery({
    queryKey: ['systemUsers'],
    queryFn: getSystemUsers,
  });
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
  });
};

export const useSentinelItems = () => {
  return useQuery({
    queryKey: ['sentinelItems'],
    queryFn: getSentinelItems,
  });
};
