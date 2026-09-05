import React, { useState, useEffect } from 'react';
import { VirtualFence } from '../types';
import { apiService } from '../services/apiService';
import { TacticalMapViewer } from '../components/map/TacticalMapViewer';
import { useDemo } from '../context/DemoContext';

export const VirtualFencePage: React.FC = () => {
  const [fences, setFences] = useState<VirtualFence[]>([]);
  const [threshold, setThreshold] = useState<number>(85.0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [zoneName, setZoneName] = useState<string>('Zone Alpha');

  const { isFenceBreached, activeAlert, triggerBreach, resetDemo } = useDemo();

  useEffect(() => {
    const fetchFences = async () => {
      const data = await apiService.getVirtualFences();
      setFences(data);
      if (data.length > 0) {
        setIsActive(data[0].status === 'ACTIVE');
        setThreshold(data[0].confidenceThreshold);
        setZoneName(data[0].name || 'Zone Alpha');
      }
    };
    fetchFences();
  }, []);

  const handleToggleActive = async () => {
    const nextStatus = isActive ? 'INACTIVE' : 'ACTIVE';
    setIsActive(!isActive);
    if (fences.length > 0) {
      await apiService.toggleVirtualFence(fences[0].id, nextStatus);
    }
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">fence</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Virtual Fence & Spatial Tripwire
            </h1>
            <span className="font-mono text-[11px] text-outline">
              POLYGON BOUNDARY HEURISTICS · SHAPELY GEOMETRY ENGINE
            </span>
          </div>
        </div>

        {/* Breach Indicator & Actions */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={isFenceBreached ? resetDemo : triggerBreach}
            className={`px-3 py-1.5 rounded-lg border font-bold uppercase transition-all shadow-md flex items-center gap-1.5 ${
              isFenceBreached
                ? 'bg-secondary text-on-secondary border-secondary hover:bg-secondary/90'
                : 'bg-error-container text-on-error border-error/50 hover:bg-error animate-pulse'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isFenceBreached ? 'check_circle' : 'crisis_alert'}
            </span>
            <span>{isFenceBreached ? 'RESET BREACH STATE' : 'TEST TRIPWIRE BREACH'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Map and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Map Stage (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <TacticalMapViewer interactive={true} compact={false} />
        </div>

        {/* Configuration Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
              <div className="flex flex-col">
                <span className="font-headline text-sm font-bold text-on-surface uppercase">
                  {zoneName} Configuration
                </span>
                <span className="font-mono text-[11px] text-outline">
                  SECTOR 07 PRIMARY TRIPWIRE
                </span>
              </div>

              <button
                onClick={handleToggleActive}
                className={`px-3 py-1 rounded-lg font-mono text-xs font-bold uppercase transition-colors ${
                  isActive
                    ? 'bg-secondary-container text-secondary border border-secondary/40'
                    : 'bg-surface-container text-outline border border-surface-container-high'
                }`}
              >
                {isActive ? 'STATUS: ACTIVE' : 'STATUS: INACTIVE'}
              </button>
            </div>

            {/* Sensitivity Presets */}
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <span className="text-outline uppercase text-[11px]">Threshold Presets:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'HIGH (95%)', val: 95 },
                  { label: 'BALANCED (85%)', val: 85 },
                  { label: 'SENSITIVE (70%)', val: 70 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    onClick={() => setThreshold(preset.val)}
                    className={`p-1.5 rounded text-[10px] font-semibold transition-colors ${
                      threshold === preset.val
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-surface-container-lowest text-outline hover:text-on-surface border border-surface-container-high'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-outline uppercase">AI Confidence Threshold:</span>
                <span className="text-primary font-bold text-sm">{threshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-2 bg-surface-container-lowest rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-[10px] text-outline">
                Inference detections below {threshold}% are filtered to prevent false positive breach alarms.
              </span>
            </div>

            {/* Assigned Sensors */}
            <div className="p-3.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-2 font-mono text-xs">
              <span className="font-bold text-on-surface uppercase text-[11px]">
                Assigned Surveillance Feeds:
              </span>
              <div className="flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between p-1.5 px-2 rounded bg-surface-container-low border border-surface-container-high/40">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-on-surface font-semibold">CAM-RGB-01</span>
                    <span className="text-outline text-[10px]">(Laptop RGB)</span>
                  </div>
                  <span className="text-secondary font-bold">ONLINE</span>
                </div>

                <div className="flex items-center justify-between p-1.5 px-2 rounded bg-surface-container-low border border-surface-container-high/40">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    <span className="text-on-surface font-semibold">CAM-LWIR-01</span>
                    <span className="text-outline text-[10px]">(Thermal)</span>
                  </div>
                  <span className="text-tertiary font-bold">WAITING</span>
                </div>
              </div>
            </div>

            {/* Boundary Heuristic Parameters */}
            <div className="p-3.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-2 font-mono text-xs">
              <span className="text-outline">Geometry Type:</span>
              <span className="text-right text-on-surface">Polygon (4 Nodes)</span>

              <span className="text-outline">Perimeter Length:</span>
              <span className="text-right text-primary">1,420 Meters</span>

              <span className="text-outline">Total Breaches:</span>
              <span className="text-right text-error font-bold">{isFenceBreached ? 1 : 0}</span>

              <span className="text-outline">Last Event:</span>
              <span className="text-right text-secondary">{activeAlert ? activeAlert.timestamp : '14:32:18'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

