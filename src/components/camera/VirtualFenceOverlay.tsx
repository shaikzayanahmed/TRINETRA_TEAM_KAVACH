import React, { useState, useEffect } from 'react';
import { VirtualFence } from '../../types';
import { apiService } from '../../services/apiService';
import { useDemo } from '../../context/DemoContext';

interface VirtualFenceOverlayProps {
  customFence?: VirtualFence;
  cameraId?: string;
  isThermal?: boolean;
}

export const VirtualFenceOverlay: React.FC<VirtualFenceOverlayProps> = ({
  customFence,
  cameraId = 'CAM-RGB-01',
  isThermal = false,
}) => {
  const [activeFence, setActiveFence] = useState<VirtualFence>(
    customFence || apiService.getActiveFenceSync()
  );
  const { isFenceBreached } = useDemo();

  useEffect(() => {
    if (customFence) {
      setActiveFence(customFence);
      return;
    }

    const updateFence = () => {
      const current = apiService.getActiveFenceSync();
      setActiveFence(current);
    };

    updateFence();
    const handleUpdateEvent = (e: any) => {
      if (e.detail?.activeFence) {
        setActiveFence(e.detail.activeFence);
      } else {
        updateFence();
      }
    };

    window.addEventListener('trinetra_fence_updated', handleUpdateEvent);
    return () => {
      window.removeEventListener('trinetra_fence_updated', handleUpdateEvent);
    };
  }, [customFence]);

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
  const isBreached = isFenceBreached;

  const baseColor = isBreached
    ? '#ff5449'
    : isThermal
    ? '#fb923c'
    : '#38bdf8';

  const fillColor = isBreached
    ? 'rgba(255, 84, 73, 0.16)'
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
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
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

          <filter id={`breachGlow-${cameraId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
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
              strokeWidth="0.75"
              strokeDasharray="1.5,1.5"
              opacity="0.85"
              filter={`url(#${isBreached ? 'breachGlow' : 'laserGlow'}-${cameraId})`}
            />

            {/* Inner solid laser core */}
            <line
              x1={pts[0].x}
              y1={pts[0].y}
              x2={pts[1].x}
              y2={pts[1].y}
              stroke="#ffffff"
              strokeWidth="0.25"
              opacity="0.9"
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
                  r="0.6"
                  fill={baseColor}
                  opacity="0.9"
                />
              );
            })}

            {/* Directional Chevrons at Midpoint */}
            <circle
              cx={midX}
              cy={midY}
              r="1.5"
              fill="none"
              stroke={baseColor}
              strokeWidth="0.3"
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
                strokeWidth="0.4"
                strokeDasharray="1.2,1.2"
                opacity="0.7"
              />
            ))}

            {/* Projected Ceiling Wireframe */}
            <polygon
              points={ceilingPointsStr}
              fill="rgba(173, 198, 255, 0.04)"
              stroke={baseColor}
              strokeWidth="0.4"
              strokeDasharray="1.5,1.5"
              opacity="0.75"
            />

            {/* Floor Base Polygon */}
            <polygon
              points={polygonPointsStr}
              fill={fillColor}
              stroke={baseColor}
              strokeWidth="0.6"
              strokeDasharray="2,1.5"
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
              strokeWidth="0.6"
              strokeDasharray="2,1.5"
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
              r="1.2"
              fill="none"
              stroke={baseColor}
              strokeWidth="0.3"
              strokeDasharray="0.8,0.8"
              opacity={isBreached ? '1' : '0.8'}
            />
            {/* Solid Center Node Point */}
            <circle
              cx={p.x}
              cy={p.y}
              r="0.5"
              fill={isBreached ? '#ff5449' : '#ffffff'}
              stroke={baseColor}
              strokeWidth="0.2"
            />
          </g>
        ))}
      </svg>

      {/* Tactical HUD Header Badge Overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 font-mono text-[9px] pointer-events-none">
        <div
          className={`px-2 py-0.5 rounded-md backdrop-blur-md border flex items-center gap-1.5 shadow-md ${
            isBreached
              ? 'bg-error-container/90 text-on-error border-error animate-pulse'
              : 'bg-surface-container-lowest/80 text-on-surface border-surface-container-high/80'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isBreached ? 'bg-error animate-ping' : 'bg-primary'
            }`}
          />
          <span className="font-bold tracking-wider uppercase">
            {isBreached ? '⚠️ TRIPWIRE BREACH' : `TRIPWIRE: ${activeFence.name}`}
          </span>
          <span className="text-outline text-[8px]">[{activeFence.id}]</span>
        </div>
      </div>

      {/* Bottom Spatial Heuristic Filter Tag */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 font-mono text-[8px] text-outline/80 pointer-events-none bg-surface-container-lowest/70 backdrop-blur px-1.5 py-0.5 rounded border border-surface-container-high/40">
        <span className="material-symbols-outlined text-[10px] text-primary">polyline</span>
        <span>POSTGIS CALIBRATED · {fenceType}</span>
      </div>
    </div>
  );
};
