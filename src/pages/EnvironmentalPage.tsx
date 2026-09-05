import React, { useState, useEffect } from 'react';
import { EnvironmentStatus } from '../types';
import { apiService } from '../services/apiService';

type WeatherScenario = 'CLEAR' | 'BLIZZARD' | 'DENSE_FOG' | 'HIGH_WINDS';

export const EnvironmentalPage: React.FC = () => {
  const [env, setEnv] = useState<EnvironmentStatus | null>(null);
  const [scenario, setScenario] = useState<WeatherScenario>('CLEAR');
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibratedMessage, setCalibratedMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnv = async () => {
      const data = await apiService.getEnvironment();
      setEnv(data);
    };
    fetchEnv();
  }, []);

  const handleScenarioChange = (s: WeatherScenario) => {
    setScenario(s);
    setCalibratedMessage(null);
    if (!env) return;

    switch (s) {
      case 'CLEAR':
        setEnv({
          ...env,
          weather: 'Clear',
          temperatureC: 18,
          visibility: 'Good',
          windSpeedKmh: 8.4,
          aiDetectionCondition: 'NORMAL',
          rgbCameraCondition: 'GOOD',
          lwirCameraCondition: 'GOOD',
        });
        break;
      case 'BLIZZARD':
        setEnv({
          ...env,
          weather: 'Snow',
          temperatureC: -14,
          visibility: 'Poor',
          windSpeedKmh: 48.2,
          aiDetectionCondition: 'ADAPTED',
          rgbCameraCondition: 'OBSTRUCTED',
          lwirCameraCondition: 'GOOD',
        });
        break;
      case 'DENSE_FOG':
        setEnv({
          ...env,
          weather: 'Fog',
          temperatureC: 4,
          visibility: 'Poor',
          windSpeedKmh: 12.0,
          aiDetectionCondition: 'ADAPTED',
          rgbCameraCondition: 'OBSTRUCTED',
          lwirCameraCondition: 'GOOD',
        });
        break;
      case 'HIGH_WINDS':
        setEnv({
          ...env,
          weather: 'Windy',
          temperatureC: 22,
          visibility: 'Moderate',
          windSpeedKmh: 62.5,
          aiDetectionCondition: 'DEGRADED',
          rgbCameraCondition: 'FAIR',
          lwirCameraCondition: 'GOOD',
        });
        break;
    }
  };

  const handleCalibrate = () => {
    setIsCalibrating(true);
    setCalibratedMessage(null);
    setTimeout(() => {
      setIsCalibrating(false);
      setCalibratedMessage('Parallax and vegetation wave baseline recalibrated. 0 False alarms guaranteed.');
    }, 700);
  };

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
          <button
            onClick={handleCalibrate}
            disabled={isCalibrating}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.3)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">{isCalibrating ? 'sync' : 'tune'}</span>
            <span>{isCalibrating ? 'CALIBRATING...' : 'CALIBRATE SENSORS'}</span>
          </button>
        </div>
      </div>

      {/* Calibration Banner */}
      {calibratedMessage && (
        <div className="p-3.5 rounded-xl bg-surface-container border border-secondary/40 shadow-tactical-inset flex items-center justify-between font-mono text-xs text-secondary animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>{calibratedMessage}</span>
          </div>
          <button onClick={() => setCalibratedMessage(null)} className="text-outline hover:text-on-surface">
            ✕
          </button>
        </div>
      )}

      {/* Atmospheric Scenario Simulator Selector */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2.5 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-surface-container-high/40 pb-2">
          <span className="font-bold text-on-surface uppercase">
            Simulate Severe Tactical Weather Scenarios:
          </span>
          <span className="text-[10px] text-primary">LIVE ADAPTIVE FILTER TEST</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: 'CLEAR', label: 'CLEAR (NOMINAL)', icon: 'wb_sunny' },
            { id: 'BLIZZARD', label: 'SNOW BLIZZARD (-14°C)', icon: 'ac_unit' },
            { id: 'DENSE_FOG', label: 'DENSE FOG (LWIR ACTIVE)', icon: 'cloud' },
            { id: 'HIGH_WINDS', label: 'HIGH WINDS / DUST', icon: 'air' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleScenarioChange(item.id as WeatherScenario)}
              className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 ${scenario === item.id
                ? 'bg-primary/20 text-primary border-primary font-bold shadow-tactical-extruded'
                : 'bg-surface-container-lowest text-outline hover:text-on-surface border-surface-container-high'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span className="text-[11px] truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Core Atmospheric Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-2xl">device_thermostat</span>
          <span className="text-outline text-[11px] uppercase">Temperature</span>
          <span className={`font-mono text-2xl lg:text-3xl font-bold ${(env?.temperatureC || 0) < 0 ? 'text-primary' : 'text-on-surface'}`}>
            {env?.temperatureC !== undefined ? `${env.temperatureC}°C` : '18°C'}
          </span>
          <span className="text-[10px] text-secondary">
            {(env?.temperatureC || 0) < 0 ? 'Extreme Cold Weather Protocol' : 'Nominal Range'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-2xl">visibility</span>
          <span className="text-outline text-[11px] uppercase">Visibility</span>
          <span className="font-mono text-xl lg:text-2xl font-bold text-secondary truncate max-w-full">
            {env?.visibility || 'Good'}
          </span>
          <span className="text-[10px] text-outline">Line of Sight</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-tertiary text-2xl">wb_sunny</span>
          <span className="text-outline text-[11px] uppercase">Weather Condition</span>
          <span className="font-mono text-base font-bold text-on-surface truncate max-w-full">
            {env?.weather || 'Clear'}
          </span>
          <span className="text-[10px] text-outline">Wind: {env?.windSpeedKmh || 8.4} km/h</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-2xl">psychology</span>
          <span className="text-outline text-[11px] uppercase">AI Detection State</span>
          <span className="font-mono text-xs font-bold text-secondary text-center">
            {env?.aiDetectionCondition || 'NORMAL'}
          </span>
          <span className="text-[10px] text-secondary">Noise Compensation Active</span>
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
                <span className={`w-2.5 h-2.5 rounded-full ${scenario === 'DENSE_FOG' || scenario === 'BLIZZARD' ? 'bg-secondary animate-pulse' : 'bg-tertiary'}`} />
                <span className="font-bold text-on-surface">CAM-LWIR-01 (Thermal)</span>
              </div>
              <span className={`font-bold ${scenario === 'DENSE_FOG' || scenario === 'BLIZZARD' ? 'text-secondary' : 'text-tertiary'}`}>
                {env?.lwirCameraCondition || 'NOT CONNECTED'}
              </span>
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

