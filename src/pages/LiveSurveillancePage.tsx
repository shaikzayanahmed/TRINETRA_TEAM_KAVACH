import React, { useState, useEffect } from 'react';
import { Camera } from '../types';
import { apiService } from '../services/apiService';
import { CameraPanel } from '../components/camera/CameraPanel';
import { useDemo } from '../context/DemoContext';

export const LiveSurveillancePage: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [opticalFilter, setOpticalFilter] = useState<'STANDARD' | 'CONTRAST_ENHANCED' | 'HIGH_PASS'>('STANDARD');
  const [selectedFeed, setSelectedFeed] = useState<string>('CAM-RGB-01');

  const { activeTarget, isFenceBreached, startDemo, isRunning } = useDemo();

  useEffect(() => {
    const fetchCameras = async () => {
      const data = await apiService.getCameras();
      setCameras(data);
    };
    fetchCameras();
  }, []);

  if (cameras.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center font-mono text-xs text-primary">
        <span className="material-symbols-outlined text-3xl animate-spin mr-2">progress_activity</span>
        <span>INITIALIZING SURVEILLANCE STAGE...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Top Controls & Surveillance Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">videocam</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Live Surveillance & Multi-Spectral Feeds
            </h1>
            <span className="font-mono text-[11px] text-outline">
              SECTOR 07 · DUAL-SENSOR SYNCHRONIZED SURVEILLANCE MATRIX
            </span>
          </div>
        </div>

        {/* Tactical Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setShowOverlays((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              showOverlays
                ? 'bg-primary/20 text-primary border-primary/40 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]'
                : 'bg-surface-container text-outline border-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>AI OVERLAYS: {showOverlays ? 'ON' : 'OFF'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high text-[11px]">
            <span className="text-outline">FILTER:</span>
            {(['STANDARD', 'CONTRAST_ENHANCED', 'HIGH_PASS'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setOpticalFilter(filter)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  opticalFilter === filter ? 'bg-surface-container-high text-primary' : 'text-outline hover:text-on-surface'
                }`}
              >
                {filter === 'STANDARD' ? 'STD' : filter === 'CONTRAST_ENHANCED' ? 'ENH' : 'HIPASS'}
              </button>
            ))}
          </div>

          {!isRunning && (
            <button
              onClick={startDemo}
              className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.3)] flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              <span>TEST THREAT DETECTION</span>
            </button>
          )}
        </div>
      </div>

      {/* Exactly Two Surveillance Camera Panels: RGB & LWIR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Primary RGB Camera: Actual Laptop Webcam */}
        <div
          onClick={() => setSelectedFeed('CAM-RGB-01')}
          className={`flex flex-col gap-2 cursor-pointer transition-all ${
            selectedFeed === 'CAM-RGB-01' ? 'ring-1 ring-primary/60 rounded-xl' : 'opacity-90'
          }`}
        >
          <CameraPanel camera={cameras[0]} showDetection={showOverlays} />
        </div>

        {/* Secondary LWIR Thermal Camera: Clean Waiting Placeholder */}
        <div
          onClick={() => setSelectedFeed('CAM-LWIR-01')}
          className={`flex flex-col gap-2 cursor-pointer transition-all ${
            selectedFeed === 'CAM-LWIR-01' ? 'ring-1 ring-tertiary/60 rounded-xl' : 'opacity-90'
          }`}
        >
          <CameraPanel camera={cameras[1]} showDetection={false} />
        </div>
      </div>

      {/* Sensor Calibration & Optical Telemetry Detail Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-xs border-b border-surface-container-high/40 pb-1.5">
            <span className="font-bold text-on-surface uppercase">CAM-RGB-01 (Visible)</span>
            <span className="text-secondary font-bold">[ONLINE]</span>
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-outline">
            <span>Spectral Band:</span>
            <span className="text-right text-on-surface">0.4 - 0.7 μm</span>
            <span>Lens Aperture:</span>
            <span className="text-right text-on-surface">f/1.8 Wide Angle</span>
            <span>Parallax Correction:</span>
            <span className="text-right text-secondary">Calibrated (0.0mm)</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-xs border-b border-surface-container-high/40 pb-1.5">
            <span className="font-bold text-on-surface uppercase">CAM-LWIR-01 (Thermal)</span>
            <span className="text-tertiary font-bold">[WAITING FOR INPUT]</span>
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-outline">
            <span>Spectral Band:</span>
            <span className="text-right text-on-surface">8.0 - 14.0 μm</span>
            <span>Sensor Core:</span>
            <span className="text-right text-on-surface">Uncooled VOx Microbolometer</span>
            <span>Status:</span>
            <span className="text-right text-tertiary font-semibold">Ready for Hardware</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-xs border-b border-surface-container-high/40 pb-1.5">
            <span className="font-bold text-on-surface uppercase">Active AI Lock</span>
            <span className={activeTarget ? 'text-error font-bold' : 'text-secondary font-bold'}>
              {activeTarget ? 'TARGET LOCKED' : 'SEARCHING'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-outline">
            <span>Target:</span>
            <span className="text-right text-primary font-bold">{activeTarget ? activeTarget.id : 'NONE'}</span>
            <span>Confidence:</span>
            <span className="text-right text-secondary font-bold">{activeTarget ? `${activeTarget.confidence}%` : '---'}</span>
            <span>Boundary State:</span>
            <span className={`text-right font-bold ${isFenceBreached ? 'text-error animate-pulse' : 'text-secondary'}`}>
              {isFenceBreached ? 'TRIPWIRE BREACH' : 'SECURE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
