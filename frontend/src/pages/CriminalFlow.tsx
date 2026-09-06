import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { MoneyFlowData, MoneyFlowNode, MoneyFlowEdge } from '../types/api';

import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

// Role→ colour mapping
const ROLE_COLOR: Record<string, string> = {
  VICTIM:   '#64748B',
  MULE:     '#DC2626',
  SUSPECT:  '#7C3AED',
  UNKNOWN:  '#F97316',
};

const roleColor = (role: string) => ROLE_COLOR[role?.toUpperCase()] ?? '#64748B';

export const CriminalFlow: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [flowData, setFlowData] = useState<MoneyFlowData | null>(null);
  const [selectedNode, setSelectedNode] = useState<MoneyFlowNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (caseId) loadFlow();
  }, [caseId]);

  const loadFlow = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getCriminalFlow(caseId!);
      setFlowData(data);
      if (data.nodes.length > 0) setSelectedNode(data.nodes[0]);
    } catch {
      showToast('Failed to load criminal flow data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportGraph = () => {
    const json = JSON.stringify(flowData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `criminalflow_case_${caseId}_money_trail.json`;
    a.click();
    showToast('Exported CriminalFlow money trail graph data.', 'success');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-[#64748B] text-sm">Loading money trail...</span>
      </div>
    );
  }

  if (!flowData || flowData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">account_tree</span>
        <div>
          <p className="font-bold text-[#0B2340]">No financial data found</p>
          <p className="text-sm text-[#64748B] mt-1">Upload bank statements or CDR files to build the money trail for Case #{caseId?.substring(0, 8)}.</p>
        </div>
        <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
          Upload Evidence
        </Button>
      </div>
    );
  }

  const nodes = flowData.nodes;
  const edges = flowData.edges;

  // Arrange nodes in a layered layout
  const totalNodes = nodes.length;
  const canvasW = Math.max(780, totalNodes * 180);
  const canvasH = 560;
  const nodeW = 200;
  const nodeH = 80;

  // Place nodes in a horizontal fan
  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    // Sort by total_sent descending (higher role = earlier in chain)
    const xStep = canvasW / (totalNodes + 1);
    const row = i % 3;
    nodePositions[n.id] = {
      x: xStep * (i + 1) - nodeW / 2,
      y: 40 + row * (nodeH + 60),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Context Header */}
      <header className="bg-white border border-[#D9E1EA] rounded-md px-5 py-3 flex flex-wrap justify-between items-center gap-3 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-0.5">
            Case #{caseId?.substring(0, 8)} — CriminalFlow Analysis
          </div>
          <h1 className="text-xl font-bold text-[#191C1E] flex items-center gap-2">
            <span className="text-[#0B5CAB]">Money Trail & Financial Network</span>
            <span className="text-xs font-normal text-[#64748B] font-mono">
              {nodes.length} accounts · {edges.length} transactions
            </span>
          </h1>
        </div>
        <Button variant="secondary" size="sm" icon="download" onClick={handleExportGraph}>
          Export Graph
        </Button>
      </header>

      <div className="flex gap-4">
        {/* Canvas */}
        <div className="flex-1 h-[560px]">
          <section className="h-full bg-[#F8FAFC] border border-[#D9E1EA] rounded-md relative overflow-hidden flex flex-col shadow-xs select-none">
            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-4 z-20 bg-white border border-[#D9E1EA] rounded shadow-sm flex flex-col">
              <button onClick={() => setZoom(z => Math.min(z + 0.15, 1.8))} className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]" title="Zoom In">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
              <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.4))} className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]" title="Zoom Out">
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <button onClick={() => setZoom(1)} className="p-2 hover:bg-slate-100 text-[#191C1E]" title="Reset">
                <span className="material-symbols-outlined text-[18px]">fit_screen</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
              <div
                className="relative transition-transform duration-100"
                style={{ width: canvasW, height: canvasH, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              >
                {/* SVG Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <marker id="arrow-red" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="8" refY="5" viewBox="0 0 10 10">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626" />
                    </marker>
                    <marker id="arrow-slate" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="8" refY="5" viewBox="0 0 10 10">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
                    </marker>
                  </defs>
                  {edges.map((e: MoneyFlowEdge, i: number) => {
                    const sp = nodePositions[e.source];
                    const tp = nodePositions[e.target];
                    if (!sp || !tp) return null;
                    const x1 = sp.x + nodeW / 2;
                    const y1 = sp.y + nodeH;
                    const x2 = tp.x + nodeW / 2;
                    const y2 = tp.y;
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2;
                    const isBig = e.amount > 10000;
                    return (
                      <g key={i}>
                        <path
                          d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                          fill="none"
                          stroke={isBig ? '#DC2626' : '#94A3B8'}
                          strokeWidth={isBig ? 3 : 1.5}
                          strokeDasharray={isBig ? 'none' : '4,4'}
                          markerEnd={`url(#${isBig ? 'arrow-red' : 'arrow-slate'})`}
                        />
                        <rect x={mx - 35} y={my - 11} width={70} height={20} rx={4} fill="white" stroke="#D9E1EA" strokeWidth={1} />
                        <text x={mx} y={my + 4} textAnchor="middle" fill={isBig ? '#DC2626' : '#424751'} fontSize={10} fontWeight={isBig ? 'bold' : 'normal'} fontFamily="monospace">
                          ₹{e.amount.toLocaleString()}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Node Cards */}
                {nodes.map((n: MoneyFlowNode) => {
                  const pos = nodePositions[n.id];
                  if (!pos) return null;
                  const color = roleColor(n.role);
                  const isSelected = selectedNode?.id === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNode(n)}
                      className={`absolute bg-white border-2 rounded-md shadow-xs overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-offset-1 ring-[#0B5CAB]' : ''
                      }`}
                      style={{
                        left: pos.x,
                        top: pos.y,
                        width: nodeW,
                        borderColor: color,
                      }}
                    >
                      <div className="px-2.5 py-1 border-b border-[#D9E1EA] flex justify-between items-center" style={{ backgroundColor: `${color}18` }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{n.role || 'ACCOUNT'}</span>
                        <span className="text-[9px] font-mono text-[#64748B]">{n.entity_type}</span>
                      </div>
                      <div className="p-2.5">
                        <div className="font-bold text-xs text-[#191C1E] truncate">{n.canonical_value}</div>
                        <div className="flex justify-between mt-1.5 font-mono text-[10px]">
                          <span className="text-[#16A34A]">IN ₹{n.total_received.toLocaleString()}</span>
                          <span className="text-[#DC2626]">OUT ₹{n.total_sent.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Side Panel */}
        {selectedNode && (
          <div className="w-64 shrink-0">
            <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[#D9E1EA] bg-[#F8FAFC]">
                <p className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">Selected Node</p>
                <p className="font-bold text-sm text-[#191C1E] mt-0.5 truncate">{selectedNode.canonical_value}</p>
              </div>
              <div className="divide-y divide-[#EDF0F4] text-xs">
                {[
                  ['Role', selectedNode.role || 'UNKNOWN'],
                  ['Type', selectedNode.entity_type],
                  ['Total Received', `₹${selectedNode.total_received.toLocaleString()}`],
                  ['Total Sent', `₹${selectedNode.total_sent.toLocaleString()}`],
                  ['Net Flow', `₹${(selectedNode.total_received - selectedNode.total_sent).toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3 py-2">
                    <span className="text-[#64748B]">{k}</span>
                    <span className="font-mono font-semibold text-[#191C1E]">{v}</span>
                  </div>
                ))}
              </div>
              {/* Linked transactions */}
              <div className="px-3 py-2 border-t border-[#D9E1EA]">
                <p className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider mb-1.5">Linked Transactions</p>
                {edges.filter((e: MoneyFlowEdge) => e.source === selectedNode.id || e.target === selectedNode.id).slice(0, 5).map((e: MoneyFlowEdge, i: number) => (
                  <div key={i} className="text-[10px] font-mono text-[#424751] flex justify-between py-0.5">
                    <span className={e.source === selectedNode.id ? 'text-[#DC2626]' : 'text-[#16A34A]'}>
                      {e.source === selectedNode.id ? '↑ OUT' : '↓ IN'}
                    </span>
                    <span>₹{e.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
