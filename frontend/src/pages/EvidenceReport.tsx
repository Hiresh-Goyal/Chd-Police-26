import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { useCaseStore } from '../context/CaseStore';
import { getFraudScore, getAlerts, getTimeline, getCaseFiles } from '../api/client';
import { FraudScoreAPI, FindingAPI, CanonicalEventAPI } from '../types/api';

interface ReportSectionItem {
  id: string;
  name: string;
  included: boolean;
}

/* ── helpers ────────────────────────────────────────────────── */

function generateReportHTML(
  sections: ReportSectionItem[], 
  certOfficer: string, 
  caseSummary: any, 
  fraudScore: FraudScoreAPI | null, 
  alerts: FindingAPI[], 
  timeline: CanonicalEventAPI[],
  files: { id: string, name: string, type: string, sha256: string, uploaded_at: string }[]
): string {
  const includedNames = sections.filter(s => s.included).map(s => s.name);
  
  const caseId = caseSummary?.id || '#Unknown';
  const subjectName = caseSummary?.title || 'Unknown Subject';
  
  const totalLoss = timeline
    .filter(t => t.event_type === 'BANK_TRANSFER' && t.amount != null)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const estLoss = totalLoss > 0 ? `₹${totalLoss.toLocaleString('en-IN')}` : 'Unknown / Pending';
  
  const status = caseSummary?.status || 'Active';
  const io = certOfficer || localStorage.getItem('ds_user') || 'Assigned Officer';
  const score = fraudScore ? fraudScore.score : 0;
  const level = fraudScore ? fraudScore.risk_level : 'UNKNOWN';

  const sectionBlocks: Record<string, string> = {
    sec_1: `
      <h2>1. Executive Case Overview &amp; Complainant Details</h2>
      <p>Investigation established that the subject <strong>${subjectName}</strong> was involved in activities generating a fraud risk score of ${score} (${level}).</p>
      <table>
        <tr><td>Case Reference ID</td><td>${caseId}</td></tr>
        <tr><td>Primary Subject / Accused</td><td>${subjectName}</td></tr>
        <tr><td>Current Status</td><td>${status}</td></tr>
        <tr><td>Estimated Defraud Amount</td><td>${estLoss}</td></tr>
        <tr><td>Investigating Officer</td><td>${io}</td></tr>
      </table>`,
    sec_2: `
      <h2>2. Critical Modus Operandi Nexus</h2>
      <p>System automatically detected ${alerts.length} critical/high alerts associated with this case.</p>
      <table>
        <tr><th>Alert ID</th><th>Severity</th><th>Explanation</th></tr>
        ${alerts.slice(0, 5).map(a => `<tr><td>${a.rule_id}</td><td>${a.severity}</td><td>${a.explanation}</td></tr>`).join('')}
      </table>`,
    sec_3: `
      <h2>3. Cross-Domain Chronological Timeline</h2>
      <table>
        <tr><th>Time</th><th>Event Type</th><th>Event Details</th></tr>
        ${timeline.slice(0, 10).map(t => `<tr><td>${new Date(t.ts_start).toLocaleTimeString()}</td><td>${t.event_type}</td><td>${t.actor_raw} ${t.peer_raw ? `→ ${t.peer_raw}` : ''}</td></tr>`).join('')}
      </table>`,
    sec_4: `
      <h2>4. Entity Link Analysis &amp; Multi-Domain Associations</h2>
      <p>Cross-domain entity resolution identified multiple suspect entities linked across domains.</p>
      <table>
        <tr><th>Entity</th><th>Type</th><th>Confidence</th></tr>
        ${caseSummary?.entities ? caseSummary.entities.slice(0, 5).map((e: any) => `<tr><td>${e.name}</td><td>${e.type}</td><td>${e.confidence || 'CONFIRMED'}</td></tr>`).join('') : '<tr><td colspan="3">No entities extracted</td></tr>'}
      </table>`,
    sec_5: `
      <h2>5. CriminalFlow Financial Trail &amp; Mule Dispersal</h2>
      <p>The financial trail analysis maps the dispersion of funds through suspected mule accounts.</p>
      <table>
        <tr><th>From</th><th>To</th><th>Amount</th><th>Method</th></tr>
        ${timeline
          .filter(t => t.event_type === 'BANK_TRANSFER')
          .slice(0, 10)
          .map(t => `<tr><td>${t.actor_raw}</td><td>${t.peer_raw || 'Unknown'}</td><td>₹${t.amount?.toLocaleString('en-IN')}</td><td>Transfer</td></tr>`)
          .join('') || '<tr><td colspan="4">No financial transactions found.</td></tr>'}
      </table>`,
    sec_6: `
      <h2>6. Cryptographic Evidence Integrity (SHA-256 Ledger)</h2>
      <table>
        <tr><th>Evidence File</th><th>Type</th><th>SHA-256 Hash</th></tr>
        ${files.length > 0 
          ? files.map(f => `<tr><td>${f.name}</td><td>${f.type}</td><td style="font-family: monospace; font-size: 11px;">${f.sha256}</td></tr>`).join('') 
          : '<tr><td colspan="3">No evidence files uploaded.</td></tr>'}
      </table>`,
    sec_7: `
      <h2>7. Section 65B Indian Evidence Act Certification</h2>
      <div class="cert-box">
        <p><strong>Certificate Under Section 65B(4) of Indian Evidence Act, 1872</strong></p>
        <p><em>"I hereby certify that the electronic output provided herein is a true reproduction of system records maintained during ordinary course of investigative duty without tampering or modification."</em></p>
        <p style="margin-top:24px"><strong>${certOfficer}</strong><br/>
        Digital Signature ID: DS-${new Date().getFullYear()}-${caseId.substring(0, 6).toUpperCase()}<br/>
        Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>`,
  };

  const sectionsHTML = sections
    .filter(s => s.included)
    .map(s => sectionBlocks[s.id] ?? '')
    .join('\n');

  const incidentDate = caseSummary?.openedDate ? new Date(caseSummary.openedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FIR #${caseId} — Forensic Evidence Dossier</title>
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
    <div><span>Case Reference:</span><span>FIR #${caseId} / 2026</span></div>
    <div><span>Subject / Accused:</span><span>${subjectName}</span></div>
    <div><span>Total Defraud Amount:</span><span class="red">${estLoss}</span></div>
    <div><span>Case Registration Date:</span><span>${incidentDate}</span></div>
    <div><span>Investigating Officer:</span><span>${io}</span></div>
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
  const { getCase } = useCaseStore();
  const caseSummary = getCase(caseId ?? '');

  const [fraudScore, setFraudScore] = useState<FraudScoreAPI | null>(null);
  const [alerts, setAlerts] = useState<FindingAPI[]>([]);
  const [timeline, setTimeline] = useState<CanonicalEventAPI[]>([]);
  const [files, setFiles] = useState<{ id: string, name: string, type: string, sha256: string, uploaded_at: string }[]>([]);

  React.useEffect(() => {
    if (caseId) {
      getFraudScore(caseId).then(setFraudScore).catch(console.error);
      getAlerts(caseId).then(setAlerts).catch(console.error);
      getTimeline(caseId).then(setTimeline).catch(console.error);
      getCaseFiles(caseId).then(setFiles).catch(console.error);
    }
  }, [caseId]);

  const [certOfficer, setCertOfficer] = useState(localStorage.getItem('ds_user') ? `${localStorage.getItem('ds_user')} (IO)` : 'Investigating Officer');
  const [sections, setSections] = useState<ReportSectionItem[]>([
    { id: 'sec_1', name: '1. Executive Case Overview & Complainant Details', included: true },
    { id: 'sec_2', name: '2. Critical Modus Operandi Nexus', included: true },
    { id: 'sec_3', name: '3. Cross-Domain Chronological Timeline', included: true },
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
    const html = generateReportHTML(sections, certOfficer, caseSummary, fraudScore, alerts, timeline, files);
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
    anchor.download = `FIR_${caseId}_Dossier.html`;
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
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#{caseId}</span>
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
              <div className="font-mono font-bold text-[#0B2340] text-sm">#{caseId}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Primary Subject</label>
              <div className="font-bold text-[#0B2340] text-sm">{caseSummary?.subject || 'Subject'}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Case Registration Date</label>
              <div className="font-bold text-[#0B2340] text-sm">{caseSummary?.openedDate ? new Date(caseSummary.openedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4] col-span-2 sm:col-span-3">
              <label className="text-[#64748B] block mb-1 font-medium">Investigating Officer (IO)</label>
              <div className="font-semibold text-[#0B2340] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0B2340] text-white flex items-center justify-center text-[9px] font-bold shrink-0">{localStorage.getItem('ds_user') ? localStorage.getItem('ds_user')?.substring(0, 2).toUpperCase() : 'IO'}</span>
                {localStorage.getItem('ds_user') || 'Assigned Officer'}
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
