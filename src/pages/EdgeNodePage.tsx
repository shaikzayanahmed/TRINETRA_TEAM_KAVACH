import React, { useState, useEffect } from 'react';
import { EdgeNode } from '../types';
import { apiService } from '../services/apiService';

export const EdgeNodePage: React.FC = () => {
  const [node, setNode] = useState<EdgeNode | null>(null);

  useEffect(() => {
    const fetchNode = async () => {
      const nodes = await apiService.getEdgeNodes();
      setNode(nodes[0]);
    };
    fetchNode();
  }, []);

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">router</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Edge Node & Hardware Engine — EDGE-01
            </h1>
            <span className="font-mono text-[11px] text-outline">
              NORTHERN BORDER SECTOR 07 · RUGGEDIZED JETSON AGX ORIN CORE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-lg bg-surface-container text-secondary border border-secondary/30 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>AI ENGINE ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Main End-to-End Processing Flow Architecture */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-2">
          <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
            Edge-to-Command Tactical Processing Pipeline
          </h2>
          <span className="font-mono text-[10px] text-primary">INT8 TENSORRT ACCELERATED</span>
        </div>

        {/* Step Flow Diagram */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs text-center">
          <div className="p-3 rounded-lg bg-surface-container-lowest border border-primary/30 shadow-tactical-inset flex flex-col items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-xl">videocam</span>
            <span className="font-bold text-on-surface">1. Sensor Feeds</span>
            <span className="text-[10px] text-secondary">RGB + LWIR</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-lowest border border-primary/30 shadow-tactical-inset flex flex-col items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-xl">memory</span>
            <span className="font-bold text-on-surface">2. EDGE-01</span>
            <span className="text-[10px] text-primary">NVDEC Decode</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-lowest border border-primary/30 shadow-tactical-inset flex flex-col items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-xl">psychology</span>
            <span className="font-bold text-on-surface">3. AI Detection</span>
            <span className="text-[10px] text-secondary">YOLOv8 INT8</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-lowest border border-primary/30 shadow-tactical-inset flex flex-col items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-xl">near_me</span>
            <span className="font-bold text-on-surface">4. Target Track</span>
            <span className="text-[10px] text-secondary">Kalman Vector</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-lowest border border-error/40 shadow-tactical-inset flex flex-col items-center gap-1.5">
            <span className="material-symbols-outlined text-error text-xl">warning</span>
            <span className="font-bold text-on-surface">5. Alert Trigger</span>
            <span className="text-[10px] text-error">ALT-7821</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-lowest border border-secondary/40 shadow-tactical-inset flex flex-col items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-xl">terminal</span>
            <span className="font-bold text-on-surface">6. Command Center</span>
            <span className="text-[10px] text-secondary">Live Telemetry</span>
          </div>
        </div>
      </div>

      {/* Edge Hardware Telemetry Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hardware Status Card */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3 font-mono text-xs">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2">
            Edge Compute & Thermal Specifications
          </span>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-outline">
            <span>Hardware Architecture:</span>
            <span className="text-right text-on-surface">{node?.hardwareModel || 'NVIDIA Jetson AGX Orin'}</span>

            <span>Neural Acceleration:</span>
            <span className="text-right text-secondary font-bold">{node?.accelerator || 'TensorRT INT8'}</span>

            <span>Inference Latency:</span>
            <span className="text-right text-secondary font-bold">{node?.inferenceLatencyMs || 4.6} ms / frame</span>

            <span>Power Envelope:</span>
            <span className="text-right text-primary font-bold">{node?.powerConsumptionW || 14.8} W (Under 15W Target)</span>

            <span>SoC Core Temp:</span>
            <span className="text-right text-on-surface">{node?.temperatureC || 41.2}°C</span>

            <span>System Uptime:</span>
            <span className="text-right text-on-surface">{node?.uptime || '14d 08h 22m'}</span>
          </div>
        </div>

        {/* Connected Sensors Card */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3 font-mono text-xs">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2">
            Connected Multi-Spectral Sensors
          </span>

          <div className="flex flex-col gap-2">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                <span className="font-bold text-on-surface">CAM-RGB-01 (Laptop RGB Camera)</span>
              </div>
              <span className="text-secondary font-bold">ONLINE · 30 FPS</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse" />
                <span className="font-bold text-on-surface">CAM-LWIR-01 (LWIR Thermal Camera)</span>
              </div>
              <span className="text-tertiary font-bold">NOT CONNECTED · STANDBY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
