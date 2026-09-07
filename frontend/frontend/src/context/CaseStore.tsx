import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ALL_CASES, CaseSummary, EvidenceFile } from '../data/mockData';

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

const STORAGE_KEY_CASES = 'rakshak_cases_v1';
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
  // Merge persisted user-created cases with the static mock cases
  const [cases, setCases] = useState<CaseSummary[]>(() => {
    const persisted = loadFromStorage<CaseSummary[]>(STORAGE_KEY_CASES, []);
    // Keep static cases + any user-created ones (by id not in ALL_CASES)
    const staticIds = new Set(ALL_CASES.map(c => c.id));
    const userCreated = persisted.filter(c => !staticIds.has(c.id));
    return [...userCreated, ...ALL_CASES];
  });

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, EvidenceFile[]>>(() =>
    loadFromStorage<Record<string, EvidenceFile[]>>(STORAGE_KEY_FILES, {})
  );

  // Persist user-created cases (not the static ones)
  useEffect(() => {
    const staticIds = new Set(ALL_CASES.map(c => c.id));
    const userCreated = cases.filter(c => !staticIds.has(c.id));
    localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(userCreated));
  }, [cases]);

  // Persist uploaded files
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  const addCase = useCallback((c: CaseSummary) => {
    setCases(prev => [c, ...prev]);
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
