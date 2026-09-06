import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { apiClient } from '../api/client';

export const AuditLog: React.FC = () => {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (action?: string) => {
    try {
      setIsLoading(true);
      const data = await apiClient.getAuditLogs({ limit: 200, ...(action ? { action } : {}) });
      setLogs(data || []);
      if (data && data.length > 0) setSelectedLog(data[0]);
    } catch {
      showToast('Failed to load audit logs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = 'Timestamp,Username,Action,Entity Type,Entity ID\n' +
      logs.map(l =>
        `${l.created_at},${l.username || ''},${l.action},${l.entity_type || ''},${l.entity_id || ''}`
      ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit_log_export.csv';
    a.click();
    showToast('Audit log exported.', 'success');
  };

  const ACTION_COLORS: Record<string, string> = {
    LOGIN: '#16A34A',
    CREATE_CASE: '#0B5CAB',
    UPLOAD_FILE: '#7C3AED',
    RUN_ANALYSIS: '#F97316',
    GENERATE_REPORT: '#0891B2',
    UPDATE_USER_ROLE: '#DC2626',
    DEACTIVATE_USER: '#DC2626',
    ADD_WATCHLIST: '#C8102E',
  };

  const actionColor = (action: string) => ACTION_COLORS[action] || '#64748B';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Audit Log</h1>
          <p className="text-sm text-[#424751] mt-0.5">
            Tamper-evident record of all system actions. {logs.length} entries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); loadLogs(e.target.value || undefined); }}
            className="border border-[#D9E1EA] rounded px-2 py-1.5 text-sm outline-none focus:border-[#0B5CAB]"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE_CASE">CREATE_CASE</option>
            <option value="UPLOAD_FILE">UPLOAD_FILE</option>
            <option value="RUN_ANALYSIS">RUN_ANALYSIS</option>
            <option value="GENERATE_REPORT">GENERATE_REPORT</option>
            <option value="UPDATE_USER_ROLE">UPDATE_USER_ROLE</option>
            <option value="DEACTIVATE_USER">DEACTIVATE_USER</option>
          </select>
          <Button variant="secondary" size="sm" icon="download" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" icon="refresh" onClick={() => loadLogs(actionFilter || undefined)}>
            Refresh
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <span className="text-[#64748B] text-sm">Loading audit logs...</span>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Log List */}
          <div className="flex-1 bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#D9E1EA] text-[10px] uppercase tracking-wider text-[#64748B]">
                  <th className="px-3 py-2.5 text-left">Time</th>
                  <th className="px-3 py-2.5 text-left">User</th>
                  <th className="px-3 py-2.5 text-left">Action</th>
                  <th className="px-3 py-2.5 text-left">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F4]">
                {logs.map(log => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer hover:bg-[#F8FAFC] transition-colors ${selectedLog?.id === log.id ? 'bg-[#EFF6FF]' : ''}`}
                  >
                    <td className="px-3 py-2.5 font-mono text-[#64748B] whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[#191C1E]">{log.username || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px]"
                        style={{ color: actionColor(log.action), backgroundColor: `${actionColor(log.action)}15` }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#64748B]">
                      {log.entity_type || '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">
                      No audit entries yet. Actions like login, case creation, and file uploads will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selectedLog && (
            <div className="w-72 shrink-0">
              <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden">
                <div className="px-3 py-2.5 border-b border-[#D9E1EA] bg-[#F8FAFC]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Log Detail</p>
                  <p className="font-bold text-sm text-[#191C1E] mt-0.5">{selectedLog.action}</p>
                </div>
                <div className="divide-y divide-[#EDF0F4] text-xs">
                  {[
                    ['ID', selectedLog.id?.substring(0, 12) + '...'],
                    ['User', selectedLog.username || '—'],
                    ['Action', selectedLog.action],
                    ['Entity Type', selectedLog.entity_type || '—'],
                    ['Entity ID', selectedLog.entity_id?.substring(0, 12) || '—'],
                    ['Time', selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between px-3 py-2 gap-2">
                      <span className="text-[#64748B]">{k}</span>
                      <span className="font-mono font-semibold text-[#191C1E] break-all text-right">{v}</span>
                    </div>
                  ))}
                </div>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div className="px-3 py-2 border-t border-[#D9E1EA]">
                    <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Details</p>
                    <pre className="text-[10px] text-[#424751] font-mono bg-[#F8FAFC] p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
