import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { DomainBadge, StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const AuditLog: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: logs, loading: logsLoading } = useAuditLogs(undefined, 200);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Auto-select first log when data loads
  React.useEffect(() => {
    if (logs.length > 0 && !selectedLog) {
      setSelectedLog(logs[0]);
    }
  }, [logs]);

  const filteredLogs = logs.filter((l: any) => {
    const domain = l.domain ?? '';
    const action = l.action ?? '';
    const status = l.status ?? '';

    const matchesCategory =
      categoryFilter === 'All' ||
      (categoryFilter === 'CDR Access' && domain === 'CDR') ||
      (categoryFilter === 'Bank View' && domain === 'BANK') ||
      (categoryFilter === 'Case Edit' && action.includes('Modified')) ||
      (categoryFilter === 'Export' && action.includes('Exported'));

    const matchesSeverity =
      severityFilter === 'All' ||
      (severityFilter === 'Critical' && status === 'FAILED') ||
      (severityFilter === 'Info' && status === 'SUCCESS');

    return matchesCategory && matchesSeverity;
  });

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    showToast(`Audit log ID ${id} copied to clipboard.`, 'success');
  };

  const handleExportCSV = () => {
    const csvContent =
      'Timestamp,Officer,Action,Target,Domain,IP Address,Device ID,Status\n' +
      filteredLogs.map((l: any) => `"${l.timestamp ?? l.created_at ?? ''}","${(l.officerName ?? l.officer_name ?? '')} (${l.officerId ?? l.officer_id ?? ''})","${l.action ?? ''}","${l.targetEntity ?? l.target_entity ?? ''}","${l.domain ?? ''}","${l.ipAddress ?? l.ip_address ?? ''}","${l.deviceId ?? l.device_id ?? ''}","${l.status ?? ''}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('Exported audit trail CSV.', 'success');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0B2340] tracking-tight mb-1">
          System Audit & Accountability Logs
        </h1>
        <p className="text-sm text-[#424751]">
          Forensic record of all investigative accesses, telecommunications queries, and evidence dossier modifications.
        </p>
      </div>


      {/* Controls & Table Layout */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        {/* Main Table Section */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {/* Filter Bar */}
          <div className="bg-white border border-[#D9E1EA] rounded-t-md p-3.5 flex flex-wrap gap-3 items-center justify-between border-b-0 shadow-xs">
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1.5 text-[#64748B] text-[18px]">
                  calendar_today
                </span>
                <input
                  type="text"
                  defaultValue="Oct 24 - Oct 25, 2026"
                  className="pl-8 pr-3 py-1.5 border border-[#D9E1EA] rounded text-xs text-[#191C1E] bg-white w-48 cursor-pointer focus:outline-none focus:border-[#0B5CAB]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-[#D9E1EA] rounded text-xs text-[#191C1E] bg-white focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="CDR Access">CDR Access</option>
                <option value="Bank View">Bank View</option>
                <option value="Case Edit">Case Edit</option>
                <option value="Export">Export</option>
              </select>

              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 border border-[#D9E1EA] rounded text-xs text-[#191C1E] bg-white focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
              >
                <option value="All">All Severities</option>
                <option value="Info">Info (Success)</option>
                <option value="Critical">Critical (Failures)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-[#F8FAFC] text-[#0B2340] text-xs font-semibold rounded hover:bg-slate-100 transition-colors flex items-center gap-1 border border-[#D9E1EA]"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#D9E1EA] rounded-b-md overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="bg-[#0B2340] text-white font-mono font-bold text-[11px]">
                  <th className="px-4 py-3">Timestamp (IST)</th>
                  <th className="px-4 py-3">Officer / User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">IP & Device</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F4] text-[#191C1E]">
                {logsLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading audit logs…</td></tr>
                ) : filteredLogs.map((log: any) => {
                  const isSelected = selectedLog?.id === log.id;
                  const logStatus = log.status ?? '';
                  const isFailed = logStatus === 'FAILED';
                  const officerName = log.officerName ?? log.officer_name ?? '—';
                  const officerId = log.officerId ?? log.officer_id ?? '';
                  const logAction = log.action ?? '—';
                  const logDomain = log.domain ?? '';
                  const targetEntity = log.targetEntity ?? log.target_entity ?? '—';
                  const ipAddress = log.ipAddress ?? log.ip_address ?? '—';
                  const deviceId = log.deviceId ?? log.device_id ?? '';
                  const logTimestamp = log.timestamp ?? log.created_at ?? '—';

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#EFF6FF] border-l-4 border-l-[#0B5CAB]'
                          : 'hover:bg-[#F8FAFC] border-l-4 border-l-transparent'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-[#64748B]">
                        {logTimestamp}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#0B2340] text-white flex items-center justify-center font-bold text-[10px]">
                            {officerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span>
                            {officerName}
                            <span className="text-[#64748B] text-[10px] ml-1 font-mono">ID:{officerId}</span>
                          </span>
                        </div>
                      </td>

                      <td className={`px-4 py-3 font-medium ${isFailed ? 'text-[#DC2626]' : 'text-[#191C1E]'}`}>
                        {logAction}
                      </td>

                      <td className="px-4 py-3">
                        {logDomain && <DomainBadge domain={logDomain} size="sm" className="mr-1.5" />}
                        <span className="font-mono text-xs">{targetEntity}</span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#64748B]">
                        {ipAddress}<br />
                        <span className="text-[#94A3B8]">{deviceId}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {logStatus === 'SUCCESS' ? (
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                        ) : (
                          <span className="material-symbols-outlined text-[#DC2626] text-[18px]">error</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="material-symbols-outlined text-[#64748B] text-[18px]">chevron_right</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between py-3 text-xs text-[#64748B]">
            <span>Showing 1 to {filteredLogs.length} of {logs.length} entries</span>
            <div className="flex gap-1 font-mono">
              <button disabled className="px-2 py-1 border border-[#D9E1EA] rounded bg-white disabled:opacity-40">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button className="px-2.5 py-1 border border-[#0B5CAB] bg-[#0B5CAB] text-white rounded font-bold">1</button>
              <button disabled className="px-2 py-1 border border-[#D9E1EA] rounded bg-white">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detail View Sidebar (Right 384px) */}
        {selectedLog && (
          <aside className="w-full xl:w-96 bg-white border border-[#D9E1EA] rounded-md shadow-sm flex flex-col shrink-0">
            <div className="p-4 border-b border-[#D9E1EA] flex justify-between items-center bg-[#F8FAFC] rounded-t-md">
              <h3 className="font-bold text-sm text-[#0B2340] uppercase tracking-wider">Log Details</h3>
              <span className="font-mono text-[10px] text-[#64748B]">ID: {selectedLog.id}</span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3.5 text-xs">
              <div>
                <div className="flex items-center gap-1.5 mb-1 font-bold text-sm text-[#191C1E]">
                  {(selectedLog.status ?? '') === 'SUCCESS' ? (
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-[#DC2626] text-[18px]">error</span>
                  )}
                  <span>{selectedLog.action ?? '—'}</span>
                </div>
                <span className="font-mono text-[11px] text-[#64748B] block">{selectedLog.timestamp ?? selectedLog.created_at ?? '—'}</span>
              </div>

              {/* Actor Section */}
              <div className="border border-[#D9E1EA] rounded p-3 bg-[#F8FAFC]">
                <h4 className="font-bold text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Actor</h4>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <div className="text-[#64748B]">Name:</div>
                  <div className="col-span-2 font-semibold text-[#191C1E]">{selectedLog.officerName ?? selectedLog.officer_name ?? '—'}</div>
                  <div className="text-[#64748B]">User ID:</div>
                  <div className="col-span-2 font-mono text-[#191C1E]">{selectedLog.officerId ?? selectedLog.officer_id ?? '—'}</div>
                  <div className="text-[#64748B]">Role:</div>
                  <div className="col-span-2 text-[#191C1E]">{selectedLog.officerRole ?? selectedLog.officer_role ?? '—'}</div>
                  <div className="text-[#64748B]">Station:</div>
                  <div className="col-span-2 text-[#191C1E]">{selectedLog.officerStation ?? selectedLog.officer_station ?? '—'}</div>
                </div>
              </div>

              {/* Context Section */}
              <div className="border border-[#D9E1EA] rounded p-3 bg-[#F8FAFC]">
                <h4 className="font-bold text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Context</h4>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <div className="text-[#64748B]">Target:</div>
                  <div className="col-span-2 font-semibold text-[#191C1E]">{selectedLog.targetEntity ?? selectedLog.target_entity ?? '—'}</div>
                  <div className="text-[#64748B]">Client IP:</div>
                  <div className="col-span-2 font-mono text-[#191C1E]">{selectedLog.ipAddress ?? selectedLog.ip_address ?? '—'}</div>
                  <div className="text-[#64748B]">Device ID:</div>
                  <div className="col-span-2 font-mono text-[#191C1E]">{selectedLog.deviceId ?? selectedLog.device_id ?? '—'}</div>
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <h4 className="font-bold text-[10px] text-[#64748B] uppercase tracking-wider mb-1.5">Raw Metadata</h4>
                <div className="bg-[#111827] rounded border border-[#374151] p-3 overflow-x-auto">
                  <pre className="font-mono text-[11px] text-[#A5C8FF] leading-relaxed">
                    {JSON.stringify(selectedLog.rawMetadata ?? selectedLog.raw_metadata ?? selectedLog, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3.5 border-t border-[#D9E1EA] bg-[#F8FAFC] rounded-b-md flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => handleCopyId(selectedLog.id)}
              >
                Copy ID
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => navigate('/cases/2847')}
              >
                View Full Case
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
