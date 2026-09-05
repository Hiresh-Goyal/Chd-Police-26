import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { useAlerts } from '../hooks/useAlerts';
import { EvidenceChain } from '../components/EvidenceChain';

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { caseId = '2847' } = useParams<{ caseId?: string }>();
  const { showToast } = useToast();
  const { data: alerts, loading } = useAlerts(caseId);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

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
            <span className="bg-[#DC2626]/10 text-[#DC2626] px-2.5 py-1 rounded border border-[#DC2626]/20">3 CRITICAL</span>
            <span className="bg-orange-500/10 text-orange-600 px-2.5 py-1 rounded border border-orange-500/20">5 HIGH</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          {loading ? (
            <div className="text-gray-400">Loading alerts...</div>
          ) : alerts && alerts.length > 0 ? (
            alerts.map((alert: any) => (
              <div key={alert.id} className="flex flex-col gap-2">
                <div
                  onClick={() => setSelectedAlertId(selectedAlertId === alert.id ? null : alert.id)}
                  className={`flex flex-col gap-2 p-4 rounded border transition-colors cursor-pointer ${
                    alert.severity === 'CRITICAL' 
                      ? 'bg-[#DC2626]/5 border-[#DC2626]/25 hover:bg-[#DC2626]/10' 
                      : alert.severity === 'HIGH'
                        ? 'bg-orange-500/5 border-orange-500/25 hover:bg-orange-500/10'
                        : 'bg-white hover:bg-[#F8FAFC] border-[#D9E1EA]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-[#DC2626] animate-ping' : alert.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'}`}></span>
                      <span className={`text-[11px] font-bold tracking-wider uppercase ${alert.severity === 'CRITICAL' ? 'text-[#DC2626]' : alert.severity === 'HIGH' ? 'text-orange-600' : 'text-yellow-600'}`}>{alert.severity}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B]">{alert.timeAgo}</span>
                  </div>
                  <div className="text-base font-semibold text-[#191C1E]">{alert.title}</div>
                  <div className="flex gap-2 items-center">
                    <div className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-[#424751]">{alert.rule_id || 'RULE_X'}</div>
                    {alert.fraudScoreContribution && (
                      <div className="font-mono text-xs bg-red-100 px-2 py-0.5 rounded text-red-600">+{alert.fraudScoreContribution} Risk Score</div>
                    )}
                  </div>
                  <div className="text-sm text-[#424751] mt-1">
                    {alert.description}
                  </div>
                </div>
                {selectedAlertId === alert.id && (
                  <div className="mt-2 ml-4">
                    <EvidenceChain alertId={alert.id} />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-400">No alerts found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
