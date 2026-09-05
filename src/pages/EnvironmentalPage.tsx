import React, { useState, useEffect } from 'react';
import { EnvironmentStatus } from '../types';
import { apiService } from '../services/apiService';

export const EnvironmentalPage: React.FC = () => {
  const [env, setEnv] = useState<EnvironmentStatus | null>(null);

  useEffect(() => {
    const fetchEnv = async () => {
      const data = await apiService.getEnvironment();
      setEnv(data);
    };
    fetchEnv();
  }, []);

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">thermostat</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Environmental Monitoring & Noise Filtering
            </h1>
            <span className="font-mono text-[11px] text-outline">
              SECTOR 07 ATMOSPHERICS · ADAPTIVE TERRAIN & OPTICAL NOISE COMPENSATION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-lg bg-surface-container text-secondary border border-secondary/30 font-bold">
            ATMOSPHERICS: OPTIMAL
          </span>
        </div>
      </div>

      {/* Core Atmospheric Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-2xl">device_thermostat</span>
          <span className="text-outline text-[11px] uppercase">Temperature</span>
          <span className="font-mono text-2xl lg:text-3xl font-bold text-on-surface">
            {env?.temperatureC || 18}°C
          </span>
          <span className="text-[10px] text-secondary">Nominal Operating Range</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-2xl">visibility</span>
          <span className="text-outline text-[11px] uppercase">Visibility</span>
          <span className="font-mono text-2xl lg:text-3xl font-bold text-secondary">
            {env?.visibility || 'Good'}
          </span>
          <span className="text-[10px] text-outline">&gt; 10 km Line of Sight</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-tertiary text-2xl">wb_sunny</span>
          <span className="text-outline text-[11px] uppercase">Weather Condition</span>
          <span className="font-mono text-2xl lg:text-3xl font-bold text-on-surface">
            {env?.weather || 'Clear'}
          </span>
          <span className="text-[10px] text-outline">Wind: {env?.windSpeedKmh || 8.4} km/h</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-2xl">psychology</span>
          <span className="text-outline text-[11px] uppercase">AI Detection State</span>
          <span className="font-mono text-2xl lg:text-3xl font-bold text-secondary">
            {env?.aiDetectionCondition || 'NORMAL'}
          </span>
          <span className="text-[10px] text-secondary">Noise Filters Active</span>
        </div>
      </div>

      {/* Sensor Conditions & Dynamic Terrain Compensation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2">
            Sensor Operating Health
          </span>

          <div className="flex flex-col gap-2">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                <span className="font-bold text-on-surface">CAM-RGB-01 (Visible)</span>
              </div>
              <span className="text-secondary font-bold">CONDITION: {env?.rgbCameraCondition || 'GOOD'}</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                <span className="font-bold text-on-surface">CAM-LWIR-01 (Thermal)</span>
              </div>
              <span className="text-tertiary font-bold">{env?.lwirCameraCondition || 'NOT CONNECTED'}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2">
            Multi-Sensor Environmental Noise Compensation
          </span>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-outline">
            <span>Vegetation Wave Filter:</span>
            <span className="text-right text-secondary font-bold">ACTIVE (0 False Alarms)</span>

            <span>Atmospheric Parallax:</span>
            <span className="text-right text-secondary font-bold">Auto-Calibrated</span>

            <span>Riverbed Boundary Drift:</span>
            <span className="text-right text-on-surface">Dynamic Adjustment (ON)</span>

            <span>Telemetry Timestamp:</span>
            <span className="text-right text-primary">{env?.lastUpdated || '14:32:18 UTC+05:30'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
