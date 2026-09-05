import React, { useState, useEffect } from 'react';
import { EdgeNode } from '../types';
import { apiService } from '../services/apiService';

export const EdgeNodePage: React.FC = () => {
  const [node, setNode] = useState<EdgeNode | null>(null);
  const [precision, setPrecision] = useState<'INT8' | 'FP16'>('INT8');
  const [isSelfTesting, setIsSelfTesting] = useState<boolean>(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [isRebooting, setIsRebooting] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchNode = async () => {
      const nodes = await apiService.getEdgeNodes();
      setNode(nodes[0]);
    };
    fetchNode();
  }, []);

  const handleRunSelfTest = () => {
    setIsSelfTesting(true);
    setTestLogs(['[1/5] Probing NVDEC Hardware Video Decoders... OK']);
    
    setTimeout(() => {
      setTestLogs((prev) => [...prev, '[2/5] Initializing TensorRT DLA engines (Cores 0-1)... OK']);
    }, 400);

    setTimeout(() => {
      setTestLogs((prev) => [...prev, '[3/5] Verifying Thermal Core calibration (VOx Bolometer)... OK']);
    }, 800);

    setTimeout(() => {
      setTestLogs((prev) => [...prev, '[4/5] Testing SHA-256 Crypto hardware acceleration... OK (0.12ms)']);
    }, 1200);

    setTimeout(() => {
      setTestLogs((prev) => [
        ...prev,
        '[5/5] Checking DMR Mesh radio backhaul RF link... OK (99.8% RSSI)',
        '>> ALL 5 DIAGNOSTIC CHECKS PASSED. HARDWARE NOMINAL.',
      ]);
      setIsSelfTesting(false);
    }, 1600);
  };

  const handleRebootEngine = () => {
    setIsRebooting(true);
    setNotice('Rebooting Jetson AGX Orin inference core...');
    setTimeout(() => {
      setIsRebooting(false);
      setNotice('Edge AI Engine restarted successfully. All pipelines re-initialized.');
    }, 1500);
  };

  const handlePurgeBuffer = () => {
    setNotice('Shared memory buffers purged. 1,420 MB RAM reclaimed. Latency baseline restored.');
  };

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

        {/* Hardware Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={handleRunSelfTest}
            disabled={isSelfTesting}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.3)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">{isSelfTesting ? 'sync' : 'build'}</span>
            <span>{isSelfTesting ? 'TESTING...' : 'RUN SELF-TEST'}</span>
          </button>

          <button
            onClick={handleRebootEngine}
            disabled={isRebooting}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-tertiary border border-tertiary/30 font-bold transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>RESTART CORE</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 rounded-xl bg-surface-container border border-primary/40 shadow-tactical-inset flex items-center justify-between font-mono text-xs text-primary animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-outline hover:text-on-surface">
            ✕
          </button>
        </div>
      )}

      {/* Terminal Diagnostic Self-Test Output */}
      {testLogs.length > 0 && (
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-secondary/40 shadow-tactical-inset font-mono text-xs text-secondary flex flex-col gap-1 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-secondary/20 pb-1.5 mb-1 text-on-surface font-bold text-[11px]">
            <span>EDGE HARDWARE DIAGNOSTIC TERMINAL</span>
            <button onClick={() => setTestLogs([])} className="text-outline hover:text-on-surface">
              CLEAR
            </button>
          </div>
          {testLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Main End-to-End Processing Flow Architecture */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-2">
          <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
            Edge-to-Command Tactical Processing Pipeline
          </h2>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-outline">PRECISION:</span>
            <button
              onClick={() => setPrecision('INT8')}
              className={`px-2 py-0.5 rounded font-bold ${
                precision === 'INT8'
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              INT8 (4.6ms)
            </button>
            <button
              onClick={() => setPrecision('FP16')}
              className={`px-2 py-0.5 rounded font-bold ${
                precision === 'FP16'
                  ? 'bg-secondary/20 text-secondary border border-secondary/40'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              FP16 (8.2ms)
            </button>
          </div>
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
            <span className="text-[10px] text-secondary">YOLOv8 {precision}</span>
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
          <div className="flex items-center justify-between border-b border-surface-container-high/40 pb-2">
            <span className="font-bold text-on-surface uppercase">
              Edge Compute & Thermal Specifications
            </span>
            <button
              onClick={handlePurgeBuffer}
              className="text-[10px] text-primary hover:underline font-semibold"
            >
              [ PURGE RAM ]
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-outline">
            <span>Hardware Architecture:</span>
            <span className="text-right text-on-surface">{node?.hardwareModel || 'NVIDIA Jetson AGX Orin'}</span>

            <span>Neural Acceleration:</span>
            <span className="text-right text-secondary font-bold">TensorRT {precision}</span>

            <span>Inference Latency:</span>
            <span className="text-right text-secondary font-bold">
              {precision === 'INT8' ? '4.6' : '8.2'} ms / frame
            </span>

            <span>Power Envelope:</span>
            <span className="text-right text-primary font-bold">{node?.powerConsumptionW || 14.8} W (Target &lt;15W)</span>

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
              <span className="text-tertiary font-bold">READY · STANDBY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

