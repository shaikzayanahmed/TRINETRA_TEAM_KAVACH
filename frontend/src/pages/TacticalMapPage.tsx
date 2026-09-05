import React from 'react';
import { TacticalMapViewer } from '../components/map/TacticalMapViewer';
import { useDemo } from '../context/DemoContext';

export const TacticalMapPage: React.FC = () => {
  const { activeTarget, isFenceBreached, activeAlert } = useDemo();

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header Bar */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">map</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Tactical GIS Map — Sector 07
            </h1>
            <span className="font-mono text-[11px] text-outline">
              NORTHERN LEH BORDER · ELEVATION 3,420M · GRIDCUT MGRS 43S ED 4821
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-surface-container-high">
            <span className="text-outline">PERIMETER:</span>
            <span className={`font-bold ${isFenceBreached ? 'text-error animate-pulse' : 'text-secondary'}`}>
              {isFenceBreached ? 'TRIPWIRE BREACH (ZONE ALPHA)' : 'SECURED'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Map Viewer */}
      <TacticalMapViewer interactive={true} compact={false} />

      {/* Sector Geodetic & Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-1">
            Sector Geodetic Grid
          </span>
          <div className="grid grid-cols-2 gap-1 text-[11px] text-outline">
            <span>Center Datum:</span>
            <span className="text-right text-on-surface">WGS-84</span>
            <span>Coordinates:</span>
            <span className="text-right text-primary">34.2911° N, 77.7533° E</span>
            <span>Altitude Range:</span>
            <span className="text-right text-on-surface">3,200m - 4,100m MSL</span>
            <span>Terrain Profile:</span>
            <span className="text-right text-on-surface">High-Altitude Arid Ridge</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-1">
            Deployed Asset Telemetry
          </span>
          <div className="grid grid-cols-2 gap-1 text-[11px] text-outline">
            <span>EDGE-01 Core:</span>
            <span className="text-right text-secondary font-bold">ONLINE (OP-07)</span>
            <span>CAM-RGB-01:</span>
            <span className="text-right text-primary font-bold">ONLINE (1080p)</span>
            <span>CAM-LWIR-01:</span>
            <span className="text-right text-tertiary">WAITING (FLIR)</span>
            <span>Radio Link:</span>
            <span className="text-right text-secondary">DMR Mesh (99.8%)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-1">
            Active Threat Tracking
          </span>
          <div className="grid grid-cols-2 gap-1 text-[11px] text-outline">
            <span>Active Target:</span>
            <span className="text-right text-primary font-bold">{activeTarget ? activeTarget.id : 'NONE'}</span>
            <span>Classification:</span>
            <span className="text-right text-error font-bold">{activeTarget ? activeTarget.classification : 'NONE'}</span>
            <span>Confidence:</span>
            <span className="text-right text-secondary font-bold">{activeTarget ? `${activeTarget.confidence}%` : '---'}</span>
            <span>Active Alert:</span>
            <span className={`text-right font-bold ${activeAlert ? 'text-error' : 'text-secondary'}`}>
              {activeAlert ? activeAlert.id : 'NO THREATS'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
