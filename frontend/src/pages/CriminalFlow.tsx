import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CriminalFlowNode, CriminalFlowEdge } from '../types/api';
import { useCase } from '../hooks/useCase';
import { useCriminalFlow } from '../hooks/useCriminalFlow';

import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

type FlowPosition = { x: number; y: number; layer: number };

const CARD_W = 280;
const CARD_H = 126;
const X_GAP = 90;
const Y_GAP = 54;
const PAD_X = 70;
const PAD_TOP = 120;
const PAD_BOTTOM = 80;

const roleIcon = (node: CriminalFlowNode) => {
  if (node.type === 'ATM' || node.role === 'TERMINAL_ATM') return 'local_atm';
  if (node.role === 'VICTIM') return 'person';
  if (node.role === 'MULE') return 'account_balance_wallet';
  if (node.role === 'AGGREGATOR') return 'account_tree';
  return 'account_balance';
};

const roleTone = (node: CriminalFlowNode) => {
  if (node.type === 'ATM' || node.role === 'TERMINAL_ATM') {
    return {
      border: '#F97316',
      bg: '#F97316',
      text: '#F97316',
      soft: '#F97316',
    };
  }
  if (node.role === 'VICTIM' || node.role === 'MULE') {
    return {
      border: '#DC2626',
      bg: '#DC2626',
      text: '#DC2626',
      soft: '#DC2626',
    };
  }
  return {
    border: '#D9E1EA',
    bg: '#F8FAFC',
    text: '#64748B',
    soft: '#64748B',
  };
};

function buildLayout(nodes: CriminalFlowNode[], edges: CriminalFlowEdge[]) {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  nodes.forEach(node => {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  });

  edges.forEach(edge => {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) return;
    outgoing.get(edge.source)!.push(edge.target);
    incoming.get(edge.target)!.push(edge.source);
  });

  // Start from genuine sources. If a graph has a cycle, fall back to the
  // first nodes deterministically and still lay the graph out left-to-right.
  const roots = nodes
    .filter(node => (incoming.get(node.id)?.length ?? 0) === 0)
    .sort((a, b) => {
      const roleRank = (n: CriminalFlowNode) =>
        n.role === 'VICTIM' ? 0 : n.role === 'MULE' ? 1 : 2;
      return roleRank(a) - roleRank(b) || a.id.localeCompare(b.id);
    });

  const startNodes = roots.length ? roots : nodes.slice().sort((a, b) => a.id.localeCompare(b.id));
  const layer = new Map<string, number>();
  startNodes.forEach(node => layer.set(node.id, 0));

  // Relax layer positions a bounded number of times. This handles normal DAGs
  // and remains stable if the source data contains a cycle.
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    nodes.forEach(node => {
      const parents = incoming.get(node.id) ?? [];
      if (!parents.length) return;
      const known = parents
        .map(parent => layer.get(parent))
        .filter((value): value is number => value !== undefined);
      if (!known.length) return;
      const next = Math.min(Math.max(...known) + 1, nodes.length - 1);
      if ((layer.get(node.id) ?? -1) < next) {
        layer.set(node.id, next);
        changed = true;
      }
    });
    if (!changed) break;
  }

  nodes.forEach(node => {
    if (!layer.has(node.id)) layer.set(node.id, 0);
  });

  // Compress unused columns while preserving direction.
  const usedLayers = Array.from(new Set(Array.from(layer.values()))).sort((a, b) => a - b);
  const compressed = new Map(usedLayers.map((value, index) => [value, index]));

  const groups = new Map<number, CriminalFlowNode[]>();
  nodes.forEach(node => {
    const col = compressed.get(layer.get(node.id) ?? 0) ?? 0;
    if (!groups.has(col)) groups.set(col, []);
    groups.get(col)!.push(node);
  });

  const maxPerColumn = Math.max(...Array.from(groups.values()).map(group => group.length), 1);
  const positions = new Map<string, FlowPosition>();
  const maxHeight = Math.max(
    760,
    PAD_TOP + maxPerColumn * (CARD_H + Y_GAP) + PAD_BOTTOM,
  );

  groups.forEach((group, col) => {
    group.sort((a, b) => {
      const roleRank = (n: CriminalFlowNode) => {
        if (n.role === 'VICTIM') return 0;
        if (n.role === 'MULE') return 1;
        if (n.role === 'AGGREGATOR') return 2;
        if (n.role === 'TERMINAL_ATM') return 4;
        return 3;
      };
      return roleRank(a) - roleRank(b) || a.id.localeCompare(b.id);
    });

    const groupHeight = group.length * CARD_H + Math.max(0, group.length - 1) * Y_GAP;
    const startY = Math.max(PAD_TOP, (maxHeight - groupHeight) / 2);

    group.forEach((node, index) => {
      positions.set(node.id, {
        x: PAD_X + col * (CARD_W + X_GAP),
        y: startY + index * (CARD_H + Y_GAP),
        layer: col,
      });
    });
  });

  const width = Math.max(
    900,
    PAD_X * 2 + Math.max(0, usedLayers.length - 1) * (CARD_W + X_GAP) + CARD_W,
  );

  return { positions, width, height: maxHeight, groups };
}

