import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CriminalFlowNode, CriminalFlowEdge } from '../types/api';
import { useCaseStore } from '../context/CaseStore';
import { useCriminalFlow } from '../hooks/useCriminalFlow';

import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const CriminalFlow: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { getCaseFiles } = useCaseStore();

  const uploadedFiles = getCaseFiles(caseId ?? '');
  const hasUploads = uploadedFiles.filter(f => f.status === 'complete' && (f.domain === 'BANK' || f.domain === 'CDR')).length > 0;

  const { data: flowData, loading } = useCriminalFlow(caseId ?? '');
  const flowNodes: CriminalFlowNode[] = flowData?.nodes ?? [];
  const flowEdges: CriminalFlowEdge[] = flowData?.edges ?? [];

  const [selectedNode, setSelectedNode] = useState<CriminalFlowNode | null>(null);
  const [zoom, setZoom] = useState(1);

  // Set default selection when data loads
  React.useEffect(() => {
    if (flowNodes.length > 1 && !selectedNode) {
      setSelectedNode(flowNodes[1] as any);
    }
  }, [flowNodes]);

  // Helper: find the edge amount between two node indices
  const edgeAmount = (srcIdx: number, tgtIdx: number): string => {
    const src = flowNodes[srcIdx];
    const tgt = flowNodes[tgtIdx];
    if (!src || !tgt) return '₹0';
    const edge = flowEdges.find(e => e.source === src.id && e.target === tgt.id);
    const amt = edge?.amount ?? 0;
    return `₹${(amt / 1000).toFixed(0)}k`;
  };

  const handleExportGraph = () => {
    const json = JSON.stringify({ nodes: flowNodes, edges: flowEdges }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `criminalflow_case_${caseId}_money_trail.json`;
    a.click();
    showToast('Exported CriminalFlow money trail graph data.', 'success');
  };

  // Empty state for new cases with no bank/CDR uploads
  if (!loading && flowNodes.length === 0 && !hasUploads) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">account_tree</span>
        <div>
          <p className="font-bold text-[#0B2340]">No financial data uploaded yet</p>
          <p className="text-sm text-[#64748B] mt-1">Upload bank statements or CDR files to build the money trail for Case #{caseId}.</p>
        </div>
        <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
          Upload Evidence
        </Button>
      </div>
    );
  }



  return (
    <div className="flex flex-col gap-4">
      {/* Context Header */}
      <header className="bg-white border border-[#D9E1EA] rounded-md px-5 py-3 flex flex-wrap justify-between items-center gap-3 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-0.5">
            Active Case: #{caseId} — Money Trail
          </div>
          <h1 className="text-xl font-bold text-[#191C1E] flex items-center gap-2">
            <span>{flowNodes[0]?.label ?? 'Subject'}</span>
            <span className="text-[#94A3B8]">/</span>
            <span className="text-[#0B5CAB]">Money Trail & CriminalFlow Analysis</span>
          </h1>
        </div>

        <Button variant="secondary" size="sm" icon="download" onClick={handleExportGraph}>
          Export Graph
        </Button>
      </header>

      {/* Full-width Canvas */}
      <div className="h-[720px]">
        <section className="h-full bg-[#F8FAFC] grid-pattern border border-[#D9E1EA] rounded-md relative overflow-hidden flex flex-col shadow-xs select-none">
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

                {/* Victim to Mule 1 */}
                <path d="M 390 100 L 390 190" fill="none" stroke="#DC2626" strokeWidth="5" markerEnd="url(#flow-arrow-red)" />
                <rect x="350" y="130" width="80" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="390" y="145" textAnchor="middle" fill="#DC2626" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">{edgeAmount(0, 1)}</text>

                {/* Mule 1 to Mule 2 */}
                <path d="M 350 310 C 350 360, 220 360, 220 410" fill="none" stroke="#DC2626" strokeWidth="4" markerEnd="url(#flow-arrow-red)" />
                <rect x="235" y="345" width="75" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="272" y="360" textAnchor="middle" fill="#DC2626" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">{edgeAmount(1, 2)}</text>

                {/* Mule 1 to UPI Dispersal */}
                <path d="M 430 310 C 430 360, 560 360, 560 410" fill="none" stroke="#64748B" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#flow-arrow-slate)" />
                <rect x="475" y="345" width="80" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="515" y="360" textAnchor="middle" fill="#424751" fontFamily="JetBrains Mono" fontSize="11">{edgeAmount(1, 3)}</text>

                {/* Mule 2 to ATM Cash-out */}
                <path d="M 220 530 L 220 610" fill="none" stroke="#DC2626" strokeWidth="4" markerEnd="url(#flow-arrow-red)" />
                <rect x="180" y="555" width="80" height="22" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                <text x="220" y="570" textAnchor="middle" fill="#DC2626" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">{edgeAmount(2, 4)}</text>
              </svg>

              {/* Node 1: Victim Source */}
              {flowNodes?.[0] && (
                <div
                  onClick={() => setSelectedNode(flowNodes[0])}
                  className="absolute top-[10px] left-[250px] w-[280px] bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden cursor-pointer hover:border-[#0B5CAB] transition-colors"
                >
                  <div className="bg-[#F8FAFC] px-3 py-1.5 border-b border-[#D9E1EA] flex justify-between items-center text-xs">
                    <span className="font-bold text-[#64748B] uppercase text-[10px]">{flowNodes[0].label}</span>
                    <span className="material-symbols-outlined text-[16px] text-[#64748B]">person</span>
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-[#191C1E]">{flowNodes[0].account_number ?? '—'}</div>
                    <div className="font-mono text-xs text-[#0B5CAB] font-semibold mt-1">
                      Role: {flowNodes[0].role ?? 'VICTIM'}
                    </div>
                  </div>
                </div>
              )}

              {/* Node 2: Layer 1 Mule */}
              {flowNodes?.[1] && (
                <div
                  onClick={() => setSelectedNode(flowNodes[1])}
                  className={`absolute top-[190px] left-[250px] w-[280px] bg-white border-2 rounded-md shadow-md overflow-hidden cursor-pointer transition-all ${
                    selectedNode?.id === flowNodes[1].id
                      ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20'
                      : 'border-[#DC2626]'
                  }`}
                >
                  <div className="bg-[#DC2626]/10 px-3 py-1.5 border-b border-[#D9E1EA] flex justify-between items-center text-xs">
                    <span className="font-bold text-[#DC2626] uppercase text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {flowNodes[1].label}
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#DC2626] text-white text-[9px] font-bold rounded font-mono">
                      {flowNodes[1].role ?? 'MULE'}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-[#191C1E]">{flowNodes[1].account_number ?? '—'}</div>
                    <div className="flex justify-between items-center border-t border-[#EDF0F4] pt-2 mt-2 font-mono text-xs">
                      <span className="text-[#64748B]">Received</span>
                      <span className="font-bold text-[#191C1E]">{edgeAmount(0, 1)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Node 3: Layer 2 Mule */}
              {flowNodes?.[2] && (
                <div
                  onClick={() => setSelectedNode(flowNodes[2])}
                  className={`absolute top-[410px] left-[80px] w-[280px] bg-white border-2 rounded-md shadow-xs overflow-hidden cursor-pointer transition-all ${
                    selectedNode?.id === flowNodes[2].id ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20' : 'border-[#DC2626]/60'
                  }`}
                >
                  <div className="bg-[#DC2626]/5 px-3 py-1.5 border-b border-[#DC2626]/20 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#DC2626] uppercase text-[10px]">{flowNodes[2].label}</span>
                    <span className="px-1.5 py-0.2 bg-[#7C3AED] text-white text-[9px] font-bold rounded font-mono">
                      {flowNodes[2].role ?? 'MULE'}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-[#191C1E]">{flowNodes[2].account_number ?? '—'}</div>
                    <div className="text-xs text-[#DC2626] font-semibold mt-0.5">Role: {flowNodes[2].role ?? '—'}</div>
                    <div className="flex justify-between items-center border-t border-[#EDF0F4] pt-2 mt-2 font-mono text-xs">
                      <span className="text-[#64748B]">Received</span>
                      <span className="font-bold text-[#DC2626]">{edgeAmount(1, 2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Node 4: Secondary UPI Distribution */}
              {flowNodes?.[3] && (
                <div
                  onClick={() => setSelectedNode(flowNodes[3])}
                  className={`absolute top-[410px] left-[420px] w-[280px] bg-white border rounded-md shadow-xs overflow-hidden cursor-pointer opacity-85 hover:opacity-100 transition-all ${
                    selectedNode?.id === flowNodes[3].id ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20' : 'border-[#D9E1EA]'
                  }`}
                >
                  <div className="bg-[#F8FAFC] px-3 py-1.5 border-b border-[#D9E1EA] flex justify-between items-center text-xs">
                    <span className="font-bold text-[#64748B] uppercase text-[10px]">{flowNodes[3].label}</span>
                    <span className="material-symbols-outlined text-[16px] text-[#64748B]">call_split</span>
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-[#191C1E]">{flowNodes[3].account_number ?? '—'}</div>
                    <div className="text-xs text-[#64748B] font-mono mt-0.5">{flowNodes[3].role ?? '—'}</div>
                    <div className="flex justify-between items-center border-t border-[#EDF0F4] pt-2 mt-2 font-mono text-xs">
                      <span className="text-[#64748B]">Dispersed</span>
                      <span className="font-bold text-[#191C1E]">{edgeAmount(1, 3)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Node 5: Terminal Node (ATM) */}
              {flowNodes?.[4] && (
                <div
                  onClick={() => setSelectedNode(flowNodes[4])}
                  className={`absolute top-[610px] left-[80px] w-[280px] bg-white border-2 rounded-md shadow-md overflow-hidden cursor-pointer transition-all ${
                    selectedNode?.id === flowNodes[4].id ? 'border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20' : 'border-[#F97316]'
                  }`}
                >
                  <div className="bg-[#F97316]/10 px-3 py-1.5 border-b border-[#F97316]/30 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#F97316] uppercase text-[10px]">{flowNodes[4].label}</span>
                    <span className="material-symbols-outlined text-[16px] text-[#F97316]">local_atm</span>
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-[#191C1E]">{flowNodes[4].account_number ?? '—'}</div>
                    <div className="text-xs text-[#64748B] mt-0.5 font-mono">{flowNodes[4].role ?? '—'}</div>
                    <div className="font-mono text-sm font-bold text-[#DC2626] mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      {edgeAmount(2, 4)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>


    </div>
  );
};
