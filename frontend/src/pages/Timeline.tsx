import React, { useState } from 'react';
import { CASE_2847_TIMELINE, TimelineEvent } from '../data/mockData';

import { DomainBadge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const Timeline: React.FC = () => {
  const { showToast } = useToast();

  const [activeDomains, setActiveDomains] = useState<string[]>(['CDR', 'IPDR', 'BANK', 'SOCIAL', 'NCRP']);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [zoomScale, setZoomScale] = useState<'1hr' | '30m' | '15m'>('1hr');
  const [selectedDate, setSelectedDate] = useState('15 Aug 2026');

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
    const json = JSON.stringify(CASE_2847_TIMELINE, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_case_2847_${selectedDate.replace(/\s+/g, '_')}.json`;
    a.click();
    showToast('Timeline exported successfully.', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#2847</span>
            <span>•</span>
            <span className="font-medium text-[#191C1E]">Rajesh Verma</span>
            <span>•</span>
            <span>Investment Scam</span>
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
        {/* Date Selector & Zoom */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="material-symbols-outlined text-[#64748B] text-[18px]">calendar_today</span>
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="font-mono text-xs font-bold text-[#191C1E] bg-[#F8FAFC] border border-[#D9E1EA] rounded px-2 py-1 cursor-pointer"
            >
              <option value="15 Aug 2026">15 Aug 2026 (Incident Day)</option>
              <option value="14 Aug 2026">14 Aug 2026 (Pre-Contact)</option>
            </select>
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
            <span>09:00</span>
            <span>11:00</span>
            <span>13:00</span>
            <span>14:00</span>
            <span>15:00</span>
            <span>17:00</span>
          </div>
        </div>

        {/* Lane: EPISODES / Nexus Sequence */}
        <div className="flex min-h-[70px] border-b border-[#D9E1EA] bg-[#FFF5F5]/60 relative group">
          <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
              EPISODES
            </span>
            <span className="text-[9px] text-[#64748B] font-mono">Core Correlation</span>
          </div>
          <div className="flex-1 p-2 relative flex items-center">
            {/* Correlated Nexus block spanning from 14:00 to 15:15 */}
            <div
              onClick={() => showToast('Correlated Modus Operandi sequence: Voice Call → Data Session → ₹48,000 IMPS → ATM Withdrawal.', 'info')}
              className="ml-[55%] w-[38%] bg-[#DC2626]/10 border-2 border-dashed border-[#DC2626] rounded-md p-2 cursor-pointer hover:bg-[#DC2626]/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[#DC2626] text-[18px] animate-pulse">
                warning
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#DC2626] font-mono">
                  CALL → DATA → TRANSFER → ATM NEXUS
                </div>
                <div className="text-[10px] text-[#424751] truncate">
                  High-velocity sequence across 4 domains in 70 mins
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lane: SOCIAL */}
        {activeDomains.includes('SOCIAL') && (
          <div className="flex min-h-[75px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors">
            <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A]">
                SOCIAL
              </span>
              <span className="text-[9px] text-[#64748B] font-mono">WhatsApp / TG</span>
            </div>
            <div className="flex-1 p-2 relative flex items-center">
              {/* Event 09:15 */}
              <div
                onClick={() => setSelectedEvent(CASE_2847_TIMELINE[0])}
                className="ml-[4%] bg-[#16A34A]/10 border border-[#16A34A]/40 rounded px-2.5 py-1.5 cursor-pointer hover:shadow-sm hover:scale-[1.02] transition-all flex items-center gap-2 max-w-xs"
              >
                <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                <div>
                  <div className="text-[11px] font-bold text-[#16A34A] font-mono">09:15 • Social Contact</div>
                  <div className="text-[10px] text-[#191C1E] truncate">WhatsApp promo from +44 7700...</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lane: CDR */}
        {activeDomains.includes('CDR') && (
          <div className="flex min-h-[75px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors">
            <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0891B2]">
                CDR
              </span>
              <span className="text-[9px] text-[#64748B] font-mono">Voice & SMS</span>
            </div>
            <div className="flex-1 p-2 relative flex items-center">
              {/* Event 14:00 */}
              <div
                onClick={() => setSelectedEvent(CASE_2847_TIMELINE[1])}
                className="ml-[56%] bg-[#0891B2]/10 border-2 border-[#0891B2] rounded px-3 py-1.5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 max-w-sm"
              >
                <span className="material-symbols-outlined text-[#0891B2] text-[16px]">call</span>
                <div>
                  <div className="text-[11px] font-bold text-[#0891B2] font-mono">14:00 • Voice Call (14m 23s)</div>
                  <div className="text-[10px] text-[#191C1E] truncate">+91 9812345678 → Victim (Cell ID 45892)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lane: IPDR */}
        {activeDomains.includes('IPDR') && (
          <div className="flex min-h-[75px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors">
            <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">
                IPDR
              </span>
              <span className="text-[9px] text-[#64748B] font-mono">Data Sessions</span>
            </div>
            <div className="flex-1 p-2 relative flex items-center">
              {/* Event 14:28 */}
              <div
                onClick={() => setSelectedEvent(CASE_2847_TIMELINE[2])}
                className="ml-[66%] bg-[#7C3AED]/10 border-2 border-[#7C3AED] rounded px-3 py-1.5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 max-w-sm"
              >
                <span className="material-symbols-outlined text-[#7C3AED] text-[16px]">router</span>
                <div>
                  <div className="text-[11px] font-bold text-[#7C3AED] font-mono">14:28 • Banking Data Session</div>
                  <div className="text-[10px] text-[#191C1E] truncate">IP: 103.76.234.12 (Port 443, 2.4MB)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lane: BANK */}
        {activeDomains.includes('BANK') && (
          <div className="flex min-h-[85px] border-b border-[#D9E1EA] relative hover:bg-[#F8FAFC] transition-colors">
            <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F97316]">
                BANK
              </span>
              <span className="text-[9px] text-[#64748B] font-mono">IMPS & Cash-out</span>
            </div>
            <div className="flex-1 p-2 relative flex items-center gap-3">
              {/* Event 14:32 (IMPS) */}
              <div
                onClick={() => setSelectedEvent(CASE_2847_TIMELINE[3])}
                className="ml-[68%] bg-[#DC2626]/10 border-2 border-[#DC2626] rounded px-3 py-1.5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 max-w-xs ring-2 ring-[#DC2626]/20"
              >
                <span className="material-symbols-outlined text-[#DC2626] text-[16px]">account_balance</span>
                <div>
                  <div className="text-[11px] font-bold text-[#DC2626] font-mono">14:32 • IMPS Transfer</div>
                  <div className="text-[10px] text-[#191C1E] font-bold font-mono">₹48,000 → HDFC 4521</div>
                </div>
              </div>

              {/* Event 15:10 (ATM) */}
              <div
                onClick={() => setSelectedEvent(CASE_2847_TIMELINE[4])}
                className="bg-[#F97316]/10 border-2 border-[#F97316] rounded px-3 py-1.5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 max-w-xs"
              >
                <span className="material-symbols-outlined text-[#F97316] text-[16px]">local_atm</span>
                <div>
                  <div className="text-[11px] font-bold text-[#F97316] font-mono">15:10 • ATM Cash-Out</div>
                  <div className="text-[10px] text-[#191C1E] font-bold font-mono">₹47,500 @ Sector 22</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lane: NCRP */}
        {activeDomains.includes('NCRP') && (
          <div className="flex min-h-[75px] relative hover:bg-[#F8FAFC] transition-colors">
            <div className="w-32 shrink-0 border-r border-[#D9E1EA] bg-white flex flex-col justify-center px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8102E]">
                NCRP
              </span>
              <span className="text-[9px] text-[#64748B] font-mono">1930 Portal</span>
            </div>
            <div className="flex-1 p-2 relative flex items-center">
              {/* Event 16:20 */}
              <div
                onClick={() => setSelectedEvent(CASE_2847_TIMELINE[5])}
                className="ml-[82%] bg-[#C8102E]/10 border border-[#C8102E]/40 rounded px-2.5 py-1.5 cursor-pointer hover:shadow-sm hover:scale-[1.02] transition-all flex items-center gap-2 max-w-xs"
              >
                <span className="w-2 h-2 rounded-full bg-[#C8102E]"></span>
                <div>
                  <div className="text-[11px] font-bold text-[#C8102E] font-mono">16:20 • NCRP Complaint</div>
                  <div className="text-[10px] text-[#191C1E] truncate">Ref: NCRP-2026-89128</div>
                </div>
              </div>
            </div>
          </div>
        )}
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
