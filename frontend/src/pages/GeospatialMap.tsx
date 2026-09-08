import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useCaseStore } from '../context/CaseStore';
import { useGeospatial } from '../hooks/useApi';

import { DomainBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { GeospatialEvent } from '../types/api';

// Fix Leaflet default icon issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface GeoLocationNode {
  id: string;
  name: string;
  type: 'CDR_TOWER' | 'IP_LOCATION' | 'BANK_BRANCH' | 'ATM_CASHOUT';
  domain: 'CDR' | 'IPDR' | 'BANK';
  lat: number;
  lng: number;
  time: string;
  timestamp: number;
  address: string;
  radiusKm: number;
  details: string;
  color: string;
}

const mapApiEventToNode = (e: GeospatialEvent): GeoLocationNode => {
  let type: GeoLocationNode['type'] = 'CDR_TOWER';
  let domain: GeoLocationNode['domain'] = 'CDR';
  let color = '#0891B2';
  let radiusKm = 1.0;

  if (e.event_type.includes('IPDR')) {
    type = 'IP_LOCATION';
    domain = 'IPDR';
    color = '#7C3AED';
    radiusKm = 0.5;
  } else if (e.event_type.includes('WITHDRAWAL') || e.event_type.includes('ATM')) {
    type = 'ATM_CASHOUT';
    domain = 'BANK';
    color = '#DC2626';
    radiusKm = 0.2;
  } else if (e.event_type.includes('IMPS') || e.event_type.includes('BANK')) {
    type = 'BANK_BRANCH';
    domain = 'BANK';
    color = '#F97316';
    radiusKm = 0.8;
  }

  return {
    id: e.id,
    name: e.location_name || `Location ${e.location_raw}`,
    type,
    domain,
    lat: e.lat,
    lng: e.lng,
    time: new Date(e.ts_start).toLocaleString('en-IN'),
    timestamp: new Date(e.ts_start).getTime(),
    address: e.location_name,
    radiusKm,
    details: `${e.event_type}: ${e.actor_raw} ${e.peer_raw ? `-> ${e.peer_raw}` : ''}`,
    color,
  };
};

// Custom colored marker icons
const createColoredIcon = (color: string, number?: number) =>
  L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;position:relative;transition: transform 0.2s;">
             <span style="transform:rotate(45deg);color:white;font-weight:bold;font-size:14px;line-height:1;">${number !== undefined ? number : ''}</span>
           </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -38],
  });

