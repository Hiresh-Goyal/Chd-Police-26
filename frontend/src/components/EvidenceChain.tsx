import React, { useState } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, FileText, Activity } from 'lucide-react';
import { useAlertDetail } from '../hooks/useAlertDetail';
import type { CanonicalEventAPI } from '../types/api';

interface EvidenceChainProps {
  alertId: string;
  caseId: string;
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({ alertId, caseId }) => {
  const { data: alertDetail, loading, error } = useAlertDetail(alertId, caseId);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  if (loading) return <div className="text-gray-400 p-4">Loading evidence drill-down...</div>;
  if (error) return <div className="text-red-400 p-4">Error: {error.message}</div>;
  if (!alertDetail) return <div className="text-gray-500 p-4">No evidence detail available.</div>;

  const toggle = (id: string) =>
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  // Real API path: flat events array
  const events: CanonicalEventAPI[] = alertDetail.events ?? [];
  // Fallback mock path: nested findings (for mock mode only)
  const findings: any[] = alertDetail.findings ?? [];

  const renderEventRow = (ev: CanonicalEventAPI) => (
    <div key={ev.id} className="ml-6 border-l border-slate-700 pl-4">
      <div
        className="flex items-start gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded transition-colors"
        onClick={() => toggle(ev.id)}
      >
        {expandedIds[ev.id] ? <ChevronDown className="w-4 h-4 mt-0.5" /> : <ChevronRight className="w-4 h-4 mt-0.5" />}
        <FileText className="w-4 h-4 text-blue-400 mt-0.5" />
        <div>
          <div className="text-slate-300 font-medium">
            {ev.event_type} — {ev.actor_raw}
            {ev.peer_raw ? ` → ${ev.peer_raw}` : ''}
          </div>
          <div className="text-slate-500 text-xs font-mono">
            {new Date(ev.ts_start).toLocaleString('en-IN')}
            {ev.amount != null ? ` | ₹${ev.amount.toLocaleString('en-IN')}` : ''}
          </div>
        </div>
      </div>
      {expandedIds[ev.id] && (
        <div className="ml-6 p-3 bg-black rounded-md border border-slate-800 font-mono text-xs text-slate-400 mt-1">
          <div><span className="text-slate-500">source_file_id:</span> <span className="text-green-400">{ev.source_file_id}</span></div>
          <div><span className="text-slate-500">source_row:</span> <span className="text-green-400">{ev.source_row}</span></div>
          {ev.location_raw && <div><span className="text-slate-500">location:</span> <span className="text-green-400">{ev.location_raw}</span></div>}
          {ev.actor_confidence_tier && <div><span className="text-slate-500">confidence:</span> <span className="text-green-400">{ev.actor_confidence_tier}</span></div>}
        </div>
      )}
    </div>
  );

  const headerLabel = alertDetail.rule_id
    ? `${alertDetail.rule_id} — ${alertDetail.severity}`
    : (alertDetail.title ?? 'Alert Detail');

  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 text-sm">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Evidence Drill-Down: {headerLabel}
      </h3>
      {alertDetail.explanation && (
        <p className="text-slate-400 text-xs mb-3">{alertDetail.explanation}</p>
      )}

      <div className="ml-2 border-l border-slate-700 pl-4 space-y-2">
        {/* REAL API path: flat events */}
        {events.length > 0
          ? events.map(renderEventRow)
          // MOCK fallback: nested findings structure
          : findings.map((finding: any) => (
              <div key={finding.id} className="space-y-2">
                <div
                  className="flex items-start gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded"
                  onClick={() => toggle(finding.id)}
                >
                  {expandedIds[finding.id] ? <ChevronDown className="w-4 h-4 mt-0.5" /> : <ChevronRight className="w-4 h-4 mt-0.5" />}
                  <Activity className="w-4 h-4 text-orange-400" />
                  <div>
                    <div className="text-slate-200 font-medium">{finding.title}</div>
                    <div className="text-slate-400 text-xs">{finding.description}</div>
                  </div>
                </div>
                {expandedIds[finding.id] && finding.episodes?.map((ep: any) => (
                  <div key={ep.id} className="ml-6 border-l border-slate-700 pl-4">
                    <div
                      className="flex items-start gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded"
                      onClick={() => toggle(ep.id)}
                    >
                      {expandedIds[ep.id] ? <ChevronDown className="w-4 h-4 mt-0.5" /> : <ChevronRight className="w-4 h-4 mt-0.5" />}
                      <Activity className="w-4 h-4 text-yellow-400" />
                      <div className="text-slate-300">{ep.title}</div>
                    </div>
                    {expandedIds[ep.id] && ep.events?.map((ev: any) => (
                      <div key={ev.id} className="ml-6 border-l border-slate-700 pl-4">
                        <div className="flex items-start gap-2 p-1">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <div>
                            <div className="text-slate-300">{ev.title}</div>
                            <div className="text-slate-500 text-xs">{ev.description}</div>
                          </div>
                        </div>
                        {ev.rawRecord && (
                          <div className="ml-6 p-3 bg-black rounded-md border border-slate-800 font-mono text-xs text-slate-400">
                            <div className="text-slate-500 mb-1">
                              Source: {ev.rawRecord.source_file} (Row {ev.rawRecord.source_row})
                            </div>
                            {Object.entries(ev.rawRecord.keyFields || {}).map(([k, v]) => (
                              <div key={k}><span className="text-slate-500">{k}:</span> <span className="text-green-400">{String(v)}</span></div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))
        }
      </div>
    </div>
  );
};
