import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CASE_2847 } from '../data/mockData';
import { useCaseStore } from '../context/CaseStore';
import { useGraph } from '../hooks/useGraph';
import { tierColor } from '../utils/confidence';

import { DomainBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

interface GraphNode {
  id: string;
  name: string;
  sub: string;
  type: 'PERSON' | 'PHONE' | 'BANK' | 'IMEI' | 'IP' | 'SOCIAL' | 'ATM';
  domain: 'CDR' | 'IPDR' | 'BANK' | 'SOCIAL' | 'NCRP';
  x: number;
  y: number;
  riskScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  role: string;
  details: Record<string, string>;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  color: string;
  color: string;
  animated?: boolean;
  confidence_tier?: string;
}

export const EntityGraph: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { getCaseFiles, getCase } = useCaseStore();

  const isDemo = caseId === '2847';
  const uploadedFiles = getCaseFiles(caseId ?? '');
  const caseData = getCase(caseId ?? '');
  const hasUploads = uploadedFiles.filter(f => f.status === 'complete').length > 0;

  const { data: graphData, loading } = useGraph(caseId ?? '');
  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const handleExpandConnections = () => {
    if (!selectedNode) return;
    showToast(`Expanded 1-hop connections for ${selectedNode.name}. Found 2 new indirect link nodes.`, 'info');
  };

  // Empty state for new cases with no uploads
  if (!isDemo && !hasUploads) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">hub</span>
        <div>
          <p className="font-bold text-[#0B2340]">No evidence uploaded yet</p>
          <p className="text-sm text-[#64748B] mt-1">Upload evidence files to map entity connections for Case #{caseId}.</p>
        </div>
        <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
          Upload Evidence
        </Button>
      </div>
    );
 }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#2847</span>
            <span>•</span>
            <span>Entity Relationship & Multi-Domain Link Analysis</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Entity Graph</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="crop_free"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          >
            Reset View
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="hub"
            onClick={handleExpandConnections}
          >
            Expand Graph
          </Button>
        </div>
      </header>

      {/* Split Graph View: Canvas (70%) + Inspector (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] items-stretch">
        {/* Interactive Graph Canvas (8 cols / ~70%) */}
        <div
          className="lg:col-span-8 bg-[#F8FAFC] border border-[#D9E1EA] rounded-md relative overflow-hidden shadow-xs select-none grid-pattern flex flex-col"
          onMouseDown={e => {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          }}
          onMouseMove={e => {
            if (!isPanning) return;
            setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          {/* Zoom/Pan Controls Overlay */}
          <div className="absolute bottom-4 left-4 z-20 bg-white border border-[#D9E1EA] rounded shadow-sm flex flex-col">
            <button
              onClick={() => setZoom(z => Math.min(z + 0.15, 2))}
              className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]"
              title="Zoom In"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
              className="p-2 hover:bg-slate-100 border-b border-[#D9E1EA] text-[#191C1E]"
              title="Zoom Out"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-2 hover:bg-slate-100 text-[#191C1E]"
              title="Fit to Screen"
            >
              <span className="material-symbols-outlined text-[18px]">fit_screen</span>
            </button>
          </div>

          {/* Graph Legend Overlay */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-xs border border-[#D9E1EA] rounded px-3 py-2 shadow-xs flex items-center gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span> Person (P1)</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0891B2]"></span> CDR Phone</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]"></span> Bank Acc</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]"></span> IP Proxy</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span> Social</div>
            </div>
            <div className="bg-white/90 backdrop-blur-xs border border-[#D9E1EA] rounded px-3 py-2 shadow-xs flex items-center gap-3 text-[11px] font-mono">
              <div className="font-bold mr-2 text-[#64748B]">CONFIDENCE TIER:</div>
              <div className="flex items-center gap-1"><span className="w-6 h-0.5 bg-black"></span> CONFIRMED</div>
              <div className="flex items-center gap-1"><span className="w-6 h-0.5 border-t-2 border-dashed border-black"></span> PROBABLE</div>
              <div className="flex items-center gap-1"><span className="w-6 h-0.5 border-t border-dotted border-black"></span> CANDIDATE</div>
            </div>
          </div>

          {/* Transform Layer */}
          <div
            className="w-full h-full relative cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* SVG Edges */}
            <svg className="absolute inset-0 w-[1200px] h-[800px] pointer-events-none">
              <defs>
                <marker id="arrow-cyan" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="28" refY="5" viewBox="0 0 10 10">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#0891B2" />
                </marker>
                <marker id="arrow-orange" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="28" refY="5" viewBox="0 0 10 10">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#F97316" />
                </marker>
                <marker id="arrow-red" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="28" refY="5" viewBox="0 0 10 10">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626" />
                </marker>
                <marker id="arrow-purple" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="28" refY="5" viewBox="0 0 10 10">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#7C3AED" />
                </marker>
                <marker id="arrow-grey" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="28" refY="5" viewBox="0 0 10 10">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
                </marker>
              </defs>

              {edges.map(e => {
                const src = nodes.find(n => n.id === e.from);
                const tgt = nodes.find(n => n.id === e.to);
                if (!src || !tgt) return null;

                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;

                let edgeProps = { strokeWidth: 2, strokeDasharray: 'none', opacity: 1.0 };
                if (e.confidence_tier === 'PROBABLE') {
                  edgeProps = { strokeWidth: 1.5, strokeDasharray: '4, 4', opacity: 0.8 };
                } else if (e.confidence_tier === 'CANDIDATE') {
                  edgeProps = { strokeWidth: 1, strokeDasharray: '2, 2', opacity: 0.5 };
                }

                return (
                  <g key={e.id} style={{ opacity: edgeProps.opacity }}>
                    <path
                      d={`M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`}
                      stroke={e.color}
                      strokeWidth={edgeProps.strokeWidth}
                      strokeDasharray={edgeProps.strokeDasharray}
                      className={e.animated ? 'anim-dash' : ''}
                      markerEnd={`url(#arrow-${e.color === '#0891B2' ? 'cyan' : e.color === '#F97316' ? 'orange' : e.color === '#DC2626' ? 'red' : e.color === '#7C3AED' ? 'purple' : 'grey'})`}
                    />
                    <rect
                      x={midX - 35}
                      y={midY - 9}
                      width="70"
                      height="18"
                      rx="3"
                      fill="#FFFFFF"
                      stroke="#D9E1EA"
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fill={e.color}
                      fontFamily="JetBrains Mono"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {e.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* HTML Interactive Nodes */}
            <div className="absolute inset-0 pointer-events-none">
              {nodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const isTargetP1 = node.id === 'node_rajesh';

                let iconName = 'person';
                let borderColor = 'border-[#0B5CAB]';
                let iconColor = 'text-[#0B5CAB]';

                if (node.type === 'PERSON') {
                  iconName = 'person';
                  borderColor = 'border-[#DC2626]';
                  iconColor = 'text-[#DC2626]';
                } else if (node.type === 'PHONE') {
                  iconName = 'smartphone';
                  borderColor = 'border-[#0891B2]';
                  iconColor = 'text-[#0891B2]';
                } else if (node.type === 'BANK') {
                  iconName = 'account_balance';
                  borderColor = 'border-[#F97316]';
                  iconColor = 'text-[#F97316]';
                } else if (node.type === 'IMEI') {
                  iconName = 'sim_card';
                  borderColor = 'border-[#475569]';
                  iconColor = 'text-[#475569]';
                } else if (node.type === 'IP') {
                  iconName = 'router';
                  borderColor = 'border-[#7C3AED]';
                  iconColor = 'text-[#7C3AED]';
                } else if (node.type === 'SOCIAL') {
                  iconName = 'forum';
                  borderColor = 'border-[#16A34A]';
                  iconColor = 'text-[#16A34A]';
                } else if (node.type === 'ATM') {
                  iconName = 'local_atm';
                  borderColor = 'border-[#F97316]';
                  iconColor = 'text-[#F97316]';
                }

                return (
                  <div
                    key={node.id}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className={`absolute pointer-events-auto group cursor-pointer -translate-x-1/2 -translate-y-1/2 transition-transform ${
                      isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-10'
                    }`}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  >
                    {/* Node Bubble */}
                    <div
                      className={`w-14 h-14 rounded-full bg-white border-2 ${borderColor} flex items-center justify-center shadow-md relative ${
                        isTargetP1 ? 'node-pulse' : ''
                      } ${isSelected ? 'ring-4 ring-[#0B5CAB]/30' : ''}`}
                    >
                      <span className={`material-symbols-outlined text-[24px] ${iconColor}`}>
                        {iconName}
                      </span>
                    </div>

                    {/* Node Label Card */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white shadow-md border border-[#D9E1EA] px-2.5 py-1 rounded whitespace-nowrap text-center">
                      <div className="text-xs font-bold text-[#191C1E]">{node.name}</div>
                      <div className={`text-[9px] font-mono font-bold ${node.riskLevel === 'CRITICAL' ? 'text-[#DC2626]' : node.riskLevel === 'HIGH' ? 'text-orange-600' : 'text-[#64748B]'}`}>
                        {node.sub}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Entity Detail Inspector (4 cols / ~30%) */}
        <div className="lg:col-span-4 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2340] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0B5CAB] text-[18px]">manage_search</span>
              Entity Inspector
            </h3>
            {selectedNode && <DomainBadge domain={selectedNode.domain} size="sm" />}
          </div>

          {selectedNode ? (
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-xs">
              {/* Header Profile */}
              <div className="flex items-start justify-between border-b border-[#EDF0F4] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-[#191C1E]">{selectedNode.name}</h4>
                    {selectedNode.confidence_tier && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${tierColor(selectedNode.confidence_tier)}`}>
                        {selectedNode.confidence_tier}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#64748B] font-medium mt-0.5">{selectedNode.role}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-[#64748B] block">RISK SCORE</span>
                  <span className={`text-base font-bold font-mono ${selectedNode.riskLevel === 'CRITICAL' ? 'text-[#DC2626]' : 'text-orange-600'}`}>
                    {selectedNode.riskScore} / 100
                  </span>
                </div>
              </div>

              {/* Attributes block */}
              <div>
                <h5 className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-2">
                  Intelligence Metadata
                </h5>
                <div className="bg-[#F8FAFC] border border-[#D9E1EA] rounded divide-y divide-[#EDF0F4]">
                  {Object.entries(selectedNode.details).map(([k, v]) => (
                    <div key={k} className="p-2.5 flex justify-between gap-2">
                      <span className="text-[#64748B] font-medium">{k}</span>
                      <span className="font-mono text-[#191C1E] font-semibold text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected Relationships */}
              <div>
                <h5 className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-2">
                  Associated Links (Direct Edges)
                </h5>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {edges
                    .filter(e => e.from === selectedNode.id || e.to === selectedNode.id)
                    .map(e => {
                      const otherNode = nodes.find(n => n.id === (e.from === selectedNode.id ? e.to : e.from));
                      return (
                        <div
                          key={e.id}
                          onClick={() => otherNode && setSelectedNode(otherNode)}
                          className="p-2 rounded bg-slate-50 border border-[#EDF0F4] hover:border-[#0B5CAB] cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <span className="text-[#0B5CAB] font-bold">{e.label}</span>
                          <span className="text-[#191C1E]">{otherNode?.name}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto pt-3 border-t border-[#EDF0F4] flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon="share"
                  onClick={handleExpandConnections}
                >
                  Expand 1-Hop Neighbors
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="gavel"
                  onClick={() => showToast(`Legal subpoena order drafted for ${selectedNode.name}.`, 'success')}
                >
                  Request Subpoena Records
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs my-auto">
              Select any graph node to inspect forensic links and intelligence metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
