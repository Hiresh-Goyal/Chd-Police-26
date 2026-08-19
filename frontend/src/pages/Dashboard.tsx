import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ALL_CASES, CASE_2847 } from '../data/mockData';
import { useToast } from '../components/common/Toast';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isActivityPaused, setIsActivityPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState('Oct 24, 2024 | 14:45');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      setCurrentTime(now.toLocaleString('en-US', options).replace(',', ' |'));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#191C1E] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#424751] mt-0.5">Operational overview of active investigations and intelligence</p>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-[#D9E1EA] shadow-xs self-start md:self-auto">
          <div className="flex items-center gap-1.5 text-[#0B5CAB] text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            <span>Chandigarh Police UT</span>
          </div>
          <div className="w-px h-3.5 bg-[#C2C6D3]"></div>
          <div className="font-mono text-xs text-[#424751] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-4 flex flex-col shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-[#424751] uppercase tracking-wider">ACTIVE CASES</span>
            <span className="material-symbols-outlined text-[#0B5CAB] bg-[#0B5CAB]/10 p-1.5 rounded">folder</span>
          </div>
          <div className="text-3xl font-bold text-[#191C1E] mb-1">24</div>
          <div className="text-xs text-[#424751] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">arrow_upward</span>
            <span className="text-emerald-700 font-semibold">+3</span> this shift
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-4 flex flex-col shadow-xs border-l-4 border-l-[#DC2626]">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider">CRITICAL ALERTS</span>
            <span className="material-symbols-outlined text-[#DC2626] bg-[#DC2626]/10 p-1.5 rounded">warning</span>
          </div>
          <div className="text-3xl font-bold text-[#DC2626] mb-1">7</div>
          <div className="text-xs text-[#DC2626] font-medium flex items-center gap-1">
            Requires immediate action
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-4 flex flex-col shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-[#424751] uppercase tracking-wider">ENTITIES LINKED TODAY</span>
            <span className="material-symbols-outlined text-[#16A34A] bg-[#16A34A]/10 p-1.5 rounded">hub</span>
          </div>
          <div className="text-3xl font-bold text-[#191C1E] mb-1">142</div>
          <div className="text-xs text-[#424751] flex items-center gap-1">
            Cross-domain matched
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-4 flex flex-col shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-[#424751] uppercase tracking-wider">EVIDENCE REPORTS</span>
            <span className="material-symbols-outlined text-[#7C3AED] bg-[#7C3AED]/10 p-1.5 rounded">description</span>
          </div>
          <div className="text-3xl font-bold text-[#191C1E] mb-1">12</div>
          <div className="text-xs text-[#424751] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
            Generated successfully
          </div>
        </div>
      </div>

      {/* Main Grid (40% | 35% | 25%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[430px]">
        {/* Left Column: LIVE ALERTS (5 cols / ~40%) */}
        <div className="lg:col-span-5 flex flex-col bg-white border border-[#D9E1EA] rounded-md shadow-xs h-full overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D9E1EA] flex justify-between items-center bg-[#F8FAFC]">
            <h2 className="text-xs font-bold text-[#191C1E] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#DC2626]">notifications_active</span>
              LIVE ALERTS
            </h2>
            <div className="flex gap-2 text-[10px] font-bold font-mono">
              <span className="bg-[#DC2626]/10 text-[#DC2626] px-2 py-0.5 rounded border border-[#DC2626]/20">3 CRITICAL</span>
              <span className="bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded border border-orange-500/20">5 HIGH</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2">
            {/* Alert Row 1 (Critical) */}
            <div
              onClick={() => navigate('/cases/2847')}
              className="flex flex-col gap-1 p-3 rounded bg-[#DC2626]/5 border border-[#DC2626]/25 hover:bg-[#DC2626]/10 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-ping"></span>
                  <span className="text-[10px] text-[#DC2626] font-bold tracking-wider uppercase">CRITICAL</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">JUST NOW</span>
              </div>
              <div className="text-sm font-semibold text-[#191C1E]">Call→Transfer nexus detected</div>
              <div className="font-mono text-xs text-[#0B5CAB] font-semibold">Case #2847 (Rajesh Verma)</div>
            </div>

            {/* Alert Row 2 (High) */}
            <div
              onClick={() => showToast('Opening incident #2842 telemetry.', 'info')}
              className="flex flex-col gap-1 p-3 rounded bg-white hover:bg-[#F8FAFC] border border-[#D9E1EA] transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-[10px] text-orange-600 font-bold tracking-wider uppercase">HIGH</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">2 MIN AGO</span>
              </div>
              <div className="text-sm font-medium text-[#191C1E]">Multiple SIM activations on same IMEI</div>
              <div className="font-mono text-xs text-[#64748B]">Case #2842</div>
            </div>

            {/* Alert Row 3 (High) */}
            <div
              onClick={() => navigate('/sentinelwatch')}
              className="flex flex-col gap-1 p-3 rounded bg-white hover:bg-[#F8FAFC] border border-[#D9E1EA] transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-[10px] text-orange-600 font-bold tracking-wider uppercase">HIGH</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">15 MIN AGO</span>
              </div>
              <div className="text-sm font-medium text-[#191C1E]">Suspicious geo-velocity alert (Chandigarh → Delhi)</div>
              <div className="font-mono text-xs text-[#64748B]">Target_Alpha_99</div>
            </div>

            {/* Alert Row 4 (Medium) */}
            <div
              onClick={() => showToast('Viewing network profile logs.', 'info')}
              className="flex flex-col gap-1 p-3 rounded bg-white hover:bg-[#F8FAFC] border border-[#D9E1EA] transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span className="text-[10px] text-yellow-600 font-bold tracking-wider uppercase">MEDIUM</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">1 HR AGO</span>
              </div>
              <div className="text-sm font-medium text-[#191C1E]">Bulk IPDR session start matching profile</div>
              <div className="font-mono text-xs text-[#64748B]">Network_Scan_Z</div>
            </div>
          </div>

          <Link
            to="/cases"
            className="px-4 py-2.5 text-center border-t border-[#D9E1EA] text-xs font-semibold text-[#0B5CAB] hover:bg-[#EFF6FF] transition-colors"
          >
            View all active alerts →
          </Link>
        </div>

        {/* Center Column: CROSS-DOMAIN ACTIVITY (4 cols / ~35%) */}
        <div className="lg:col-span-4 flex flex-col bg-[#1E293B] text-white border border-[#334155] rounded-md shadow-xs h-full overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center bg-[#0F172A]">
            <h2 className="text-xs font-bold font-mono text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isActivityPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
              CROSS-DOMAIN ACTIVITY
            </h2>
            <button
              onClick={() => setIsActivityPaused(!isActivityPaused)}
              className="text-gray-400 hover:text-white transition-colors"
              title={isActivityPaused ? 'Resume feed' : 'Pause feed'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isActivityPaused ? 'play_arrow' : 'pause'}
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 flex flex-col gap-3 font-mono text-xs leading-relaxed">
            <div className="flex gap-2.5 items-start">
              <span className="text-gray-400 shrink-0">14:32:05</span>
              <span className="text-[#F97316] font-bold shrink-0">[BANK]</span>
              <div className="text-gray-300">
                <span>IMPS transfer: </span>
                <span className="text-orange-300 font-bold">₹48,000</span>
                <span className="text-cyan-400 ml-1">#2847</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="text-gray-400 shrink-0">14:28:44</span>
              <span className="text-[#A78BFA] font-bold shrink-0">[IPDR]</span>
              <div className="text-gray-300">
                <span>Session started: </span>
                <span className="text-purple-300">IP 103.76.234.12</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <span className="text-gray-400 shrink-0">14:00:12</span>
              <span className="text-[#0891B2] font-bold shrink-0">[CDR]</span>
              <div className="text-gray-300">
                <span>Voice call: </span>
                <span className="text-cyan-300">+91-98123-XXXXX</span>
                <span className="text-gray-500"> → </span>
                <span className="text-cyan-300">+91-99887-XXXXX</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start opacity-85">
              <span className="text-gray-400 shrink-0">13:58:22</span>
              <span className="text-[#16A34A] font-bold shrink-0">[SOCIAL]</span>
              <div className="text-gray-300">
                <span>Location tag updated: </span>
                <span className="text-emerald-300">Sector 17, Chandigarh</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start opacity-75">
              <span className="text-gray-400 shrink-0">13:55:04</span>
              <span className="text-[#0891B2] font-bold shrink-0">[CDR]</span>
              <div className="text-gray-300">
                <span>SMS sent: </span>
                <span className="text-cyan-300">+91-98123-XXXXX</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start opacity-60">
              <span className="text-gray-400 shrink-0">09:15:00</span>
              <span className="text-[#16A34A] font-bold shrink-0">[SOCIAL]</span>
              <div className="text-gray-300">
                <span>WhatsApp contact initiated: </span>
                <span className="text-emerald-300">+44 7700 900077</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: SENTINELWATCH & RISK (3 cols / ~25%) */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full">
          {/* Top Panel: SentinelWatch */}
          <div className="flex-1 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[#D9E1EA] flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-xs font-bold text-[#191C1E] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0B5CAB]">visibility</span>
                SENTINELWATCH
              </h2>
              <button
                onClick={() => navigate('/sentinelwatch')}
                className="text-[#0B5CAB] hover:bg-[#0B5CAB]/10 p-1 rounded transition-colors"
                title="Add Monitor"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            <div className="p-2.5 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
              <div
                onClick={() => navigate('/sentinelwatch')}
                className="bg-[#F5F7FA] border border-[#D9E1EA] p-2 rounded flex items-center gap-2.5 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">smartphone</span>
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-semibold text-[#191C1E] truncate">+91 9812345678</div>
                  <div className="font-mono text-[10px] text-[#64748B] truncate">Rajesh Verma (CDR)</div>
                </div>
              </div>

              <div
                onClick={() => navigate('/sentinelwatch')}
                className="bg-[#F5F7FA] border border-[#D9E1EA] p-2 rounded flex items-center gap-2.5 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">account_balance</span>
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-semibold text-[#191C1E] truncate">HDFC 4521</div>
                  <div className="font-mono text-[10px] text-[#64748B] truncate">IFSC: HDFC0001245</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Panel: Risk Distribution */}
          <div className="flex-1 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[#D9E1EA] bg-[#F8FAFC]">
              <h2 className="text-xs font-bold text-[#191C1E] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#424751]">pie_chart</span>
                RISK DISTRIBUTION
              </h2>
            </div>

            <div className="flex-1 p-3 flex items-center justify-center gap-3">
              {/* Donut representation */}
              <div className="relative w-16 h-16 rounded-full border-4 border-slate-200 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full border-4 border-[#DC2626] border-t-transparent border-r-transparent rotate-45"></div>
                <span className="text-[10px] font-mono font-bold text-[#191C1E]">24 total</span>
              </div>

              <div className="flex flex-col gap-1 text-[10px] font-bold font-mono">
                <div className="flex items-center gap-1.5 text-[#DC2626]">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
                  8% Critical (2)
                </div>
                <div className="flex items-center gap-1.5 text-orange-600">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  21% High (5)
                </div>
                <div className="flex items-center gap-1.5 text-yellow-600">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  41% Medium (10)
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  30% Low (7)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: ACTIVE INVESTIGATIONS */}
      <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-[#D9E1EA] flex justify-between items-center bg-[#F8FAFC]">
          <h2 className="text-xs font-bold text-[#191C1E] uppercase tracking-wider">
            ACTIVE INVESTIGATIONS
          </h2>
          <Link to="/cases" className="text-xs font-semibold text-[#0B5CAB] hover:underline flex items-center gap-1">
            <span>View all cases</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#D9E1EA] bg-[#F5F7FA] text-[11px] font-bold text-[#424751] uppercase tracking-wider">
                <th className="py-3 px-4 w-28">Case ID</th>
                <th className="py-3 px-4">Subject / Entity</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E1EA]/60">
              {/* Row 1: Case #2847 */}
              <tr className="hover:bg-[#EFF6FF]/40 transition-colors group bg-[#F0F7FF]/50 border-l-4 border-l-[#0B5CAB]">
                <td className="py-3.5 px-4 font-mono font-bold text-[#0B5CAB]">#2847</td>
                <td className="py-3.5 px-4 font-semibold text-[#191C1E]">
                  Rajesh Verma
                  <span className="text-xs text-[#64748B] font-normal block font-mono">HDFC 4521 / +91 9812345678</span>
                </td>
                <td className="py-3.5 px-4 text-[#424751]">Investment Scam</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
                    CRITICAL
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </td>
                <td className="py-3.5 px-4 text-[#424751] font-mono text-xs">2 min ago</td>
                <td className="py-3.5 px-4 text-right">
                  <Link
                    to="/cases/2847"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#0B5CAB] hover:bg-[#084A8B] text-white text-xs font-bold rounded shadow-xs transition-colors"
                  >
                    <span>ANALYZE</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </td>
              </tr>

              {/* Row 2: Case #2846 */}
              <tr className="hover:bg-slate-50 transition-colors group">
                <td className="py-3 px-4 font-mono text-[#0B5CAB]">#2846</td>
                <td className="py-3 px-4 font-medium text-[#191C1E]">
                  Unknown <span className="font-mono text-xs text-[#64748B] font-normal">(IP: 104.xx)</span>
                </td>
                <td className="py-3 px-4 text-[#424751]">Cyber Intrusion</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
                    HIGH
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 text-[#424751] text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#727783]"></span>
                    Pending
                  </span>
                </td>
                <td className="py-3 px-4 text-[#424751] font-mono text-xs">18 min ago</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => showToast('Opening Case #2846 overview.', 'info')}
                    className="px-3 py-1 border border-[#D9E1EA] hover:bg-slate-100 text-[#334155] text-xs font-bold rounded transition-colors"
                  >
                    VIEW
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
