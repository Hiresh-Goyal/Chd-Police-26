import React, { useState } from 'react';
import { CASE_2847, CASE_2847_TIMELINE, INITIAL_EVIDENCE_FILES } from '../data/mockData';
import { AnalysisNav } from '../components/shell/AnalysisNav';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

interface ReportSectionItem {
  id: string;
  name: string;
  included: boolean;
}

export const EvidenceReport: React.FC = () => {
  const { showToast } = useToast();

  const [certOfficer, setCertOfficer] = useState('Insp. Amrit Singh, Senior Inspector (ID: 1042)');
  const [reportTitle, setReportTitle] = useState('Forensic Evidence & Modus Operandi Dossier');
  const [sections, setSections] = useState<ReportSectionItem[]>([
    { id: 'sec_1', name: '1. Executive Case Overview & Complainant Details', included: true },
    { id: 'sec_2', name: '2. Critical Modus Operandi Nexus (Call → IPDR → IMPS → ATM)', included: true },
    { id: 'sec_3', name: '3. Cross-Domain Chronological Timeline (15 Aug 2026)', included: true },
    { id: 'sec_4', name: '4. Entity Link Analysis & Multi-Domain Associations', included: true },
    { id: 'sec_5', name: '5. CriminalFlow Financial Trail & Mule Dispersal', included: true },
    { id: 'sec_6', name: '6. Cryptographic Evidence Integrity (SHA-256 Ledger)', included: true },
    { id: 'sec_7', name: '7. Section 65B Indian Evidence Act Certification', included: true }
  ]);

  const toggleSection = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, included: !s.included } : s));
  };

  const handlePrintReport = () => {
    window.print();
    showToast('Sent official evidence report dossier to print generator.', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#2847</span>
            <span>•</span>
            <span>Official Court & Legal Proceedings Dossier</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Evidence Report Builder</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast('Report draft saved successfully.', 'success')}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="picture_as_pdf"
            onClick={handlePrintReport}
          >
            Generate PDF
          </Button>
        </div>
      </header>

      {/* Analysis Tabs */}
      <AnalysisNav />

      {/* 60/40 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Configuration Form (7 cols / ~60%) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Section: Case Information */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">info</span>
              Case Information
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#EDF0F4]">
                <label className="text-[#64748B] block mb-0.5 font-medium">Case Reference ID</label>
                <div className="font-mono font-bold text-[#0B2340] text-sm">#2847</div>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#EDF0F4]">
                <label className="text-[#64748B] block mb-0.5 font-medium">Primary Subject</label>
                <div className="font-bold text-[#0B2340] text-sm">Rajesh Verma</div>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#EDF0F4] col-span-2">
                <label className="text-[#64748B] block mb-0.5 font-medium">Investigating Officer (IO)</label>
                <div className="font-semibold text-[#0B2340] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0B2340] text-white flex items-center justify-center text-[9px] font-bold">AS</span>
                  Insp. Amrit Singh, Senior Inspector • Sector 17 Unit
                </div>
              </div>
            </div>
          </div>

          {/* Section: Section 65B Certification Form */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">verified</span>
              Section 65B Indian Evidence Act Certification
            </h2>
            <p className="text-xs text-[#64748B] mb-3">
              Identify the certifying authority attesting to electronic data integrity and tamper-evident custody.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#424751] mb-1">
                Certifying Officer / Authority Name & Rank
              </label>
              <input
                type="text"
                value={certOfficer}
                onChange={e => setCertOfficer(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D9E1EA] rounded text-xs text-[#191C1E] focus:outline-none focus:border-[#0B5CAB]"
              />
            </div>
          </div>

          {/* Section: Report Sections Selection */}
          <div className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs">
            <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">format_list_bulleted</span>
              Report Section Selection
            </h2>
            <p className="text-xs text-[#64748B] mb-3">
              Select analytical modules to compile into the final court submission.
            </p>

            <div className="space-y-1.5 border border-[#D9E1EA] rounded p-2 bg-[#F8FAFC]">
              {sections.map(sec => (
                <label
                  key={sec.id}
                  className="flex items-center gap-3 p-2 rounded bg-white border border-[#EDF0F4] hover:bg-[#EFF6FF] cursor-pointer transition-colors text-xs"
                >
                  <input
                    type="checkbox"
                    checked={sec.included}
                    onChange={() => toggleSection(sec.id)}
                    className="w-4 h-4 text-[#0B5CAB] rounded accent-[#0B5CAB]"
                  />
                  <span className={`font-medium ${sec.included ? 'text-[#191C1E]' : 'text-[#94A3B8] line-through'}`}>
                    {sec.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Report Preview Dossier (5 cols / ~40%) */}
        <div className="lg:col-span-5 bg-white border border-[#D9E1EA] rounded-md shadow-md p-5 flex flex-col gap-4 text-xs">
          {/* Official Police Dossier Header */}
          <div className="text-center border-b-2 border-[#0B2340] pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src="/chd-police-logo.png" alt="Chandigarh Police Logo" className="w-8 h-8 rounded bg-white p-0.5 object-contain" />
              <span className="font-bold text-sm tracking-wider text-[#0B2340] uppercase">
                CHANDIGARH POLICE DEPARTMENT
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-widest">
              CYBER CRIME & FORENSIC INVESTIGATION DIVISION
            </div>
            <div className="mt-1.5 inline-block bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider">
              CONFIDENTIAL // FOR OFFICIAL LEGAL PROCEEDINGS ONLY
            </div>
          </div>

          {/* Dossier Meta Summary */}
          <div className="bg-[#F8FAFC] border border-[#D9E1EA] p-3 rounded space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Case Ref:</span>
              <span className="font-bold text-[#0B2340]">FIR #2847 / 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Subject / Accused:</span>
              <span className="font-bold text-[#191C1E]">Rajesh Verma</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Total Traced Defraud Amount:</span>
              <span className="font-bold text-[#DC2626]">₹4,82,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Primary Incident Date:</span>
              <span>15 August 2026</span>
            </div>
          </div>

          {/* Executive Summary */}
          {sections[0].included && (
            <div>
              <h4 className="font-bold text-xs text-[#0B2340] border-b border-[#EDF0F4] pb-1 mb-1.5 uppercase">
                1. Executive Summary & Modus Operandi
              </h4>
              <p className="text-[#424751] text-[11px] leading-relaxed">
                Investigation established that subject <strong>Rajesh Verma</strong> coordinated an investment fraud scheme through social media channels, communicating via target SIM <strong>+91 9812345678</strong>. Cellular tower logs corroborate suspect presence at Sector 17 at 14:00 IST followed by data sessions and IMPS transfer of ₹48,000 into HDFC Account <strong>XXXXXXX4521</strong> and terminal cash withdrawal of ₹47,500 at Sector 22 ATM.
              </p>
            </div>
          )}

          {/* Timeline Summary Table */}
          {sections[2].included && (
            <div>
              <h4 className="font-bold text-xs text-[#0B2340] border-b border-[#EDF0F4] pb-1 mb-1.5 uppercase">
                2. Key Event Provenance Table
              </h4>
              <table className="w-full text-left border-collapse text-[10px] font-mono">
                <thead>
                  <tr className="bg-slate-100 text-[#64748B] border-b border-[#D9E1EA]">
                    <th className="py-1 px-1.5">Time</th>
                    <th className="py-1 px-1.5">Domain</th>
                    <th className="py-1 px-1.5">Finding Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0F4]">
                  {CASE_2847_TIMELINE.slice(0, 5).map(ev => (
                    <tr key={ev.id}>
                      <td className="py-1 px-1.5 font-bold text-[#0B5CAB]">{ev.timeDisplay}</td>
                      <td className="py-1 px-1.5">{ev.domain}</td>
                      <td className="py-1 px-1.5 text-[#191C1E]">{ev.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Evidence Hashes */}
          {sections[5].included && (
            <div>
              <h4 className="font-bold text-xs text-[#0B2340] border-b border-[#EDF0F4] pb-1 mb-1.5 uppercase">
                3. Cryptographic Hashes (SHA-256)
              </h4>
              <div className="space-y-1 font-mono text-[9px] bg-[#F8FAFC] p-2 rounded border border-[#D9E1EA] text-[#424751]">
                {INITIAL_EVIDENCE_FILES.map(f => (
                  <div key={f.id} className="truncate">
                    <span className="font-bold text-[#0B5CAB]">{f.name}:</span> {f.hash}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 65B Attestation Box */}
          {sections[6].included && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-300 rounded text-[10px] leading-relaxed">
              <div className="font-bold uppercase text-[#0B2340] mb-1">
                Certificate Under Section 65B(4)
              </div>
              <p className="text-[#424751] italic mb-2">
                "I hereby certify that the electronic output provided herein is a true reproduction of system records maintained during ordinary course of investigative duty without tampering."
              </p>
              <div className="flex justify-between items-end pt-2 border-t border-slate-300">
                <div>
                  <span className="font-bold block text-[#191C1E]">{certOfficer}</span>
                  <span className="text-[#64748B]">Digital Signature ID: DS-2026-CHDPOL-1042</span>
                </div>
                <div className="w-16 h-8 border border-dashed border-slate-400 flex items-center justify-center text-[8px] font-mono text-slate-400">
                  OFFICIAL SEAL
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
