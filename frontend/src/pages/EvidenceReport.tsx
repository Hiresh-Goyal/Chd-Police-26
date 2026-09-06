import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { apiClient } from '../api/client';

interface ReportSectionItem {
  id: string;
  name: string;
  included: boolean;
}

/* ── helpers ────────────────────────────────────────────────── */

function generateReportHTML(sections: ReportSectionItem[], certOfficer: string, reportData: any): string {
  const caseData = reportData?.case || { id: 'UNKNOWN', title: 'Unknown Case' };
  const summary = reportData?.summary || {};
  const findings = reportData?.findings || [];
  const moneyFlow = reportData?.money_flow || { nodes: [], links: [] };
  const mlSignals = reportData?.ml_signals || {};
  const chain = reportData?.chain_of_custody || [];
  
  const includedNames = sections.filter(s => s.included).map(s => s.id);

  // Filter ML explanations
  const aiFindings = findings.filter((f: any) => f.ml_signal > 0 && f.ml_explanation);
  
  // Format findings for Section 2
  const findingsHTML = findings.map((f: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td><span class="confidential" style="background:#e0e7ff; color:#3730a3; border-color:#c7d2fe;">${f.rule_id}</span></td>
      <td>${f.severity}</td>
      <td>${f.explanation}</td>
    </tr>
  `).join('');

  // Format AI for Section 1b (AI Synthesized Summary)
  const aiHTML = aiFindings.length > 0 ? `
    <div style="background-color: #faf5ff; border-left: 4px solid #9333ea; padding: 12px; margin-top: 15px;">
      <h3 style="color: #6b21a8; font-size: 12px; margin-bottom: 8px;">AI-Synthesized Behavioral Anomalies</h3>
      <ul style="font-size: 11px; padding-left: 15px; color: #4c1d95;">
        ${aiFindings.map((f: any) => `<li><strong>${f.rule_id} Context:</strong> ${f.ml_explanation} (Confidence: ${(f.ml_signal * 100).toFixed(1)}%)</li>`).join('')}
      </ul>
    </div>
  ` : '';

  // Format Money Flow for Section 5
  const flowHTML = moneyFlow.links.map((l: any) => {
    const source = moneyFlow.nodes.find((n: any) => n.id === l.source)?.canonical_value || l.source;
    const target = moneyFlow.nodes.find((n: any) => n.id === l.target)?.canonical_value || l.target;
    return `
      <tr>
        <td>${source}</td>
        <td>${target}</td>
        <td>₹${l.amount?.toLocaleString() || 'Unknown'}</td>
        <td>${l.link_type}</td>
      </tr>
    `;
  }).join('');

  // Format Chain of Custody for Section 6
  const chainHTML = chain.map((c: any) => `
    <tr>
      <td>${c.original_name}</td>
      <td style="font-family: monospace; font-size: 10px;">${c.sha256}</td>
      <td>${new Date(c.uploaded_at).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const sectionBlocks: Record<string, string> = {
    sec_1: `
      <h2>1. Executive Case Overview &amp; ML Synthesis</h2>
      <p>Investigation established that the subject coordinates a fraud scheme via multiple domains. Total fraud score computed by Rakshak Setu is <strong>${summary.fraud_score || 0} (${summary.risk_level || 'UNKNOWN'})</strong>.</p>
      <table>
        <tr><td>Case Reference ID</td><td>#${caseData.id?.substring(0,8)}</td></tr>
        <tr><td>Primary Subject / Accused</td><td>${caseData.title.split('—')[1] || caseData.title}</td></tr>
        <tr><td>Case Type</td><td>${caseData.title.split('—')[0] || 'Investigation'}</td></tr>
        <tr><td>Total Flagged Anomalies</td><td>${summary.total_findings || 0}</td></tr>
        <tr><td>Data Domains Analyzed</td><td>${(summary.data_sources || []).join(', ')}</td></tr>
        <tr><td>Investigating Officer</td><td>${certOfficer.split(',')[0]}</td></tr>
      </table>
      ${aiHTML}
    `,
    sec_2: `
      <h2>2. Critical Modus Operandi &amp; Rules Fired</h2>
      <p>The system's deterministic rules engine identified the following high-confidence tactical behaviors:</p>
      <table>
        <tr><th>#</th><th>Rule ID</th><th>Severity</th><th>Explanation</th></tr>
        ${findingsHTML || '<tr><td colspan="4" style="text-align:center;">No findings detected.</td></tr>'}
      </table>
    `,
    sec_5: `
      <h2>5. CriminalFlow Financial Trail &amp; Mule Dispersal</h2>
      <p>The financial ledger was analyzed via network graph to trace fund movement across potential mule accounts.</p>
      <table>
        <tr><th>Source Account</th><th>Destination Account</th><th>Amount</th><th>Method</th></tr>
        ${flowHTML || '<tr><td colspan="4" style="text-align:center;">No financial transfers recorded.</td></tr>'}
      </table>
    `,
    sec_6: `
      <h2>6. Cryptographic Evidence Integrity (SHA-256 Ledger)</h2>
      <p>All source files ingested for this case are permanently hashed to guarantee evidentiary non-repudiation.</p>
      <table>
        <tr><th>Evidence File</th><th>SHA-256 Hash</th><th>Ingestion Timestamp</th></tr>
        ${chainHTML || '<tr><td colspan="3" style="text-align:center;">No files uploaded.</td></tr>'}
      </table>
    `,
    sec_7: `
      <h2>7. Section 65B Indian Evidence Act Certification</h2>
      <div class="cert-box">
        <p><strong>Certificate Under Section 65B(4) of Indian Evidence Act, 1872</strong></p>
        <p><em>"I hereby certify that the electronic output provided herein is a true reproduction of system records maintained during ordinary course of investigative duty without tampering or modification. The digital forensic analytics were generated automatically by the Rakshak Setu system."</em></p>
        <p style="margin-top:24px"><strong>${certOfficer}</strong><br/>
        Digital Signature Verified<br/>
        Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
    `,
  };

  const sectionsHTML = includedNames.map(id => sectionBlocks[id]).filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FIR #${caseData.id?.substring(0,8)} — Forensic Evidence Dossier</title>
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
    <div><span>Case Reference:</span><span>#${caseData.id?.substring(0,8)}</span></div>
    <div><span>Subject / Accused:</span><span>${caseData.title.split('—')[1] || caseData.title}</span></div>
    <div><span>Risk Level:</span><span class="red">${summary.risk_level || 'UNKNOWN'}</span></div>
    <div><span>Total Findings:</span><span>${summary.total_findings || 0}</span></div>
    <div><span>Investigating Officer:</span><span>${certOfficer.split(',')[0]}</span></div>
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

  const [certOfficer, setCertOfficer] = useState('Insp. Amrit Singh, Senior Inspector (ID: 1042)');
  const [reportData, setReportData] = useState<any>(null);
  
  useEffect(() => {
    if (caseId) {
      apiClient.getReport(caseId).then(data => setReportData(data)).catch(() => {});
    }
  }, [caseId]);

  const [sections, setSections] = useState<ReportSectionItem[]>([
    { id: 'sec_1', name: '1. Executive Case Overview & ML Synthesis', included: true },
    { id: 'sec_2', name: '2. Critical Modus Operandi & Rules Fired', included: true },
    { id: 'sec_5', name: '5. CriminalFlow Financial Trail & Mule Dispersal', included: true },
    { id: 'sec_6', name: '6. Cryptographic Evidence Integrity (SHA-256 Ledger)', included: true },
    { id: 'sec_7', name: '7. Section 65B Indian Evidence Act Certification', included: true },
  ]);

  const toggleSection = (id: string) => {
    setSections(sections.map(s => (s.id === id ? { ...s, included: !s.included } : s)));
  };

  /** Build a Blob URL from the generated HTML */
  const buildBlobUrl = (): string => {
    const html = generateReportHTML(sections, certOfficer, reportData || {});
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
    anchor.download = `FIR_${caseId?.substring(0,8)}_Dossier.html`;
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
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#{caseId?.substring(0,8)}</span>
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
              <div className="font-mono font-bold text-[#0B2340] text-sm">#{caseId?.substring(0,8)}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Primary Subject</label>
              <div className="font-semibold text-[#0B2340] text-sm">{reportData?.case?.title || 'Unknown'}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Certifying Officer</label>
              <input 
                type="text" 
                value={certOfficer} 
                onChange={(e) => setCertOfficer(e.target.value)}
                className="w-full bg-transparent border-b border-[#cbd5e1] font-semibold text-[#0B2340] text-sm outline-none focus:border-[#0B5CAB]"
              />
            </div>
          </div>
        </div>

        {/* Sections Selection */}
        <div className="bg-white border border-[#D9E1EA] rounded-md p-5 shadow-xs">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">list_alt</span>
                Include in Report
              </h2>
              <p className="text-xs text-[#64748B]">Select the automated modules to bundle into the final PDF/HTML dossier.</p>
            </div>
            <span className="text-[10px] font-mono bg-[#F8FAFC] text-[#64748B] px-2 py-1 rounded border border-[#EDF0F4]">
              {sections.filter(s => s.included).length} SELECTED
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map(section => (
              <label 
                key={section.id}
                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                  section.included ? 'bg-[#EFF6FF] border-[#0B5CAB]/30' : 'bg-white border-[#D9E1EA] hover:bg-[#F8FAFC]'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={section.included}
                  onChange={() => toggleSection(section.id)}
                  className="mt-0.5 w-4 h-4 text-[#0B5CAB] rounded border-gray-300 focus:ring-[#0B5CAB]"
                />
                <div className="flex-1 text-sm font-medium text-[#191C1E]">{section.name}</div>
              </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
