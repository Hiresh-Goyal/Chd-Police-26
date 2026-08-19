import React, { useState } from 'react';
import { AnalysisNav } from '../components/shell/AnalysisNav';
import { DomainBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

interface GeoLocationNode {
  id: string;
  name: string;
  type: 'CDR_TOWER' | 'IP_LOCATION' | 'BANK_BRANCH' | 'ATM_CASHOUT';
  domain: 'CDR' | 'IPDR' | 'BANK';
  coordinates: string;
  time: string;
  address: string;
  radiusKm: number;
  details: string;
  xPercent: number;
  yPercent: number;
}

const GEO_POINTS: GeoLocationNode[] = [
  {
    id: 'geo_1',
    name: 'Cell Tower Sector 17 (Tower A)',
    type: 'CDR_TOWER',
    domain: 'CDR',
    coordinates: '30.7398° N, 76.7827° E',
    time: '14:00:12 IST (15 Aug 2026)',
    address: 'Sector 17 Plaza Telecom Mast #45892',
    radiusKm: 1.8,
    details: '14m 23s voice call to victim handset (+91 9988776655)',
    xPercent: 32,
    yPercent: 42
  },
  {
    id: 'geo_2',
    name: 'Cyber Cafe Proxy Hub (Node Alpha)',
    type: 'IP_LOCATION',
    domain: 'IPDR',
    coordinates: '30.7412° N, 76.7795° E',
    time: '14:28:44 IST (15 Aug 2026)',
    address: 'Shop 14, Sector 17-D Market, Chandigarh',
    radiusKm: 0.5,
    details: 'IP 103.76.234.12 logged data transmission to NetBanking',
    xPercent: 44,
    yPercent: 34
  },
  {
    id: 'geo_3',
    name: 'HDFC Bank Sector 22 Branch',
    type: 'BANK_BRANCH',
    domain: 'BANK',
    coordinates: '30.7324° N, 76.7690° E',
    time: '14:32:05 IST (15 Aug 2026)',
    address: 'SCO 88-89, Sector 22-C, Chandigarh',
    radiusKm: 0.8,
    details: '₹48,000 IMPS credit to HDFC XXXXXXX4521',
    xPercent: 62,
    yPercent: 55
  },
  {
    id: 'geo_4',
    name: 'Sector 22 Market ATM Booth',
    type: 'ATM_CASHOUT',
    domain: 'BANK',
    coordinates: '30.7298° N, 76.7712° E',
    time: '15:10:18 IST (15 Aug 2026)',
    address: 'ATM ID SIB8922, Near Bus Stand, Sector 22',
    radiusKm: 0.2,
    details: 'Physical cash withdrawal of ₹47,500',
    xPercent: 78,
    yPercent: 68
  }
];

export const GeospatialMap: React.FC = () => {
  const { showToast } = useToast();

  const [selectedPoint, setSelectedPoint] = useState<GeoLocationNode | null>(GEO_POINTS[0]);
  const [radiusBuffer, setRadiusBuffer] = useState<number>(2.5);
  const [layers, setLayers] = useState({
    cdr: true,
    bank: true,
    ipdr: true,
    geofence: true
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <header className="border-b border-[#D9E1EA] pb-3 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <span className="font-mono bg-[#EFF6FF] text-[#0B5CAB] px-1.5 py-0.5 rounded font-bold">#2847</span>
            <span>•</span>
            <span>Spatial Geo-Trajectory & Cell Tower Triangulation</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">Geospatial Investigation</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="my_location"
            onClick={() => showToast('Recentered map on Chandigarh UT Cyber Operations sector.', 'info')}
          >
            Center on Target
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="download"
            onClick={() => showToast('Exported KML geo-dossier.', 'success')}
          >
            Export GeoJSON
          </Button>
        </div>
      </header>

      {/* Analysis Tabs */}
      <AnalysisNav />

      {/* Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] items-stretch">
        {/* Left HUD Panel: Controls (4 cols / ~32%) */}
        <div className="lg:col-span-4 bg-white border border-[#D9E1EA] rounded-md shadow-xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center">
            <h3 className="text-xs font-bold text-[#0B2340] uppercase tracking-wider">Spatial Parameters</h3>
            <span className="material-symbols-outlined text-[#64748B] text-[18px]">tune</span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar text-xs">
            {/* Search Location */}
            <div>
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-1.5">
                Search Location / Landmark
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[16px]">
                  location_on
                </span>
                <input
                  type="text"
                  defaultValue="Sector 17 & Sector 22, Chandigarh"
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
                />
              </div>
            </div>

            {/* Radius Buffer Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider">
                  Radius Buffer
                </label>
                <span className="font-mono font-bold text-[#0B5CAB]">{radiusBuffer} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={radiusBuffer}
                onChange={e => setRadiusBuffer(parseFloat(e.target.value))}
                className="w-full accent-[#0B5CAB] cursor-pointer"
              />
            </div>

            {/* Target Entity */}
            <div>
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-1.5">
                Target Entity
              </label>
              <select className="w-full py-1.5 px-3 bg-[#F8FAFC] border border-[#D9E1EA] rounded text-xs font-medium cursor-pointer">
                <option>Rajesh Verma (Case #2847 Primary)</option>
                <option>IMEI 864359012345219 (OnePlus)</option>
                <option>Sector 17 Watchlist Cluster</option>
              </select>
            </div>

            {/* Data Overlays Toggles */}
            <div className="pt-2 border-t border-[#EDF0F4]">
              <label className="text-[11px] font-bold text-[#424751] uppercase tracking-wider block mb-2.5">
                Data Overlays
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#EDF0F4] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0891B2] text-[18px]">cell_tower</span>
                    <span className="font-medium text-[#191C1E]">Cell Towers (CDR)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layers.cdr}
                    onChange={e => setLayers({ ...layers, cdr: e.target.checked })}
                    className="w-4 h-4 text-[#0B5CAB] rounded accent-[#0B5CAB]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#EDF0F4] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#F97316] text-[18px]">local_atm</span>
                    <span className="font-medium text-[#191C1E]">Financial Nodes (ATMs/Banks)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layers.bank}
                    onChange={e => setLayers({ ...layers, bank: e.target.checked })}
                    className="w-4 h-4 text-[#0B5CAB] rounded accent-[#0B5CAB]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#EDF0F4] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7C3AED] text-[18px]">router</span>
                    <span className="font-medium text-[#191C1E]">IP Geolocation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layers.ipdr}
                    onChange={e => setLayers({ ...layers, ipdr: e.target.checked })}
                    className="w-4 h-4 text-[#0B5CAB] rounded accent-[#0B5CAB]"
                  />
                </label>
              </div>
            </div>

            {/* Selected Waypoint Info in Left Sidebar */}
            {selectedPoint && (
              <div className="p-3 rounded bg-[#EFF6FF] border border-[#0B5CAB]/30 mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <DomainBadge domain={selectedPoint.domain} size="sm" />
                  <span className="font-mono text-[10px] text-[#0B5CAB] font-bold">WAYPOINT</span>
                </div>
                <div className="font-bold text-xs text-[#0B2340] mb-0.5">{selectedPoint.name}</div>
                <div className="text-[11px] text-[#64748B] mb-2">{selectedPoint.address}</div>
                <div className="font-mono text-[10px] text-[#191C1E] bg-white p-1.5 rounded border border-[#0B5CAB]/20">
                  {selectedPoint.time} • {selectedPoint.coordinates}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map View Canvas (8 cols / ~68%) */}
        <div className="lg:col-span-8 bg-[#0F172A] border border-[#334155] rounded-md shadow-xs relative overflow-hidden flex flex-col">
          {/* Tactical Map Canvas with Real Police Styling & Roads Simulation */}
          <div className="w-full h-full relative grid-pattern-dark flex items-center justify-center select-none">
            {/* Compass HUD */}
            <div className="absolute top-4 right-4 z-10 bg-[#1E293B]/80 backdrop-blur-xs border border-gray-700 text-gray-300 rounded p-2 text-center text-[10px] font-mono">
              <span className="font-bold block text-cyan-400">N ↑</span>
              <span>GRID UT</span>
            </div>

            {/* Sector Boundary Label HUD */}
            <div className="absolute top-4 left-4 z-10 bg-[#1E293B]/80 backdrop-blur-xs border border-gray-700 text-gray-300 rounded px-3 py-1.5 text-xs font-mono">
              <span className="text-cyan-400 font-bold">SECTOR 17 ↔ SECTOR 22 CORRIDOR</span>
              <span className="block text-[10px] text-gray-400">Chandigarh Police Tactical GIS</span>
            </div>

            {/* Vector Roads & Movement Trajectory SVG */}
            <svg className="absolute inset-0 w-full h-full">
              {/* Road Grid Lines */}
              <line x1="10%" y1="20%" x2="90%" y2="80%" stroke="#334155" strokeWidth="6" strokeOpacity="0.4" />
              <line x1="20%" y1="70%" x2="80%" y2="20%" stroke="#334155" strokeWidth="6" strokeOpacity="0.4" />
              <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#334155" strokeWidth="4" strokeOpacity="0.3" />
              <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#334155" strokeWidth="4" strokeOpacity="0.3" />

              {/* Suspect Path Trajectory (14:00 to 15:10) */}
              <path
                d="M 280 280 Q 420 220 540 360 T 720 440"
                fill="none"
                stroke="#DC2626"
                strokeWidth="3"
                strokeDasharray="6,4"
                className="anim-dash"
              />

              {/* Tower Coverage Radar Circles */}
              {layers.cdr && (
                <circle
                  cx="280"
                  cy="280"
                  r={radiusBuffer * 35}
                  fill="#0891B2"
                  fillOpacity="0.08"
                  stroke="#0891B2"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
              )}

              {layers.bank && (
                <circle
                  cx="720"
                  cy="440"
                  r="45"
                  fill="#F97316"
                  fillOpacity="0.12"
                  stroke="#F97316"
                  strokeWidth="1.5"
                />
              )}
            </svg>

            {/* Interactive Location Markers */}
            <div className="absolute inset-0 pointer-events-none">
              {GEO_POINTS.map((pt, idx) => {
                const isSelected = selectedPoint?.id === pt.id;
                let markerBg = 'bg-[#0891B2]';
                let icon = 'cell_tower';

                if (pt.domain === 'BANK') {
                  markerBg = 'bg-[#F97316]';
                  icon = pt.type === 'ATM_CASHOUT' ? 'local_atm' : 'account_balance';
                } else if (pt.domain === 'IPDR') {
                  markerBg = 'bg-[#7C3AED]';
                  icon = 'router';
                }

                return (
                  <div
                    key={pt.id}
                    onClick={() => setSelectedPoint(pt)}
                    className={`absolute pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 transition-transform ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-10'
                    }`}
                    style={{ left: `${pt.xPercent}%`, top: `${pt.yPercent}%` }}
                  >
                    {/* Marker Pin */}
                    <div
                      className={`w-9 h-9 rounded-full ${markerBg} text-white flex items-center justify-center shadow-lg border-2 border-white ${
                        isSelected ? 'ring-4 ring-cyan-400/50 animate-bounce' : ''
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>

                    {/* Marker Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-[#0F172A] border border-gray-700 text-white px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap shadow-md text-center">
                      <div className="font-bold text-cyan-300">#{idx + 1} {pt.name}</div>
                      <div className="text-gray-400">{pt.time.split(' ')[0]}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Status bar */}
            <div className="absolute bottom-3 right-4 z-10 bg-[#1E293B]/90 border border-gray-700 px-3 py-1.5 rounded text-xs font-mono text-gray-300 flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                GPS Triangulation Active
              </span>
              <span className="text-gray-500">|</span>
              <span>4 Geo-Points Linked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
