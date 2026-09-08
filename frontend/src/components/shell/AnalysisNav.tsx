import React from 'react';
import { NavLink } from 'react-router-dom';

export const AnalysisNav: React.FC = () => {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2.5 border-b-2 text-sm whitespace-nowrap flex items-center gap-2 shrink-0 font-medium transition-colors ${
      isActive
        ? 'border-[#0B5CAB] text-[#0B5CAB] font-semibold bg-[#EFF6FF]/40'
        : 'border-transparent text-[#424751] hover:text-[#191C1E] hover:border-[#C2C6D3]'
    }`;

  return (
    <div className="bg-white border border-[#D9E1EA] rounded-lg px-2 flex items-center overflow-x-auto hide-scrollbar shadow-[0_2px_4px_rgba(11,35,64,0.02)] shrink-0 select-none">
      <NavLink to="/cases/2847" end className={tabClass}>
        <span className="material-symbols-outlined text-[18px]">work</span>
        <span>Case Workspace</span>
      </NavLink>

      <NavLink to="/cases/2847/upload-evidence" className={tabClass}>
        <span className="material-symbols-outlined text-[18px]">upload_file</span>
        <span>Upload Evidence</span>
      </NavLink>

      <NavLink to="/cases/2847/timeline" className={tabClass}>
        <span className="material-symbols-outlined text-[18px]">timeline</span>
        <span>Timeline</span>
      </NavLink>

      <NavLink to="/cases/2847/entity-graph" className={tabClass}>
        <span className="material-symbols-outlined text-[18px]">hub</span>
        <span>Entity Graph</span>
      </NavLink>

      <NavLink to="/cases/2847/geospatial" className={tabClass}>
        <span className="material-symbols-outlined text-[18px]">map</span>
        <span>Geospatial Map</span>
      </NavLink>

      <NavLink to="/cases/2847/criminal-flow" className={tabClass}>
        <span className="material-symbols-outlined text-[18px]">account_tree</span>
        <span>CriminalFlow</span>
      </NavLink>

      <NavLink to="/cases/2847/evidence-report" className={tabClass}>
        <span className="material-symbols-outlined text-[18px]">description</span>
        <span>Evidence Report</span>
      </NavLink>
    </div>
  );
};
