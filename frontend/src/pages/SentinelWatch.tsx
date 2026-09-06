import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { apiClient } from '../api/client';

export const SentinelWatch: React.FC = () => {
  const { showToast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [entityValue, setEntityValue] = useState('');
  const [entityType, setEntityType] = useState('PHONE');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getWatchlist();
      setItems(data || []);
    } catch {
      showToast('Failed to load watchlist', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityValue.trim() || !reason.trim()) {
      showToast('Please provide identifier and reason.', 'warning');
      return;
    }
    try {
      const result = await apiClient.addWatchlist({
        entity_value: entityValue.trim(),
        entity_type: entityType,
        reason: reason.trim(),
      });
      setItems(prev => [result, ...prev]);
      setEntityValue('');
      setReason('');
      showToast(`${entityValue} added to SentinelWatch.`, 'success');
      await loadWatchlist();
    } catch {
      showToast('Failed to add watchlist entry.', 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiClient.toggleWatchlist(id);
      setItems(prev => prev.map(x => x.id === id ? { ...x, is_active: !x.is_active } : x));
      showToast('Watchlist entry toggled.', 'success');
    } catch {
      showToast('Failed to toggle entry.', 'error');
    }
  };

  const TYPE_COLORS: Record<string, string> = {
    PHONE: '#0891B2',
    ACCOUNT: '#F97316',
    IP: '#7C3AED',
    NAME: '#16A34A',
    IMEI: '#DC2626',
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="border-b border-[#D9E1EA] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">SentinelWatch</h1>
          <p className="text-sm text-[#424751] mt-0.5">
            Real-time entity watchlist — flag phone numbers, accounts, IPs for active monitoring.
          </p>
        </div>
        <span className="text-xs font-mono text-[#64748B]">{items.filter(i => i.is_active).length} active watches</span>
      </header>

      {/* Add Entry Form */}
      <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
        <h3 className="text-sm font-bold text-[#191C1E] mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#0B5CAB]">add_circle</span>
          Add Entity to Watch
        </h3>
        <form onSubmit={handleAddWatch} className="flex flex-wrap gap-2">
          <select
            value={entityType}
            onChange={e => setEntityType(e.target.value)}
            className="border border-[#D9E1EA] rounded px-2 py-1.5 text-sm outline-none focus:border-[#0B5CAB]"
          >
            {['PHONE', 'ACCOUNT', 'IP', 'NAME', 'IMEI'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Entity identifier (e.g. +91 9812345678)"
            value={entityValue}
            onChange={e => setEntityValue(e.target.value)}
            className="border border-[#D9E1EA] rounded px-3 py-1.5 text-sm outline-none focus:border-[#0B5CAB] flex-1 min-w-[200px]"
          />
          <input
            type="text"
            placeholder="Reason for watch..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="border border-[#D9E1EA] rounded px-3 py-1.5 text-sm outline-none focus:border-[#0B5CAB] flex-1 min-w-[200px]"
          />
          <Button variant="primary" size="sm" icon="add">
            Add Watch
          </Button>
        </form>
      </div>

      {/* Watchlist Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <span className="text-[#64748B] text-sm">Loading watchlist...</span>
        </div>
      ) : (
        <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#D9E1EA] text-[10px] uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">Entity</th>
                <th className="px-4 py-2.5 text-left">Reason</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Added</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF0F4]">
              {items.map(item => (
                <tr key={item.id} className={`hover:bg-[#F8FAFC] transition-colors ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-bold font-mono px-2 py-0.5 rounded"
                      style={{ color: TYPE_COLORS[item.entity_type] || '#64748B', backgroundColor: `${TYPE_COLORS[item.entity_type] || '#64748B'}18` }}
                    >
                      {item.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[#191C1E] text-xs">{item.entity_value}</td>
                  <td className="px-4 py-3 text-[#424751] text-xs max-w-xs truncate">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B] font-mono">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => handleToggle(item.id)}>
                      {item.is_active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#64748B] text-sm">
                    No watchlist entries. Add an entity above to start monitoring.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
