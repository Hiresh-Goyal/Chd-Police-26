import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { useCaseStore } from '../context/CaseStore';
import { useAllAlerts, useAlertDetail } from '../hooks/useApi';
import { FindingAPI } from '../types/api';
import { Drawer } from '../components/common/Drawer';
import { tierColor } from '../utils/confidence';

const AlertDetailPanel: React.FC<{ caseId: string; findingId: string }> = ({ caseId, findingId }) => {
  const { data: detail, isLoading, error } = useAlertDetail(caseId, findingId);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  if (isLoading) return <div className="p-6 text-sm text-[#64748B] font-mono animate-pulse">Fetching intelligence report...</div>;
  if (error || !detail) return <div className="p-6 text-sm text-red-500 font-mono">Error loading alert detail.</div>;

  const toggleEvent = (id: string) => setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Finding Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-4 shadow-inner">
        <h3 className="text-sm font-bold text-[#191C1E] uppercase tracking-wider mb-2 border-b border-slate-200 pb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">policy</span>
          Rule {detail.rule_id}
        </h3>
        <p className="text-sm text-[#424751] leading-relaxed">{detail.explanation}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[#64748B]">Fraud Weight</span>
            <span className="font-bold text-[#191C1E]">{detail.fraud_weight} / 100</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#64748B]">Confidence</span>
            <span className="font-bold text-[#191C1E]">{(detail.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#64748B]">Entities Involved</span>
            <span className="font-bold text-[#191C1E]">{detail.entity_ids.length}</span>
          </div>
        </div>
      </div>

      {/* Episode Summary */}
      {(detail.episode_id || detail.episode_summary) && (
        <div className="bg-white border-l-4 border-[#7C3AED] rounded-r-md p-4 shadow-sm">
          <h4 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            Correlated Episode
          </h4>
          <p className="text-sm text-[#191C1E]">{detail.episode_summary || 'Multi-stage fraudulent pattern detected.'}</p>
          <div className="text-[10px] font-mono text-[#64748B] mt-2">EPISODE ID: {detail.episode_id || 'N/A'}</div>
        </div>
      )}

      {/* Events Tree */}
      <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-slate-200 ml-1">
        <h4 className="text-xs font-bold text-[#191C1E] uppercase tracking-wider bg-white py-1 relative z-10 pl-6">
          <span className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0B5CAB]"></span>
          Evidence Trail ({detail.events?.length || 0} Events)
        </h4>

        {detail.events?.map((evt, idx) => {
          const isExpanded = !!expandedEvents[evt.id];
          return (
            <div key={evt.id} className="ml-6 relative">
              {/* Connector line to node */}
              <div className="absolute left-[-24px] top-4 w-4 h-px bg-slate-200"></div>
              
              <div 
                className={`border rounded-md transition-all ${isExpanded ? 'border-[#0B5CAB] shadow-md' : 'border-slate-200 shadow-sm hover:border-slate-300'}`}
              >
                {/* Event Header (Clickable) */}
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer bg-white rounded-md"
                  onClick={() => toggleEvent(evt.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#64748B] text-[18px]">
                      {evt.event_type.includes('BANK') ? 'account_balance' : evt.event_type.includes('CALL') ? 'call' : 'data_object'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#191C1E] font-mono">{evt.event_type}</div>
                      <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                        {new Date(evt.ts_start).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${tierColor(evt.actor_confidence_tier)}`}>
                      {evt.actor_confidence_tier}
                    </span>
                    <span className="material-symbols-outlined text-[#64748B] text-[20px] transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : '' }}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Expanded Raw Record */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-900 rounded-b-md p-4 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[9px] font-mono px-2 py-1 rounded-bl-md">
                      RAW RECORD
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        File: <span className="text-emerald-400">{evt.source_file_id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="material-symbols-outlined text-[14px]">table_rows</span>
                        Row: <span className="text-emerald-400">{evt.source_row}</span>
                      </div>
                      
                      <div className="mt-2 bg-black/50 p-3 rounded border border-slate-700 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
                        <div className="flex whitespace-nowrap"><span className="text-slate-500 w-24 shrink-0">actor_raw:</span> <span className="text-white bg-emerald-500/20 px-1 rounded">{evt.actor_raw}</span></div>
                        <div className="flex whitespace-nowrap"><span className="text-slate-500 w-24 shrink-0">peer_raw:</span> <span className="text-white">{evt.peer_raw || 'null'}</span></div>
                        <div className="flex whitespace-nowrap"><span className="text-slate-500 w-24 shrink-0">amount:</span> <span className="text-amber-300">{evt.amount ? `₹${evt.amount}` : 'null'}</span></div>
                        <div className="flex whitespace-nowrap"><span className="text-slate-500 w-24 shrink-0">location:</span> <span className="text-white">{evt.location_raw || 'null'}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { cases } = useCaseStore();
  
  const { data: alerts = [], isLoading } = useAllAlerts(cases);
  const [selectedAlert, setSelectedAlert] = useState<FindingAPI & { caseName: string } | null>(null);

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#191C1E] tracking-tight">System Alerts</h1>
          <p className="text-sm text-[#424751] mt-0.5">Real-time notifications and threat intelligence</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col bg-white border border-[#D9E1EA] rounded-md shadow-xs h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-[#D9E1EA] flex justify-between items-center bg-[#F8FAFC]">
          <h2 className="text-sm font-bold text-[#191C1E] uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#DC2626]">notifications_active</span>
            LIVE ALERTS STREAM
          </h2>
          <div className="flex gap-2 text-xs font-bold font-mono">
            {criticalCount > 0 && <span className="bg-[#DC2626]/10 text-[#DC2626] px-2.5 py-1 rounded border border-[#DC2626]/20">{criticalCount} CRITICAL</span>}
            {highCount > 0 && <span className="bg-orange-500/10 text-orange-600 px-2.5 py-1 rounded border border-orange-500/20">{highCount} HIGH</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          {isLoading && <div className="p-4 text-center text-[#64748B] text-sm font-mono animate-pulse">Scanning surveillance streams...</div>}
          
          {!isLoading && alerts.length === 0 && (
            <div className="p-4 text-center text-[#64748B] text-sm">No active alerts found.</div>
          )}

          {!isLoading && alerts.map((alert, idx) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';
            
            let colorHex = '#EAB308'; // medium
            let colorClass = 'bg-yellow-500';
            let bgClass = 'bg-white hover:bg-[#F8FAFC]';
            let borderClass = 'border-[#D9E1EA]';
            let titleClass = 'text-[#191C1E]';
            
            if (isCritical) {
              colorHex = '#DC2626';
              colorClass = 'bg-[#DC2626]';
              bgClass = 'bg-[#DC2626]/5 hover:bg-[#DC2626]/10';
              borderClass = 'border-[#DC2626]/25';
              titleClass = 'text-[#191C1E] font-semibold';
            } else if (isHigh) {
              colorHex = '#F97316';
              colorClass = 'bg-orange-500';
            }

            return (
              <div
                key={alert.id || idx}
                onClick={() => setSelectedAlert(alert)}
                className={`flex flex-col gap-2 p-4 rounded ${bgClass} border ${borderClass} transition-colors cursor-pointer group`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colorClass} ${isCritical ? 'animate-ping' : ''}`}></span>
                    <span className={`text-[11px] font-bold tracking-wider uppercase`} style={{color: colorHex}}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'RECENT'}
                    </span>
                    <button className="text-[10px] font-bold text-[#0B5CAB] opacity-0 group-hover:opacity-100 transition-opacity">
                      DRILL DOWN →
                    </button>
                  </div>
                </div>
                <div className={`text-base font-medium ${titleClass}`}>
                  Rule {alert.rule_id} triggered
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm text-[#0B5CAB] font-semibold">Case #{alert.case_id} ({alert.caseName})</div>
                  <div className="text-[10px] text-[#64748B] font-mono">Fraud Contribution: <span className="font-bold text-[#191C1E]">+{alert.fraud_weight}</span></div>
                </div>
                <div className="text-sm text-[#424751] mt-1 line-clamp-2">
                  {alert.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Drawer
        isOpen={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert ? `Alert Detail: ${selectedAlert.rule_id}` : 'Alert Detail'}
        subtitle={selectedAlert ? `Case #${selectedAlert.case_id} (${selectedAlert.caseName})` : ''}
        width="w-[500px]"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <button
              onClick={() => setSelectedAlert(null)}
              className="px-4 py-2 text-sm font-bold text-[#424751] hover:bg-slate-100 rounded transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (selectedAlert?.case_id) {
                  navigate(`/cases/${selectedAlert.case_id}`);
                }
              }}
              className="px-4 py-2 text-sm font-bold text-white bg-[#0B2340] hover:bg-[#193652] rounded transition-colors"
            >
              Go to Case Workspace
            </button>
          </div>
        }
      >
        {selectedAlert && selectedAlert.case_id && (
          <AlertDetailPanel caseId={selectedAlert.case_id} findingId={selectedAlert.id} />
        )}
      </Drawer>
    </div>
  );
};