// Arrow marker icon
const createArrowIcon = (angle: number) =>
  L.divIcon({
    className: '',
    html: `<div style="transform: rotate(${angle}deg); color: #DC2626; font-size: 14px; display: flex; align-items: center; justify-content: center; text-shadow: 0 0 3px white, 0 0 3px white; width: 14px; height: 14px; line-height: 1;">▲</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

// Component to re-center map
const MapCenterControl: React.FC<{ center: [number, number]; trigger: number }> = ({ center, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0) map.flyTo(center, 14, { duration: 1.5 });
  }, [trigger]);
  return null;
};

export const GeospatialMap: React.FC = () => {
  const { showToast } = useToast();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { getCaseFiles } = useCaseStore();

  const uploadedFiles = getCaseFiles(caseId ?? '');
  const hasUploads = uploadedFiles.filter(f => f.status === 'complete').length > 0;

  const { data: geospatialData, isLoading } = useGeospatial(caseId ?? '');
  
  const [geoPoints, setGeoPoints] = useState<GeoLocationNode[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<GeoLocationNode | null>(null);
  
  useEffect(() => {
    if (geospatialData?.events?.length) {
      const mapped = geospatialData.events.map(mapApiEventToNode).sort((a, b) => a.timestamp - b.timestamp);
      setGeoPoints(mapped);
      setSelectedPoint(mapped[0]);
    } else {
      setGeoPoints([]);
      setSelectedPoint(null);
    }
  }, [geospatialData]);

  const [radiusBuffer, setRadiusBuffer] = useState<number>(2.5);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [layers, setLayers] = useState({ cdr: true, bank: true, ipdr: true });

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const uniqueLocations = Array.from(new Set(geoPoints.map(p => p.address || p.name))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  useEffect(() => {
    setSelectedLocations(Array.from(new Set(geoPoints.map(p => p.address || p.name))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  }, [geoPoints]);

  const handleToggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const filteredPoints = React.useMemo(() => {
    return geoPoints.filter(p => {
      const showByDomain = 
        (p.domain === 'CDR' && layers.cdr) ||
        (p.domain === 'BANK' && layers.bank) ||
        (p.domain === 'IPDR' && layers.ipdr);
      const showByLocation = selectedLocations.includes(p.address || p.name);
      return showByDomain && showByLocation;
    });
  }, [geoPoints, selectedLocations, layers]);

  const defaultCenter: [number, number] = [30.7350, 76.7760];
  const CENTER: [number, number] = filteredPoints.length > 0 ? [filteredPoints[0].lat, filteredPoints[0].lng] : defaultCenter;

  const locationGroups: Record<string, GeoLocationNode[]> = {};
  filteredPoints.forEach((pt) => {
    const key = `${pt.lat}-${pt.lng}`;
    if (!locationGroups[key]) locationGroups[key] = [];
    locationGroups[key].push(pt);
  });

  const jitteredPoints = filteredPoints.map((pt, idx) => {
    const key = `${pt.lat}-${pt.lng}`;
    const group = locationGroups[key];
    if (group.length === 1) {
      return { ...pt, displayLat: pt.lat, displayLng: pt.lng, sequenceIndex: idx + 1 };
    }
    const groupIdx = group.findIndex(g => g.id === pt.id);
    const radius = 0.0015; // Jitter radius (~150m)
    const angle = (groupIdx / group.length) * 2 * Math.PI;
    return {
      ...pt,
      displayLat: pt.lat + (Math.sin(angle) * radius),
      displayLng: pt.lng + (Math.cos(angle) * radius),
      sequenceIndex: idx + 1
    };
  });

  const trajectoryPath: [number, number][] = jitteredPoints.map(p => [p.displayLat, p.displayLng]);

  const arrowMarkers: { id: string, lat: number, lng: number, angle: number }[] = [];
  for (let i = 0; i < trajectoryPath.length - 1; i++) {
    const p1 = trajectoryPath[i];
    const p2 = trajectoryPath[i + 1];
    if (Math.abs(p1[0] - p2[0]) > 0.0001 || Math.abs(p1[1] - p2[1]) > 0.0001) {
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;
      const dy = p2[0] - p1[0];
      const dx = (p2[1] - p1[1]) * Math.cos(p1[0] * Math.PI / 180);
      const angleRad = Math.atan2(dy, dx);
      const cssAngle = 90 - (angleRad * (180 / Math.PI));
      arrowMarkers.push({ id: `arrow-${i}`, lat: midLat, lng: midLng, angle: cssAngle });
    }
  }

  // Empty state for new cases with no uploads
  if (!hasUploads) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">map</span>
        <div>
          <p className="font-bold text-[#0B2340]">No evidence uploaded yet</p>
          <p className="text-sm text-[#64748B] mt-1">Upload CDR or IPDR files to plot geospatial data for Case #{caseId}.</p>
        </div>
        <Button variant="primary" size="sm" icon="upload_file" onClick={() => navigate(`/cases/${caseId}/upload-evidence`)}>
          Upload Evidence
        </Button>
      </div>
    );
  }

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: geoPoints.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { name: p.name, domain: p.domain, time: p.time, address: p.address, details: p.details },
      })),
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case_${caseId}_geodossier.geojson`;
    a.click();
    showToast(`Exported GeoJSON dossier for Case #${caseId}.`, 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#{caseId}</span>
            <span>•</span>
            <span>Spatial Geo-Trajectory &amp; Cell Tower Triangulation</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Geospatial Investigation</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon="my_location"
            onClick={() => { setCenterTrigger(t => t + 1); showToast('Recentered map on Chandigarh UT.', 'info'); }}>
            Center on Target
          </Button>
          <Button variant="primary" size="sm" icon="download" onClick={handleExportGeoJSON}>
            Export GeoJSON
          </Button>
        </div>
      </header>

      {/* Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch" style={{ height: '640px' }}>

        {/* Left HUD Panel */}
        <div className="lg:col-span-4 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider">Spatial Parameters</h3>
            <span className="material-symbols-outlined text-[#64748B] text-[18px]">tune</span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar text-xs">
            {/* Filter Locations */}
            <div className="relative">
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-1.5">Filter Locations</label>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full text-left pl-3 pr-8 py-1.5 bg-[#F8FAFC] border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB] flex items-center justify-between"
              >
                <span className="truncate">{selectedLocations.length === uniqueLocations.length ? 'All Locations Selected' : `${selectedLocations.length} Location(s) Selected`}</span>
                <span className="material-symbols-outlined text-[16px] text-[#64748B] absolute right-2">arrow_drop_down</span>
              </button>
              {isDropdownOpen && (
                <div className="absolute z-10 top-full left-0 mt-1 w-full bg-white border border-[#D9E1EA] rounded shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                  {uniqueLocations.map(loc => (
                    <label key={loc} className="flex items-center gap-2 p-2 hover:bg-[#F8FAFC] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedLocations.includes(loc)}
                        onChange={() => handleToggleLocation(loc)}
                        className="accent-[#0B5CAB] cursor-pointer"
                      />
                      <span className="text-xs text-[#191C1E] truncate">{loc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>





            {/* Selected Waypoint Info */}
            {selectedPoint && (
              <div className="p-3 rounded bg-[#EFF6FF] border border-[#0B5CAB]/30">
                <div className="flex items-center justify-between mb-1.5">
                  <DomainBadge domain={selectedPoint.domain} size="sm" />
                  <span className="font-mono text-[10px] text-[#0B5CAB] font-bold">WAYPOINT</span>
                </div>
                <div className="font-bold text-xs text-[#0B2340] mb-0.5">{selectedPoint.name}</div>
                <div className="text-[11px] text-[#64748B] mb-1">{selectedPoint.address}</div>
                <div className="font-mono text-[10px] text-[#191C1E] bg-white p-1.5 rounded border border-[#0B5CAB]/20 mb-1">{selectedPoint.time}</div>
                <div className="text-[11px] text-[#424751] italic leading-relaxed">{selectedPoint.details}</div>
              </div>
            )}

            {/* Geo-Points List */}
            <div className="pt-2 border-t border-[#EDF0F4]">
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-2">
                Geo-Points ({filteredPoints.length})
              </label>
              <div className="space-y-1.5">
                {filteredPoints.map((pt, idx) => (
                  <button key={pt.id} onClick={() => setSelectedPoint(pt)}
                    className={`w-full text-left p-2 rounded border text-[11px] transition-colors ${
                      selectedPoint?.id === pt.id
                        ? 'bg-[#EFF6FF] border-[#0B5CAB]/40 text-[#0B2340]'
                        : 'bg-[#F8FAFC] border-[#EDF0F4] text-[#424751] hover:bg-[#EFF6FF]/50'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pt.color }} />
                      <span className="font-semibold truncate">#{idx + 1} {pt.name}</span>
                    </div>
                    <div className="font-mono text-[10px] text-[#64748B] mt-0.5 pl-4">{pt.time.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leaflet Map */}
        <div className="lg:col-span-8 rounded-md overflow-hidden border border-[#D9E1EA] shadow-xs relative" style={{ height: '640px' }}>
          <MapContainer center={CENTER} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapCenterControl center={CENTER} trigger={centerTrigger} />

            {/* Suspect trajectory line */}
            <Polyline positions={trajectoryPath} color="#DC2626" weight={3} dashArray="8, 6" opacity={0.85} />
            
            {/* Directional Arrows */}
            {arrowMarkers.map(am => (
              <Marker key={am.id} position={[am.lat, am.lng]} icon={createArrowIcon(am.angle)} interactive={false} />
            ))}

            {/* Radius buffer circle (from slider) */}
            {filteredPoints.length > 0 && (
              <Circle center={[filteredPoints[0].lat, filteredPoints[0].lng]} radius={radiusBuffer * 1000}
                pathOptions={{ color: '#0B5CAB', fillColor: '#0B5CAB', fillOpacity: 0.04, weight: 2, dashArray: '8, 4' }} />
            )}

            {/* Individual geo-point markers */}
            {jitteredPoints.map((pt) => {
              return (
                <React.Fragment key={pt.id}>
                  <Circle center={[pt.lat, pt.lng]} radius={pt.radiusKm * 1000}
                    pathOptions={{ color: pt.color, fillColor: pt.color, fillOpacity: 0.04, weight: 1.5, dashArray: '5,5' }} />
                  <Marker position={[pt.displayLat, pt.displayLng]} icon={createColoredIcon(pt.color, pt.sequenceIndex)}
                    eventHandlers={{ 
                      click: () => setSelectedPoint(pt),
                      mouseover: (e) => e.target.setZIndexOffset(1000),
                      mouseout: (e) => e.target.setZIndexOffset(0)
                    }}>
                    <Tooltip direction="top" offset={[0, -38]} opacity={1}>
                      <div className="font-mono text-xs font-bold text-[#0B2340]">
                        #{pt.sequenceIndex} - <span className="font-sans font-normal text-[#424751]">{pt.name}</span>
                      </div>
                    </Tooltip>
                    <Popup maxWidth={260}>
                      <div style={{ fontFamily: 'inherit', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ background: pt.color, color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace' }}>
                            {pt.domain}
                          </span>
                          <span style={{ color: '#64748B', fontSize: '10px', fontFamily: 'monospace' }}>#{pt.sequenceIndex}</span>
                        </div>
                        <div style={{ fontWeight: 700, color: '#0B2340', marginBottom: '4px' }}>{pt.name}</div>
                        <div style={{ color: '#64748B', marginBottom: '4px', fontSize: '11px' }}>{pt.address}</div>
                        <div style={{ background: '#F8FAFC', border: '1px solid #D9E1EA', borderRadius: '4px', padding: '4px 6px', fontFamily: 'monospace', fontSize: '10px', color: '#191C1E', marginBottom: '6px' }}>{pt.time}</div>
                        <div style={{ color: '#424751', fontSize: '11px', lineHeight: '1.5' }}>{pt.details}</div>
                        <div style={{ marginTop: '6px', fontSize: '10px', color: '#0B5CAB', fontFamily: 'monospace' }}>Radius: {pt.radiusKm} km</div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>

          {/* Status overlay badge */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-xs border border-[#D9E1EA] px-3 py-1.5 rounded-md text-xs font-mono text-[#191C1E] flex items-center gap-3 shadow-sm pointer-events-none">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              GPS Active
            </span>
            <span className="text-[#C2C6D3]">|</span>
            <span>4 Geo-Points</span>
            <span className="text-[#C2C6D3]">|</span>
            <span className="text-[#0B5CAB]">Chandigarh UT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

