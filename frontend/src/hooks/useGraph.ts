import { useCallback, useEffect, useState } from 'react';
import { getGraph } from '../api/client';
import type { GraphData, GraphEdge as GraphEdgeAPI, GraphNode as GraphNodeAPI } from '../types/api';

export interface PositionedGraphNode {
  id: string;
  name: string;
  sub: string;
  type: GraphNodeAPI['type'];
  domain: string;
  role: string;
  x: number;
  y: number;
  riskScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_tier?: string;
  color: string;
  details: Record<string, string>;
}

export interface NormalizedGraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  color: string;
  animated?: boolean;
  confidence?: number;
  confidence_tier?: string;
  evidence_event_ids?: string[];
}

// The graph remains strictly horizontal, but its columns are derived from
// the actual relationship structure rather than entity type. A connected
// investigation therefore reads naturally from a primary entity through its
// linked entities instead of putting every phone/IMEI/account into one pile.
const GRAPH_LEFT = 90;
const LEVEL_GAP = 205;
const NODE_GAP = 118;
const TOP_PADDING = 210;
const BOTTOM_PADDING = 120;
const GRAPH_MIN_WIDTH = 1020;
const GRAPH_MIN_HEIGHT = 800;

function riskValue(node: GraphNodeAPI): number {
  return Number(node.risk_score ?? node.fraud_score_contribution ?? 0);
}

function preferredRoot(nodes: GraphNodeAPI[], degree: Map<string, number>): GraphNodeAPI {
  const people = nodes.filter(node => node.type === 'PERSON');
  const pool = people.length ? people : nodes;

  return [...pool].sort((a, b) => {
    const degreeDifference = (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0);
    if (degreeDifference !== 0) return degreeDifference;
    return riskValue(b) - riskValue(a);
  })[0];
}

