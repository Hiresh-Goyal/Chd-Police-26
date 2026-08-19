import React, { useState, useRef } from 'react';
import { INITIAL_EVIDENCE_FILES, EvidenceFile } from '../data/mockData';
import { AnalysisNav } from '../components/shell/AnalysisNav';
import { DomainBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const UploadEvidence: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<EvidenceFile[]>(INITIAL_EVIDENCE_FILES);
  const [isDragging, setIsDragging] = useState(false);

  const generateMockHash = () => {
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: EvidenceFile[] = Array.from(files).map((file, idx) => {
      let domain: 'CDR' | 'BANK' | 'IPDR' | 'SOCIAL' | 'NCRP' = 'CDR';
      const name = file.name.toLowerCase();
      if (name.includes('bank') || name.includes('statement') || name.includes('hdfc') || name.includes('sbi')) domain = 'BANK';
      else if (name.includes('ip') || name.includes('pcap') || name.includes('ipdr')) domain = 'IPDR';
      else if (name.includes('chat') || name.includes('whatsapp') || name.includes('social')) domain = 'SOCIAL';
      else if (name.includes('ncrp') || name.includes('complaint')) domain = 'NCRP';

      return {
        id: `ev_${Date.now()}_${idx}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        domain,
        status: 'validating',
        progress: 15,
        hash: generateMockHash(),
        uploadDate: `${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} IST`,
        recordsCount: Math.floor(Math.random() * 500) + 10
      };
    });

    setQueue(prev => [...newFiles, ...prev]);
    showToast(`Added ${newFiles.length} file(s) to ingestion queue.`, 'info');

    // Simulate progressive completion
    newFiles.forEach(nf => {
      setTimeout(() => {
        setQueue(current =>
          current.map(item =>
            item.id === nf.id ? { ...item, status: 'parsing', progress: 65 } : item
          )
        );
      }, 1200);

      setTimeout(() => {
        setQueue(current =>
          current.map(item =>
            item.id === nf.id ? { ...item, status: 'complete', progress: 100 } : item
          )
        );
        showToast(`Ingestion complete for ${nf.name}`, 'success');
      }, 2500);
    });
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    showToast('SHA-256 evidence hash copied to clipboard.', 'success');
  };

  const handleRemoveFile = (id: string) => {
    setQueue(queue.filter(q => q.id !== id));
    showToast('Removed evidence item from queue.', 'info');
  };

  const handleRetry = (id: string) => {
    setQueue(queue.map(q => q.id === id ? { ...q, status: 'parsing', progress: 50 } : q));
    setTimeout(() => {
      setQueue(current => current.map(q => q.id === id ? { ...q, status: 'complete', progress: 100 } : q));
      showToast('File reprocessed successfully.', 'success');
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3">
        <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Upload Evidence</h1>
        <p className="text-sm text-[#424751] mt-0.5">
          Securely ingest external data sets for forensic processing and analytical correlation with Case #2847.
        </p>
      </header>

      {/* Analysis Tabs */}
      <AnalysisNav />

      {/* 60/40 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (60% ~ 7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Drag & Drop Zone */}
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
              {queue.map(item => (
                <div
                  key={item.id}
                  className="bg-white border border-[#D9E1EA] rounded p-3 flex flex-col gap-2 hover:border-[#0B5CAB]/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        <DomainBadge domain={item.domain} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#191C1E] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#64748B] font-mono">
                          {item.size} • {item.domain} • {item.status === 'complete' ? 'Ingestion Complete' : item.status === 'parsing' ? 'Parsing text & metadata...' : 'Validating SHA-256 structure...'}
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
                      <button
                        onClick={() => handleRemoveFile(item.id)}
                        className="text-[#94A3B8] hover:text-[#DC2626] p-1 rounded transition-colors"
                        title="Remove file"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
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
                    <span className="truncate mr-2">SHA-256: {item.hash}</span>
                    <button
                      onClick={() => handleCopyHash(item.hash)}
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

        {/* Right Column: Ingestion Guidance & Evidence Integrity (40% ~ 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Ingestion Guidance Section */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">info</span>
              Ingestion Guidance & Schema Specs
            </h3>
            <p className="text-xs text-[#64748B] mb-3 leading-relaxed">
              Standardized schemas ensure automatic entity extraction and cross-domain correlation matching.
            </p>

            <div className="space-y-2.5 text-xs text-[#334155]">
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#EDF0F4]">
                <div className="font-semibold text-[#0891B2] flex items-center gap-1 mb-0.5">
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  CDR (Call Data Records)
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Required headers: Calling_No, Called_No, Call_Date, Call_Time, Duration_Sec, First_Cell_ID, Azimuth.
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#EDF0F4]">
                <div className="font-semibold text-[#F97316] flex items-center gap-1 mb-0.5">
                  <span className="material-symbols-outlined text-[14px]">account_balance</span>
                  Bank Statement Logs
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Required headers: Txn_Date, Value_Date, Description, Ref_No, Debit_Amt, Credit_Amt, Balance.
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#EDF0F4]">
                <div className="font-semibold text-[#7C3AED] flex items-center gap-1 mb-0.5">
                  <span className="material-symbols-outlined text-[14px]">router</span>
                  IPDR / Network Sessions
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Required headers: Source_IP, Source_Port, Dest_IP, Dest_Port, Session_Start, Bytes_Transferred.
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Integrity & Section 65B */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
              Evidence Integrity Guarantee
            </h3>
            <p className="text-xs text-[#424751] leading-relaxed mb-3">
              All ingested files undergo immediate cryptographic SHA-256 hashing at upload. Hashes are logged to the tamper-evident audit ledger to maintain legal admissibility under Section 65B of the Indian Evidence Act.
            </p>

            <div className="bg-[#EFF6FF] border border-[#0B5CAB]/20 rounded p-2.5 text-xs text-[#0B2340]">
              <div className="font-bold flex items-center gap-1 mb-0.5">
                <span className="material-symbols-outlined text-[14px] text-[#0B5CAB]">lock</span>
                Chain of Custody Active
              </div>
              <div className="text-[11px] text-[#424751]">
                Custodian: Insp. Amrit Singh (ID: 1042) • UT Police Forensics
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
