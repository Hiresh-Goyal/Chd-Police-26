import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../common/Toast';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const caseIdMatch = location.pathname.match(/^\/cases\/([^\/]+)/);
  const caseId = caseIdMatch ? caseIdMatch[1] : null;
  const isCaseRoute = !!caseId;

  let contextTitle = 'Operational Dashboard';
  if (location.pathname === '/cases') {
    contextTitle = 'My Cases';
  } else if (isCaseRoute) {
    if (location.pathname.endsWith('/upload-evidence')) {
      contextTitle = `Cases / #${caseId} / Upload Evidence`;
    } else if (location.pathname.endsWith('/timeline')) {
      contextTitle = `Cases / #${caseId} / Cross-Domain Timeline`;
    } else if (location.pathname.endsWith('/entity-graph')) {
      contextTitle = `Cases / #${caseId} / Entity Graph`;
    } else if (location.pathname.endsWith('/geospatial')) {
      contextTitle = `Cases / #${caseId} / Geospatial Map`;
    } else if (location.pathname.endsWith('/criminal-flow')) {
      contextTitle = `Cases / #${caseId} / CriminalFlow Money Trail`;
    } else if (location.pathname.endsWith('/evidence-report')) {
      contextTitle = `Cases / #${caseId} / Evidence Report`;
    } else {
      contextTitle = `Cases / #${caseId} — Case Workspace`;
    }
  } else if (location.pathname === '/search') {
    contextTitle = 'Universal Cross-Domain Search';
  } else if (location.pathname === '/admin/users') {
    contextTitle = 'Administration / User Management';
  } else if (location.pathname === '/admin/audit-log') {
    contextTitle = 'Administration / System Audit Log';
  }

  return (
    <header className="h-16 bg-[#0B2340] text-white flex items-center justify-between px-5 fixed left-0 right-0 top-0 z-[9990] shadow-[0_1px_4px_rgba(11,35,64,0.14)] select-none">
      {/* Left branding & context */}
      <div className="flex items-center min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity mr-1"
        >
          <img 
            src="/chd-police-logo.png" 
            alt="Chandigarh Police Logo"
            className="w-8 h-8 rounded object-cover bg-white p-0.5 border border-white/20"
          />
          <span className="font-bold text-xl tracking-tight text-white">Rakshak Setu</span>
        </button>

        <div className="h-5 w-px bg-white/25 mx-4 hidden sm:block" />

        <div className="text-sm text-[#DBEAFE] font-medium truncate max-w-md hidden md:block">
          {contextTitle}
        </div>
      </div>

      {/* Right operational status & user profile */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded border border-white/15">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-xs font-bold text-[#DBEAFE] tracking-wider">
            {isCaseRoute ? `CASE #${caseId}` : 'OPERATIONAL VIEW'}
          </span>
        </div>

        <div className="h-4 w-px bg-white/20 hidden sm:block" />

        <span className="text-xs font-semibold text-white/90 hidden sm:inline-block">
          IO — Amrit Singh
        </span>

        <button
          onClick={() => showToast('No pending critical system broadcasts.', 'info')}
          className="w-8 h-8 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>

        <button
          onClick={() => navigate('/admin/audit-log')}
          className="w-8 h-8 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          title="Audit Trail"
          aria-label="Activity"
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
        </button>

        <div
          onClick={() => navigate('/admin/users')}
          className="w-8 h-8 rounded-full bg-[#E9EEF5] text-[#0B2340] flex items-center justify-center text-xs font-bold border-2 border-white/50 cursor-pointer shadow-sm hover:scale-105 transition-transform"
          title="Profile: Insp. Amrit Singh (ID: 1042)"
        >
          AS
        </div>
      </div>
    </header>
  );
};