function connectedComponents(
  nodes: GraphNodeAPI[],
  edges: GraphEdgeAPI[],
): GraphNodeAPI[][] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();

  for (const node of nodes) adjacency.set(node.id, new Set());

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  const visited = new Set<string>();
  const components: GraphNodeAPI[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component: GraphNodeAPI[] = [];
    const queue = [node.id];
    visited.add(node.id);

    while (queue.length) {
      const id = queue.shift()!;
      component.push(byId.get(id)!);

      for (const neighbor of adjacency.get(id) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

function layoutComponent(
  component: GraphNodeAPI[],
  edges: GraphEdgeAPI[],
  xOffset: number,
): PositionedGraphNode[] {
  const ids = new Set(component.map(node => node.id));
  const degree = new Map<string, number>();
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  const adjacency = new Map<string, Set<string>>();

  for (const node of component) {
    degree.set(node.id, 0);
    outgoing.set(node.id, new Set());
    incoming.set(node.id, new Set());
    adjacency.set(node.id, new Set());
  }

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;

    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);

    outgoing.get(edge.source)!.add(edge.target);
    incoming.get(edge.target)!.add(edge.source);
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  const root = preferredRoot(component, degree);

  /*
   * Assign horizontal depth from the primary/root entity. We use the real
   * edge direction first, then use undirected links as a fallback so cycles
   * and bidirectional evidence still receive a readable left-to-right rank.
   */
  const depth = new Map<string, number>();
  depth.set(root.id, 0);
  const queue = [root.id];

  while (queue.length) {
    const current = queue.shift()!;
    const nextDepth = (depth.get(current) ?? 0) + 1;
    const neighbors = [
      ...(outgoing.get(current) ?? []),
      ...(adjacency.get(current) ?? []),
    ];

    for (const next of neighbors) {
      if (depth.has(next)) continue;
      depth.set(next, nextDepth);
      queue.push(next);
    }
  }

  // Defensive fallback for any isolated/cyclic remainder.
  for (const node of component) {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  }

  const layers = new Map<number, GraphNodeAPI[]>();
  for (const node of component) {
    const layer = depth.get(node.id) ?? 0;
    const group = layers.get(layer) ?? [];
    group.push(node);
    layers.set(layer, group);
  }

  /*
   * Barycentric ordering: repeatedly order each layer according to the
   * vertical positions of its neighbours. This is the important part that
   * prevents the "same type in one column" tangle and reduces edge crossing.
   */
  const maxLayer = Math.max(...layers.keys(), 0);
  const order = new Map<number, GraphNodeAPI[]>();
  for (let layer = 0; layer <= maxLayer; layer++) {
    order.set(layer, [...(layers.get(layer) ?? [])]);
  }

  const position = new Map<string, number>();
  const refreshPositions = () => {
    position.clear();
    for (const [layer, group] of order) {
      group.forEach((node, index) => position.set(node.id, index));
    }
  };

  refreshPositions();

  const barycenter = (node: GraphNodeAPI, neighborLayer: number) => {
    const neighbors = [
      ...(adjacency.get(node.id) ?? []),
    ].filter(id => depth.get(id) === neighborLayer);

    if (!neighbors.length) return Number.MAX_SAFE_INTEGER;
    return neighbors.reduce((sum, id) => sum + (position.get(id) ?? 0), 0) / neighbors.length;
  };

  for (let pass = 0; pass < 4; pass++) {
    for (let layer = 1; layer <= maxLayer; layer++) {
      const group = order.get(layer) ?? [];
      group.sort((a, b) => {
        const ba = barycenter(a, layer - 1);
        const bb = barycenter(b, layer - 1);
        if (ba !== bb) return ba - bb;
        return String(a.label ?? a.canonical_value).localeCompare(
          String(b.label ?? b.canonical_value),
        );
      });
      refreshPositions();
    }

    for (let layer = maxLayer - 1; layer >= 0; layer--) {
      const group = order.get(layer) ?? [];
      group.sort((a, b) => {
        const ba = barycenter(a, layer + 1);
        const bb = barycenter(b, layer + 1);
        if (ba !== bb) return ba - bb;
        return String(a.label ?? a.canonical_value).localeCompare(
          String(b.label ?? b.canonical_value),
        );
      });
      refreshPositions();
    }
  }

  const maxNodesInLayer = Math.max(
    ...Array.from(order.values()).map(group => group.length),
    1,
  );
  const componentHeight = Math.max(
    GRAPH_MIN_HEIGHT,
    TOP_PADDING + (maxNodesInLayer - 1) * NODE_GAP + BOTTOM_PADDING,
  );
  const centerY = TOP_PADDING + (componentHeight - TOP_PADDING - BOTTOM_PADDING) / 2;

  const positioned: PositionedGraphNode[] = [];

  for (let layer = 0; layer <= maxLayer; layer++) {
    const group = order.get(layer) ?? [];
    const groupHeight = (group.length - 1) * NODE_GAP;
    const startY = centerY - groupHeight / 2;

    group.forEach((node, index) => {
      const score = riskValue(node);
      positioned.push({
        id: node.id,
        name: node.label ?? node.canonical_value,
        sub: node.type,
        type: node.type,
        domain: node.domain ?? 'UNKNOWN',
        role: node.role ?? 'UNKNOWN',
        x: GRAPH_LEFT + xOffset + layer * LEVEL_GAP,
        y: Math.round(startY + index * NODE_GAP),
        riskScore: Math.round(Number(node.risk_score ?? score)),
        riskLevel: node.risk_level ?? 'LOW',
        confidence_tier: node.confidence_tier,
        color: '#64748B',
        details: node.details ?? {},
      });
    });
  }

  return positioned;
}

function layoutNodes(
  nodes: GraphNodeAPI[],
  edges: GraphEdgeAPI[],
): { nodes: PositionedGraphNode[]; width: number; height: number } {
  if (!nodes.length) {
    return { nodes: [], width: GRAPH_MIN_WIDTH, height: GRAPH_MIN_HEIGHT };
  }

  const components = connectedComponents(nodes, edges);
  const positioned: PositionedGraphNode[] = [];
  let xOffset = 0;
  let maxHeight = GRAPH_MIN_HEIGHT;

  for (const component of components) {
    const componentEdges = edges.filter(
      edge => component.some(node => node.id === edge.source) &&
        component.some(node => node.id === edge.target),
    );

    const componentNodes = layoutComponent(component, componentEdges, xOffset);
    positioned.push(...componentNodes);

    const maxX = Math.max(...componentNodes.map(node => node.x), GRAPH_LEFT);
    const minX = Math.min(...componentNodes.map(node => node.x), GRAPH_LEFT);
    const componentWidth = maxX - minX;

    maxHeight = Math.max(
      maxHeight,
      Math.max(...componentNodes.map(node => node.y), GRAPH_MIN_HEIGHT - BOTTOM_PADDING) + BOTTOM_PADDING,
    );

    // Give disconnected investigations a visible horizontal separation.
    xOffset += Math.max(componentWidth + LEVEL_GAP, LEVEL_GAP * 2);
  }

  return {
    nodes: positioned,
    width: Math.max(GRAPH_MIN_WIDTH, GRAPH_LEFT + xOffset + 120),
    height: maxHeight,
  };
}

function edgeColor(linkType: string): string {
  switch (linkType) {
    case 'COMMS':
    case 'CALL':
    case 'SMS':
      return '#0891B2';
    case 'FINANCIAL':
    case 'BANK_TRANSFER':
    case 'CASHOUT':
      return '#F97316';
    case 'SOCIAL_MATCH':
    case 'SOCIAL_INTERACTION':
      return '#16A34A';
    case 'IP_ASSOCIATION':
      return '#7C3AED';
    default:
      return '#64748B';
  }
}

function normalizeEdges(edges: GraphEdgeAPI[]): NormalizedGraphEdge[] {
  return edges.map(edge => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    label: edge.link_type.replace(/_/g, ' '),
    color: edgeColor(edge.link_type),
    confidence: edge.confidence,
    confidence_tier: edge.confidence_tier,
    evidence_event_ids: edge.evidence_event_ids,
    animated: edge.confidence_tier === 'CONFIRMED',
  }));
}

export const useGraph = (caseId: string) => {
  const [data, setData] = useState<{
    nodes: PositionedGraphNode[];
    edges: NormalizedGraphEdge[];
  }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!caseId) {
      setData({ nodes: [], edges: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: GraphData = await getGraph(caseId);
      const normalizedEdges = normalizeEdges(response.edges);
      const layout = layoutNodes(response.nodes, response.edges);
      setData({
        nodes: layout.nodes,
        edges: normalizedEdges,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load entity graph.'));
      setData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const graphWidth = Math.max(
    GRAPH_MIN_WIDTH,
    ...data.nodes.map(node => node.x + 120),
  );
  const graphHeight = Math.max(
    GRAPH_MIN_HEIGHT,
    ...data.nodes.map(node => node.y + BOTTOM_PADDING),
  );

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    graphWidth,
    graphHeight,
  };
};
