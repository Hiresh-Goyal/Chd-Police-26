import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { apiClient } from '../api/client';
import { CaseDetail, FraudScore } from '../types/api';

export const CaseWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [fraudScore, setFraudScore] = useState<FraudScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      loadData();
    }
  }, [caseId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [caseDetail, fScore] = await Promise.all([
        apiClient.getCase(caseId!),
        apiClient.getFraudScore(caseId!)
      ]);
      setCaseData(caseDetail);
      setFraudScore(fScore);
    } catch (err) {
      console.error(err);
      setError('Failed to load case data');
    } finally {
      setIsLoading(false);
    }
  };

  const hasUploads = caseData?.files && caseData.files.length > 0;
  
  // Note: the backend doesn't store notes natively right now, keep in state for demo
  const [notes, setNotes] = useState<any[]>([]);

  const [newNoteText, setNewNoteText] = useState('');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [caseStatus, setCaseStatus] = useState<string>('Active');
  const [isCloseCaseModalOpen, setIsCloseCaseModalOpen] = useState(false);

  if (isLoading) {
    return <div className="p-8 text-center text-ds-muted">Loading case data...</div>;
  }

  // If case not found, show not found
  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">search_off</span>
        <p className="text-[#64748B] text-sm">Case not found. <Link to="/cases" className="text-[#0B5CAB] underline">Back to My Cases</Link></p>
      </div>
    );
  }

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      id: `note_${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ASingh`,
      author: 'Insp. Amrit Singh',
      text: newNoteText.trim()
    };
    setNotes([newNote, ...notes]);
    setNewNoteText('');
    setIsAddNoteModalOpen(false);
    showToast('Investigator note recorded in case diary.', 'success');
  };

  const handleCloseCase = () => {
    setCaseStatus('Closed');
    setIsCloseCaseModalOpen(false);
    showToast(`Case #${caseId} status updated to CLOSED.`, 'info');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Context Header */}
      <div className="bg-white border border-[#D9E1EA] rounded-md px-5 py-3.5 flex flex-wrap justify-between items-start md:items-center gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm font-bold text-[#0B5CAB]">Case #{caseId?.substring(0, 8)}</span>
            <span className="text-[#94A3B8]">—</span>
            <h1 className="text-lg font-bold text-[#191C1E]">
              {caseData.title}
            </h1>
          </div>
          <div className="text-xs text-[#424751] flex items-center gap-2">
            <span>Opened {new Date(caseData.updated_at).toLocaleDateString()}</span>
            <span className="w-1 h-1 rounded-full bg-[#C2C6D3]"></span>
            <span>Assigned to IO</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {fraudScore?.risk_level === 'Critical' && (
            <div className="bg-[#DC2626]/10 text-[#DC2626] px-2.5 py-1 rounded border border-[#DC2626]/20 text-xs font-bold font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              CRITICAL
            </div>
          )}

          <button
            onClick={() => showToast(`Case is currently ${caseData.status}.`, 'info')}
            className="bg-[#F8FAFC] border border-[#D9E1EA] px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold text-[#191C1E] hover:bg-slate-100 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${caseData.status === 'Active' ? 'bg-[#0B5CAB] animate-pulse' : 'bg-slate-400'}`}></span>
            {caseData.status}
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/cases/${caseId}/evidence-report`)}
          >
            Generate Report
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCloseCaseModalOpen(true)}
            icon="done_all"
          >
            Close Case
          </Button>
        </div>
      </div>

      {/* Upload prompt for new cases with no evidence yet */}
      {!hasUploads && (
        <div className="bg-[#EFF6FF] border border-[#0B5CAB]/20 rounded-md px-5 py-4 flex items-center gap-4">
          <span className="material-symbols-outlined text-[#0B5CAB] text-3xl shrink-0">upload_file</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0B2340]">No evidence uploaded yet</p>
            <p className="text-xs text-[#64748B] mt-0.5">Upload CDR, bank statements, IPDR or NCRP files to enable analysis modules.</p>
          </div>
          <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
            Upload Evidence
          </Button>
        </div>
      )}

      {/* Workspace Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-9 gap-4 items-start">
        {/* Left Column: Summary & Suspect Entities (~3 cols / 25%) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Case Summary Card */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <h3 className="text-[11px] font-bold text-[#424751] tracking-widest border-b border-[#EDF0F4] pb-1.5 mb-3 uppercase">
              CASE SUMMARY
            </h3>

            {/* Fraud Score Gauge */}
            <div className="flex flex-col items-center justify-center my-2">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={fraudScore?.risk_level === 'Critical' ? '#DC2626' : '#F97316'}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - ((fraudScore?.score || 0) / 100) * 251.2}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold font-mono ${fraudScore?.risk_level === 'Critical' ? 'text-[#DC2626]' : 'text-[#F97316]'}`}>{Math.round(fraudScore?.score || 0)}</span>
                </div>
              </div>
              <span className={`mt-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${fraudScore?.risk_level === 'Critical' ? 'text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/20' : 'text-[#F97316] bg-[#F97316]/10 border-[#F97316]/20'}`}>
                FRAUD SCORE: {fraudScore?.risk_level || 'UNKNOWN'}
              </span>
            </div>

            {/* Metadata Rows */}
            <div className="flex flex-col gap-2 text-xs divide-y divide-[#EDF0F4] pt-2">
              <div className="flex justify-between pt-1">
                <span className="text-[#64748B]">Case ID</span>
                <span className="font-mono font-bold text-[#191C1E]">#{caseId?.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Subject</span>
                <span className="font-semibold text-[#191C1E]">{caseData.title.split(' — ')[1] || caseData.title}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Type</span>
                <span className="text-[#191C1E]">{caseData.title.split(' — ')[0] || 'Investigation'}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Total Alerts</span>
                <span className="font-mono font-bold text-[#DC2626]">{fraudScore?.total_findings || 0}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Status</span>
                <span className="text-[#0B5CAB] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#0B5CAB] rounded-full"></span>
                  {caseData.status}
                </span>
              </div>
            </div>
          </div>

          {/* Top Alerts / Suspect Entities List */}
          <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="text-[11px] font-bold text-[#424751] uppercase tracking-widest">
                TOP FINDINGS ({fraudScore?.top_findings?.length || 0})
              </h3>
              <button
                onClick={() => navigate(`/cases/${caseId}/entity-graph`)}
                className="text-[#0B5CAB] hover:bg-[#0B5CAB]/10 p-1 rounded"
                title="View in Entity Graph"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
              </button>
            </div>

            <div className="p-2 flex flex-col gap-1">
              {(fraudScore?.top_findings || []).map((finding: any) => (
                <div
                  key={finding.id}
                  onClick={() => navigate(`/cases/${caseId}/alerts`)}
                  className="flex items-center gap-2.5 p-2 hover:bg-[#EFF6FF]/50 rounded cursor-pointer transition-colors border border-transparent hover:border-[#D9E1EA]"
                >
                  <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-[#424751] shrink-0">
                    <span className="material-symbols-outlined text-[16px]">
                      {finding.severity === 'CRITICAL' ? 'warning' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#191C1E] truncate">{finding.explanation || 'Alert Detected'}</div>
                    <div className="text-[9px] font-mono text-[#64748B] truncate uppercase">{finding.rule_id}</div>
                  </div>
                  <div className="shrink-0 bg-[#DC2626]/10 text-[#DC2626] text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                    {Math.round(finding.fraud_weight)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Overview, Quick Stats, Nexus, Mini Timeline (~6 cols / 50%) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0891B2]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">CDR</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">147</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#F97316]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">BANK</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">23</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#16A34A]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">SOCIAL</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">4</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#7C3AED]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">IPDR</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">18</span>
            </div>

            <div className="bg-white border border-[#DC2626]/40 rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden bg-[#DC2626]/5 shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#DC2626]"></div>
              <span className="text-[10px] font-bold text-[#DC2626] mb-0.5 font-mono">ANOMALIES</span>
              <span className="font-mono text-base font-bold text-[#DC2626]">7</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0B5CAB]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">EVIDENCE</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">6</span>
            </div>
          </div>

          {/* Mini Key Event Timeline */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs flex flex-col">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-2 mb-3">
              <h3 className="text-[11px] font-bold text-[#424751] tracking-widest uppercase">
                KEY EVENT TIMELINE (15 AUG 2026)
              </h3>
              <Link
                to="/cases/2847/timeline"
                className="text-xs text-[#0B5CAB] font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Full Timeline</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </Link>
            </div>

            <div className="flex flex-col gap-3 relative pl-2 pr-1">
              {/* Event 1 */}
              <div className="flex items-start gap-3 hover:bg-[#F8FAFC] p-1.5 rounded transition-colors">
                <div className="font-mono text-xs text-[#64748B] w-12 pt-0.5 text-right shrink-0">09:15</div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A] mt-1 shrink-0 ring-4 ring-[#16A34A]/20"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#191C1E] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#16A34A]">forum</span>
                    Initial Social Contact
                  </div>
                  <div className="font-mono text-[11px] text-[#64748B] mt-0.5 truncate">
                    WhatsApp MSG from +44 7700 900077
                  </div>
                </div>
              </div>

              {/* Event 2 */}
              <div className="flex items-start gap-3 hover:bg-[#F8FAFC] p-1.5 rounded transition-colors">
                <div className="font-mono text-xs text-[#64748B] w-12 pt-0.5 text-right shrink-0">14:00</div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#0891B2] mt-1 shrink-0 ring-4 ring-[#0891B2]/20"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#191C1E] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#0891B2]">call</span>
                    Voice Call (CDR)
                  </div>
                  <div className="font-mono text-[11px] text-[#64748B] mt-0.5 truncate">
                    Duration: 14m 23s (Tower: Cell ID 45892)
                  </div>
                </div>
              </div>

              {/* Event 3 */}
              <div className="flex items-start gap-3 hover:bg-[#F8FAFC] p-1.5 rounded transition-colors">
                <div className="font-mono text-xs text-[#64748B] w-12 pt-0.5 text-right shrink-0">14:28</div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] mt-1 shrink-0 ring-4 ring-[#7C3AED]/20"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#191C1E] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#7C3AED]">router</span>
                    Active Data Session
                  </div>
                  <div className="font-mono text-[11px] text-[#64748B] mt-0.5 truncate">
                    IP: 103.76.234.12 (Port 443) Data: 2.4MB
                  </div>
                </div>
              </div>

              {/* Event 4 (IMPS Transfer - Highlighted) */}
              <div className="flex items-start gap-3 bg-[#DC2626]/5 border border-[#DC2626]/20 p-2 rounded">
                <div className="font-mono text-xs text-[#DC2626] font-bold w-12 pt-0.5 text-right shrink-0">14:32</div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626] mt-1 shrink-0 ring-4 ring-[#DC2626]/30 animate-pulse"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#DC2626] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">account_balance</span>
                    Fraudulent Transfer (IMPS ₹48,000)
                  </div>
                  <div className="font-mono text-[11px] text-[#191C1E] mt-0.5">
                    Amount: ₹48,000 → HDFC XXXXXXX4521
                  </div>
                </div>
              </div>

              {/* Event 5 */}
              <div className="flex items-start gap-3 hover:bg-[#F8FAFC] p-1.5 rounded transition-colors">
                <div className="font-mono text-xs text-[#64748B] w-12 pt-0.5 text-right shrink-0">15:10</div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#F97316] mt-1 shrink-0 ring-4 ring-[#F97316]/20"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#191C1E] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#F97316]">local_atm</span>
                    ATM Withdrawal
                  </div>
                  <div className="font-mono text-[11px] text-[#64748B] mt-0.5 truncate">
                    Location: ATM ID SIB8922, Sector 22
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Add Note Modal */}
      <Modal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        title="Add Investigator Note"
        subtitle="Record observations in the Case #2847 official diary."
        icon="note_add"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleAddNote()}>
              Save Note
            </Button>
          </>
        }
      >
        <textarea
          rows={4}
          value={newNoteText}
          onChange={e => setNewNoteText(e.target.value)}
          placeholder="Enter detailed forensic note or investigative direction..."
          className="w-full p-2.5 border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
        />
      </Modal>

      {/* Close Case Modal */}
      <Modal
        isOpen={isCloseCaseModalOpen}
        onClose={() => setIsCloseCaseModalOpen(false)}
        title="Confirm Case Closure"
        subtitle="Are you sure you want to mark Case #2847 as Closed?"
        icon="task_alt"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCloseCaseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCloseCase}>
              Confirm Close
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#424751]">
          Marking this case closed will archive active tracking nodes and finalize the current evidence dossier for court proceedings.
        </p>
      </Modal>
    </div>
  );
};
