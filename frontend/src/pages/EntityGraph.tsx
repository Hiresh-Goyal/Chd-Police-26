import React, { useRef, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGraph } from '../hooks/useApi';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphNode, GraphEdge } from '../types/api';
import { tierColor } from '../utils/confidence';

export const EntityGraph: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const graphRef = useRef<any>();

  const { data: graphData, isLoading } = useGraph(caseId ?? '');

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Transform backend data for ForceGraph2D
  const formattedData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    
    // Add val (size) and color based on node type
    const nodes = graphData.nodes.map(node => {
      let color = '#94A3B8'; // default
      if (node.type === 'PERSON') color = '#0ea5e9'; // sky-500
      else if (node.type === 'PHONE') color = '#22c55e'; // green-500
      else if (node.type === 'BANK_ACCOUNT') color = '#f97316'; // orange-500
      else if (node.type === 'IMEI') color = '#8b5cf6'; // violet-500
      else if (node.type === 'IP_ADDRESS') color = '#eab308'; // yellow-500
      
      return {
        ...node,
        val: 10 + (node.fraud_score_contribution || 0) * 0.5,
        color
      };
    });

    const links = graphData.edges.map(edge => ({
      ...edge,
      source: edge.source,
      target: edge.target
    }));

    return { nodes, links };
  }, [graphData]);

  // Style helpers based on confidence_tier
  const getLinkWidth = (link: any) => {
    switch (link.confidence_tier) {
      case 'CONFIRMED': return 2;
      case 'PROBABLE': return 1.5;
      case 'CANDIDATE': return 1;
      default: return 1;
    }
  };

  const getLinkColor = (link: any) => {
    switch (link.confidence_tier) {
      case 'CONFIRMED': return 'rgba(11, 92, 171, 1.0)'; // primary solid
      case 'PROBABLE': return 'rgba(11, 92, 171, 0.8)';
      case 'CANDIDATE': return 'rgba(11, 92, 171, 0.5)';
      default: return 'rgba(148, 163, 184, 0.5)';
    }
  };

  const getLinkLineDash = (link: any) => {
    switch (link.confidence_tier) {
      case 'CONFIRMED': return []; // solid
      case 'PROBABLE': return [5, 5]; // dashed
      case 'CANDIDATE': return [1, 3]; // dotted
      default: return [];
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full relative">
      {/* Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex flex-col md:flex-row md:items-end justify-between gap-3 bg-white px-5 pt-4 rounded-t-md">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#{caseId}</span>
            <span>•</span>
            <span className="font-medium text-[#191C1E]">Entity Resolution</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Entity Graph Network</h1>
          <p className="text-sm text-[#424751] mt-0.5">
            Cross-domain entities resolved into a single nexus view.
          </p>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-slate-50 border border-[#D9E1EA] rounded-md shadow-inner relative overflow-hidden flex">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <span className="font-mono text-sm text-[#0B5CAB] animate-pulse">Computing graph layout...</span>
          </div>
        )}

        <div className="flex-1 cursor-grab active:cursor-grabbing">
          {formattedData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={formattedData}
              nodeLabel="canonical_value"
              nodeColor="color"
              nodeRelSize={6}
              linkColor={getLinkColor}
              linkWidth={getLinkWidth}
              linkLineDash={getLinkLineDash}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              onNodeClick={(node: any) => setSelectedNode(node)}
              cooldownTicks={100}
              onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
            />
          ) : (
            !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <span className="material-symbols-outlined text-5xl text-[#CBD5E1] mb-4">account_tree</span>
                <p className="text-[#0B2340] font-bold text-lg">No entities extracted yet</p>
                <p className="text-sm text-[#64748B] mt-1">Upload evidence files to populate the entity graph network.</p>
              </div>
            )
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200 p-3 rounded shadow-sm text-xs pointer-events-none">
          <div className="font-bold text-[#191C1E] mb-2 uppercase tracking-wider text-[10px]">Confidence Legend</div>
          <div className="flex flex-col gap-2 font-mono text-[#424751]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0 border-t-2 border-[#0B5CAB]"></div>
              <span>CONFIRMED</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0 border-t-[1.5px] border-[#0B5CAB] border-dashed opacity-80"></div>
              <span>PROBABLE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0 border-t border-[#0B5CAB] border-dotted opacity-50"></div>
              <span>CANDIDATE</span>
            </div>
          </div>
        </div>

        {/* Selected Node Details Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l border-[#D9E1EA] shadow-xl flex flex-col z-10 absolute right-0 inset-y-0 transform transition-transform">
            <div className="p-4 border-b border-[#D9E1EA] flex justify-between items-start bg-[#F8FAFC]">
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">{selectedNode.type}</div>
                <h3 className="text-lg font-bold text-[#191C1E]">{selectedNode.canonical_value}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-[#64748B] hover:text-[#191C1E]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${tierColor(selectedNode.confidence_tier)}`}>
                  {selectedNode.confidence_tier}
                </span>
              </div>
              
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-[#64748B]">Node ID</span>
                  <span className="font-mono text-xs">{selectedNode.id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-[#64748B]">Fraud Contribution</span>
                  <span className="font-bold text-[#DC2626]">+{selectedNode.fraud_score_contribution}</span>
                </div>
              </div>

              <div className="bg-[#EFF6FF] border border-[#0B5CAB]/20 rounded p-3 mt-2">
                <h4 className="text-xs font-bold text-[#0B5CAB] mb-1">Intelligence Context</h4>
                <p className="text-xs text-[#424751]">
                  This entity is correlated across multiple domains. Verify records in Timeline.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
