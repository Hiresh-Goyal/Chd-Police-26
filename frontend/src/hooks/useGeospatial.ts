import { useEffect, useState } from 'react';
import { getGeospatial } from '../api/client';
import type { GeospatialData } from '../types/api';

export interface GeoPointView {
  id: string; name: string; type: 'CDR_TOWER'|'IP_LOCATION'|'BANK_BRANCH'|'ATM_CASHOUT'; domain: string; lat:number; lng:number;
  time:string; address:string; radiusKm:number; details:string; color:string; source_file_id?:string|null; source_row?:number|null;
}
const colorFor = (domain:string, eventType:string) => eventType === 'BANK_TRANSFER' && /ATM|CASH/i.test(eventType) ? '#DC2626' : ({CDR:'#0891B2',IPDR:'#7C3AED',BANK:'#F97316',SOCIAL:'#16A34A'} as Record<string,string>)[domain] ?? '#64748B';
const mapPoint = (e: GeospatialData['events'][number]): GeoPointView => ({
  id:e.id, name:e.location_name || e.location_raw || e.event_type, type:e.event_type === 'BANK_TRANSFER' && /ATM|CASH/i.test(e.details ?? '') ? 'ATM_CASHOUT' : e.domain === 'IPDR' ? 'IP_LOCATION' : e.domain === 'BANK' ? 'BANK_BRANCH' : 'CDR_TOWER',
  domain:e.domain ?? 'CDR', lat:e.lat, lng:e.lng, time:e.time_display ?? new Date(e.ts_start).toLocaleString('en-IN'), address:e.address ?? e.location_name ?? e.location_raw ?? '—', radiusKm:e.radius_km ?? 0, details:e.details ?? '', color:colorFor(e.domain ?? 'CDR',e.event_type), source_file_id:e.source_file_id, source_row:e.source_row
});
export const useGeospatial = (caseId:string) => {
  const [data,setData]=useState<GeoPointView[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<Error|null>(null);
  useEffect(()=>{let mounted=true; if(!caseId){setData([]);setLoading(false);return;} setLoading(true);setError(null); getGeospatial(caseId).then(r=>{if(mounted)setData(r.events.map(mapPoint));}).catch(e=>{if(mounted){setError(e instanceof Error?e:new Error('Failed to load geospatial data.'));setData([]);}}).finally(()=>{if(mounted)setLoading(false)}); return()=>{mounted=false};},[caseId]);
  return {data,loading,error};
};
