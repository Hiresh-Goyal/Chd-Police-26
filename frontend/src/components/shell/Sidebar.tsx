import React from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../common/Toast';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Match any /cases/:caseId route
  const caseRouteMatch = location.pathname.match(/^\/cases\/([^/]+)/);
  const isCaseRoute = Boolean(caseRouteMatch);
  const activeCaseId = caseRouteMatch ? caseRouteMatch[1] : null;

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded text-sm transition-all select-none border-l-[3px] ${
      isActive
        ? 'bg-[#EFF6FF] text-[#0B5CAB] border-l-[#0B5CAB] font-semibold shadow-xs'
        : 'text-[#334155] border-l-transparent hover:bg-[#F8FBFF] hover:text-[#0B5CAB]'
    }`;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-[#D9E1EA] flex flex-col z-[9980] shadow-sm select-none">
      {/* Unit Brand */}
      <div className="h-16 flex items-center px-4 border-b border-[#EDF0F4] gap-3 shrink-0">
        <img
          src="/chd-police-logo.png"
          alt="Chandigarh Police Logo"
          className="w-9 h-9 rounded object-cover border border-[#D9E1EA] bg-white p-0.5 shadow-2xs"
        />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[#172B4D] text-sm leading-snug truncate">Rakshak Setu</div>
          <div className="text-[11px] text-[#64748B] font-medium leading-none mt-0.5">Investigation Unit</div>
        </div>
      </div>

      {/* Active Session Status */}
      <div className="mx-3 my-2 px-2.5 py-1 bg-[#F8FAFC] border border-[#D9E1EA] rounded text-[10px] font-mono font-bold tracking-wider text-[#64748B] flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
        ACTIVE SESSION
      </div>

      {/* Navigation Groups (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {/* Investigation Section */}
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest text-[#64748B] uppercase">
          INVESTIGATION
        </div>

        <NavLink to="/dashboard" className={navItemClass}>
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/cases" className={({ isActive }) =>
          `flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded text-sm transition-all select-none border-l-[3px] ${
            isActive && location.pathname === '/cases'
              ? 'bg-[#EFF6FF] text-[#0B5CAB] border-l-[#0B5CAB] font-semibold'
              : 'text-[#334155] border-l-transparent hover:bg-[#F8FBFF] hover:text-[#0B5CAB]'
          }`
        }>
          <span className="material-symbols-outlined text-[18px]">folder_open</span>
          <span>My Cases</span>
        </NavLink>

        <NavLink to="/search" className={navItemClass}>
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span>Universal Search</span>
        </NavLink>

        <NavLink to="/alerts" className={navItemClass}>
          <span className="material-symbols-outlined text-[18px]">notifications</span>
          <span className="flex-1">Alerts</span>
          <span className="px-1.5 py-0.5 bg-[#DC2626]/10 text-[#DC2626] rounded text-[10px] font-mono font-bold">3</span>
        </NavLink>

        <NavLink to="/sentinelwatch" className={navItemClass}>
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          <span>SentinelWatch</span>
        </NavLink>

        {/* Contextual Analysis Section — visible for any case route */}
        {isCaseRoute && activeCaseId && (
          <div className="mt-3 pt-3 border-t border-[#EDF0F4] animate-in fade-in duration-200">
            <div className="px-3 pt-1 pb-1.5 flex items-center justify-between text-[10px] font-bold tracking-widest text-[#64748B] uppercase">
              <span>ANALYSIS</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#0B5CAB] border border-[#0B5CAB]/20">
                #{activeCaseId}
              </span>
            </div>

            <NavLink to={`/cases/${activeCaseId}`} end className={navItemClass}>
              <span className="material-symbols-outlined text-[18px]">work</span>
              <span>Case Workspace</span>
            </NavLink>

            <NavLink to={`/cases/${activeCaseId}/upload-evidence`} className={navItemClass}>
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Evidence</span>
            </NavLink>

            <NavLink to={`/cases/${activeCaseId}/timeline`} className={navItemClass}>
              <span className="material-symbols-outlined text-[18px]">timeline</span>
              <span>Timeline</span>
            </NavLink>

            <NavLink to={`/cases/${activeCaseId}/entity-graph`} className={navItemClass}>
              <span className="material-symbols-outlined text-[18px]">hub</span>
              <span>Entity Graph</span>
            </NavLink>

            <NavLink to={`/cases/${activeCaseId}/geospatial`} className={navItemClass}>
              <span className="material-symbols-outlined text-[18px]">map</span>
              <span>Geospatial Map</span>
            </NavLink>

            <NavLink to={`/cases/${activeCaseId}/criminal-flow`} className={navItemClass}>
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              <span>CriminalFlow</span>
            </NavLink>

            <NavLink to={`/cases/${activeCaseId}/evidence-report`} className={navItemClass}>
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span>Evidence Report</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* Administration Section (Pinned to Bottom) */}
      <div className="border-t border-[#D9E1EA] py-2 bg-white shrink-0">
        <div className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-widest text-[#64748B] uppercase">
          ADMINISTRATION
        </div>

        <NavLink to="/admin/users" className={navItemClass}>
          <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
          <span>User Management</span>
        </NavLink>

        <NavLink to="/admin/audit-log" className={navItemClass}>
          <span className="material-symbols-outlined text-[18px]">history</span>
          <span>Audit Log</span>
        </NavLink>
      </div>
    </aside>
  );
};
