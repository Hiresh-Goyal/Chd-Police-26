import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TimelineEvent } from '../data/types';
import { useCaseStore } from '../context/CaseStore';
import { CanonicalEventAPI } from '../types/api';
import { useTimeline } from '../hooks/useApi';
import { tierColor } from '../utils/confidence';

import { DomainBadge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const Timeline: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { getCaseFiles, getCase } = useCaseStore();

  const uploadedFiles = getCaseFiles(caseId ?? '');
  const caseData = getCase(caseId ?? '');
  const hasUploads = uploadedFiles.filter(f => f.status === 'complete').length > 0;

  const [filterType, setFilterType] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const { data: rawEvents = [], isLoading } = useTimeline(
    caseId ?? '',
    filterType || undefined,
    filterEntity || undefined
  );

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    return rawEvents.map((evt: CanonicalEventAPI, i: number) => {
      let domain: 'CDR' | 'IPDR' | 'BANK' | 'SOCIAL' | 'NCRP' | 'EPISODES' = 'CDR';
      if (evt.event_type === 'IPDR_SESSION') domain = 'IPDR';
      else if (evt.event_type === 'BANK_TRANSFER') domain = 'BANK';
      else if (evt.event_type === 'SOCIAL_POST' || evt.event_type === 'SOCIAL_INTERACTION') domain = 'SOCIAL';

      return {
        id: evt.id,
        timestamp: evt.ts_start,
        timeDisplay: new Date(evt.ts_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        domain,
        title: evt.event_type.replace('_', ' '),
        description: `Actor: ${evt.actor_raw} | Target: ${evt.peer_raw || 'N/A'}`,
        source: `Source File ID: ${evt.source_file_id}`,
        provenance: `Confidence: ${evt.actor_confidence_tier}`,
        isCritical: i === 0,
        metadata: {
          'Actor': evt.actor_raw,
          'Peer': evt.peer_raw || 'N/A',
          'Amount': evt.amount ? String(evt.amount) : 'N/A',
          'Location': evt.location_raw || 'N/A'
        }
      };
    });
  }, [rawEvents]);

  const [activeDomains, setActiveDomains] = useState<string[]>(['CDR', 'IPDR', 'BANK', 'SOCIAL', 'NCRP']);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [zoomScale, setZoomScale] = useState<'1hr' | '30m' | '15m'>('1hr');
  const [selectedDate, setSelectedDate] = useState('15 Aug 2026');

  // Calculate dynamic min/max time bounds for the header axis
  const timeAxisLabels = useMemo(() => {
    if (timelineEvents.length === 0) return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
    
    const timestamps = timelineEvents.map(e => new Date(e.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    // If only one event or events span less than 1 hour, create a 1 hour padding
    const padding = (maxTime - minTime) < 3600000 ? 3600000 : 0;
    const start = minTime - padding;
    const end = maxTime + padding;
    const step = (end - start) / 5;
    
    const labels = [];
    for (let i = 0; i <= 5; i++) {
      labels.push(new Date(start + step * i).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
    return labels;
  }, [timelineEvents]);

  const toggleDomain = (domain: string) => {
    if (activeDomains.includes(domain)) {
      if (activeDomains.length > 1) {
        setActiveDomains(activeDomains.filter(d => d !== domain));
      } else {
        showToast('At least one domain must remain active.', 'warning');
      }
    } else {
      setActiveDomains([...activeDomains, domain]);
    }
  };

  const handleExportTimeline = () => {
    const json = JSON.stringify(timelineEvents, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_case_${caseId}_${selectedDate.replace(/\s+/g, '_')}.json`;
    a.click();
    showToast('Timeline exported successfully.', 'success');
  };

  // Empty state for new cases with no uploads
  if (!hasUploads) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">timeline</span>
        <div>
          <p className="font-bold text-[#0B2340]">No evidence uploaded yet</p>
          <p className="text-sm text-[#64748B] mt-1">Upload CDR, bank or IPDR files to generate the timeline.</p>
        </div>
        <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
          Upload Evidence
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#{caseId}</span>
            <span>•</span>
            <span className="font-medium text-[#191C1E]">{caseData?.subject ?? 'Subject'}</span>
            <span>•</span>
            <span>{caseData?.type ?? 'Case'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Cross-Domain Timeline</h1>
          <p className="text-sm text-[#424751] mt-0.5">
            Chronological multi-lane correlation of telecom, bank, data, and social events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon="download" onClick={handleExportTimeline}>
            Export Timeline
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="add_task"
            onClick={() => showToast('Timeline sequence added to Evidence Report draft.', 'success')}
          >
            Add to Report
          </Button>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-white border border-[#D9E1EA] rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="material-symbols-outlined text-[#64748B] text-[18px]">filter_alt</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="font-mono text-xs font-bold text-[#191C1E] bg-[#F8FAFC] border border-[#D9E1EA] rounded px-2 py-1 cursor-pointer"
            >
              <option value="">All Event Types</option>
              <option value="CALL">Call</option>
              <option value="SMS">SMS</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="IPDR_SESSION">Data Session</option>
              <option value="SOCIAL_POST">Social Post</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#64748B] text-[18px]">search</span>
            <input
              type="text"
              placeholder="Filter by Entity ID..."
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value)}
              className="font-mono text-xs text-[#191C1E] bg-[#F8FAFC] border border-[#D9E1EA] rounded px-2 py-1 outline-none focus:border-[#0B5CAB] transition-colors"
            />
          </div>

          <div className="h-4 w-px bg-[#D9E1EA] hidden sm:block"></div>

          {/* Domain Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase mr-1">
              DOMAINS:
            </span>

            {[
              { key: 'CDR', label: 'CDR', color: '#0891B2' },
              { key: 'IPDR', label: 'IPDR', color: '#7C3AED' },
              { key: 'BANK', label: 'BANK', color: '#F97316' },
              { key: 'SOCIAL', label: 'SOCIAL', color: '#16A34A' },
              { key: 'NCRP', label: 'NCRP', color: '#C8102E' }
            ].map(dom => {
              const active = activeDomains.includes(dom.key);
              return (
                <button
                  key={dom.key}
                  onClick={() => toggleDomain(dom.key)}
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-white shadow-xs'
                      : 'opacity-40 bg-slate-100 border-transparent text-slate-400'
                  }`}
                  style={{
                    borderColor: active ? dom.color : 'transparent',
                    color: active ? dom.color : undefined
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dom.color }}
                  ></span>
                  {dom.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomScale(zoomScale === '15m' ? '30m' : '1hr')}
            className="p-1 text-[#64748B] hover:text-[#191C1E] hover:bg-slate-100 rounded"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_out</span>
          </button>
          <span className="text-xs font-mono text-[#64748B]">{zoomScale} scale</span>
          <button
            onClick={() => setZoomScale(zoomScale === '1hr' ? '30m' : '15m')}
            className="p-1 text-[#64748B] hover:text-[#191C1E] hover:bg-slate-100 rounded"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
          </button>
        </div>
      </div>

      {/* Multi-Lane Chronological Timeline Canvas */}
      <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden flex flex-col">
        {/* Timeline Header (Time Axis) */}
        <div className="flex h-9 bg-[#F8FAFC] border-b border-[#D9E1EA] sticky top-0 z-20 text-xs font-mono text-[#64748B]">
          <div className="w-32 shrink-0 border-r border-[#D9E1EA] flex items-center justify-center font-bold uppercase text-[10px] text-[#424751]">
            TIMELINE LANE
          </div>
          <div className="flex-1 relative flex items-center justify-between px-6">
            {timeAxisLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>

        {/* Dynamic Lanes */}
        {activeDomains.map(domain => {
          const domainEvents = timelineEvents.filter(e => e.domain === domain);
          if (domainEvents.length === 0) return null;
          
          let color = '#0891B2'; // Default CDR
          if (domain === 'IPDR') color = '#7C3AED';
          else if (domain === 'BANK') color = '#F97316';
          else if (domain === 'SOCIAL') color = '#16A34A';
          else if (domain === 'NCRP') color = '#C8102E';
          
          return (
            <div key={domain} className="flex min-h-[75px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors">
              <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                  {domain}
                </span>
              </div>
              <div className="flex-1 p-2 relative flex flex-wrap items-center gap-2 overflow-x-auto">
                {domainEvents.map(evt => (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="bg-white border-2 rounded px-3 py-1.5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 max-w-sm shrink-0"
                    style={{ borderColor: color, backgroundColor: `${color}1A` }}
                  >
                    <div>
                      <div className="text-[11px] font-bold font-mono" style={{ color }}>{evt.timeDisplay} • {evt.title}</div>
                      <div className="text-[10px] text-[#191C1E] truncate">{evt.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Details Drawer */}
      <Drawer
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
        subtitle={selectedEvent?.timestamp}
        width="w-[420px]"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2));
                showToast('Event JSON copied to clipboard.', 'success');
              }}
            >
              Copy Payload
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => {
                showToast(`Event #${selectedEvent?.id} marked as primary evidence.`, 'success');
                setSelectedEvent(null);
              }}
            >
              Tag as Key Finding
            </Button>
          </>
        }
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            {/* Header domain & description */}
            <div className="p-3 bg-[#F8FAFC] border border-[#D9E1EA] rounded">
              <div className="flex items-center justify-between mb-2">
                <DomainBadge domain={selectedEvent.domain} size="md" />
                {selectedEvent.isCritical && (
                  <span className="bg-[#DC2626]/10 text-[#DC2626] font-bold text-[10px] px-2 py-0.5 rounded font-mono">
                    CRITICAL CORRELATION
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[#191C1E] leading-snug">
                {selectedEvent.description}
              </p>
            </div>

            {/* Structured Metadata */}
            <div>
              <h4 className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-2">
                Forensic Parameters
              </h4>
              <div className="bg-white border border-[#D9E1EA] rounded divide-y divide-[#EDF0F4]">
                {Object.entries(selectedEvent.metadata).map(([key, value]) => (
                  <div key={key} className="p-2.5 flex justify-between gap-3">
                    <span className="text-[#64748B] font-medium">{key}</span>
                    <span className="font-mono text-[#191C1E] font-semibold text-right break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Provenance Block */}
            <div>
              <h4 className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-2">
                Evidence Provenance & Ingestion Source
              </h4>
              <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E1EA] font-mono text-[11px] text-[#424751]">
                <div className="text-[#0B5CAB] font-bold">{selectedEvent.source}</div>
                <div className="mt-1 text-[#64748B]">{selectedEvent.provenance}</div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
