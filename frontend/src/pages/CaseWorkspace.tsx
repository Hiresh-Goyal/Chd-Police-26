import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../context/CaseStore';
import { useFraudScore, useGraph, useTimeline } from '../hooks/useApi';
import { FraudScoreAPI, FindingAPI } from '../types/api';

import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

export const CaseWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const { getCase, getCaseFiles } = useCaseStore();

  const caseData = getCase(caseId ?? '');
  const uploadedFiles = getCaseFiles(caseId ?? '');
  const hasUploads = uploadedFiles.filter(f => f.status === 'complete').length > 0;

  const [notes, setNotes] = useState(caseData?.notes ?? []);
  
  const { data: fraudScoreData, isLoading: isFraudScoreLoading } = useFraudScore(caseId ?? '');
  const { data: graphData, isLoading: isGraphLoading } = useGraph(caseId ?? '');
  const { data: timelineData, isLoading: isTimelineLoading } = useTimeline(caseId ?? '');
  
  // Extract top suspect entities from graph data
  const suspectEntities = (graphData?.nodes || [])
    .sort((a, b) => b.fraud_score_contribution - a.fraud_score_contribution)
    .slice(0, 6);

  // Extract top 5 recent events from timeline
  const recentEvents = (timelineData || []).slice(0, 5);

  const [newNoteText, setNewNoteText] = useState('');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [caseStatus, setCaseStatus] = useState<string>(caseData?.status ?? 'Active');
  const [isCloseCaseModalOpen, setIsCloseCaseModalOpen] = useState(false);

  // If case not found, show not found
  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">search_off</span>
        <p className="text-[#64748B] text-sm">Case not found. <Link to="/cases" className="text-[#0B5CAB] underline">Back to My Cases</Link></p>
      </div>
    );
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
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
            <span className="font-mono text-sm font-bold text-[#0B5CAB]">Case #{caseId}</span>
            <span className="text-[#94A3B8]">—</span>
            <h1 className="text-lg font-bold text-[#191C1E]">
              {caseData.title}
            </h1>
          </div>
          <div className="text-xs text-[#424751] flex items-center gap-2">
            <span>Opened {caseData.openedDate}</span>
            <span className="w-1 h-1 rounded-full bg-[#C2C6D3]"></span>
            <span>Assigned to Insp. {caseData.assignedIO}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {caseData.priority === 'Critical' && (
            <div className="bg-[#DC2626]/10 text-[#DC2626] px-2.5 py-1 rounded border border-[#DC2626]/20 text-xs font-bold font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              CRITICAL
            </div>
          )}

          <button
            onClick={() => showToast(`Case is currently ${caseStatus}.`, 'info')}
            className="bg-[#F8FAFC] border border-[#D9E1EA] px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold text-[#191C1E] hover:bg-slate-100 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${caseStatus === 'Active' ? 'bg-[#0B5CAB] animate-pulse' : 'bg-slate-400'}`}></span>
            {caseStatus}
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
                    stroke={fraudScoreData?.risk_level === 'CRITICAL' ? '#DC2626' : fraudScoreData?.risk_level === 'HIGH' ? '#ea580c' : '#0B5CAB'}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - ((fraudScoreData?.score || 0) / 100))}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold font-mono ${fraudScoreData?.risk_level === 'CRITICAL' ? 'text-[#DC2626]' : fraudScoreData?.risk_level === 'HIGH' ? 'text-orange-600' : 'text-[#0B5CAB]'}`}>
                    {fraudScoreData?.score || 0}
                  </span>
                </div>
              </div>
              <span className={`mt-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                fraudScoreData?.risk_level === 'CRITICAL' ? 'text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/20' : 
                fraudScoreData?.risk_level === 'HIGH' ? 'text-orange-600 bg-orange-500/10 border-orange-500/20' : 
                (fraudScoreData?.score || 0) > 0 ? 'text-[#0B5CAB] bg-[#0B5CAB]/10 border-[#0B5CAB]/20' :
                'text-[#64748B] bg-slate-100 border-slate-200'
              }`}>
                FRAUD SCORE: {(fraudScoreData?.score || 0) > 0 ? fraudScoreData?.risk_level : 'NOT SCORED'}
              </span>
            </div>

            {/* Metadata Rows */}
            <div className="flex flex-col gap-2 text-xs divide-y divide-[#EDF0F4] pt-2">
              <div className="flex justify-between pt-1">
                <span className="text-[#64748B]">Case ID</span>
                <span className="font-mono font-bold text-[#191C1E]">#{caseId}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Subject</span>
                <span className="font-semibold text-[#191C1E]">{caseData?.subject ?? 'Subject'}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Type</span>
                <span className="text-[#191C1E]">{caseData?.type ?? 'Case'}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Est. Loss</span>
                <span className="font-mono font-bold text-[#DC2626]">₹0</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Status</span>
                <span className="text-[#0B5CAB] font-semibold flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 ${caseStatus === 'Active' ? 'bg-[#0B5CAB] animate-pulse' : 'bg-slate-400'} rounded-full`}></span>
                  {caseStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Top 3 Contributing Findings */}
          <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="text-[11px] font-bold text-[#424751] uppercase tracking-widest">
                TOP CONTRIBUTING FINDINGS
              </h3>
            </div>
            <div className="p-2 flex flex-col gap-2">
              {isFraudScoreLoading ? (
                <div className="text-center text-xs text-[#64748B] p-4 animate-pulse">Loading findings...</div>
              ) : fraudScoreData?.top_findings && fraudScoreData.top_findings.length > 0 ? (
                fraudScoreData.top_findings.slice(0, 3).map((finding: FindingAPI) => (
                  <div key={finding.id} className="p-2.5 rounded border border-[#D9E1EA] bg-white hover:bg-[#F8FAFC] cursor-pointer transition-colors group" onClick={() => navigate('/alerts')}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold font-mono text-[#DC2626] tracking-wider">RULE {finding.rule_id}</span>
                      <span className="text-[10px] font-bold text-[#191C1E] bg-slate-100 px-1.5 py-0.5 rounded">+{finding.fraud_weight || finding.weight || 0} WGT</span>
                    </div>
                    <div className="text-xs text-[#191C1E] font-medium leading-snug line-clamp-2">
                      {finding.explanation}
                    </div>
                    <div className="mt-1.5 text-[9px] font-mono text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                      <span>CONF: {(finding.confidence * 100).toFixed(0)}%</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0B5CAB]">DETAILS →</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-[#64748B] text-xs p-4">No findings detected.</div>
              )}
            </div>
          </div>

          {/* Suspect Entities List */}
          <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="text-[11px] font-bold text-[#424751] uppercase tracking-widest">
                SUSPECT ENTITIES ({suspectEntities.length})
              </h3>
              <button
                onClick={() => navigate('/cases/2847/entity-graph')}
                className="text-[#0B5CAB] hover:bg-[#0B5CAB]/10 p-1 rounded"
                title="View in Entity Graph"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
              </button>
            </div>

            <div className="p-2 flex flex-col gap-1.5 overflow-y-auto max-h-[380px] custom-scrollbar">
              {isGraphLoading ? (
                <div className="text-center text-[#64748B] text-xs p-4 animate-pulse">Loading entities...</div>
              ) : suspectEntities.length > 0 ? (
                suspectEntities.map((ent: any) => (
                  <div
                    key={ent.id}
                    onClick={() => navigate(`/cases/${caseId}/entity-graph`)}
                    className="flex items-center gap-2.5 p-2 hover:bg-[#EFF6FF]/50 rounded cursor-pointer transition-colors border border-transparent hover:border-[#D9E1EA]"
                  >
                    <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-[#424751] shrink-0">
                      <span className="material-symbols-outlined text-[16px]">
                        {ent.type === 'PERSON' ? 'person' : ent.type === 'PHONE' ? 'call' : ent.type === 'ACCOUNT' ? 'account_balance' : ent.type === 'IMEI' ? 'smartphone' : ent.type === 'IP' ? 'router' : 'forum'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#191C1E] truncate">{ent.canonical_value}</div>
                      <div className="text-[9px] font-mono text-[#64748B] truncate uppercase">{ent.confidence_tier}</div>
                    </div>
                    <div className="shrink-0 bg-[#DC2626]/10 text-[#DC2626] text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                      {ent.fraud_score_contribution.toFixed(1)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-[#64748B] text-xs p-4">No entities extracted yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Overview, Quick Stats, Nexus, Mini Timeline (~6 cols / 50%) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-5 gap-3 border-t border-[#EDF0F4] pt-5">
              {[
                { label: 'CDR', value: uploadedFiles.filter(f => f.domain === 'CDR').reduce((acc, f) => acc + (f.recordsCount || 0), 0), color: '#0B5CAB' },
                { label: 'BANK', value: uploadedFiles.filter(f => f.domain === 'BANK').reduce((acc, f) => acc + (f.recordsCount || 0), 0), color: '#F97316' },
                { label: 'SOCIAL', value: uploadedFiles.filter(f => f.domain === 'SOCIAL').reduce((acc, f) => acc + (f.recordsCount || 0), 0), color: '#22C55E' },
                { label: 'IPDR', value: uploadedFiles.filter(f => f.domain === 'IPDR').reduce((acc, f) => acc + (f.recordsCount || 0), 0), color: '#8B5CF6' },
                { label: 'ANOMALIES', value: fraudScoreData?.score ? 7 : 0, color: '#EF4444', isAlert: true },
              ].map(stat => (
                <div key={stat.label} className={`bg-white border rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs ${stat.isAlert ? 'bg-red-50 border-red-200' : 'border-[#D9E1EA]'}`}>
                  <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: stat.color }}></div>
                  <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">{stat.label}</span>
                  <span className={`font-mono text-base font-bold ${stat.isAlert ? 'text-red-600' : 'text-[#191C1E]'}`}>{stat.value}</span>
                </div>
              ))}
            </div>

          {/* Mini Key Event Timeline */}
          <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] p-3">
              <h3 className="text-[11px] font-bold text-[#424751] tracking-widest uppercase">
                KEY EVENT TIMELINE
              </h3>
              <Link
                to={`/cases/${caseId}/timeline`}
                className="text-xs text-[#0B5CAB] font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Full Timeline</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </Link>
            </div>

            <div className="p-3">
              {isTimelineLoading ? (
                <div className="text-center text-[#64748B] text-xs p-6 animate-pulse">Loading timeline...</div>
              ) : recentEvents.length > 0 ? (
                <div className="flex flex-col gap-4 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-slate-200 ml-1 mt-2">
                  {recentEvents.map((evt: any) => (
                    <div key={evt.id} className="ml-6 relative">
                      <div className="absolute left-[-25px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0B5CAB]"></div>
                      <div className="border border-slate-200 rounded-md p-2.5 bg-white shadow-sm hover:border-[#D9E1EA] transition-colors flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[#191C1E] font-mono">{evt.event_type}</span>
                          <span className="text-[9px] text-[#64748B] font-mono">{new Date(evt.ts_start).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-[#424751]">
                          <span className="font-semibold text-[#191C1E]">{evt.actor_raw}</span> 
                          {evt.peer_raw && (
                            <>
                              <span className="text-[#64748B] mx-1">→</span>
                              <span className="font-semibold text-[#191C1E]">{evt.peer_raw}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[#64748B] text-xs p-6">No events extracted yet.</div>
              )}
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
            <Button variant="primary" onClick={handleAddNote}>
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
