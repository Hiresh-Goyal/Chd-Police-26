import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/common/Toast';

interface ReportSectionItem {
  id: string;
  name: string;
  included: boolean;
}

/* ── helpers ────────────────────────────────────────────────── */

function generateReportHTML(sections: ReportSectionItem[], certOfficer: string): string {
  const includedNames = sections.filter(s => s.included).map(s => s.name);

  const sectionBlocks: Record<string, string> = {
    sec_1: `
      <h2>1. Executive Case Overview &amp; Complainant Details</h2>
      <p>Investigation established that subject <strong>Rajesh Verma</strong> coordinated an investment fraud scheme through social media channels, communicating via target SIM <strong>+91 9812345678</strong>. The suspect directed victims to transfer funds promising high returns on a fictitious trading platform.</p>
      <table>
        <tr><td>Case Reference ID</td><td>#2847</td></tr>
        <tr><td>Primary Subject / Accused</td><td>Rajesh Verma</td></tr>
        <tr><td>Complainant</td><td>Priya Sharma, Sector 21, Chandigarh</td></tr>
        <tr><td>Estimated Defraud Amount</td><td>₹4,82,000</td></tr>
        <tr><td>Primary Incident Date</td><td>15 August 2026</td></tr>
        <tr><td>Investigating Officer</td><td>Insp. Amrit Singh, Sr. Inspector, Sector 17 Unit</td></tr>
      </table>`,
    sec_2: `
      <h2>2. Critical Modus Operandi Nexus (Call → IPDR → IMPS → ATM)</h2>
      <p>Cellular tower logs corroborate suspect presence at Sector 17 at 14:00 IST. VOIP call was followed by IPDR data sessions and IMPS transfer of ₹48,000 into HDFC Account XXXXXXX4521, culminating in terminal cash withdrawal of ₹47,500 at Sector 22 ATM.</p>
      <table>
        <tr><th>Step</th><th>Domain</th><th>Detail</th></tr>
        <tr><td>1</td><td>CDR</td><td>VOIP call from +91 9812345678 to victim — 14m 23s</td></tr>
        <tr><td>2</td><td>IPDR</td><td>IP 103.76.234.12 — data to NetBanking portal</td></tr>
        <tr><td>3</td><td>BANK</td><td>IMPS TXN ₹48,000 → HDFC XXXXXXX4521</td></tr>
        <tr><td>4</td><td>BANK</td><td>ATM Cashout ₹47,500 — Sector 22 ATM SIB8922</td></tr>
      </table>`,
    sec_3: `
      <h2>3. Cross-Domain Chronological Timeline (15 Aug 2026)</h2>
      <table>
        <tr><th>Time</th><th>Domain</th><th>Event</th></tr>
        <tr><td>09:15</td><td>SOCIAL</td><td>Initial Social Contact via WhatsApp MSG from +44 7738 900977</td></tr>
        <tr><td>14:00</td><td>CDR</td><td>Voice Call — Duration 14m 23s (Tower Cell ID 45892)</td></tr>
        <tr><td>14:28</td><td>IPDR</td><td>Active Data Session — IP: 103.76.234.12 (Port 443), Data: 2.4MB</td></tr>
        <tr><td>14:32</td><td>BANK</td><td>Fraudulent Transfer — IMPS ₹48,000 → HDFC XXXXXXX4521</td></tr>
        <tr><td>15:10</td><td>BANK</td><td>ATM Withdrawal — ₹47,500 at Sector 22 ATM</td></tr>
      </table>`,
    sec_4: `
      <h2>4. Entity Link Analysis &amp; Multi-Domain Associations</h2>
      <p>Cross-domain entity resolution identified 6 suspect entities linked across CDR, IPDR and BANK domains. Primary subject Rajesh Verma shares call records and IP session logs with secondary entities operating mule accounts.</p>
      <table>
        <tr><th>Entity</th><th>Role</th><th>Domain Link</th><th>Risk Score</th></tr>
        <tr><td>Rajesh Verma</td><td>Primary Subject / Target P1</td><td>CDR + IPDR + BANK</td><td>92</td></tr>
        <tr><td>+91 9812345678</td><td>Primary Contact (IMSI)</td><td>CDR</td><td>88</td></tr>
        <tr><td>HDFC XXXXXXX4521</td><td>Mule Account T1</td><td>BANK</td><td>85</td></tr>
      </table>`,
    sec_5: `
      <h2>5. CriminalFlow Financial Trail &amp; Mule Dispersal</h2>
      <p>Total defraud amount of ₹4,82,000 was dispersed across multiple mule accounts via IMPS and then rapidly converted to cash via ATM withdrawals to prevent recovery.</p>
      <table>
        <tr><th>From</th><th>To</th><th>Amount</th><th>Method</th></tr>
        <tr><td>Victim Account</td><td>HDFC XXXXXXX4521</td><td>₹48,000</td><td>IMPS</td></tr>
        <tr><td>HDFC XXXXXXX4521</td><td>ATM SIB8922</td><td>₹47,500</td><td>Cash Withdrawal</td></tr>
      </table>`,
    sec_6: `
      <h2>6. Cryptographic Evidence Integrity (SHA-256 Ledger)</h2>
      <table>
        <tr><th>Evidence File</th><th>SHA-256 Hash</th></tr>
        <tr><td>CDR_Export_15Aug.csv</td><td>a3f1...9d2e (truncated for display)</td></tr>
        <tr><td>IPDR_Session_Log.json</td><td>b7c4...1f8a (truncated for display)</td></tr>
        <tr><td>BANK_Stmt_HDFC4521.pdf</td><td>d9e2...3c5b (truncated for display)</td></tr>
      </table>`,
    sec_7: `
      <h2>7. Section 65B Indian Evidence Act Certification</h2>
      <div class="cert-box">
        <p><strong>Certificate Under Section 65B(4) of Indian Evidence Act, 1872</strong></p>
        <p><em>"I hereby certify that the electronic output provided herein is a true reproduction of system records maintained during ordinary course of investigative duty without tampering or modification."</em></p>
        <p style="margin-top:24px"><strong>${certOfficer}</strong><br/>
        Digital Signature ID: DS-2026-CHDPOL-1042<br/>
        Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>`,
  };

  const sectionsHTML = sections
    .filter(s => s.included)
    .map(s => sectionBlocks[s.id] ?? '')
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FIR #2847 — Forensic Evidence Dossier</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 40px; max-width: 900px; margin: auto; }
    .header { text-align: center; border-bottom: 3px solid #0b2340; padding-bottom: 20px; margin-bottom: 28px; }
    .header h1 { font-size: 18px; letter-spacing: 2px; color: #0b2340; text-transform: uppercase; margin-top: 8px; }
    .header .sub { font-size: 11px; color: #64748b; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
    .confidential { display: inline-block; margin-top: 10px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 3px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin-bottom: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .meta-box div { display: flex; justify-content: space-between; font-size: 12px; }
    .meta-box span:first-child { color: #64748b; }
    .meta-box span:last-child { font-weight: 700; color: #0b2340; }
    .meta-box .red { color: #dc2626; }
    h2 { font-size: 13px; font-weight: 700; color: #0b2340; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 28px 0 12px; }
    p { color: #374151; line-height: 1.7; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 12px; }
    th { background: #f1f5f9; color: #64748b; font-weight: 600; text-align: left; padding: 7px 10px; border: 1px solid #e2e8f0; }
    td { padding: 6px 10px; border: 1px solid #e2e8f0; color: #1e293b; }
    tr:nth-child(even) td { background: #f8fafc; }
    .cert-box { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; padding: 20px; margin-top: 12px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 10px; color: #94a3b8; text-align: center; letter-spacing: 0.5px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Chandigarh Police Department</h1>
    <div class="sub">Cyber Crime &amp; Forensic Investigation Division</div>
    <div class="confidential">Confidential — For Official Legal Proceedings Only</div>
  </div>

  <div class="meta-box">
    <div><span>Case Reference:</span><span>FIR #2847 / 2026</span></div>
    <div><span>Subject / Accused:</span><span>Rajesh Verma</span></div>
    <div><span>Total Defraud Amount:</span><span class="red">₹4,82,000</span></div>
    <div><span>Primary Incident Date:</span><span>15 August 2026</span></div>
    <div><span>Investigating Officer:</span><span>Insp. Amrit Singh</span></div>
    <div><span>Report Generated:</span><span>${new Date().toLocaleString('en-IN')}</span></div>
  </div>

  ${sectionsHTML}

  <div class="footer">
    Generated by Rakshak Setu — Police Investigative Analytics Platform &nbsp;|&nbsp; CHANDIGARH POLICE DEPARTMENT &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}
  </div>
</body>
</html>`;
}

/* ── component ──────────────────────────────────────────────── */

export const EvidenceReport: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const isDemo = caseId === '2847';

  const [certOfficer, setCertOfficer] = useState('Insp. Amrit Singh, Senior Inspector (ID: 1042)');
  const [sections, setSections] = useState<ReportSectionItem[]>([
    { id: 'sec_1', name: '1. Executive Case Overview & Complainant Details', included: true },
    { id: 'sec_2', name: '2. Critical Modus Operandi Nexus (Call → IPDR → IMPS → ATM)', included: true },
    { id: 'sec_3', name: '3. Cross-Domain Chronological Timeline (15 Aug 2026)', included: true },
    { id: 'sec_4', name: '4. Entity Link Analysis & Multi-Domain Associations', included: true },
    { id: 'sec_5', name: '5. CriminalFlow Financial Trail & Mule Dispersal', included: true },
    { id: 'sec_6', name: '6. Cryptographic Evidence Integrity (SHA-256 Ledger)', included: true },
    { id: 'sec_7', name: '7. Section 65B Indian Evidence Act Certification', included: true },
  ]);

  const toggleSection = (id: string) => {
    setSections(sections.map(s => (s.id === id ? { ...s, included: !s.included } : s)));
  };

  /** Build a Blob URL from the generated HTML */
  const buildBlobUrl = (): string => {
    const html = generateReportHTML(sections, certOfficer);
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  /** Open report preview in a new browser tab */
  const handlePreview = () => {
    const url = buildBlobUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Report opened in a new tab.', 'success');
  };

  /** Trigger a real file download */
  const handleDownload = () => {
    const url = buildBlobUrl();
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'FIR_2847_Dossier_15Aug2026.html';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast('Report downloaded successfully.', 'success');
  };



  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#2847</span>
            <span>•</span>
            <span>Official Court &amp; Legal Proceedings Dossier</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Evidence Report Builder</h1>
        </div>

        {/* Inline action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-4 py-2 rounded border border-[#0B5CAB] text-[#0B5CAB] text-sm font-semibold hover:bg-[#EFF6FF] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
            Preview
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0B5CAB] text-white text-sm font-semibold hover:bg-[#0A4F96] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[17px]">download</span>
            Download Report
          </button>
        </div>
      </header>

      {/* Full-width form cards */}
      <div className="flex flex-col gap-4">

        {/* Case Information */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-5 shadow-xs">
          <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">info</span>
            Case Information
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Case Reference ID</label>
              <div className="font-mono font-bold text-[#0B2340] text-sm">#2847</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Primary Subject</label>
              <div className="font-bold text-[#0B2340] text-sm">Rajesh Verma</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Incident Date</label>
              <div className="font-bold text-[#0B2340] text-sm">15 Aug 2026</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4] col-span-2 sm:col-span-3">
              <label className="text-[#64748B] block mb-1 font-medium">Investigating Officer (IO)</label>
              <div className="font-semibold text-[#0B2340] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0B2340] text-white flex items-center justify-center text-[9px] font-bold shrink-0">AS</span>
                Insp. Amrit Singh, Senior Inspector • Sector 17 Unit
              </div>
            </div>
          </div>
        </div>

        {/* Section 65B Certification */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-5 shadow-xs">
          <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">verified</span>
            Section 65B Indian Evidence Act Certification
          </h2>
          <p className="text-xs text-[#64748B] mb-3">
            Identify the certifying authority attesting to electronic data integrity and tamper-evident custody.
          </p>
          <div className="max-w-lg">
            <label className="block text-xs font-bold text-[#424751] mb-1">
              Certifying Officer / Authority Name &amp; Rank
            </label>
            <input
              type="text"
              value={certOfficer}
              onChange={e => setCertOfficer(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9E1EA] rounded text-xs text-[#191C1E] focus:outline-none focus:border-[#0B5CAB]"
            />
          </div>
        </div>

        {/* Report Section Selection — full width */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-5 shadow-xs">
          <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">format_list_bulleted</span>
            Report Section Selection
          </h2>
          <p className="text-xs text-[#64748B] mb-3">
            Select analytical modules to compile into the final court submission.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sections.map(sec => (
              <label
                key={sec.id}
                className="flex items-center gap-3 p-3 rounded bg-[#F8FAFC] border border-[#EDF0F4] hover:bg-[#EFF6FF] hover:border-[#0B5CAB]/30 cursor-pointer transition-colors text-xs"
              >
                <input
                  type="checkbox"
                  checked={sec.included}
                  onChange={() => toggleSection(sec.id)}
                  className="w-4 h-4 rounded accent-[#0B5CAB] shrink-0"
                />
                <span className={`font-medium ${sec.included ? 'text-[#191C1E]' : 'text-[#94A3B8] line-through'}`}>
                  {sec.name}
                </span>
              </label>
            ))}
          </div>

          {/* Inline status bar */}
          <div className="mt-3 pt-3 border-t border-[#EDF0F4] flex items-center justify-between text-xs text-[#64748B]">
            <span>{sections.filter(s => s.included).length} of {sections.length} sections selected</span>
            <span className="text-[#0B5CAB] font-semibold">FIR_2847_Dossier_15Aug2026.html</span>
          </div>
        </div>

      </div>
    </div>
  );
};
