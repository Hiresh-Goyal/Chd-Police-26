import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { apiClient } from '../api/client';

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.getGlobalAlerts()
      .then(data => setAlerts(data || []))
      .catch(() => showToast('Failed to load global alerts', 'error'))
      .finally(() => setIsLoading(false));
  }, []);

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#191C1E] tracking-tight">System Alerts</h1>
          <p className="text-sm text-[#424751] mt-0.5">Real-time notifications and threat intelligence across all cases.</p>
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
            {criticalCount > 0 && (
              <span className="bg-[#DC2626]/10 text-[#DC2626] px-2.5 py-1 rounded border border-[#DC2626]/20">
                {criticalCount} CRITICAL
              </span>
            )}
            {highCount > 0 && (
              <span className="bg-orange-500/10 text-orange-600 px-2.5 py-1 rounded border border-orange-500/20">
                {highCount} HIGH
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-32 text-sm text-[#64748B]">
              Loading alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex justify-center items-center h-32 text-sm text-[#64748B]">
              No alerts found in the system.
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => navigate(`/cases/${alert.case_id}/alerts`)}
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
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      alert.severity === 'CRITICAL' ? 'bg-[#DC2626] animate-ping' :
                      alert.severity === 'HIGH' ? 'bg-orange-500' :
                      alert.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></span>
                    <span className={`text-[11px] font-bold tracking-wider uppercase ${
                      alert.severity === 'CRITICAL' ? 'text-[#DC2626]' :
                      alert.severity === 'HIGH' ? 'text-orange-600' :
                      alert.severity === 'MEDIUM' ? 'text-yellow-600' : 'text-blue-600'
                    }`}>
                      {alert.severity}
                    </span>
                    {alert.ml_signal > 0 && (
                      <span 
                        className="ml-2 flex items-center gap-1 text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200"
                        title={alert.ml_explanation || 'AI Anomaly Detected'}
                      >
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                        AI FLAG
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="text-base font-semibold text-[#191C1E]">{alert.explanation || 'Anomaly Detected'}</div>
                <div className="font-mono text-sm text-[#0B5CAB] font-semibold">
                  Case #{alert.case_id?.substring(0, 8)} {alert.case_title ? `(${alert.case_title})` : ''}
                </div>
                {alert.ml_explanation && (
                  <div className="text-sm text-[#424751] mt-1 italic border-l-2 border-purple-300 pl-2">
                    <span className="font-semibold text-purple-800">AI Analysis:</span> {alert.ml_explanation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
