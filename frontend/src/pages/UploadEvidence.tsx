import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUploadedFiles } from '../hooks/useUploadedFiles';
import { uploadEvidence } from '../api/client';
import type { UploadedFileRecord } from '../types/api';

import { DomainBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const UploadEvidence: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { data: uploadedFiles, refresh } = useUploadedFiles(caseId ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // queue is used just for UI optimistic updates while uploading
  const [queue, setQueue] = useState<(UploadedFileRecord & { progress: number, status: 'parsing' | 'validating' | 'complete' })[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const completeCount = uploadedFiles.length;

  const handleFilesAdded = async (files: FileList | null) => {
    if (!files || files.length === 0 || !caseId) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let domain: 'CDR' | 'BANK' | 'IPDR' | 'SOCIAL' | 'NCRP' = 'CDR';
      const name = file.name.toLowerCase();
      if (name.includes('bank') || name.includes('statement') || name.includes('hdfc') || name.includes('sbi')) domain = 'BANK';
      else if (name.includes('ip') || name.includes('pcap') || name.includes('ipdr')) domain = 'IPDR';
      else if (name.includes('chat') || name.includes('whatsapp') || name.includes('social')) domain = 'SOCIAL';
      else if (name.includes('ncrp') || name.includes('complaint')) domain = 'NCRP';

      const tempId = `temp_${Date.now()}_${i}`;
      setQueue(prev => [{
        id: tempId,
        case_id: caseId,
        filename: file.name,
        file_type: domain,
        sha256: 'validating...',
        events_created: 0,
        parse_errors: [],
        uploaded_at: new Date().toISOString(),
        progress: 15,
        status: 'parsing'
      }, ...prev]);

      try {
        const res = await uploadEvidence(caseId, file, domain);
        showToast(`Uploaded ${res.filename} successfully (${res.events_created} events).`, 'success');
        refresh();
        setQueue(prev => prev.filter(q => q.id !== tempId));
      } catch (err: any) {
        showToast(err.message ?? 'Upload failed', 'error');
        setQueue(prev => prev.filter(q => q.id !== tempId));
      }
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    showToast('SHA-256 evidence hash copied to clipboard.', 'success');
  };

  const handleRemoveFile = (id: string) => {
    showToast('Cannot delete file from live system yet.', 'info');
  };

  const handleRetry = (id: string) => {
    showToast('Cannot retry from here yet.', 'info');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Upload Evidence</h1>
          <p className="text-sm text-[#424751] mt-0.5">
            Securely ingest external data sets for forensic processing and analytical correlation with Case #{caseId}.
          </p>
        </div>
        {/* Start Analysis CTA — appears once ≥1 file is complete */}
        {completeCount > 0 && caseId !== '2847' && (
          <Button
            variant="primary"
            size="sm"
            icon="play_arrow"
            onClick={() => navigate(`/cases/${caseId}/timeline`)}
          >
            Start Analysis
          </Button>
        )}
      </header>

      {/* Single Column Layout */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesAdded(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#0B5CAB] bg-[#EFF6FF]'
                : 'border-[#0B5CAB]/60 bg-white hover:bg-[#F8FAFC]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => handleFilesAdded(e.target.files)}
              multiple
              className="hidden"
            />
            <span className="material-symbols-outlined text-4xl text-[#0B5CAB] mb-2.5">
              cloud_upload
            </span>
            <p className="text-sm font-semibold text-[#0B2340] mb-1">
              Drag and drop evidence files here or click to browse
            </p>
            <p className="text-xs text-[#64748B] max-w-md">
              Accepted formats: CDR (CSV/XLSX), Bank Statements (PDF/CSV), IPDR (CSV/JSON), NCRP (CSV)
            </p>
            <Button variant="primary" size="sm" className="mt-4 pointer-events-none">
              Select Files
            </Button>
          </div>

          {/* Upload Queue Section */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-[#D9E1EA] pb-2.5 mb-3">
              <h3 className="text-sm font-bold text-[#0B2340] uppercase tracking-wider">
                Current Batch Processing ({queue.length})
              </h3>
              <span className="text-xs font-mono text-[#64748B]">Batch Ref: BATCH-2026-OCT-89</span>
            </div>

            <div className="space-y-3">
              {[...queue, ...uploadedFiles.map(f => ({ ...f, status: 'complete' as const, progress: 100 }))].map(item => (
                <div
                  key={item.id}
                  className="bg-white border border-[#D9E1EA] rounded p-3 flex flex-col gap-2 hover:border-[#0B5CAB]/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        <DomainBadge domain={item.file_type} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#191C1E] truncate">{item.filename}</p>
                        <p className="text-[11px] text-[#64748B] font-mono">
                          {item.file_type} • {item.status === 'complete' ? `Ingestion Complete (${item.events_created} events)` : item.status === 'parsing' ? 'Parsing text & metadata...' : 'Validating SHA-256 structure...'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'complete' ? (
                        <span className="material-symbols-outlined text-emerald-600 text-[20px]" title="Complete">
                          check_circle
                        </span>
                      ) : (
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-[#0B5CAB]">{item.progress}%</span>
                        </div>
                      )}
                      {item.status !== 'complete' && (
                        <button
                          onClick={() => handleRemoveFile(item.id)}
                          className="text-[#94A3B8] hover:text-[#DC2626] p-1 rounded transition-colors"
                          title="Remove file"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for in-progress items */}
                  {item.status !== 'complete' && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0B5CAB] h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Cryptographic SHA-256 Hash */}
                  <div className="flex items-center justify-between bg-[#F8FAFC] px-2.5 py-1 rounded border border-[#EDF0F4] text-[10px] font-mono text-[#64748B]">
                    <span className="truncate mr-2">SHA-256: {item.sha256}</span>
                    <button
                      onClick={() => handleCopyHash(item.sha256)}
                      className="text-[#0B5CAB] hover:underline font-bold shrink-0 flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
