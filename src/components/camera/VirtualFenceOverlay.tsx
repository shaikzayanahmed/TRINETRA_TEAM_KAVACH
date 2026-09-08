import React, { useState, useEffect } from 'react';
import { VirtualFence } from '../../types';
import { apiService } from '../../services/apiService';
import { useDemo } from '../../context/DemoContext';

export function isSameCameraFeed(camA?: string, camB?: string): boolean {
  if (!camA || !camB) return false;
  const a = camA.toUpperCase().trim();
  const b = camB.toUpperCase().trim();
  if (a === b) return true;

  // Secondary feed aliases: CAM-LWIR-01, MEDIA_FILE, CAM-STREAM-02
  const secondaryGroup = new Set(['CAM-LWIR-01', 'MEDIA_FILE', 'CAM-STREAM-02']);
  if (secondaryGroup.has(a) && secondaryGroup.has(b)) return true;

  // Primary feed aliases: CAM-RGB-01, DEFAULT_STREAM, WEBCAM
  const primaryGroup = new Set(['CAM-RGB-01', 'DEFAULT_STREAM', 'WEBCAM']);
  if (primaryGroup.has(a) && primaryGroup.has(b)) return true;

  return false;
}

interface VirtualFenceOverlayProps {
  customFence?: VirtualFence;
  cameraId?: string;
  isThermal?: boolean;
  isDirectlyBreached?: boolean;
}

