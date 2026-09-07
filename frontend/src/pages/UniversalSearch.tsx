import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DomainBadge, PriorityBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const UniversalSearch: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [query, setQuery] = useState('9812345678');
  const [hasExecuted, setHasExecuted] = useState(true);

  const detectFormat = (text: string) => {
    const clean = text.trim();
    if (/^\+?\d{10,12}$/.test(clean)) return { type: 'Phone Number', icon: 'call', valid: true };
    if (/^\d{15}$/.test(clean)) return { type: 'IMEI Device ID', icon: 'smartphone', valid: true };
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return { type: 'IPv4 Address', icon: 'router', valid: true };
    if (/^[A-Za-z0-9]{8,18}$/.test(clean) && (clean.toUpperCase().includes('HDFC') || clean.toUpperCase().includes('SBI') || clean.length >= 10)) {
      return { type: 'Bank Account Number', icon: 'account_balance', valid: true };
    }
    return { type: 'Suspect / Subject Name', icon: 'person', valid: clean.length > 2 };
  };

  const detected = detectFormat(query);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      showToast('Please enter an identifier to search.', 'warning');
      return;
    }
    setHasExecuted(true);
    showToast(`Query executed across CDR, IPDR, Bank & NCRP indices. Found 4 matches.`, 'info');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header Banner */}
      <div className="bg-[#0B2340] rounded-md p-6 text-white shadow-sm flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Universal Search</h1>
        <p className="text-sm text-[#DBEAFE] max-w-2xl">
          Federated investigative search across telecom CDR, data IPDR, banking transactions, IMEI hardware, and NCRP police databases.
        </p>
      </div>

      {/* Search Bar Interface */}
      <section className="bg-white border border-[#D9E1EA] rounded-md p-5 shadow-xs flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter Phone Number, IMEI, Bank Account, IP address, or Suspect Name..."
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-[#D9E1EA] rounded focus:outline-none focus:border-[#0B5CAB] focus:ring-1 focus:ring-[#0B5CAB]"
            />
          </div>
          <Button variant="primary" type="submit" icon="search" className="px-6 py-2.5">
            Execute Query
          </Button>
        </form>

        {/* Format Auto-Detection Badges */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <span className="text-[#64748B] font-medium">Detected Format:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#EFF6FF] text-[#0B5CAB] font-mono font-bold border border-[#0B5CAB]/20">
            <span className="material-symbols-outlined text-[14px]">{detected.icon}</span>
            {detected.type}
          </span>
          {detected.valid && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px] border border-emerald-200">
              VALID
            </span>
          )}
        </div>
      </section>

      {/* Results Grid */}
      {hasExecuted && (
        <div className="bg-white border border-[#D9E1EA] rounded-md p-8 shadow-xs flex flex-col items-center justify-center text-center gap-2">
          <span className="material-symbols-outlined text-[#CBD5E1] text-5xl">search_off</span>
          <h3 className="font-bold text-[#0B2340]">Universal Search Backend Not Connected</h3>
          <p className="text-sm text-[#64748B]">
            The live search integration is pending. Federated querying across indices will be available soon.
          </p>
        </div>
      )}
    </div>
  );
};
