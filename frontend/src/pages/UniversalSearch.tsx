import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CASE_2847 } from '../data/mockData';
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Entity Matches */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider border-b border-[#D9E1EA] pb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[16px]">person_search</span>
              Entity Matches (2)
            </h3>

            {/* Primary Match */}
            <div
              onClick={() => navigate('/cases/2847')}
              className="bg-white border-l-4 border-l-[#DC2626] border border-[#D9E1EA] rounded-md p-4 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#191C1E]">Rajesh Verma</h4>
                    <span className="font-mono text-xs text-[#0B5CAB]">+91 9812345678</span>
                  </div>
                </div>
                <span className="bg-[#DC2626]/10 text-[#DC2626] text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#DC2626]/20">
                  RISK: 92
                </span>
              </div>

              <div className="text-xs text-[#424751] border-t border-[#EDF0F4] pt-2 flex flex-col gap-1">
                <div>Primary Target in <strong>Case #2847</strong> (Investment Scam)</div>
                <div className="font-mono text-[11px] text-[#64748B]">HDFC 4521 • IMEI 8643...219</div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <DomainBadge domain="CDR" size="sm" />
                <span className="text-xs text-[#0B5CAB] font-semibold flex items-center gap-0.5">
                  Open Workspace <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </div>

            {/* Secondary Match */}
            <div
              onClick={() => navigate('/cases/2847/entity-graph')}
              className="bg-white border border-[#D9E1EA] rounded-md p-3.5 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col gap-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-xs text-[#191C1E]">HDFC XXXXXXX4521</h4>
                  <span className="text-[11px] text-[#64748B]">Beneficiary Account (Mule L1)</span>
                </div>
                <DomainBadge domain="BANK" size="sm" />
              </div>
              <div className="text-xs text-[#DC2626] font-mono font-semibold">
                IMPS Received: ₹48,000
              </div>
            </div>
          </div>

          {/* Column 2: Associated Cases */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider border-b border-[#D9E1EA] pb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[16px]">folder_special</span>
              Associated Case Records (2)
            </h3>

            {/* Case 2847 */}
            <div
              onClick={() => navigate('/cases/2847')}
              className="bg-white border border-[#0B5CAB]/40 rounded-md p-4 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#0B5CAB] text-xs">Case #2847</span>
                <PriorityBadge priority="Critical" />
              </div>
              <h4 className="font-bold text-sm text-[#191C1E]">Investment Scam — Rajesh Verma</h4>
              <p className="text-xs text-[#424751] line-clamp-2">
                Coordinated fraud network involving VoIP communications, rapid IPDR session, and IMPS money splitting.
              </p>
              <div className="text-[11px] text-[#64748B] flex justify-between border-t border-[#EDF0F4] pt-2">
                <span>IO: Insp. Amrit Singh</span>
                <span className="font-mono text-emerald-700 font-bold">ACTIVE</span>
              </div>
            </div>

            {/* Case 1892 Prior */}
            <div
              onClick={() => showToast('Opening historical Case #1892 archival dossier.', 'info')}
              className="bg-white border border-[#D9E1EA] rounded-md p-3.5 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#64748B] text-xs">Case #1892 (Archived)</span>
                <PriorityBadge priority="Medium" />
              </div>
              <h4 className="font-semibold text-xs text-[#191C1E]">SIM Swap Investigation</h4>
              <div className="text-[11px] text-[#64748B]">Same handset IMEI previously recorded in 2025.</div>
            </div>
          </div>

          {/* Column 3: Data Ingestion Artifacts */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider border-b border-[#D9E1EA] pb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[16px]">dataset</span>
              Evidence Logs & Telecom Streams
            </h3>

            <div className="space-y-2 text-xs">
              <div
                onClick={() => navigate('/cases/2847/timeline')}
                className="p-3 bg-white border border-[#D9E1EA] rounded-md hover:border-[#0B5CAB] cursor-pointer transition-all"
              >
                <div className="font-bold text-[#191C1E] flex items-center justify-between">
                  <span>target_number_cdr_oct.csv</span>
                  <DomainBadge domain="CDR" size="sm" />
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 font-mono">147 Call records • 14m call logged</div>
              </div>

              <div
                onClick={() => navigate('/cases/2847/timeline')}
                className="p-3 bg-white border border-[#D9E1EA] rounded-md hover:border-[#0B5CAB] cursor-pointer transition-all"
              >
                <div className="font-bold text-[#191C1E] flex items-center justify-between">
                  <span>ipdr_fastnet_cybercafe.csv</span>
                  <DomainBadge domain="IPDR" size="sm" />
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 font-mono">IP 103.76.234.12 • Port 443 Session</div>
              </div>

              <div
                onClick={() => navigate('/cases/2847/criminal-flow')}
                className="p-3 bg-white border border-[#D9E1EA] rounded-md hover:border-[#0B5CAB] cursor-pointer transition-all"
              >
                <div className="font-bold text-[#191C1E] flex items-center justify-between">
                  <span>hdfc_bank_statement_q3.csv</span>
                  <DomainBadge domain="BANK" size="sm" />
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 font-mono">₹48,000 IMPS entry • Row #991</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
