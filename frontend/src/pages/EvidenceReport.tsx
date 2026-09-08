import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { getCaseReport } from '../api/client';


interface ReportSectionItem {
  id: string;
  name: string;
  included: boolean;
}

/* ── helpers ────────────────────────────────────────────────── */

function generateReportHTML(report: any, sections: ReportSectionItem[], certOfficer: string): string {
  const c = report.case;
  const subject = c.entities?.[0]?.name ?? c.name ?? c.title;
  const sectionBlocks: Record<string,string> = {};
  const money = (v:any) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const esc = (v:any) => String(v ?? '—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  sectionBlocks.sec_1 = `<h2>1. Executive Case Overview &amp; Case Details</h2><p>${esc(c.description || 'No case description provided.')}</p><table><tr><td>Case Reference ID</td><td>#${esc(c.id)}</td></tr><tr><td>Case Title</td><td>${esc(c.title)}</td></tr><tr><td>Primary Subject</td><td>${esc(subject)}</td></tr><tr><td>Estimated Defraud Amount</td><td>${money(c.estimated_loss)}</td></tr><tr><td>Primary Incident Date</td><td>${esc(c.incident_date ? new Date(c.incident_date).toLocaleString('en-IN') : '—')}</td></tr><tr><td>Investigating Officer</td><td>${esc(c.assigned_io_name ?? c.assigned_io ?? '—')}</td></tr></table>`;
  sectionBlocks.sec_2 = `<h2>2. Critical Modus Operandi Findings</h2>${report.alerts.length ? `<table><tr><th>Rule</th><th>Severity</th><th>Confidence</th><th>Detail</th></tr>${report.alerts.map((a:any)=>`<tr><td>${esc(a.rule_id)}</td><td>${esc(a.severity)}</td><td>${Number(a.confidence).toFixed(2)}</td><td>${esc(a.explanation)}</td></tr>`).join('')}</table>` : '<p>No findings returned by the backend.</p>'}`;
  sectionBlocks.sec_3 = `<h2>3. Cross-Domain Chronological Timeline</h2>${report.timeline.length ? `<table><tr><th>Time</th><th>Domain</th><th>Event</th></tr>${report.timeline.map((e:any)=>`<tr><td>${esc(e.ts_start)}</td><td>${esc(e.domain ?? e.event_type)}</td><td>${esc(e.title ?? e.event_type)} — ${esc(e.actor_raw)}${e.peer_raw ? ` → ${esc(e.peer_raw)}` : ''}${e.amount != null ? ` — ${money(e.amount)}` : ''}</td></tr>`).join('')}</table>` : '<p>No timeline events returned by the backend.</p>'}`;
  sectionBlocks.sec_4 = `<h2>4. Entity Link Analysis &amp; Multi-Domain Associations</h2>${report.graph.nodes.length ? `<table><tr><th>Entity</th><th>Role</th><th>Domain</th><th>Risk Score</th></tr>${report.graph.nodes.map((n:any)=>`<tr><td>${esc(n.label ?? n.canonical_value)}</td><td>${esc(n.role)}</td><td>${esc(n.domain)}</td><td>${esc(n.risk_score)} / ${esc(n.risk_level)}</td></tr>`).join('')}</table>` : '<p>No resolved entities returned by the backend.</p>'}`;
  sectionBlocks.sec_5 = `<h2>5. CriminalFlow Financial Trail &amp; Mule Dispersal</h2>${report.criminal_flow.edges.length ? `<table><tr><th>From</th><th>To</th><th>Amount</th><th>Method</th></tr>${report.criminal_flow.edges.map((e:any)=>{const f=report.criminal_flow.nodes.find((n:any)=>n.id===e.source);const t=report.criminal_flow.nodes.find((n:any)=>n.id===e.target);return `<tr><td>${esc(f?.label)}</td><td>${esc(t?.label)}</td><td>${money(e.amount)}</td><td>${esc(e.method)}</td></tr>`}).join('')}</table>` : '<p>No financial-flow edges returned by the backend.</p>'}`;
  sectionBlocks.sec_6 = `<h2>6. Cryptographic Evidence Integrity (SHA-256 Ledger)</h2>${report.evidence.length ? `<table><tr><th>Evidence File</th><th>SHA-256 Hash</th><th>Records</th></tr>${report.evidence.map((e:any)=>`<tr><td>${esc(e.filename)}</td><td>${esc(e.hash)}</td><td>${esc(e.records_count)}</td></tr>`).join('')}</table>` : '<p>No evidence files returned by the backend.</p>'}`;
  sectionBlocks.sec_7 = `<h2>7. Section 65B Indian Evidence Act Certification</h2><div class="cert-box"><p><strong>Certificate Under Section 65B(4) of Indian Evidence Act, 1872</strong></p><p><em>"I hereby certify that the electronic output provided herein is a true reproduction of system records maintained during ordinary course of investigative duty without tampering or modification."</em></p><p style="margin-top:24px"><strong>${esc(certOfficer || c.assigned_io_name || c.assigned_io || 'Certifying Authority')}</strong><br/>Generated: ${esc(report.generated_at)}</p></div>`;
  const sectionsHTML = sections.filter(s=>s.included).map(s=>sectionBlocks[s.id] ?? '').join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Case #${esc(c.id)} — Forensic Evidence Dossier</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:40px;max-width:900px;margin:auto}.header{text-align:center;border-bottom:3px solid #0b2340;padding-bottom:20px;margin-bottom:28px}.header h1{font-size:18px;letter-spacing:2px;color:#0b2340;text-transform:uppercase;margin-top:8px}.header .sub{font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-top:4px}.confidential{display:inline-block;margin-top:10px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:3px 10px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase}.meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 18px;margin-bottom:28px;display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}.meta-box div{display:flex;justify-content:space-between;font-size:12px}.meta-box span:first-child{color:#64748b}.meta-box span:last-child{font-weight:700;color:#0b2340}.meta-box .red{color:#dc2626}h2{font-size:13px;font-weight:700;color:#0b2340;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:28px 0 12px}p{color:#374151;line-height:1.7;margin-bottom:10px}table{width:100%;border-collapse:collapse;margin:10px 0 20px;font-size:12px}th{background:#f1f5f9;color:#64748b;font-weight:600;text-align:left;padding:7px 10px;border:1px solid #e2e8f0}td{padding:6px 10px;border:1px solid #e2e8f0;color:#1e293b}tr:nth-child(even) td{background:#f8fafc}.cert-box{border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:20px;margin-top:12px}.footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:10px;color:#94a3b8;text-align:center;letter-spacing:.5px}@media print{body{padding:20px}}</style></head><body><div class="header"><h1>Chandigarh Police Department</h1><div class="sub">Cyber Crime &amp; Forensic Investigation Division</div><div class="confidential">Confidential — For Official Legal Proceedings Only</div></div><div class="meta-box"><div><span>Case Reference:</span><span>#${esc(c.id)}</span></div><div><span>Subject / Accused:</span><span>${esc(subject)}</span></div><div><span>Fraud Score:</span><span class="red">${esc(report.fraud_score.score)} — ${esc(report.fraud_score.risk_level)}</span></div><div><span>Total Defraud Amount:</span><span class="red">${money(c.estimated_loss)}</span></div><div><span>Investigating Officer:</span><span>${esc(c.assigned_io_name ?? c.assigned_io ?? '—')}</span></div><div><span>Report Generated:</span><span>${esc(report.generated_at)}</span></div></div>${sectionsHTML}<div class="footer">Generated by Rakshak Setu — Police Investigative Analytics Platform &nbsp;|&nbsp; CHANDIGARH POLICE DEPARTMENT</div></body></html>`;
}

/* ── component ──────────────────────────────────────────────── */

export const EvidenceReport: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [certOfficer, setCertOfficer] = useState('');
  const [sections, setSections] = useState<ReportSectionItem[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!caseId) { setLoading(false); return; }
    getCaseReport(caseId).then((data) => {
      if (!mounted) return;
      setReport(data);
      setCertOfficer(data.case.assigned_io_name ?? data.case.assigned_io ?? '');
      setSections((data.report_sections ?? []).map((s:any) => ({ id:s.id, name:s.name, included:Boolean(s.available) })));
    }).catch((err) => { if (mounted) setError(err instanceof Error ? err : new Error('Failed to load evidence report.')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [caseId]);

  const toggleSection = (id: string) => {
    setSections(sections.map(s => (s.id === id ? { ...s, included: !s.included } : s)));
  };

  /** Build a Blob URL from the backend-backed report */
  const buildBlobUrl = (): string => {
    if (!report) return '';
    const blob = new Blob([generateReportHTML(report, sections, certOfficer)], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  const handlePreview = () => {
    const url = buildBlobUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Report opened in a new tab.', 'success');
  };

  const handleDownload = () => {
    const url = buildBlobUrl();
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `Case_${caseId}_Evidence_Dossier.html`;
    document.body.appendChild(anchor); anchor.click(); document.body.removeChild(anchor); URL.revokeObjectURL(url);
    showToast('Report downloaded successfully.', 'success');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-sm text-[#64748B]">Loading evidence report…</div>;
  if (error || !report) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-center"><span className="material-symbols-outlined text-4xl text-red-500">error</span><p className="text-sm text-[#424751]">Failed to load evidence report.</p><p className="text-xs text-[#64748B]">{error?.message ?? 'Report unavailable.'}</p></div>;

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">{`#${report.case.id}`}</span>
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
              <div className="font-mono font-bold text-[#0B2340] text-sm">#{report.case.id}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Primary Subject</label>
              <div className="font-bold text-[#0B2340] text-sm">{report.case.entities?.[0]?.name ?? report.case.name ?? report.case.title}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4]">
              <label className="text-[#64748B] block mb-0.5 font-medium">Incident Date</label>
              <div className="font-bold text-[#0B2340] text-sm">{report.case.incident_date ? new Date(report.case.incident_date).toLocaleDateString('en-IN') : '—'}</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded border border-[#EDF0F4] col-span-2 sm:col-span-3">
              <label className="text-[#64748B] block mb-1 font-medium">Investigating Officer (IO)</label>
              <div className="font-semibold text-[#0B2340] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0B2340] text-white flex items-center justify-center text-[9px] font-bold shrink-0">{(report.case.assigned_io_name ?? report.case.assigned_io ?? 'IO').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()}</span>
                {report.case.assigned_io_name ?? report.case.assigned_io ?? '—'}{report.case.assigned_io_role ? ` • ${report.case.assigned_io_role}` : ''}{report.case.assigned_io_station ? ` • ${report.case.assigned_io_station}` : ''}
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
            <span className="text-[#0B5CAB] font-semibold">{`Case_${report.case.id}_Evidence_Dossier.html`}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
