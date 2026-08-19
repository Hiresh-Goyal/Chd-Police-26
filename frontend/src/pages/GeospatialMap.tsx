import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AnalysisNav } from '../components/shell/AnalysisNav';
import { DomainBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

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
  address: string;
  radiusKm: number;
  details: string;
  color: string;
}

const GEO_POINTS: GeoLocationNode[] = [
  {
    id: 'geo_1',
    name: 'Cell Tower Sector 17 (Tower A)',
    type: 'CDR_TOWER',
    domain: 'CDR',
    lat: 30.7398,
    lng: 76.7827,
    time: '14:00:12 IST (15 Aug 2026)',
    address: 'Sector 17 Plaza Telecom Mast #45892',
    radiusKm: 1.8,
    details: '14m 23s voice call to victim handset (+91 9988776655)',
    color: '#0891B2',
  },
  {
    id: 'geo_2',
    name: 'Cyber Cafe Proxy Hub (Node Alpha)',
    type: 'IP_LOCATION',
    domain: 'IPDR',
    lat: 30.7412,
    lng: 76.7795,
    time: '14:28:44 IST (15 Aug 2026)',
    address: 'Shop 14, Sector 17-D Market, Chandigarh',
    radiusKm: 0.5,
    details: 'IP 103.76.234.12 logged data transmission to NetBanking',
    color: '#7C3AED',
  },
  {
    id: 'geo_3',
    name: 'HDFC Bank Sector 22 Branch',
    type: 'BANK_BRANCH',
    domain: 'BANK',
    lat: 30.7324,
    lng: 76.769,
    time: '14:32:05 IST (15 Aug 2026)',
    address: 'SCO 88-89, Sector 22-C, Chandigarh',
    radiusKm: 0.8,
    details: '₹48,000 IMPS credit to HDFC XXXXXXX4521',
    color: '#F97316',
  },
  {
    id: 'geo_4',
    name: 'Sector 22 Market ATM Booth',
    type: 'ATM_CASHOUT',
    domain: 'BANK',
    lat: 30.7298,
    lng: 76.7712,
    time: '15:10:18 IST (15 Aug 2026)',
    address: 'ATM ID SIB8922, Near Bus Stand, Sector 22',
    radiusKm: 0.2,
    details: 'Physical cash withdrawal of ₹47,500',
    color: '#DC2626',
  },
];

// Custom colored marker icons
const createColoredIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -38],
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
  const [selectedPoint, setSelectedPoint] = useState<GeoLocationNode | null>(GEO_POINTS[0]);
  const [radiusBuffer, setRadiusBuffer] = useState<number>(2.5);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [layers, setLayers] = useState({ cdr: true, bank: true, ipdr: true });

  const CENTER: [number, number] = [30.7350, 76.7760];
  const trajectoryPath: [number, number][] = GEO_POINTS.map(p => [p.lat, p.lng]);

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: GEO_POINTS.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { name: p.name, domain: p.domain, time: p.time, address: p.address, details: p.details },
      })),
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'case_2847_geodossier.geojson';
    a.click();
    showToast('Exported GeoJSON dossier for Case #2847.', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#2847</span>
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

      <AnalysisNav />

      {/* Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch" style={{ height: '640px' }}>

        {/* Left HUD Panel */}
        <div className="lg:col-span-4 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider">Spatial Parameters</h3>
            <span className="material-symbols-outlined text-[#64748B] text-[18px]">tune</span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar text-xs">
            {/* Search */}
            <div>
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-1.5">Search Location / Landmark</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[16px]">location_on</span>
                <input type="text" defaultValue="Sector 17 & Sector 22, Chandigarh"
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]" />
              </div>
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider">Radius Buffer</label>
                <span className="font-mono font-bold text-[#0B5CAB]">{radiusBuffer} km</span>
              </div>
              <input type="range" min="0.5" max="10" step="0.5" value={radiusBuffer}
                onChange={e => setRadiusBuffer(parseFloat(e.target.value))}
                className="w-full accent-[#0B5CAB] cursor-pointer" />
            </div>

            {/* Target Entity */}
            <div>
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-1.5">Target Entity</label>
              <select className="w-full py-1.5 px-3 bg-[#F8FAFC] border border-[#D9E1EA] rounded text-xs font-medium cursor-pointer">
                <option>Rajesh Verma (Case #2847 Primary)</option>
                <option>IMEI 864359012345219 (OnePlus)</option>
                <option>Sector 17 Watchlist Cluster</option>
              </select>
            </div>

            {/* Layer Toggles */}
            <div className="pt-2 border-t border-[#EDF0F4]">
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-2.5">Data Overlays</label>
              <div className="space-y-2">
                {[
                  { key: 'cdr', icon: 'cell_tower', color: '#0891B2', label: 'Cell Towers (CDR)' },
                  { key: 'bank', icon: 'local_atm', color: '#F97316', label: 'Financial Nodes (ATMs/Banks)' },
                  { key: 'ipdr', icon: 'router', color: '#7C3AED', label: 'IP Geolocation' },
                ].map(({ key, icon, color, label }) => (
                  <label key={key} className="flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#EDF0F4] cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
                      <span className="font-medium text-[#191C1E]">{label}</span>
                    </div>
                    <input type="checkbox" checked={(layers as any)[key]}
                      onChange={e => setLayers({ ...layers, [key]: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#0B5CAB]" />
                  </label>
                ))}
              </div>
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
                Geo-Points ({GEO_POINTS.length})
              </label>
              <div className="space-y-1.5">
                {GEO_POINTS.map((pt, idx) => (
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

            {/* Radius buffer circle (from slider) */}
            <Circle center={[GEO_POINTS[0].lat, GEO_POINTS[0].lng]} radius={radiusBuffer * 1000}
              pathOptions={{ color: '#0B5CAB', fillColor: '#0B5CAB', fillOpacity: 0.04, weight: 2, dashArray: '8, 4' }} />

            {/* Individual geo-point markers */}
            {GEO_POINTS.map((pt, idx) => {
              const show =
                (pt.domain === 'CDR' && layers.cdr) ||
                (pt.domain === 'BANK' && layers.bank) ||
                (pt.domain === 'IPDR' && layers.ipdr);
              if (!show) return null;

              return (
                <React.Fragment key={pt.id}>
                  <Circle center={[pt.lat, pt.lng]} radius={pt.radiusKm * 1000}
                    pathOptions={{ color: pt.color, fillColor: pt.color, fillOpacity: 0.08, weight: 1.5, dashArray: '5,5' }} />
                  <Marker position={[pt.lat, pt.lng]} icon={createColoredIcon(pt.color)}
                    eventHandlers={{ click: () => setSelectedPoint(pt) }}>
                    <Popup maxWidth={260}>
                      <div style={{ fontFamily: 'inherit', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ background: pt.color, color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace' }}>
                            {pt.domain}
                          </span>
                          <span style={{ color: '#64748B', fontSize: '10px', fontFamily: 'monospace' }}>#{idx + 1}</span>
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

