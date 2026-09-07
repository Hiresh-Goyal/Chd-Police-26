import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CaseSummary, EvidenceFile } from '../data/types';
import { getCases, createCase as apiCreateCase } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CaseStoreContext {
  cases: CaseSummary[];
  addCase: (c: CaseSummary) => void;
  getCase: (id: string) => CaseSummary | undefined;
  uploadedFiles: Record<string, EvidenceFile[]>;
  updateCaseEvidence: (caseId: string, files: EvidenceFile[]) => void;
  getCaseFiles: (caseId: string) => EvidenceFile[];
}

// ── Context ───────────────────────────────────────────────────────────────────

const CaseStoreCtx = createContext<CaseStoreContext | null>(null);

const STORAGE_KEY_FILES = 'rakshak_files_v1';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const CaseStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<CaseSummary[]>([]);

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, EvidenceFile[]>>(() =>
    loadFromStorage<Record<string, EvidenceFile[]>>(STORAGE_KEY_FILES, {})
  );

  // Fetch real cases from backend
  useEffect(() => {
    let isMounted = true;
    const fetchApiCases = async () => {
      try {
        const apiCases = await getCases();
        const mapped: CaseSummary[] = apiCases.map(c => ({
          id: c.id,
          title: c.title || c.name,
          subject: c.name,
          type: 'Investigation',
          status: c.status as any,
          priority: 'High',
          openedDate: new Date(c.created_at).toLocaleDateString(),
          assignedIO: 'Amrit Singh',
          ioRole: 'Inspector',
          ioStation: 'Sector 17',
          fraudScore: 0,
          estimatedLoss: 'TBD',
          entitiesCount: 0,
          lastActivity: 'Just now',
          stats: { cdr: 0, bank: 0, social: 0, ipdr: 0, anomalies: 0, evidence: 0 },
          entities: [],
          notes: [],
          alerts: []
        }));
        if (isMounted) setCases(mapped);
      } catch (e) {
        console.error("Failed to fetch cases:", e);
      }
    };
    fetchApiCases();
    return () => { isMounted = false; };
  }, []);

  // Persist uploaded files
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  const addCase = useCallback(async (c: CaseSummary) => {
    try {
      const res = await apiCreateCase({ name: c.subject, title: c.title });
      const mapped: CaseSummary = {
        ...c,
        id: res.id,
      };
      setCases(prev => [mapped, ...prev]);
    } catch (e) {
      console.error("Failed to create case", e);
      // fallback to optimistic update
      setCases(prev => [c, ...prev]);
    }
  }, []);

  const getCase = useCallback((id: string) => {
    return cases.find(c => c.id === id);
  }, [cases]);

  const updateCaseEvidence = useCallback((caseId: string, files: EvidenceFile[]) => {
    setUploadedFiles(prev => ({ ...prev, [caseId]: files }));
    // Also update the case stats
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const domains = new Set(files.map(f => f.domain));
      return {
        ...c,
        stats: {
          cdr: files.filter(f => f.domain === 'CDR').length,
          bank: files.filter(f => f.domain === 'BANK').length,
          ipdr: files.filter(f => f.domain === 'IPDR').length,
          social: files.filter(f => f.domain === 'SOCIAL').length,
          anomalies: domains.size > 2 ? 3 : 1,
          evidence: files.length,
        },
        entitiesCount: Math.max(c.entitiesCount, Math.floor(files.length * 1.5) + 1),
      };
    }));
  }, []);

  const getCaseFiles = useCallback((caseId: string) => {
    return uploadedFiles[caseId] ?? [];
  }, [uploadedFiles]);

  return (
    <CaseStoreCtx.Provider value={{ cases, addCase, getCase, uploadedFiles, updateCaseEvidence, getCaseFiles }}>
      {children}
    </CaseStoreCtx.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCaseStore(): CaseStoreContext {
  const ctx = useContext(CaseStoreCtx);
  if (!ctx) throw new Error('useCaseStore must be used inside CaseStoreProvider');
  return ctx;
}