export const VirtualFenceOverlay: React.FC<VirtualFenceOverlayProps> = ({
  customFence,
  cameraId = 'CAM-RGB-01',
  isThermal = false,
  isDirectlyBreached = false,
}) => {
  const [activeFence, setActiveFence] = useState<VirtualFence>(
    customFence || apiService.getActiveFenceSync(cameraId)
  );
  const [liveBreached, setLiveBreached] = useState<boolean>(false);
  const { isFenceBreached, activeTarget, activeAlert } = useDemo();

  useEffect(() => {
    let breachTimeout: any;
    const handleLiveBreach = (e: any) => {
      const breachCam = e.detail?.cameraId || e.detail?.alert?.cameraId || e.detail?.evidence?.cameraId;
      // Only trigger breach glow on this specific fence if the event belongs to this camera feed
      if (breachCam && isSameCameraFeed(breachCam, cameraId)) {
        setLiveBreached(true);
        clearTimeout(breachTimeout);
        breachTimeout = setTimeout(() => {
          setLiveBreached(false);
        }, 6000);
      }
    };

    const handleBreachCleared = (e: any) => {
      const clearedCam = e.detail?.alert?.cameraId || e.detail?.cameraId;
      if (!clearedCam || isSameCameraFeed(clearedCam, cameraId)) {
        setLiveBreached(false);
      }
    };

    const handleAlertResolved = (e: any) => {
      if (e.detail?.hasActiveBreach === false) {
        setLiveBreached(false);
      }
    };

    window.addEventListener('trinetra_live_breach', handleLiveBreach);
    window.addEventListener('trinetra_breach_cleared', handleBreachCleared);
    window.addEventListener('trinetra_alert_resolved', handleAlertResolved);
    return () => {
      window.removeEventListener('trinetra_live_breach', handleLiveBreach);
      window.removeEventListener('trinetra_breach_cleared', handleBreachCleared);
      window.removeEventListener('trinetra_alert_resolved', handleAlertResolved);
      clearTimeout(breachTimeout);
    };
  }, [cameraId]);

  useEffect(() => {
    if (customFence) {
      setActiveFence(customFence);
      return;
    }

    const updateFence = () => {
      const current = apiService.getActiveFenceSync(cameraId);
      setActiveFence(current);
    };

    updateFence();
    const handleUpdateEvent = (e: any) => {
      if (e.detail?.activeFence) {
        // If active fence matches this camera or source, use it; otherwise get latest for camera
        const updated = e.detail.activeFence as VirtualFence;
        if (
          !updated.sourceTarget ||
          isSameCameraFeed(updated.sourceTarget, cameraId) ||
          updated.assignedCameras?.some((cam) => isSameCameraFeed(cam, cameraId))
        ) {
          setActiveFence(updated);
        } else {
          updateFence();
        }
      } else {
        updateFence();
      }
    };

    window.addEventListener('trinetra_fence_updated', handleUpdateEvent);
    return () => {
      window.removeEventListener('trinetra_fence_updated', handleUpdateEvent);
    };
  }, [customFence, cameraId]);

  if (!activeFence || !activeFence.points || activeFence.points.length < 2) {
    return null;
  }

  // Only render if status is ACTIVE
  if (activeFence.status === 'INACTIVE') {
    return null;
  }

  const fenceType = activeFence.type || 'POLYGON';
  const pts = activeFence.points;
  const heightMeters = activeFence.heightMeters || 4.5;

  // Demo breach only applies if the scripted demo target or alert corresponds to this camera feed
  const isDemoBreached = Boolean(
    isFenceBreached &&
    (
      (activeAlert?.cameraId && isSameCameraFeed(activeAlert.cameraId, cameraId)) ||
      (activeTarget?.cameraId && isSameCameraFeed(activeTarget.cameraId, cameraId)) ||
      (!activeAlert?.cameraId && !activeTarget?.cameraId && isSameCameraFeed('CAM-RGB-01', cameraId))
    )
  );

  const isBreached = Boolean(isDirectlyBreached || liveBreached || isDemoBreached);

  const baseColor = isBreached
    ? '#ff1e1e'
    : isThermal
    ? '#fb923c'
    : '#38bdf8';

  const fillColor = isBreached
    ? 'rgba(255, 30, 30, 0.30)'
    : isThermal
    ? 'rgba(251, 146, 60, 0.08)'
    : 'rgba(56, 189, 248, 0.08)';

  // Format points string for SVG polygon (viewBox: 0 0 100 100)
  const polygonPointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // Compute top ceiling points for 3D extrusion
  const ceilingPointsStr = pts
    .map((p) => `${p.x},${Math.max(2, p.y - heightMeters * 2.2)}`)
    .join(' ');

  // Midpoint for directional tripwire arrow
  const midX = (pts[0].x + pts[1].x) / 2;
  const midY = (pts[0].y + pts[1].y) / 2;

  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-10 overflow-hidden ${isBreached ? 'animate-fence-breach-blink' : ''}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <filter id={`laserGlow-${cameraId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`breachGlow-${cameraId}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="blur1" />
            <feGaussianBlur stdDeviation="1.0" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* TRIPWIRE MODE */}
        {fenceType === 'TRIPWIRE' && (
          <g>
            {/* Outer dotted laser guide beam */}
            <line
              x1={pts[0].x}
              y1={pts[0].y}
              x2={pts[1].x}
              y2={pts[1].y}
              stroke={baseColor}
              strokeWidth={isBreached ? '1.2' : '0.75'}
              strokeDasharray={isBreached ? '2,1' : '1.5,1.5'}
              opacity="0.95"
              filter={`url(#${isBreached ? 'breachGlow' : 'laserGlow'}-${cameraId})`}
            />

            {/* Inner solid laser core */}
            <line
              x1={pts[0].x}
              y1={pts[0].y}
              x2={pts[1].x}
              y2={pts[1].y}
              stroke={isBreached ? '#ffffff' : '#ffffff'}
              strokeWidth={isBreached ? '0.4' : '0.25'}
              opacity="1"
            />

            {/* Intermediate dotted tick marks along the line */}
            {[0.25, 0.5, 0.75].map((ratio, idx) => {
              const tickX = pts[0].x + (pts[1].x - pts[0].x) * ratio;
              const tickY = pts[0].y + (pts[1].y - pts[0].y) * ratio;
              return (
                <circle
                  key={`tick-${idx}`}
                  cx={tickX}
                  cy={tickY}
                  r={isBreached ? '1.0' : '0.6'}
                  fill={isBreached ? '#ff1e1e' : baseColor}
                  opacity="1"
                />
              );
            })}

            {/* Directional Chevrons at Midpoint */}
            <circle
              cx={midX}
              cy={midY}
              r={isBreached ? '2.2' : '1.5'}
              fill="none"
              stroke={baseColor}
              strokeWidth={isBreached ? '0.5' : '0.3'}
              strokeDasharray="0.6,0.6"
            />
          </g>
        )}

        {/* 3D VOLUMETRIC SURROUNDING MODE */}
        {fenceType === '3D_SURROUNDING' && (
          <g>
            {/* Vertical Dotted Laser Pillars */}
            {pts.map((p, idx) => (
              <line
                key={`pillar-${idx}`}
                x1={p.x}
                y1={p.y}
                x2={p.x}
                y2={Math.max(2, p.y - heightMeters * 2.2)}
                stroke={baseColor}
                strokeWidth={isBreached ? '0.8' : '0.4'}
                strokeDasharray="1.2,1.2"
                opacity={isBreached ? '0.95' : '0.7'}
                filter={isBreached ? `url(#breachGlow-${cameraId})` : undefined}
              />
            ))}

            {/* Projected Ceiling Wireframe */}
            <polygon
              points={ceilingPointsStr}
              fill={isBreached ? 'rgba(255, 30, 30, 0.15)' : 'rgba(173, 198, 255, 0.04)'}
              stroke={baseColor}
              strokeWidth={isBreached ? '0.8' : '0.4'}
              strokeDasharray="1.5,1.5"
              opacity="0.85"
            />

            {/* Floor Base Polygon */}
            <polygon
              points={polygonPointsStr}
              fill={fillColor}
              stroke={baseColor}
              strokeWidth={isBreached ? '1.2' : '0.6'}
              strokeDasharray={isBreached ? '2.5,1' : '2,1.5'}
              filter={`url(#${isBreached ? 'breachGlow' : 'laserGlow'}-${cameraId})`}
            />
          </g>
        )}

        {/* 2D POLYGON MODE */}
        {fenceType === 'POLYGON' && (
          <g>
            {/* Filled Polygon with Dotted Border */}
            <polygon
              points={polygonPointsStr}
              fill={fillColor}
              stroke={baseColor}
              strokeWidth={isBreached ? '1.2' : '0.6'}
              strokeDasharray={isBreached ? '2.5,1' : '2,1.5'}
              filter={`url(#${isBreached ? 'breachGlow' : 'laserGlow'}-${cameraId})`}
            />
          </g>
        )}

        {/* Vertex Corner Reticles & Small Dotted Marks */}
        {pts.map((p, idx) => (
          <g key={`vertex-${idx}`}>
            {/* Pulsing outer reticle ring */}
            <circle
              cx={p.x}
              cy={p.y}
              r={isBreached ? '2.0' : '1.2'}
              fill="none"
              stroke={baseColor}
              strokeWidth={isBreached ? '0.5' : '0.3'}
              strokeDasharray="0.8,0.8"
              opacity="1"
            />
            {/* Solid Center Node Point */}
            <circle
              cx={p.x}
              cy={p.y}
              r={isBreached ? '0.9' : '0.5'}
              fill={isBreached ? '#ff1e1e' : '#ffffff'}
              stroke={isBreached ? '#ffffff' : baseColor}
              strokeWidth="0.2"
            />
          </g>
        ))}
      </svg>

      {/* Tactical HUD Header Badge Overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 font-mono text-[9px] pointer-events-none">
        <div
          className={`px-2 py-0.5 rounded-md backdrop-blur-md border flex items-center gap-1.5 shadow-md transition-all ${
            isBreached
              ? 'bg-red-950/90 text-red-100 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse'
              : 'bg-surface-container-lowest/80 text-on-surface border-surface-container-high/80'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBreached ? 'bg-red-500 animate-ping' : 'bg-primary'
            }`}
          />
          <span className="font-bold tracking-wider uppercase">
            {isBreached ? '⚠️ TRIPWIRE BREACH DETECTED' : `TRIPWIRE: ${activeFence.name}`}
          </span>
          <span className="text-outline text-[8px]">[{activeFence.id}]</span>
        </div>
      </div>

      {/* Bottom Spatial Heuristic Filter Tag */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 font-mono text-[8px] text-outline/80 pointer-events-none bg-surface-container-lowest/70 backdrop-blur px-1.5 py-0.5 rounded border border-surface-container-high/40">
        <span className="material-symbols-outlined text-[10px] text-primary">person</span>
        <span>POSTGIS · {fenceType} · HUMAN TARGET FILTER</span>
      </div>
    </div>
  );
};
