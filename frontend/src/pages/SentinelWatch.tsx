import React, { useState } from 'react';
import { SENTINEL_WATCH_ITEMS, SentinelWatchItem } from '../data/mockData';
import { DomainBadge, StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const SentinelWatch: React.FC = () => {
  const { showToast } = useToast();

  const [items, setItems] = useState<SentinelWatchItem[]>(SENTINEL_WATCH_ITEMS);
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [streamType, setStreamType] = useState<'CDR' | 'BANK' | 'IPDR' | 'ALL'>('CDR');
  const [threshold, setThreshold] = useState<'Any Activity' | 'High Volume' | 'Flagged Contacts'>('Any Activity');
  const [expiryDate, setExpiryDate] = useState('2026-12-31');

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      showToast('Please provide an entity identifier.', 'warning');
      return;
    }

    const newItem: SentinelWatchItem = {
      id: `watch_${Date.now()}`,
      identifier: identifier.trim(),
      name: name.trim() || 'Monitored Target',
      streamType,
      threshold,
      riskScore: 85,
      status: 'ACTIVE',
      lastActivity: 'Monitoring initialized just now',
      caseRef: 'Case #2847',
      expiryDate
    };

    setItems([newItem, ...items]);
    setIdentifier('');
    setName('');
    showToast(`Target ${newItem.identifier} added to active SentinelWatch stream.`, 'success');
  };

  const handleToggleStatus = (id: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'ACTIVE' ? 'STANDBY' : 'ACTIVE';
        showToast(`Target ${item.identifier} monitoring status changed to ${nextStatus}.`, 'info');
        return { ...item, status: nextStatus };
      }
      return item;
    }));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0B2340] tracking-tight mb-1">
          SentinelWatch Monitoring
        </h1>
        <p className="text-sm text-[#424751]">
          Real-time stream interception and continuous monitoring of target entities across telecom and financial networks.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column: Add Entity Form (5 cols / ~40%) */}
        <div className="xl:col-span-5 bg-white border border-[#D9E1EA] rounded-md p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#EDF0F4] pb-3">
            <h2 className="text-sm font-bold text-[#0B2340] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0B5CAB]">add_circle</span>
              Add Entity to Watchlist
            </h2>
          </div>

          <form onSubmit={handleAddWatch} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#424751] mb-1">Entity Identifier</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Phone Number (+91...), Bank Acc No., IP, or IMEI"
                className="w-full px-3 py-2 bg-white border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#424751] mb-1">Target Description / Subject Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rajesh Verma Alternate Phone, Secondary Mule Account"
                className="w-full px-3 py-2 bg-white border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#424751] mb-1">Data Stream Type</label>
                <select
                  value={streamType}
                  onChange={e => setStreamType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
                >
                  <option value="CDR">CDR (Call Data)</option>
                  <option value="BANK">Bank Transactions</option>
                  <option value="IPDR">IPDR / Network</option>
                  <option value="ALL">All Combined Streams</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#424751] mb-1">Alert Threshold</label>
                <select
                  value={threshold}
                  onChange={e => setThreshold(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
                >
                  <option value="Any Activity">Any Activity</option>
                  <option value="High Volume">High Volume Only</option>
                  <option value="Flagged Contacts">Flagged Contacts Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#424751] mb-1">Watch Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
              />
            </div>

            <Button variant="primary" type="submit" icon="add" className="w-full py-2.5 mt-2">
              Deploy SentinelWatch Monitor
            </Button>
          </form>
        </div>

        {/* Right Column: Monitored Entities (7 cols / ~60%) */}
        <div className="xl:col-span-7 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
            <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider">
              Active Monitored Targets ({items.length})
            </h2>
            <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Intercept Mode
            </span>
          </div>

          <div className="divide-y divide-[#EDF0F4] overflow-y-auto max-h-[600px] custom-scrollbar">
            {items.map(item => {
              const isTriggered = item.status === 'TRIGGERED';
              return (
                <div
                  key={item.id}
                  className={`p-4 transition-colors flex flex-col gap-2.5 ${
                    isTriggered ? 'bg-[#FFF5F5]/60 hover:bg-[#FFF5F5]' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#0B2340]">
                          {item.identifier}
                        </span>
                        <DomainBadge domain={item.streamType} size="sm" />
                      </div>
                      <div className="text-xs font-medium text-[#191C1E] mt-0.5">{item.name}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isTriggered
                          ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {item.status}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className="p-1 text-[#64748B] hover:text-[#0B5CAB] rounded hover:bg-slate-100 transition-colors"
                        title="Toggle status"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {item.status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono bg-[#F8FAFC] p-2 rounded border border-[#EDF0F4] text-[#424751]">
                    <div>
                      <span className="text-[#64748B] block text-[10px]">THRESHOLD</span>
                      <span className="font-semibold">{item.threshold}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">LAST INTERCEPT</span>
                      <span className={isTriggered ? 'text-[#DC2626] font-bold' : 'text-[#191C1E]'}>
                        {item.lastActivity}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">CASE LINK</span>
                      <span className="font-bold text-[#0B5CAB]">{item.caseRef}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
