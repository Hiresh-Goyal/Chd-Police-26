import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ALL_CASES, CASE_2847 } from '../data/mockData';
import { apiClient } from '../api/client';
import type { Case } from '../types/api';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isActivityPaused, setIsActivityPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState('Oct 24, 2024 | 14:45');
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    apiClient.getCases().then(data => setCases(data || [])).catch(() => { });

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
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E1EA]/60">
              {cases.map((c: any, i) => (
                <tr key={c.id} className="hover:bg-[#EFF6FF]/40 transition-colors group">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0B5CAB]">
                    #{c.id.split('-')[0]}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#191C1E]">
                    {c.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${i === 0 ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20' : 'bg-orange-500/10 text-orange-700 border border-orange-500/20'
                      }`}>
                      {i === 0 ? 'CRITICAL' : 'HIGH'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {c.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#424751] font-mono text-xs">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#0B5CAB] hover:bg-[#084A8B] text-white text-xs font-bold rounded shadow-xs transition-colors"
                    >
                      <span>ANALYZE</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#64748B]">
                    No active investigations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
