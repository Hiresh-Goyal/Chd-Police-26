import React, { useState } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, FileText, Activity } from 'lucide-react';
import { useAlertDetail } from '../hooks/useAlertDetail';

interface EvidenceChainProps {
  alertId: string;
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({ alertId }) => {
  const { data: alertDetail, loading, error } = useAlertDetail(alertId);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  if (loading) return <div className="text-gray-400 p-4">Loading evidence drill-down...</div>;
  if (error) return <div className="text-red-400 p-4">Error loading evidence: {error.message}</div>;
  if (!alertDetail) return <div className="text-gray-500 p-4">No evidence detail available.</div>;

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'finding': return <Activity className="w-4 h-4 text-orange-400" />;
      case 'episode': return <Activity className="w-4 h-4 text-yellow-400" />;
      case 'event': return <FileText className="w-4 h-4 text-blue-400" />;
      default: return <ChevronRight className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 text-sm">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Evidence Drill-Down: {alertDetail.title}
      </h3>
      
      <div className="ml-2 border-l border-slate-700 pl-4 space-y-3">
        {alertDetail.findings?.map((finding: any) => (
          <div key={finding.id} className="space-y-2">
            <div 
              className="flex items-start gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded transition-colors"
              onClick={() => toggleNode(finding.id)}
            >
              {expandedNodes[finding.id] ? <ChevronDown className="w-4 h-4 mt-0.5" /> : <ChevronRight className="w-4 h-4 mt-0.5" />}
              {renderIcon('finding')}
              <div>
                <div className="text-slate-200 font-medium">{finding.title}</div>
                <div className="text-slate-400 text-xs">{finding.description}</div>
              </div>
            </div>

            {expandedNodes[finding.id] && finding.episodes?.map((episode: any) => (
              <div key={episode.id} className="ml-6 border-l border-slate-700 pl-4 space-y-2">
                <div 
                  className="flex items-start gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded transition-colors"
                  onClick={() => toggleNode(episode.id)}
                >
                  {expandedNodes[episode.id] ? <ChevronDown className="w-4 h-4 mt-0.5" /> : <ChevronRight className="w-4 h-4 mt-0.5" />}
                  {renderIcon('episode')}
                  <div className="text-slate-300">{episode.title}</div>
                </div>

                {expandedNodes[episode.id] && episode.events?.map((event: any) => (
                  <div key={event.id} className="ml-6 border-l border-slate-700 pl-4 space-y-2">
                    <div 
                      className="flex items-start gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded transition-colors"
                      onClick={() => toggleNode(event.id)}
                    >
                      {expandedNodes[event.id] ? <ChevronDown className="w-4 h-4 mt-0.5" /> : <ChevronRight className="w-4 h-4 mt-0.5" />}
                      {renderIcon('event')}
                      <div>
                        <div className="text-slate-300">{event.title}</div>
                        <div className="text-slate-500 text-xs">{event.description}</div>
                      </div>
                    </div>

                    {expandedNodes[event.id] && event.rawRecord && (
                      <div className="ml-6 p-3 bg-black rounded-md border border-slate-800 font-mono text-xs text-slate-400">
                        <div className="text-slate-500 mb-1">
                          Source: {event.rawRecord.source_file} (Row {event.rawRecord.source_row})
                        </div>
                        <div className="space-y-1 mt-2">
                          {Object.entries(event.rawRecord.keyFields || {}).map(([key, val]) => (
                            <div key={key}>
                              <span className="text-slate-500">{key}:</span> <span className="text-green-400">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
