import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useTimeline } from '../hooks/useTimeline';
import { useCase } from '../hooks/useCase';
import { useFraudScore } from '../hooks/useFraudScore';

import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

export const CaseWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const { data: timelineEvents } = useTimeline(caseId ?? '');

  const { data: caseData, loading: caseLoading } = useCase(caseId ?? '');
  const { data: fraudScoreData } = useFraudScore(caseId ?? '');
  const uploadedFiles = caseData?.evidence ?? [];
  const hasUploads = uploadedFiles.some(f => f.status === 'complete');

  const [notes, setNotes] = useState((caseData as any)?.notes ?? []);

  const [newNoteText, setNewNoteText] = useState('');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [caseStatus, setCaseStatus] = useState<string>(caseData?.status ?? 'OPEN');
  const displayCaseStatus = caseStatus === 'OPEN' ? 'Active' : caseStatus === 'IN_PROGRESS' ? 'Under Review' : caseStatus.charAt(0) + caseStatus.slice(1).toLowerCase();

  const [isCloseCaseModalOpen, setIsCloseCaseModalOpen] = useState(false);
  const priorityEntities = useMemo(() =>
    [...(caseData?.entities ?? [])]
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
      .slice(0, 8),
    [caseData?.entities],
  );

  const priorityFindings = useMemo(() =>
    [...(fraudScoreData?.topFindings ?? [])]
      .sort((a, b) => {
        const weightDelta = (b.weight ?? 0) - (a.weight ?? 0);
        return weightDelta !== 0 ? weightDelta : (b.confidence ?? 0) - (a.confidence ?? 0);
      })
      .slice(0, 3),
    [fraudScoreData?.topFindings],
  );

  const priorityAlerts = useMemo(() =>
    [...(caseData?.alerts ?? [])]
      .sort((a, b) => {
        const weightDelta = (b.fraud_weight ?? 0) - (a.fraud_weight ?? 0);
        return weightDelta !== 0 ? weightDelta : (b.confidence ?? 0) - (a.confidence ?? 0);
      })
      .slice(0, 3),
    [caseData?.alerts],
  );

  const priorityTimelineEvents = useMemo(() => {
    // Build the case narrative from the highest-value evidence while ensuring
    // each available evidence stream is represented in the overview.
    const topEventIds = new Set(
      priorityFindings.flatMap((finding: any) => finding.event_ids ?? []),
    );
    const sorted = [...timelineEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const relevant = sorted.filter(event => event.isCritical || topEventIds.has(event.id));
    const selected = new Map<string, any>();

    // Prefer an important event from CDR, BANK, SOCIAL and IPDR respectively.
    for (const domain of ['CDR', 'BANK', 'SOCIAL', 'IPDR']) {
      const domainEvents = sorted.filter(event => event.domain === domain);
      const preferred = domainEvents.find(event => event.isCritical || topEventIds.has(event.id));
      if (preferred) selected.set(preferred.id, preferred);
      else if (domainEvents[0]) selected.set(domainEvents[0].id, domainEvents[0]);
    }

    // Fill the remaining slots from finding-linked / critical activity.
    for (const event of relevant) {
      if (selected.size >= 8) break;
      selected.set(event.id, event);
    }

    return [...selected.values()]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, 8);
  }, [timelineEvents, priorityFindings]);

  const formatKeyEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  useEffect(() => { if (caseData) setCaseStatus(caseData.status); }, [caseData?.status]);

  // If case not found, show not found
  if (caseLoading) {
    return <div className="p-8 text-center text-gray-500">Loading Case...</div>;
  }
  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">search_off</span>
        <p className="text-[#64748B] text-sm">Case not found. <Link to="/cases" className="text-[#0B5CAB] underline">Back to My Cases</Link></p>
      </div>
    );
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !caseId) return;
    try {
      const { createCaseNote } = await import('../api/client');
      await createCaseNote(caseId, newNoteText.trim());
      setNewNoteText('');
      setIsAddNoteModalOpen(false);
      showToast('Investigator note recorded in case diary.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record note.', 'error');
    }
  };

  const handleCloseCase = async () => {
    if (!caseId) return;
    try {
      const { updateCase } = await import('../api/client');
      const updated = await updateCase(caseId, { status: 'CLOSED' });
      setCaseStatus(updated.status);
      setIsCloseCaseModalOpen(false);
      showToast(`Case #${caseId} status updated to CLOSED.`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to close case.', 'error');
    }
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
              {caseData.title ?? (caseData as any).name ?? `Case #${caseId}`}
            </h1>
          </div>
          <div className="text-xs text-[#424751] flex items-center gap-2">
            <span>Opened {caseData.created_at
              ? new Date(caseData.created_at).toLocaleDateString('en-IN')
              : ((caseData as any).openedDate ?? '—')}</span>
            <span className="w-1 h-1 rounded-full bg-[#C2C6D3]"></span>
            <span>Assigned to {caseData.assigned_io_name ?? caseData.assigned_io ?? 'Officer'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {caseData.priority === 'CRITICAL' && (
            <div className="bg-[#DC2626]/10 text-[#DC2626] px-2.5 py-1 rounded border border-[#DC2626]/20 text-xs font-bold font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              CRITICAL
            </div>
          )}

          <button
            onClick={() => showToast(`Case is currently ${caseStatus}.`, 'info')}
            className="bg-[#F8FAFC] border border-[#D9E1EA] px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold text-[#191C1E] hover:bg-slate-100 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${caseStatus === 'OPEN' || caseStatus === 'IN_PROGRESS' ? 'bg-[#0B5CAB] animate-pulse' : 'bg-slate-400'}`}></span>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Summary & Suspect Entities (~3 cols / 25%) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Case Summary Card */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <h3 className="text-[11px] font-bold text-[#424751] tracking-widest border-b border-[#EDF0F4] pb-1.5 mb-3 uppercase">
              CASE SUMMARY
            </h3>

            {/* Fraud Score Gauge */}
            {fraudScoreData && (
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
                      stroke={fraudScoreData.riskLevel === 'CRITICAL' ? '#DC2626' : fraudScoreData.riskLevel === 'HIGH' ? '#EA580C' : fraudScoreData.riskLevel === 'MEDIUM' ? '#EAB308' : '#22C55E'}
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * fraudScoreData.score) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold font-mono ${fraudScoreData.riskLevel === 'CRITICAL' ? 'text-[#DC2626]' : fraudScoreData.riskLevel === 'HIGH' ? 'text-orange-600' : fraudScoreData.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {fraudScoreData.score}
                    </span>
                  </div>
                </div>
                <span className={`mt-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${fraudScoreData.riskLevel === 'CRITICAL' ? 'text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/20' : fraudScoreData.riskLevel === 'HIGH' ? 'text-orange-600 bg-orange-500/10 border-orange-500/20' : fraudScoreData.riskLevel === 'MEDIUM' ? 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' : 'text-green-600 bg-green-500/10 border-green-500/20'}`}>
                  FRAUD SCORE: {fraudScoreData.riskLevel}
                </span>

                {/* Top Contributing Findings */}
                <div className="mt-4 w-full flex flex-col gap-2 px-2">
                  <h4 className="text-[10px] font-bold text-[#64748B] uppercase">Top Contributors</h4>
                  {priorityFindings.map((finding: any, idx: number) => (
                    <div key={idx} className="bg-[#F8FAFC] border border-[#D9E1EA] rounded p-2 text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-[#191C1E]">{finding.ruleName}</span>
                        <span className="font-mono text-[#DC2626] bg-red-50 px-1 rounded">+{finding.weight}</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] mb-1">Confidence: {finding.confidence}</div>
                      <div className="text-[#424751] truncate" title={finding.evidenceSummary}>{finding.evidenceSummary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Rows */}
            <div className="flex flex-col gap-2 text-xs divide-y divide-[#EDF0F4] pt-2">
              <div className="flex justify-between pt-1">
                <span className="text-[#64748B]">Case ID</span>
                <span className="font-mono font-bold text-[#191C1E]">#{caseData.id}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Subject</span>
                <span className="font-semibold text-[#191C1E]">{caseData.name || caseData.title}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Type</span>
                <span className="text-[#191C1E]">{caseData.case_type || caseData.title || '—'}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Est. Loss</span>
                <span className="font-mono font-bold text-[#DC2626]">₹{caseData.estimated_loss.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-[#64748B]">Status</span>
                <span className="text-[#0B5CAB] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#0B5CAB] rounded-full"></span>
                  {displayCaseStatus}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Center Column: Overview, Quick Stats, Nexus, Mini Timeline (~6 cols / 50%) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0891B2]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">CDR</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">{caseData.stats.cdr}</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#F97316]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">BANK</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">{caseData.stats.bank}</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#16A34A]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">SOCIAL</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">{caseData.stats.social}</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#7C3AED]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">IPDR</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">{caseData.stats.ipdr}</span>
            </div>

            <div className="bg-white border border-[#DC2626]/40 rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden bg-[#DC2626]/5 shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#DC2626]"></div>
              <span className="text-[10px] font-bold text-[#DC2626] mb-0.5 font-mono">ANOMALIES</span>
              <span className="font-mono text-base font-bold text-[#DC2626]">{caseData.stats.anomalies}</span>
            </div>

            <div className="bg-white border border-[#D9E1EA] rounded p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#0B5CAB]"></div>
              <span className="text-[10px] font-bold text-[#64748B] mb-0.5 font-mono">EVIDENCE</span>
              <span className="font-mono text-base font-bold text-[#191C1E]">{caseData.stats.evidence}</span>
            </div>
          </div>

          {/* Mini Key Event Timeline */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#EDF0F4] pb-2 mb-3">
              <h3 className="text-[11px] font-bold text-[#424751] tracking-widest uppercase min-w-0">
                KEY EVENT TIMELINE ({timelineEvents[0]?.timestamp ? new Date(timelineEvents[0].timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'NO DATE'})
              </h3>
              <Link
                to={`/cases/${caseId}/timeline`}
                className="text-xs text-[#0B5CAB] font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Full Timeline</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </Link>
            </div>

            <div className="flex flex-col gap-2.5 relative pl-1 pr-1">
              {priorityTimelineEvents.map((event, index) => {
                const color = event.domain === 'CDR' ? '#0891B2' : event.domain === 'IPDR' ? '#7C3AED' : event.domain === 'BANK' ? (event.description?.toUpperCase().includes('ATM') ? '#F97316' : '#DC2626') : event.domain === 'SOCIAL' ? '#16A34A' : '#C8102E';
                const icon = event.domain === 'CDR' ? 'call' : event.domain === 'IPDR' ? 'router' : event.domain === 'BANK' ? (event.description?.toUpperCase().includes('ATM') ? 'local_atm' : 'account_balance') : event.domain === 'SOCIAL' ? 'forum' : 'description';
                return (
                  <div key={event.id ?? index} className={`grid grid-cols-[128px_16px_minmax(0,1fr)] items-start gap-2 ${event.isCritical ? 'bg-[#DC2626]/5 border border-[#DC2626]/20 p-2 rounded' : 'hover:bg-[#F8FAFC] p-1.5 rounded'} transition-colors`}>
                    <div className={`font-mono text-[10px] leading-4 ${event.isCritical ? 'text-[#DC2626] font-bold' : 'text-[#64748B]'} pt-0.5 text-right whitespace-normal break-words`}>{formatKeyEventTime(event.timestamp)}</div>
                    <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 ring-4" style={{ backgroundColor: color, boxShadow: `0 0 0 4px ${color}33` }}></div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className={`text-xs ${event.isCritical ? 'font-bold text-[#DC2626]' : 'font-semibold text-[#191C1E]'} flex flex-wrap items-center gap-1.5 min-w-0`}>
                        <span className="material-symbols-outlined text-[14px]" style={{ color }}>{icon}</span>
                        {event.title}
                      </div>
                      <div className="font-mono text-[11px] leading-4 text-[#64748B] mt-0.5 break-words whitespace-normal">{event.description}</div>
                    </div>
                  </div>
                );
              })}
              {timelineEvents.length === 0 && <div className="text-xs text-[#64748B] p-2">No priority events returned.</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Highest-Risk Entities */}
          <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden h-full">
            <div className="p-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
              <h3 className="text-[11px] font-bold text-[#424751] uppercase tracking-widest">
                HIGHEST-RISK ENTITIES ({caseData.entities_count})
              </h3>
              <button
                onClick={() => navigate(`/cases/${caseId}/entity-graph`)}
                className="text-[#0B5CAB] hover:bg-[#0B5CAB]/10 p-1 rounded"
                title="View in Entity Graph"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
              </button>
            </div>

            <div className="p-2 flex flex-col gap-1.5 overflow-y-auto max-h-[380px] custom-scrollbar">
              {priorityEntities.map((ent: any) => (
                <div
                  key={ent.id}
                  onClick={() => navigate(`/cases/${caseId}/entity-graph`)}
                  className="flex items-center gap-2.5 p-2 hover:bg-[#EFF6FF]/50 rounded cursor-pointer transition-colors border border-transparent hover:border-[#D9E1EA]"
                >
                  <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-[#424751] shrink-0">
                    <span className="material-symbols-outlined text-[16px]">
                      {ent.type === 'PERSON' ? 'person' : ent.type === 'PHONE' ? 'call' : ent.type === 'BANK' ? 'account_balance' : ent.type === 'IMEI' ? 'smartphone' : ent.type === 'IP' ? 'router' : 'forum'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#191C1E] truncate">{ent.name}</div>
                    <div className="text-[9px] font-mono text-[#64748B] truncate uppercase">{ent.role}</div>
                  </div>
                  <div className="shrink-0 bg-[#DC2626]/10 text-[#DC2626] text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                    {ent.risk_score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Alerts */}
          {priorityAlerts.length > 0 && (
            <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden h-full">
              <div className="p-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-[#424751] uppercase tracking-widest">
                  PRIORITY ALERTS
                </h3>
                <span className="text-[10px] font-mono font-bold text-[#DC2626]">TOP {priorityAlerts.length}</span>
              </div>
              <div className="p-2 flex flex-col gap-1.5">
                {priorityAlerts.map((alert: any) => (
                  <div key={alert.id} className="p-2 rounded border border-[#DC2626]/15 bg-[#DC2626]/5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-[#191C1E]">{alert.title}</span>
                      {alert.fraud_weight != null && (
                        <span className="shrink-0 font-mono text-[10px] font-bold text-[#DC2626]">+{alert.fraud_weight}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5 line-clamp-2">{alert.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Note Modal */}
      <Modal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        title="Add Investigator Note"
        subtitle="Record observations in the official case diary."
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
        subtitle="Are you sure you want to mark this case as Closed?"
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
