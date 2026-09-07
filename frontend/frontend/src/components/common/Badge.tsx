import React from 'react';

interface DomainBadgeProps {
  domain: 'CDR' | 'IPDR' | 'BANK' | 'SOCIAL' | 'NCRP' | 'SYS' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const DomainBadge: React.FC<DomainBadgeProps> = ({ domain, size = 'sm', className = '' }) => {
  const d = domain.toUpperCase();
  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = 'folder';

  if (d === 'CDR') {
    styles = 'bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/20';
    icon = 'call';
  } else if (d === 'IPDR') {
    styles = 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20';
    icon = 'router';
  } else if (d === 'BANK') {
    styles = 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20';
    icon = 'account_balance';
  } else if (d === 'SOCIAL') {
    styles = 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20';
    icon = 'forum';
  } else if (d === 'NCRP') {
    styles = 'bg-[#C8102E]/10 text-[#C8102E] border-[#C8102E]/20';
    icon = 'shield';
  } else if (d === 'SYS') {
    styles = 'bg-slate-100 text-slate-700 border-slate-300';
    icon = 'settings';
  }

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold uppercase rounded border ${sizeClass} ${styles} ${className}`}>
      <span className="material-symbols-outlined text-[12px]">{icon}</span>
      {d}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm', className = '' }) => {
  const p = priority.toUpperCase();
  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (p === 'CRITICAL') {
    styles = 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25 font-bold';
  } else if (p === 'HIGH') {
    styles = 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/25 font-bold';
  } else if (p === 'MEDIUM') {
    styles = 'bg-[#0B5CAB]/10 text-[#0B5CAB] border-[#0B5CAB]/25';
  } else if (p === 'LOW') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center uppercase tracking-wider rounded border ${sizeClass} ${styles} ${className}`}>
      {priority}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'Active' | 'Under Review' | 'Pending' | 'Closed' | 'TRIGGERED' | 'STANDBY' | 'SUCCESS' | 'FAILED' | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const s = status.toLowerCase();

  if (s === 'active' || s === 'success') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-emerald-700 font-medium text-xs ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        {status}
      </span>
    );
  }

  if (s === 'triggered' || s === 'failed') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-red-700 font-medium text-xs ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
        {status}
      </span>
    );
  }

  if (s === 'pending' || s === 'under review') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-amber-700 font-medium text-xs ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-slate-600 font-medium text-xs ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
      {status}
    </span>
  );
};
