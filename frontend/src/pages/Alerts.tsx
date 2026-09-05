import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

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
          {/* Alert Row 1 (Critical) */}
          <div
            onClick={() => navigate('/cases/2847')}
            className="flex flex-col gap-2 p-4 rounded bg-[#DC2626]/5 border border-[#DC2626]/25 hover:bg-[#DC2626]/10 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-ping"></span>
                <span className="text-[11px] text-[#DC2626] font-bold tracking-wider uppercase">CRITICAL</span>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">JUST NOW</span>
            </div>
            <div className="text-base font-semibold text-[#191C1E]">Call→Transfer nexus detected</div>
            <div className="font-mono text-sm text-[#0B5CAB] font-semibold">Case #2847 (Rajesh Verma)</div>
            <div className="text-sm text-[#424751] mt-1">
              Immediate investigation required. Suspect identified initiating cross-domain transactions matching known mule networks.
            </div>
          </div>

          {/* Alert Row 2 (High) */}
          <div
            onClick={() => showToast('Opening incident #2842 telemetry.', 'info')}
            className="flex flex-col gap-2 p-4 rounded bg-white hover:bg-[#F8FAFC] border border-[#D9E1EA] transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="text-[11px] text-orange-600 font-bold tracking-wider uppercase">HIGH</span>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">2 MIN AGO</span>
            </div>
            <div className="text-base font-medium text-[#191C1E]">Multiple SIM activations on same IMEI</div>
            <div className="font-mono text-sm text-[#64748B]">Case #2842</div>
          </div>

          {/* Alert Row 3 (High) */}
          <div
            onClick={() => navigate('/sentinelwatch')}
            className="flex flex-col gap-2 p-4 rounded bg-white hover:bg-[#F8FAFC] border border-[#D9E1EA] transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="text-[11px] text-orange-600 font-bold tracking-wider uppercase">HIGH</span>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">15 MIN AGO</span>
            </div>
            <div className="text-base font-medium text-[#191C1E]">Suspicious geo-velocity alert (Chandigarh → Delhi)</div>
            <div className="font-mono text-sm text-[#64748B]">Target_Alpha_99</div>
          </div>

          {/* Alert Row 4 (Medium) */}
          <div
            onClick={() => showToast('Viewing network profile logs.', 'info')}
            className="flex flex-col gap-2 p-4 rounded bg-white hover:bg-[#F8FAFC] border border-[#D9E1EA] transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="text-[11px] text-yellow-600 font-bold tracking-wider uppercase">MEDIUM</span>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">1 HR AGO</span>
            </div>
            <div className="text-base font-medium text-[#191C1E]">Bulk IPDR session start matching profile</div>
            <div className="font-mono text-sm text-[#64748B]">Network_Scan_Z</div>
          </div>
        </div>
      </div>
    </div>
  );
};
