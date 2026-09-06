import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { TimelineEvent } from '../types/api';

import { DomainBadge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

// Domain config
const DOMAIN_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  CDR:    { color: '#0891B2', icon: 'call',             label: 'Voice & SMS' },
  IPDR:   { color: '#7C3AED', icon: 'router',           label: 'Data Sessions' },
  BANK:   { color: '#F97316', icon: 'account_balance',  label: 'IMPS & Cash-out' },
  SOCIAL: { color: '#16A34A', icon: 'forum',            label: 'WhatsApp / TG' },
  NCRP:   { color: '#C8102E', icon: 'report',           label: '1930 Portal' },
};

interface MappedEvent {
  id: string;
  timestamp: string;
  timeDisplay: string;
  domain: string;
  title: string;
  description: string;
  source: string;
  provenance: string;
  isCritical: boolean;
  metadata: Record<string, unknown>;
}

export const Timeline: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [timelineEvents, setTimelineEvents] = useState<MappedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (caseId) loadTimeline();
  }, [caseId]);

  const loadTimeline = async () => {
    try {
      setIsLoading(true);
      const events: TimelineEvent[] = await apiClient.getTimeline(caseId!);
      const mappedEvents: MappedEvent[] = events.map(e => {
        let domain = 'NCRP';
        if (e.event_type === 'CALL' || e.event_type === 'SMS') domain = 'CDR';
        if (e.event_type === 'BANK_TRANSFER') domain = 'BANK';
        if (e.event_type === 'IPDR_SESSION') domain = 'IPDR';
        if (e.event_type === 'SOCIAL_POST' || e.event_type === 'SOCIAL_INTERACTION') domain = 'SOCIAL';
        if (e.event_type === 'LOCATION_PING') domain = 'CDR';

        const timestamp = new Date(e.ts_start || new Date());
        return {
          id: e.id,
          timestamp: timestamp.toISOString(),
          timeDisplay: `${String(timestamp.getHours()).padStart(2,'0')}:${String(timestamp.getMinutes()).padStart(2,'0')}`,
          domain,
          title: `${e.event_type.replace(/_/g, ' ')} — ${e.actor_raw} → ${e.peer_raw || 'Unknown'}`,
          description: e.amount
            ? `Amount: ₹${Number(e.amount).toLocaleString()}`
            : e.location_raw
              ? `Location: ${e.location_raw}`
              : e.device_id ? `Device: ${e.device_id}` : '',
          source: e.source_file_name || 'System',
          provenance: `Row ${e.source_row}`,
          isCritical: e.episode_id !== null,
          metadata: {
            'Event Type': e.event_type,
            'Actor': e.actor_raw,
            'Peer': e.peer_raw || '—',
            'Time': timestamp.toLocaleString(),
            ...(e.amount ? { 'Amount': `₹${Number(e.amount).toLocaleString()}` } : {}),
            ...(e.location_raw ? { 'Location': e.location_raw } : {}),
            ...(e.device_id ? { 'Device': e.device_id } : {}),
            'Source File': e.source_file_name || '—',
            'Source Row': String(e.source_row ?? '—'),
            'Episode': e.episode_label || (e.episode_id ? 'Yes' : 'None'),
          },
        };
      });
      setTimelineEvents(mappedEvents);
    } catch {
      showToast('Failed to load timeline events', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeDomains, setActiveDomains] = useState<string[]>(['CDR', 'IPDR', 'BANK', 'SOCIAL', 'NCRP']);
  const [selectedEvent, setSelectedEvent] = useState<MappedEvent | null>(null);
  const [zoomScale, setZoomScale] = useState<'1hr' | '30m' | '15m'>('1hr');

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
    a.download = `timeline_case_${caseId}.json`;
    a.click();
    showToast('Timeline exported successfully.', 'success');
  };

  // Group events by domain for lane rendering
  const eventsByDomain = useMemo(() => {
    const grouped: Record<string, MappedEvent[]> = {};
    for (const ev of timelineEvents) {
      if (!grouped[ev.domain]) grouped[ev.domain] = [];
      grouped[ev.domain].push(ev);
    }
    return grouped;
  }, [timelineEvents]);

  // Compute time range for position calculation
  const timeRange = useMemo(() => {
    if (timelineEvents.length === 0) return { min: 0, max: 1 };
    const times = timelineEvents.map(e => new Date(e.timestamp).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    return { min, max: max === min ? min + 3600000 : max };
  }, [timelineEvents]);

  const getPositionPercent = (ts: string) => {
    const t = new Date(ts).getTime();
    return ((t - timeRange.min) / (timeRange.max - timeRange.min)) * 88 + 2; // 2–90% range
  };

  // Episodes / correlated events
  const criticalEvents = timelineEvents.filter(e => e.isCritical);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-[#64748B] text-sm">Loading timeline events...</span>
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">timeline</span>
        <div>
          <p className="font-bold text-[#0B2340]">No timeline events found</p>
          <p className="text-sm text-[#64748B] mt-1">Upload CDR, Bank, IPDR or Social files to generate the timeline.</p>
        </div>
        <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
          Upload Evidence
        </Button>
      </div>
    );
  }

  // Format time labels for the header axis
  const minTime = new Date(timeRange.min);
  const maxTime = new Date(timeRange.max);
  const axisLabels: string[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = new Date(timeRange.min + (i / 5) * (timeRange.max - timeRange.min));
    axisLabels.push(`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#{caseId?.substring(0, 8)}</span>
            <span>•</span>
            <span className="font-medium text-[#191C1E]">{timelineEvents.length} events across {Object.keys(eventsByDomain).length} domains</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Cross-Domain Timeline</h1>
          <p className="text-sm text-[#424751] mt-0.5">
            Chronological multi-lane correlation of telecom, bank, data, and social events.
            Spanning {minTime.toLocaleString()} → {maxTime.toLocaleString()}
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
        {/* Domain Filter Pills */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase mr-1">
              DOMAINS:
            </span>
            {Object.entries(DOMAIN_CONFIG).map(([key, cfg]) => {
              const active = activeDomains.includes(key);
              const count = eventsByDomain[key]?.length ?? 0;
              return (
                <button
                  key={key}
                  onClick={() => toggleDomain(key)}
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border transition-all flex items-center gap-1.5 ${active
                    ? 'bg-white shadow-xs'
                    : 'opacity-40 bg-slate-100 border-transparent text-slate-400'
                    }`}
                  style={{ borderColor: active ? cfg.color : 'transparent', color: active ? cfg.color : undefined }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  {key} {count > 0 && <span className="opacity-70">({count})</span>}
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
          <div className="flex-1 relative flex items-center justify-between px-4">
            {axisLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>

        {/* Episodes Lane — highlight correlated events */}
        {criticalEvents.length > 0 && (
          <div className="flex min-h-[60px] border-b border-[#D9E1EA] bg-[#FFF5F5]/60 relative">
            <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">EPISODES</span>
              <span className="text-[9px] text-[#64748B] font-mono">Correlated Events</span>
            </div>
            <div className="flex-1 p-2 relative flex items-center">
              {criticalEvents.slice(0, 3).map(ev => (
                <div
                  key={ev.id}
                  style={{ left: `${getPositionPercent(ev.timestamp)}%`, position: 'absolute' }}
                  onClick={() => setSelectedEvent(ev)}
                  className="bg-[#DC2626]/10 border-2 border-dashed border-[#DC2626] rounded px-2 py-1 cursor-pointer hover:bg-[#DC2626]/20 transition-all text-[10px] font-bold text-[#DC2626] font-mono whitespace-nowrap"
                >
                  {ev.timeDisplay} ⚡
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Domain Lanes — rendered from real fetched data */}
        {Object.entries(DOMAIN_CONFIG).map(([domainKey, cfg]) => {
          if (!activeDomains.includes(domainKey)) return null;
          const laneEvents = eventsByDomain[domainKey] || [];

          return (
            <div key={domainKey} className="flex min-h-[75px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors last:border-b-0">
              <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                  {domainKey}
                </span>
                <span className="text-[9px] text-[#64748B] font-mono">{cfg.label}</span>
                {laneEvents.length > 0 && (
                  <span className="text-[8px] text-[#94A3B8] font-mono">{laneEvents.length} events</span>
                )}
              </div>
              <div className="flex-1 py-2 relative">
                {laneEvents.length === 0 ? (
                  <div className="flex items-center h-full px-4">
                    <span className="text-[10px] text-[#CBD5E1] font-mono italic">No {domainKey} events in this case</span>
                  </div>
                ) : (
                  laneEvents.map(ev => {
                    const leftPct = getPositionPercent(ev.timestamp);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all text-[10px] font-bold font-mono whitespace-nowrap border-2 ${
                          ev.isCritical ? 'ring-2 ring-offset-1' : ''
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: `${cfg.color}18`,
                          borderColor: ev.isCritical ? '#DC2626' : cfg.color,
                          color: ev.isCritical ? '#DC2626' : cfg.color,
                        }}
                      >
                        <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                        <span>{ev.timeDisplay}</span>
                      </div>
                    );

                  })
                )}
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
        subtitle={selectedEvent ? new Date(selectedEvent.timestamp).toLocaleString() : undefined}
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
                {selectedEvent.description || selectedEvent.title}
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
                      {String(value)}
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
