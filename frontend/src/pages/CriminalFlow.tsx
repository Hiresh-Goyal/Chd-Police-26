import React, { useRef, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCaseStore } from '../context/CaseStore';
import { useCriminalFlow } from '../hooks/useApi';
import ForceGraph2D from 'react-force-graph-2d';
import { CriminalFlowNode } from '../types/api';

import { Button } from '../components/common/Button';

export const CriminalFlow: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const graphRef = useRef<any>();
  const { getCase } = useCaseStore();
  const caseData = getCase(caseId ?? '');

  const { data: flowData, isLoading } = useCriminalFlow(caseId ?? '');
  const [selectedNode, setSelectedNode] = useState<CriminalFlowNode | null>(null);

  const formattedData = useMemo(() => {
    if (!flowData) return { nodes: [], links: [] };

    const nodes = flowData.nodes.map(node => {
      let color = '#94A3B8'; // UNKNOWN
      let size = 6;
      if (node.role === 'VICTIM') {
        color = '#ef4444'; // red-500
        size = 8;
      } else if (node.role === 'MULE') {
        color = '#f97316'; // orange-500
        size = 6;
      } else if (node.role === 'AGGREGATOR') {
        color = '#0B5CAB'; // primary blue
        size = 10;
      }

      return {
        ...node,
        color,
        val: size
      };
    });

    const links = flowData.edges.map(edge => ({
      ...edge,
      source: edge.source,
      target: edge.target,
      label: `₹${(edge.amount || 0).toLocaleString()}`
    }));

    return { nodes, links };
  }, [flowData]);

  // Render text along link
  const renderLinkLabel = (link: any, ctx: CanvasRenderingContext2D) => {
    if (!link.label || !link.source.x || !link.target.x) return;
    const MAX_FONT_SIZE = 4;
    const LABEL_NODE_MARGIN = 6;

    const start = link.source;
    const end = link.target;

    // ignore unbound links
    if (typeof start !== 'object' || typeof end !== 'object') return;

    // calculate label positioning
    const textPos = {
      x: start.x + (end.x - start.x) / 2,
      y: start.y + (end.y - start.y) / 2
    };

    const relLink = { x: end.x - start.x, y: end.y - start.y };
    let textAngle = Math.atan2(relLink.y, relLink.x);
    // maintain label orientation
    if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
      textAngle += Math.PI;
    }

    ctx.font = `bold ${MAX_FONT_SIZE}px Sans-Serif`;
    const textWidth = ctx.measureText(link.label).width;
    const bckgDimensions = [textWidth + 2, MAX_FONT_SIZE + 1];

    ctx.save();
    ctx.translate(textPos.x, textPos.y);
    ctx.rotate(textAngle);

    // draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

    // draw text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0B5CAB';
    ctx.fillText(link.label, 0, 0);
    ctx.restore();
  };

  return (
    <div className="flex flex-col gap-4 h-full relative">
      {/* Context Header */}
      <header className="bg-white border border-[#D9E1EA] rounded-md px-5 py-3 flex flex-wrap justify-between items-center gap-3 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-[#424751] uppercase tracking-wider mb-0.5">
            Active Case: #{caseId} — {caseData?.type || 'Unknown Type'}
          </div>
          <h1 className="text-xl font-bold text-[#191C1E] flex items-center gap-2">
            <span>{caseData?.subject || 'Subject'}</span>
            <span className="text-[#94A3B8]">/</span>
            <span className="text-[#0B5CAB]">Money Trail & CriminalFlow Analysis</span>
          </h1>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-slate-50 border border-[#D9E1EA] rounded-md shadow-inner relative overflow-hidden flex">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <span className="font-mono text-sm text-[#0B5CAB] animate-pulse">Tracing money flow...</span>
          </div>
        )}

        <div className="flex-1 cursor-grab active:cursor-grabbing">
          {formattedData.nodes.length > 0 && (
            <ForceGraph2D
              ref={graphRef}
              graphData={formattedData}
              nodeLabel="label"
              nodeColor="color"
              nodeRelSize={6}
              linkColor={() => 'rgba(11, 92, 171, 0.3)'}
              linkWidth={1.5}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={0.01}
              linkCanvasObjectMode={() => 'after'}
              linkCanvasObject={renderLinkLabel}
              onNodeClick={(node: any) => setSelectedNode(node)}
              cooldownTicks={100}
              onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
            />
          )}
          {!isLoading && formattedData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-sm text-[#64748B]">No financial data uploaded yet to build the money trail.</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200 p-3 rounded shadow-sm text-xs pointer-events-none">
          <div className="font-bold text-[#191C1E] mb-2 uppercase tracking-wider text-[10px]">Flow Roles</div>
          <div className="flex flex-col gap-2 font-mono text-[#424751]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
              <span>VICTIM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
              <span>MULE / LAYER 1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#0B5CAB]"></div>
              <span>AGGREGATOR</span>
            </div>
          </div>
        </div>

        {/* Selected Node Details Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l border-[#D9E1EA] shadow-xl flex flex-col z-10 absolute right-0 inset-y-0 transform transition-transform">
            <div className="p-4 border-b border-[#D9E1EA] flex justify-between items-start bg-[#F8FAFC]">
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">{selectedNode.role}</div>
                <h3 className="text-lg font-bold text-[#191C1E]">{selectedNode.label}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-[#64748B] hover:text-[#191C1E]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-[#64748B]">Node ID</span>
                  <span className="font-mono text-xs">{selectedNode.id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-[#64748B]">Account No</span>
                  <span className="font-mono font-bold text-[#191C1E]">{selectedNode.account_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1 mt-2">
                  <span className="text-[#64748B]">Total Inflow</span>
                  <span className="font-mono font-bold text-[#0B5CAB]">₹{(selectedNode.total_inflow || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-[#64748B]">Total Outflow</span>
                  <span className="font-mono font-bold text-[#DC2626]">₹{(selectedNode.total_outflow || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