export const CriminalFlow: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { data: caseData } = useCase(caseId ?? '');
  const hasUploads = (caseData?.evidence ?? []).some(
    f => f.status === 'complete' && (f.domain === 'BANK' || f.domain === 'CDR'),
  );

  const { data: flowData, loading } = useCriminalFlow(caseId ?? '');
  const flowNodes: CriminalFlowNode[] = flowData?.nodes ?? [];
  const flowEdges: CriminalFlowEdge[] = flowData?.edges ?? [];
  const [selectedNode, setSelectedNode] = useState<CriminalFlowNode | null>(null);
  const [zoom, setZoom] = useState(1);

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return [];

    const linkedIds = new Set<string>();
    flowEdges.forEach(edge => {
      if (edge.source === selectedNode.id) linkedIds.add(edge.target);
      if (edge.target === selectedNode.id) linkedIds.add(edge.source);
    });

    return Array.from(linkedIds)
      .map(id => flowNodes.find(node => node.id === id))
      .filter((node): node is CriminalFlowNode => Boolean(node));
  }, [selectedNode, flowNodes, flowEdges]);

  const selectedIncoming = useMemo(
    () => selectedNode ? flowEdges.filter(edge => edge.target === selectedNode.id) : [],
    [selectedNode, flowEdges],
  );

  const selectedOutgoing = useMemo(
    () => selectedNode ? flowEdges.filter(edge => edge.source === selectedNode.id) : [],
    [selectedNode, flowEdges],
  );

  const layout = useMemo(
    () => buildLayout(flowNodes, flowEdges),
    [flowNodes, flowEdges],
  );

  React.useEffect(() => {
    if (!selectedNode && flowNodes.length) {
      const first = flowNodes.find(node => node.role === 'VICTIM') ?? flowNodes[0];
      setSelectedNode(first);
    }
  }, [flowNodes, selectedNode]);

  const edgeBetween = (source: string, target: string) =>
    flowEdges.find(edge => edge.source === source && edge.target === target);

  const formatAmount = (amount: number | undefined | null) =>
    amount == null ? '—' : `₹${Number(amount).toLocaleString('en-IN')}`;

  const handleExportGraph = () => {
    const json = JSON.stringify({ nodes: flowNodes, edges: flowEdges }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `criminalflow_case_${caseId}_money_trail.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported CriminalFlow money trail graph data.', 'success');
  };

  if (!loading && flowNodes.length === 0 && !hasUploads) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">account_tree</span>
        <div>
          <p className="font-bold text-[#0B2340]">No financial data uploaded yet</p>
          <p className="text-sm text-[#64748B] mt-1">
            Upload bank statements or CDR files to build the money trail for Case #{caseId}.
          </p>
        </div>
        <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
          Upload Evidence
        </Button>
      </div>
    );
  }

  if (loading && !flowNodes.length) {
    return (
      <div className="h-[720px] flex items-center justify-center bg-[#F8FAFC] border border-[#D9E1EA] rounded-md">
        <div className="text-sm font-semibold text-[#64748B]">Loading money trail…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="bg-white border border-[#D9E1EA] rounded-md px-5 py-3 flex flex-wrap justify-between items-center gap-3 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-0.5">
            Case: #{caseId} — Money Trail
          </div>
          <h1 className="text-xl font-bold text-[#191C1E] flex items-center gap-2">
            <span>{flowNodes.find(node => node.role === 'VICTIM')?.label ?? flowNodes[0]?.label ?? 'Subject'}</span>
            <span className="text-[#94A3B8]">/</span>
            <span className="text-[#0B5CAB]">Money Trail & CriminalFlow Analysis</span>
          </h1>
        </div>
        <Button variant="secondary" size="sm" icon="download" onClick={handleExportGraph}>
          Export Graph
        </Button>
      </header>

      <div className="h-[720px]">
        <section className="h-full bg-[#F8FAFC] grid-pattern border border-[#D9E1EA] rounded-md relative overflow-hidden flex flex-col shadow-xs select-none">
          {/* Fixed to the viewport, not the scrollable graph content. */}
          <div className="absolute bottom-4 left-4 z-30 bg-white border border-[#D9E1EA] rounded shadow-sm flex flex-col">
            <button onClick={() => setZoom(z => Math.min(z + 0.15, 1.6))} className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]" title="Zoom In">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.6))} className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]" title="Zoom Out">
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <button onClick={() => setZoom(1)} className="p-2 hover:bg-slate-100 text-[#191C1E]" title="Reset Zoom">
              <span className="material-symbols-outlined text-[18px]">fit_screen</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-6 pt-8">
            <div
              className="relative transition-transform duration-100"
              style={{
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                marginRight: `${Math.max(0, (zoom - 1) * layout.width)}px`,
                marginBottom: `${Math.max(0, (zoom - 1) * layout.height)}px`,
              }}
            >
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <marker id="flow-arrow-red" markerHeight="7" markerWidth="7" orient="auto" refX="8" refY="5" viewBox="0 0 10 10">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626" />
                  </marker>
                  <marker id="flow-arrow-slate" markerHeight="7" markerWidth="7" orient="auto" refX="8" refY="5" viewBox="0 0 10 10">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
                  </marker>
                </defs>

                {flowEdges.map(edge => {
                  const source = layout.positions.get(edge.source);
                  const target = layout.positions.get(edge.target);
                  if (!source || !target) return null;

                  const x1 = source.x + CARD_W;
                  const y1 = source.y + CARD_H / 2;
                  const x2 = target.x;
                  const y2 = target.y + CARD_H / 2;
                  const dx = Math.max(40, (x2 - x1) / 2);
                  const sameLayer = source.layer === target.layer;
                  const bend = sameLayer ? 80 : 0;
                  const midX = sameLayer ? x1 + CARD_W / 2 : x1 + dx;
                  const d = sameLayer
                    ? `M ${x1} ${y1} C ${midX} ${y1 - bend}, ${midX} ${y2 + bend}, ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                  const critical = ['CASHOUT', 'ATM', 'ATM WITHDRAWAL', 'CASH WITHDRAWAL'].some(token =>
                    (edge.method ?? '').toUpperCase().includes(token),
                  );
                  const stroke = critical ? '#DC2626' : '#64748B';
                  const edgeInfo = `${edge.method ?? 'TRANSFER'} • ${formatAmount(edge.amount)}`;
                  const labelX = sameLayer ? midX : (x1 + x2) / 2;
                  const labelY = (y1 + y2) / 2 - 9;

                  return (
                    <g key={edge.id}>
                      <path
                        d={d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={critical ? 4 : 2}
                        strokeDasharray={critical ? undefined : '5,4'}
                        markerEnd={critical ? 'url(#flow-arrow-red)' : 'url(#flow-arrow-slate)'}
                      />
                      <rect x={labelX - 72} y={labelY - 9} width="144" height="20" rx="4" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1" />
                      <text x={labelX} y={labelY + 5} textAnchor="middle" fill={critical ? '#DC2626' : '#424751'} fontFamily="JetBrains Mono" fontSize="9" fontWeight={critical ? 'bold' : 'normal'}>
                        {edgeInfo.length > 34 ? `${edgeInfo.slice(0, 31)}…` : edgeInfo}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {flowNodes.map(node => {
                const position = layout.positions.get(node.id);
                if (!position) return null;
                const tone = roleTone(node);
                const incoming = flowEdges.filter(edge => edge.target === node.id);
                const outgoing = flowEdges.filter(edge => edge.source === node.id);
                const incomingTotal = node.total_inflow ?? incoming.reduce((sum, edge) => sum + (edge.amount || 0), 0);
                const outgoingTotal = node.total_outflow ?? outgoing.reduce((sum, edge) => sum + (edge.amount || 0), 0);

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`absolute bg-white rounded-md overflow-hidden cursor-pointer transition-all ${
                      selectedNode?.id === node.id
                        ? 'border-2 border-[#0B5CAB] ring-2 ring-[#0B5CAB]/20 shadow-md'
                        : node.role === 'VICTIM' || node.role === 'MULE' || node.type === 'ATM'
                          ? 'border-2 shadow-md'
                          : 'border shadow-xs'
                    }`}
                    style={{
                      left: position.x,
                      top: position.y,
                      width: CARD_W,
                      minHeight: CARD_H,
                      borderColor: selectedNode?.id === node.id ? '#0B5CAB' : tone.border,
                    }}
                  >
                    <div
                      className="px-3 py-1.5 border-b flex justify-between items-center text-xs"
                      style={{ backgroundColor: `${tone.bg}12`, borderColor: `${tone.border}40` }}
                    >
                      <span className="font-bold uppercase text-[10px] flex items-center gap-1" style={{ color: tone.text }}>
                        {(node.role === 'MULE' || node.role === 'VICTIM') && (
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                        )}
                        {node.role ?? node.type ?? 'ACCOUNT'}
                      </span>
                      <span className="material-symbols-outlined text-[16px]" style={{ color: tone.text }}>
                        {roleIcon(node)}
                      </span>
                    </div>

                    <div className="p-3">
                      <div className="font-bold text-sm text-[#191C1E] truncate" title={node.account_number ?? node.label}>
                        {node.account_number ?? node.label ?? '—'}
                      </div>
                      {node.owner && (
                        <div className="text-xs text-[#64748B] mt-0.5 truncate" title={node.owner}>Owner: {node.owner}</div>
                      )}
                      <div className="flex justify-between items-center border-t border-[#EDF0F4] pt-2 mt-2 font-mono text-xs">
                        <span className="text-[#64748B]">Inflow</span>
                        <span className="font-bold text-[#191C1E]">{formatAmount(incomingTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1 font-mono text-xs">
                        <span className="text-[#64748B]">Outflow</span>
                        <span className="font-bold text-[#191C1E]">{formatAmount(outgoingTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedNode && (
            <aside className="absolute top-4 right-4 bottom-4 z-40 w-[340px] max-w-[calc(100%-2rem)] bg-white border border-[#D9E1EA] rounded-md shadow-lg overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[#D9E1EA] flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[20px] text-[#0B5CAB]">account_tree</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Selected Entity</div>
                    <div className="font-bold text-[#191C1E] truncate" title={selectedNode.account_number ?? selectedNode.label}>
                      {selectedNode.account_number ?? selectedNode.label}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded hover:bg-slate-200 text-[#64748B]"
                  title="Close details"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 rounded border border-[#D9E1EA] bg-[#F8FAFC] text-[10px] font-bold uppercase text-[#475569]">
                    {selectedNode.role ?? selectedNode.type ?? 'ACCOUNT'}
                  </span>
                  {selectedNode.status && (
                    <span className="text-[11px] font-semibold text-[#64748B]">{selectedNode.status}</span>
                  )}
                </div>

                {selectedNode.owner && (
                  <div className="rounded-md border border-[#D9E1EA] bg-[#F8FAFC] p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Known Person / Owner</div>
                    <div className="font-bold text-sm text-[#191C1E]">{selectedNode.owner}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-[#EDF0F4] rounded p-2">
                    <div className="text-[10px] text-[#64748B]">Inflow</div>
                    <div className="font-mono font-bold text-sm text-[#191C1E] mt-1">{formatAmount(selectedNode.total_inflow)}</div>
                  </div>
                  <div className="border border-[#EDF0F4] rounded p-2">
                    <div className="text-[10px] text-[#64748B]">Outflow</div>
                    <div className="font-mono font-bold text-sm text-[#191C1E] mt-1">{formatAmount(selectedNode.total_outflow)}</div>
                  </div>
                </div>

                {selectedNode.details && Object.keys(selectedNode.details).length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#424751] mb-2">Entity Metadata</div>
                    <div className="border border-[#D9E1EA] rounded-md divide-y divide-[#EDF0F4]">
                      {Object.entries(selectedNode.details).map(([key, value]) => (
                        <div key={key} className="px-3 py-2 flex justify-between gap-3 text-xs">
                          <span className="text-[#64748B]">{key.replace(/_/g, ' ')}</span>
                          <span className="font-mono font-semibold text-[#191C1E] text-right break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedNode.retained_balance != null || selectedNode.freeze_priority || selectedNode.ip_address) && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#424751] mb-2">Intelligence Details</div>
                    <div className="border border-[#D9E1EA] rounded-md divide-y divide-[#EDF0F4]">
                      {selectedNode.retained_balance != null && (
                        <div className="px-3 py-2 flex justify-between gap-3 text-xs">
                          <span className="text-[#64748B]">Retained Balance</span>
                          <span className="font-mono font-semibold text-[#191C1E]">{formatAmount(selectedNode.retained_balance)}</span>
                        </div>
                      )}
                      {selectedNode.freeze_priority && (
                        <div className="px-3 py-2 flex justify-between gap-3 text-xs">
                          <span className="text-[#64748B]">Freeze Priority</span>
                          <span className="font-semibold text-[#191C1E]">{selectedNode.freeze_priority}</span>
                        </div>
                      )}
                      {selectedNode.ip_address && (
                        <div className="px-3 py-2 flex justify-between gap-3 text-xs">
                          <span className="text-[#64748B]">IP Address</span>
                          <span className="font-mono font-semibold text-[#191C1E]">{selectedNode.ip_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedConnections.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#424751] mb-2">Linked Entities</div>
                    <div className="space-y-2">
                      {selectedConnections.map(linked => {
                        const edge = flowEdges.find(e =>
                          (e.source === selectedNode.id && e.target === linked.id) ||
                          (e.target === selectedNode.id && e.source === linked.id)
                        );
                        return (
                          <button
                            key={linked.id}
                            type="button"
                            onClick={() => setSelectedNode(linked)}
                            className="w-full text-left border border-[#D9E1EA] rounded-md px-3 py-2 hover:bg-[#F8FAFC] transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-[#0B5CAB] truncate">
                                {linked.account_number ?? linked.label}
                              </span>
                              <span className="text-[9px] font-bold uppercase text-[#64748B]">{linked.role ?? linked.type ?? 'ENTITY'}</span>
                            </div>
                            {edge && (
                              <div className="mt-1 flex justify-between gap-2 text-[10px] text-[#64748B]">
                                <span>{edge.method ?? 'TRANSFER'}</span>
                                <span className="font-mono">{formatAmount(edge.amount)}</span>
                              </div>
                            )}
                            {linked.owner && (
                              <div className="mt-1 text-[10px] text-[#64748B] truncate">Owner: {linked.owner}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(selectedIncoming.length > 0 || selectedOutgoing.length > 0) && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#424751] mb-2">Flow Direction</div>
                    <div className="text-xs text-[#64748B] space-y-1">
                      {selectedIncoming.length > 0 && <div><span className="font-semibold text-[#191C1E]">{selectedIncoming.length}</span> incoming transfer{selectedIncoming.length === 1 ? '' : 's'}</div>}
                      {selectedOutgoing.length > 0 && <div><span className="font-semibold text-[#191C1E]">{selectedOutgoing.length}</span> outgoing transfer{selectedOutgoing.length === 1 ? '' : 's'}</div>}
                    </div>
                  </div>
                )}

                {selectedNode.source_provenance && (
                  <div className="pt-2 border-t border-[#EDF0F4]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Source Provenance</div>
                    <div className="text-xs text-[#424751] mt-1 break-words">{selectedNode.source_provenance}</div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </section>
      </div>
    </div>
  );
};
