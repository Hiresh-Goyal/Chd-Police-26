import React, { useState } from 'react';
import { MONEY_TRAIL_NODES, FlowNode } from '../data/mockData';
import { AnalysisNav } from '../components/shell/AnalysisNav';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

export const CriminalFlow: React.FC = () => {
  const { showToast } = useToast();

  const [selectedNode, setSelectedNode] = useState<FlowNode>(MONEY_TRAIL_NODES[1]); // Default Layer 1 Mule
  const [isWarrantModalOpen, setIsWarrantModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [warrantNotes, setWarrantNotes] = useState('');

  const handleExportGraph = () => {
    const json = JSON.stringify(MONEY_TRAIL_NODES, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'criminalflow_case_2847_money_trail.json';
    a.click();
    showToast('Exported CriminalFlow money trail graph data.', 'success');
  };

  const handleRequestWarrants = (e: React.FormEvent) => {
    e.preventDefault();
    setIsWarrantModalOpen(false);
    showToast('Freezing orders & Section 91 CrPC notice generated for magistrate endorsement.', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Context Header */}
      <header className="bg-white border border-[#D9E1EA] rounded-md px-5 py-3 flex flex-wrap justify-between items-center gap-3 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-0.5">
            Active Case: #2847 — Investment Scam
          </div>
          <h1 className="text-xl font-bold text-[#191C1E] flex items-center gap-2">
            <span>Rajesh Verma</span>
            <span className="text-[#94A3B8]">/</span>
            <span className="text-[#0B5CAB]">Money Trail & CriminalFlow Analysis</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon="download" onClick={handleExportGraph}>
            Export Graph
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="gavel"
            onClick={() => setIsWarrantModalOpen(true)}
          >
            Request Warrants
          </Button>
        </div>
      </header>

      {/* Analysis Tabs */}
      <AnalysisNav />

      {/* Split View Container (70% Canvas + 30% Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px] items-stretch">
        {/* Left: Interactive Financial Flow Canvas (8 cols / ~70%) */}
        <section className="lg:col-span-8 bg-[#F8FAFC] grid-pattern border border-[#D9E1EA] rounded-md relative overflow-hidden flex flex-col shadow-xs select-none">
          {/* Zoom/Pan Controls Overlay */}
          <div className="absolute bottom-4 left-4 z-20 bg-white border border-[#D9E1EA] rounded shadow-sm flex flex-col">
            <button
              onClick={() => setZoom(z => Math.min(z + 0.15, 1.6))}
              className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]"
              title="Zoom In"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.15, 0.6))}
              className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]"
              title="Zoom Out"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 hover:bg-slate-100 text-[#191C1E]"
              title="Reset Zoom"
            >
              <span className="material-symbols-outlined text-[18px]">fit_screen</span>
            </button>
          </div>

          {/* Canvas View Container (Scrollable) */}
          <div className="flex-1 overflow-auto custom-scrollbar p-6 flex justify-center items-start pt-8">
            <div
              className="relative w-[780px] h-[780px] transition-transform duration-100"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            >
              {/* SVG Flow Edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <marker id="flow-arrow-red" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="8" refY="5" viewBox="0 0 10 10">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626" />
                  </marker>
                  <marker id="flow-arrow-slate" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="8" refY="5" viewBox="0 0 10 10">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
                  </marker>
                </defs>

                {/* Victim to Mule 1 (₹4,82,000) */}
                <path d="M 390 100 L 390 190" fill="none" stroke="#DC2626" strokeWidth="5" markerEnd="url(#flow-arrow-red)" />
                <rect x="350" y="130" width="80" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="390" y="145" textAnchor="middle" fill="#DC2626" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">₹4,82,000</text>

                {/* Mule 1 to Mule 2 (₹48,000) */}
                <path d="M 350 310 C 350 360, 220 360, 220 410" fill="none" stroke="#DC2626" strokeWidth="4" markerEnd="url(#flow-arrow-red)" />
                <rect x="235" y="345" width="75" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="272" y="360" textAnchor="middle" fill="#DC2626" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">₹48,000</text>

                {/* Mule 1 to UPI Dispersal (₹4,34,000) */}
                <path d="M 430 310 C 430 360, 560 360, 560 410" fill="none" stroke="#64748B" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#flow-arrow-slate)" />
                <rect x="475" y="345" width="80" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="515" y="360" textAnchor="middle" fill="#424751" fontFamily="JetBrains Mono" fontSize="11">₹4,34,000</text>

                {/* Mule 2 to ATM Cash-out (₹47,500) */}
                <path d="M 220 530 L 220 610" fill="none" stroke="#DC2626" strokeWidth="4" markerEnd="url(#flow-arrow-red)" />
                <rect x="180" y="555" width="80" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="220" y="570" textAnchor="middle" fill="#DC2626" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">₹47,500</text>
              </svg>

              {/* Node 1: Victim Source */}
              <div
                onClick={() => setSelectedNode(MONEY_TRAIL_NODES[0])}
                className="absolute top-[10px] left-[250px] w-[280px] bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden cursor-pointer hover:border-[#0B5CAB] transition-colors"
              >
                <div className="bg-[#F8FAFC] px-3 py-1.5 border-b border-[#D9E1EA] flex justify-between items-center text-xs">
                  <span className="font-bold text-[#64748B] uppercase text-[10px]">Victim Source</span>
                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">person</span>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-[#191C1E]">VICTIM-001 (SBI XXXXXXX1190)</div>
                  <div className="font-mono text-xs text-[#0B5CAB] font-semibold mt-1">
                    Entering: ₹4,82,000 Outflow
                  </div>
                </div>
              </div>

              {/* Node 2: Layer 1 Mule (Rajesh Verma) */}
              <div
                onClick={() => setSelectedNode(MONEY_TRAIL_NODES[1])}
                className={`absolute top-[190px] left-[250px] w-[280px] bg-white border-2 rounded-md shadow-md overflow-hidden cursor-pointer transition-all ${
                  selectedNode.id === 'node_mule1'
                    ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20'
                    : 'border-[#DC2626]'
                }`}
              >
                <div className="bg-[#DC2626]/10 px-3 py-1.5 border-b border-[#D9E1EA] flex justify-between items-center text-xs">
                  <span className="font-bold text-[#DC2626] uppercase text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Layer 1 Mule
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#DC2626] text-white text-[9px] font-bold rounded font-mono">
                    RISK: 91
                  </span>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-[#191C1E]">HDFC XXXXXXX4521</div>
                  <div className="text-xs text-[#64748B] mt-0.5">Owner: Rajesh Verma</div>
                  <div className="flex justify-between items-center border-t border-[#EDF0F4] pt-2 mt-2 font-mono text-xs">
                    <span className="text-[#64748B]">Received</span>
                    <span className="font-bold text-[#191C1E]">₹4,82,000</span>
                  </div>
                </div>
              </div>

              {/* Node 3: Layer 2 Mule */}
              <div
                onClick={() => setSelectedNode(MONEY_TRAIL_NODES[2])}
                className={`absolute top-[410px] left-[80px] w-[280px] bg-white border-2 rounded-md shadow-xs overflow-hidden cursor-pointer transition-all ${
                  selectedNode.id === 'node_mule2' ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20' : 'border-[#DC2626]/60'
                }`}
              >
                <div className="bg-[#DC2626]/5 px-3 py-1.5 border-b border-[#DC2626]/20 flex justify-between items-center text-xs">
                  <span className="font-bold text-[#DC2626] uppercase text-[10px]">Layer 2 Mule</span>
                  <span className="px-1.5 py-0.2 bg-[#7C3AED] text-white text-[9px] font-bold rounded font-mono">
                    RISK: 86
                  </span>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-[#191C1E]">HDFC XXXXXXX7832</div>
                  <div className="text-xs text-[#DC2626] font-semibold mt-0.5">Status: Active Splitting</div>
                  <div className="flex justify-between items-center border-t border-[#EDF0F4] pt-2 mt-2 font-mono text-xs">
                    <span className="text-[#64748B]">Received</span>
                    <span className="font-bold text-[#DC2626]">₹48,000</span>
                  </div>
                </div>
              </div>

              {/* Node 4: Secondary UPI Distribution */}
              <div
                onClick={() => setSelectedNode(MONEY_TRAIL_NODES[3])}
                className={`absolute top-[410px] left-[420px] w-[280px] bg-white border rounded-md shadow-xs overflow-hidden cursor-pointer opacity-85 hover:opacity-100 transition-all ${
                  selectedNode.id === 'node_upi' ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20' : 'border-[#D9E1EA]'
                }`}
              >
                <div className="bg-[#F8FAFC] px-3 py-1.5 border-b border-[#D9E1EA] flex justify-between items-center text-xs">
                  <span className="font-bold text-[#64748B] uppercase text-[10px]">Secondary Distribution</span>
                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">call_split</span>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-[#191C1E]">Multiple UPI Handlers</div>
                  <div className="text-xs text-[#64748B] font-mono mt-0.5">14 Distinct Accounts</div>
                  <div className="flex justify-between items-center border-t border-[#EDF0F4] pt-2 mt-2 font-mono text-xs">
                    <span className="text-[#64748B]">Dispersed</span>
                    <span className="font-bold text-[#191C1E]">₹4,34,000</span>
                  </div>
                </div>
              </div>

              {/* Node 5: Terminal Node (ATM) */}
              <div
                onClick={() => setSelectedNode(MONEY_TRAIL_NODES[4])}
                className={`absolute top-[610px] left-[80px] w-[280px] bg-white border-2 rounded-md shadow-md overflow-hidden cursor-pointer transition-all ${
                  selectedNode.id === 'node_atm' ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20' : 'border-[#F97316]'
                }`}
              >
                <div className="bg-[#F97316]/10 px-3 py-1.5 border-b border-[#F97316]/30 flex justify-between items-center text-xs">
                  <span className="font-bold text-[#F97316] uppercase text-[10px]">Terminal Node</span>
                  <span className="material-symbols-outlined text-[16px] text-[#F97316]">local_atm</span>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-[#191C1E]">Sector 22 ATM (SIB8922)</div>
                  <div className="text-xs text-[#64748B] mt-0.5 font-mono">15:10 IST • Cash-out</div>
                  <div className="font-mono text-sm font-bold text-[#DC2626] mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    ₹47,500 Cash
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Inspector & Freeze Priority (4 cols / ~30%) */}
        <aside className="lg:col-span-4 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
          {/* Freeze Priority Panel (Top Half) */}
          <div className="border-b border-[#D9E1EA] flex flex-col h-[280px]">
            <div className="px-4 py-2.5 border-b border-[#D9E1EA] bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#DC2626] text-[16px]">ac_unit</span>
                Freeze Priority Queue
              </h2>
              <span className="text-[10px] font-mono text-[#DC2626] bg-[#DC2626]/10 px-1.5 py-0.5 rounded font-bold">
                EMERGENCY
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F5F7FA] border-b border-[#D9E1EA] text-[10px] font-bold text-[#64748B] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Pri</th>
                    <th className="py-2 px-3">Account</th>
                    <th className="py-2 px-3 text-right">Retained Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0F4] font-mono">
                  <tr
                    onClick={() => setSelectedNode(MONEY_TRAIL_NODES[2])}
                    className="bg-[#DC2626]/5 hover:bg-[#DC2626]/10 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3">
                      <span className="bg-[#DC2626] text-white font-bold text-[10px] px-1.5 py-0.5 rounded">P1</span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#191C1E]">HDFC 7832</td>
                    <td className="py-2 px-3 text-right font-bold text-[#DC2626]">₹48,000</td>
                  </tr>

                  <tr
                    onClick={() => setSelectedNode(MONEY_TRAIL_NODES[1])}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3">
                      <span className="bg-[#DC2626] text-white font-bold text-[10px] px-1.5 py-0.5 rounded">P1</span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#191C1E]">HDFC 4521</td>
                    <td className="py-2 px-3 text-right font-bold text-[#DC2626]">₹48,000</td>
                  </tr>

                  <tr className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="py-2 px-3">
                      <span className="bg-[#F97316] text-white font-bold text-[10px] px-1.5 py-0.5 rounded">P2</span>
                    </td>
                    <td className="py-2 px-3 text-[#334155]">SBI 9921</td>
                    <td className="py-2 px-3 text-right text-[#191C1E]">₹12,400</td>
                  </tr>

                  <tr className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="py-2 px-3">
                      <span className="bg-slate-200 text-[#475569] font-bold text-[10px] px-1.5 py-0.5 rounded">P3</span>
                    </td>
                    <td className="py-2 px-3 text-[#64748B]">ICICI 4410</td>
                    <td className="py-2 px-3 text-right text-[#64748B]">₹0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Account Detail Inspector (Bottom Half) */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar gap-3 text-xs">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-2">
              <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[#0B5CAB] text-[16px]">manage_search</span>
                Detail Inspector
              </h3>
              <span className="font-mono text-[10px] text-[#0B5CAB] bg-[#EFF6FF] px-2 py-0.5 rounded font-bold">
                {selectedNode.accountNo}
              </span>
            </div>

            {/* Metadata Box */}
            <div className="bg-[#F8FAFC] border border-[#D9E1EA] rounded p-2.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Owner Name:</span>
                <span className="font-semibold text-[#191C1E]">{selectedNode.owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Traced Volume:</span>
                <span className="font-mono font-bold text-[#DC2626]">{selectedNode.amount}</span>
              </div>
              {selectedNode.ipAddress && (
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Associated IP:</span>
                  <span className="font-mono text-[#0B5CAB]">{selectedNode.ipAddress}</span>
                </div>
              )}
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="text-[10px] font-bold text-[#424751] uppercase tracking-wider mb-1.5">Risk Flags</h4>
              <div className="space-y-1 text-[11px]">
                <div className="p-1.5 rounded bg-red-50 text-[#DC2626] border border-red-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Rapid in-and-out transfers (High Velocity)
                </div>
                <div className="p-1.5 rounded bg-amber-50 text-[#B45309] border border-amber-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  Mismatched KYC documents flagged
                </div>
              </div>
            </div>

            {/* Forensic Provenance */}
            <div>
              <h4 className="text-[10px] font-bold text-[#424751] uppercase tracking-wider mb-1">Forensic Provenance</h4>
              <div className="p-2 rounded bg-slate-100 border border-[#D9E1EA] font-mono text-[10px] text-[#424751] break-all">
                {selectedNode.sourceProvenance}
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="mt-auto"
              onClick={() => showToast(`Opening ledger statements for ${selectedNode.accountNo}.`, 'info')}
            >
              View Full Account Ledger
            </Button>
          </div>
        </aside>
      </div>

      {/* Request Warrants Modal */}
      <Modal
        isOpen={isWarrantModalOpen}
        onClose={() => setIsWarrantModalOpen(false)}
        title="Request Judicial Freeze Orders & Section 91 Warrants"
        subtitle="Expedited requisition for mule accounts HDFC 4521 and HDFC 7832."
        icon="gavel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsWarrantModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRequestWarrants}>
              Issue Emergency Freeze Warrant
            </Button>
          </>
        }
      >
        <form onSubmit={handleRequestWarrants} className="space-y-3 text-xs">
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-900">
            <span className="font-bold block mb-1">Target Accounts for Immediate Lien:</span>
            <ul className="list-disc pl-4 font-mono text-[11px] space-y-0.5">
              <li>HDFC Bank: XXXXXXX4521 (Rajesh Verma) — Amount: ₹48,000</li>
              <li>HDFC Bank: XXXXXXX7832 (Layer 2 Mule) — Amount: ₹48,000</li>
            </ul>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#424751] uppercase mb-1">
              Investigative Justification
            </label>
            <textarea
              rows={3}
              required
              value={warrantNotes}
              onChange={e => setWarrantNotes(e.target.value)}
              placeholder="State reasonable suspicion of proceeds of crime under IPC Section 420 / IT Act..."
              className="w-full p-2.5 border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
            />
          </div>

          <div className="text-[11px] text-[#64748B]">
            Authorizing Officer: <strong>Insp. Amrit Singh (ID: 1042)</strong> • Sector 17 Police Station
          </div>
        </form>
      </Modal>
    </div>
  );
};
