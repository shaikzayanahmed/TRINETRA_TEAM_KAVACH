import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Target, Alert, EdgeNode } from '../types';
import { apiService } from '../services/apiService';
import { CameraPanel } from '../components/camera/CameraPanel';
import { useDemo } from '../context/DemoContext';

export const CommandCenterPage: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [edgeNode, setEdgeNode] = useState<EdgeNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { activeTarget, activeAlert, isFenceBreached } = useDemo();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [cams, tgts, alts, nodes] = await Promise.all([
        apiService.getCameras(),
        apiService.getTargets(),
        apiService.getAlerts(),
        apiService.getEdgeNodes(),
      ]);
      setCameras(cams);
      setTarget(tgts[0]);
      setAlert(alts[0]);
      setEdgeNode(nodes[0]);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const displayTarget = activeTarget || target;
  const displayAlert = activeAlert || alert;

  if (isLoading || cameras.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center font-mono text-xs text-primary">
        <span className="material-symbols-outlined text-3xl animate-spin mr-2">progress_activity</span>
        <span>LOADING TACTICAL COMMAND STAGE...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Top Status & Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline font-mono text-[11px]">
            <span>ACTIVE THREATS</span>
            <span className="material-symbols-outlined text-error text-[18px]">warning</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-2xl font-bold text-error">
              {isFenceBreached ? '1 CRIT' : '1 HIGH'}
            </span>
            <span className="font-mono text-[10px] text-outline">ALT-7821</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline font-mono text-[11px]">
            <span>ACTIVE TARGETS</span>
            <span className="material-symbols-outlined text-primary text-[18px]">person_search</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-2xl font-bold text-primary">1 LOCK</span>
            <span className="font-mono text-[10px] text-outline">TGT-2048</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline font-mono text-[11px]">
            <span>CAMERA SENSORS</span>
            <span className="material-symbols-outlined text-secondary text-[18px]">videocam</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-2xl font-bold text-secondary">1 / 2</span>
            <span className="font-mono text-[10px] text-secondary font-semibold">RGB ONLINE</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col justify-between">
          <div className="flex items-center justify-between text-outline font-mono text-[11px]">
            <span>EDGE-01 NODE</span>
            <span className="material-symbols-outlined text-secondary text-[18px]">router</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-2xl font-bold text-secondary">ONLINE</span>
            <span className="font-mono text-[10px] text-outline">4.6ms LATENCY</span>
          </div>
        </div>
      </div>

      {/* Main Command Stage Layout: Feeds on Left, Intelligence Cards on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Dual Camera Feeds Stage */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="p-3 px-4 rounded-xl bg-surface-container-low border border-surface-container-high/50 flex flex-wrap items-center justify-between shadow-tactical-plate">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <h2 className="font-headline text-sm uppercase tracking-wide text-on-surface font-bold">
                MULTI-SPECTRAL SURVEILLANCE FEEDS
              </h2>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-surface-container text-secondary border border-secondary/30 font-semibold">
                RGB ACTIVE · LWIR STANDBY
              </span>
              <span className="text-outline hidden sm:inline">SECTOR: 07 (LEH)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Actual Laptop Webcam */}
            <CameraPanel camera={cameras[0]} showDetection={true} />

            {/* Right: LWIR Thermal Placeholder */}
            <CameraPanel camera={cameras[1]} showDetection={false} />
          </div>

          {/* Edge AI Telemetry Strip */}
          <div className="p-3 px-4 rounded-xl bg-surface-container-lowest border border-surface-container-high/50 shadow-tactical-inset flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
              <span className="text-on-surface font-semibold uppercase">EDGE AI CADENCE:</span>
              <span className="text-outline">{edgeNode?.hardwareModel || 'NVIDIA Jetson AGX Orin'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-outline">
                LATENCY: <strong className="text-secondary">{edgeNode?.inferenceLatencyMs || 4.6}ms</strong>
              </span>
              <span className="text-outline-variant">|</span>
              <span className="text-outline">
                BANDWIDTH: <strong className="text-primary">{edgeNode?.bandwidthUsageKbpkt || 4.8} KB/PKT</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar Intelligence Cards */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          {/* Active Alert Card */}
          {displayAlert && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-error/40 shadow-tactical-plate flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-surface-container/70 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[20px] animate-pulse">
                    warning
                  </span>
                  <h3 className="font-headline text-sm uppercase tracking-wide text-on-surface font-bold">
                    ACTIVE THREAT ALERT
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-error-container text-on-error font-mono text-[10px] font-bold tracking-wider uppercase">
                  {displayAlert.severity}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-primary font-bold">{displayAlert.id}</span>
                <span className="font-mono text-[11px] text-on-surface-variant truncate">
                  {displayAlert.title}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-1.5 font-mono text-xs">
                <div className="text-outline">Target:</div>
                <div className="text-right text-on-surface font-semibold">{displayAlert.targetId}</div>
                <div className="text-outline">Classification:</div>
                <div className="text-right text-error font-bold">{displayAlert.targetClassification}</div>
                <div className="text-outline">Confidence:</div>
                <div className="text-right text-secondary font-bold">{displayAlert.confidence}%</div>
                <div className="text-outline">Zone:</div>
                <div className="text-right text-primary font-semibold">{displayAlert.zone}</div>
                <div className="text-outline">Time:</div>
                <div className="text-right text-on-surface">{displayAlert.timestamp}</div>
                <div className="text-outline">Status:</div>
                <div className="text-right text-error font-bold">{displayAlert.status}</div>
              </div>

              <Link
                to="/alerts"
                className="w-full py-2 rounded-lg bg-error-container text-on-error font-mono text-xs uppercase tracking-wider font-bold shadow-tactical-extruded hover:bg-error transition-all flex items-center justify-center gap-1.5"
              >
                <span>[ VIEW ALERT DETAILS ]</span>
              </Link>
            </div>
          )}

          {/* Target Summary Card */}
          {displayTarget && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-surface-container/70 pb-2">
                <h3 className="font-headline text-sm uppercase tracking-wide text-on-surface font-semibold">
                  TARGET SUMMARY
                </h3>
                <span className="material-symbols-outlined text-outline text-[18px]">person_search</span>
              </div>

              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-on-surface font-bold">{displayTarget.id}</span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-bold">
                  {displayTarget.classification}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-1.5 font-mono text-xs">
                <div className="text-outline">Confidence:</div>
                <div className="text-right text-secondary font-bold">{displayTarget.confidence}%</div>
                <div className="text-outline">Sensor Lock:</div>
                <div className="text-right text-primary font-semibold">{displayTarget.cameraId}</div>
                <div className="text-outline">Status:</div>
                <div className="text-right text-secondary font-bold">{displayTarget.status}</div>
                <div className="text-outline">Coordinates:</div>
                <div className="text-right text-on-surface text-[11px]">
                  {displayTarget.coordinates.lat.toFixed(4)}, {displayTarget.coordinates.lng.toFixed(4)}
                </div>
              </div>

              <Link
                to="/targets"
                className="w-full py-2 rounded-lg bg-surface-container-high text-primary font-mono text-xs uppercase tracking-wider font-semibold border border-primary/20 shadow-tactical-extruded hover:bg-surface-container-highest transition-all flex items-center justify-center gap-1.5"
              >
                <span>[ VIEW TARGET TRACKING ]</span>
              </Link>
            </div>
          )}

          {/* Recent Activity Card */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-surface-container/70 pb-2">
              <h3 className="font-headline text-sm uppercase tracking-wide text-on-surface font-semibold">
                RECENT ACTIVITY
              </h3>
              <span className="material-symbols-outlined text-outline text-[18px]">history</span>
            </div>

            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <div className="p-1.5 px-2.5 rounded bg-surface-container-lowest/80 border border-surface-container-high/40 flex items-center justify-between">
                <span className="text-primary font-semibold">14:32:18</span>
                <span className="text-on-surface truncate">Virtual tripwire breach · Zone Alpha</span>
              </div>
              <div className="p-1.5 px-2.5 rounded bg-surface-container-lowest/80 border border-surface-container-high/40 flex items-center justify-between">
                <span className="text-secondary font-semibold">14:32:08</span>
                <span className="text-on-surface truncate">Target locked · TGT-2048</span>
              </div>
              <div className="p-1.5 px-2.5 rounded bg-surface-container-lowest/80 border border-surface-container-high/40 flex items-center justify-between">
                <span className="text-outline font-semibold">14:32:04</span>
                <span className="text-on-surface-variant truncate">Optical detection · CAM-RGB-01</span>
              </div>
            </div>
          </div>

          {/* Tactical Sector Quick Link */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">pin_drop</span>
                <span className="font-bold text-on-surface">SECTOR 07 MAP</span>
              </div>
              <span className="text-[10px] text-outline">NORTHERN BORDER</span>
            </div>
            <Link
              to="/map"
              className="w-full py-1.5 text-center rounded bg-surface-container-high text-primary text-[11px] uppercase tracking-wider font-semibold border border-primary/20 hover:bg-surface-container-highest transition-colors"
            >
              [ VIEW TACTICAL MAP ]
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
