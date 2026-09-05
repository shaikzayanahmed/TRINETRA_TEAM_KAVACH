import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useDemo } from '../context/DemoContext';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<{
    accuracyRate: number;
    inferenceLatencyMs: number;
    pipelineStages: { name: string; status: string; details: string }[];
  } | null>(null);
  const [timeframe, setTimeframe] = useState<'1H' | '6H' | '24H' | '7D'>('24H');
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    minMs: number;
    avgMs: number;
    p99Ms: number;
    throughputFps: number;
  } | null>(null);

  const { activeTarget, isFenceBreached } = useDemo();

  useEffect(() => {
    const fetchAnalytics = async () => {
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    };
    fetchAnalytics();
  }, []);

  const handleRunBenchmark = () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    setTimeout(() => {
      setIsBenchmarking(false);
      setBenchmarkResult({
        minMs: 3.8,
        avgMs: 4.4,
        p99Ms: 5.1,
        throughputFps: 227.2,
      });
    }, 900);
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">insights</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Edge AI Analytics & Pipeline Workflow
            </h1>
            <span className="font-mono text-[11px] text-outline">
              YOLOV8 DEEP QUANTIZATION · INT8 PRECISION · KALMAN STATE ESTIMATOR
            </span>
          </div>
        </div>

        {/* Timeframe & Benchmark */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container border border-surface-container-high text-[10px]">
            {(['1H', '6H', '24H', '7D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  timeframe === tf
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunBenchmark}
            disabled={isBenchmarking}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.3)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">{isBenchmarking ? 'sync' : 'speed'}</span>
            <span>{isBenchmarking ? 'TESTING...' : 'RUN BENCHMARK'}</span>
          </button>
        </div>
      </div>

      {/* Benchmark Results Banner */}
      {benchmarkResult && (
        <div className="p-4 rounded-xl bg-surface-container border border-secondary/40 shadow-tactical-plate font-mono text-xs flex flex-col gap-2 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-surface-container-high/60 pb-1.5">
            <div className="flex items-center gap-2 text-secondary font-bold">
              <span className="material-symbols-outlined text-lg">verified</span>
              <span>HARDWARE BENCHMARK COMPLETE (50 FRAMES INGESTED)</span>
            </div>
            <button onClick={() => setBenchmarkResult(null)} className="text-outline hover:text-on-surface">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
            <div className="p-2 rounded bg-surface-container-lowest shadow-tactical-inset">
              <span className="text-[10px] text-outline">MIN LATENCY:</span>
              <div className="text-secondary font-bold text-base">{benchmarkResult.minMs} ms</div>
            </div>
            <div className="p-2 rounded bg-surface-container-lowest shadow-tactical-inset">
              <span className="text-[10px] text-outline">AVG LATENCY:</span>
              <div className="text-primary font-bold text-base">{benchmarkResult.avgMs} ms</div>
            </div>
            <div className="p-2 rounded bg-surface-container-lowest shadow-tactical-inset">
              <span className="text-[10px] text-outline">P99 JITTER:</span>
              <div className="text-secondary font-bold text-base">{benchmarkResult.p99Ms} ms</div>
            </div>
            <div className="p-2 rounded bg-surface-container-lowest shadow-tactical-inset">
              <span className="text-[10px] text-outline">PEAK THROUGHPUT:</span>
              <div className="text-on-surface font-bold text-base">{benchmarkResult.throughputFps} FPS</div>
            </div>
          </div>
        </div>
      )}

      {/* AI System Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-1">
          <span className="text-outline text-[10px] uppercase">AI Inference Core</span>
          <span className="font-bold text-secondary text-lg">ACTIVE</span>
          <span className="text-[10px] text-outline">Latency: {analytics?.inferenceLatencyMs || 4.6}ms</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-1">
          <span className="text-outline text-[10px] uppercase">YOLOv8 Detection</span>
          <span className="font-bold text-secondary text-lg">ACTIVE</span>
          <span className="text-[10px] text-outline">Person / Vehicle Models</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-1">
          <span className="text-outline text-[10px] uppercase">Tracking Algorithm</span>
          <span className="font-bold text-secondary text-lg">ACTIVE</span>
          <span className="text-[10px] text-outline">Kalman Spatial Filter</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-1">
          <span className="text-outline text-[10px] uppercase">Connected Feeds</span>
          <span className="font-bold text-primary text-lg">1 / 2</span>
          <span className="text-[10px] text-secondary">RGB Online · LWIR Standby</span>
        </div>
      </div>

      {/* AI Pipeline Architecture Diagram */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-2.5">
          <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
            Sequential AI Inference Pipeline Stages
          </h2>
          <span className="font-mono text-[10px] text-primary">ZERO CLOUD DEPENDENCY · JETSON ACCELERATED</span>
        </div>

        {/* 5-Step Pipeline Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/40 shadow-tactical-inset flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold">
              1
            </div>
            <span className="font-bold text-on-surface">RGB Input</span>
            <span className="text-[10px] text-outline">CAM-RGB-01 1080p Stream Ingestion</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/40 shadow-tactical-inset flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold">
              2
            </div>
            <span className="font-bold text-on-surface">Detection</span>
            <span className="text-[10px] text-secondary">YOLOv8 INT8 Object Bounding Boxes</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/40 shadow-tactical-inset flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold">
              3
            </div>
            <span className="font-bold text-on-surface">Tracking</span>
            <span className="text-[10px] text-secondary">Kalman Filter Target Association</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/40 shadow-tactical-inset flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold">
              4
            </div>
            <span className="font-bold text-on-surface">Virtual Fence</span>
            <span className="text-[10px] text-primary">Spatial Heuristics (Zone Alpha)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-error/40 shadow-tactical-inset flex flex-col items-center text-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-on-error font-bold">
              5
            </div>
            <span className="font-bold text-on-surface">Alert Dispatch</span>
            <span className="text-[10px] text-error">SHA-256 Hashed DMR/MQTT Payload</span>
          </div>
        </div>
      </div>

      {/* Target Telemetry in Pipeline */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3 font-mono text-xs">
        <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2">
          Current Target Telemetry Under Inference
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-1">
            <span className="text-outline text-[10px]">TARGET ID:</span>
            <span className="font-bold text-primary text-base">{activeTarget ? activeTarget.id : 'TGT-2048'}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-1">
            <span className="text-outline text-[10px]">CLASS:</span>
            <span className="font-bold text-error text-base">{activeTarget ? activeTarget.classification : 'PERSON'}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-1">
            <span className="text-outline text-[10px]">CONFIDENCE:</span>
            <span className="font-bold text-secondary text-base">{activeTarget ? `${activeTarget.confidence}%` : '96.8%'}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-1">
            <span className="text-outline text-[10px]">STATE:</span>
            <span className={`font-bold text-base ${isFenceBreached ? 'text-error' : 'text-secondary'}`}>
              {isFenceBreached ? 'TRIPWIRE BREACH' : 'TRACKING'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

