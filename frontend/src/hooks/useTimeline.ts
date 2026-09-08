import { useEffect, useState } from 'react';
import { getTimeline } from '../api/client';
import type { CanonicalEventAPI } from '../types/api';

export interface TimelineFilters {
  entity_id?: string; eventType?: string; start?: string; end?: string; search?: string;
}

export type TimelineEventView = CanonicalEventAPI & {
  timestamp: string; timeDisplay: string; domain: string; title: string; description: string;
  source: string; provenance: string; isCritical: boolean; metadata: Record<string,string>;
};

const view = (e: CanonicalEventAPI): TimelineEventView => ({
  ...e,
  timestamp: e.ts_start,
  timeDisplay: e.time_display ?? new Date(e.ts_start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
  domain: e.domain ?? 'OTHER',
  title: e.title ?? e.event_type,
  description: e.description ?? `${e.actor_raw}${e.peer_raw ? ` → ${e.peer_raw}` : ''}${e.amount != null ? ` • ₹${e.amount.toLocaleString('en-IN')}` : ''}`,
  source: e.source ?? e.domain ?? 'UNKNOWN',
  provenance: e.provenance ?? `Source file ${e.source_file_id}, row ${e.source_row}`,
  isCritical: Boolean(e.is_critical),
  metadata: e.metadata ?? {},
});

export const useTimeline = (caseId: string, filters?: TimelineFilters) => {
  const [data, setData] = useState<TimelineEventView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!caseId) { setData([]); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const params: Record<string,string> = {};
        if (filters?.eventType) params.event_type = filters.eventType;
        if (filters?.entity_id) params.entity_id = filters.entity_id;
        if (filters?.start) params.start = filters.start;
        if (filters?.end) params.end = filters.end;
        let result = await getTimeline(caseId, Object.keys(params).length ? params : undefined);
        let mapped = result.map(view);
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          mapped = mapped.filter(e => JSON.stringify(e).toLowerCase().includes(q));
        }
        if (mounted) setData(mapped);
      } catch (err) {
        if (mounted) { setError(err instanceof Error ? err : new Error('Failed to load timeline.')); setData([]); }
      } finally { if (mounted) setLoading(false); }
    };
    void fetchData();
    return () => { mounted = false; };
  }, [caseId, filters?.entity_id, filters?.eventType, filters?.start, filters?.end, filters?.search]);
  return { data, loading, error };
};
