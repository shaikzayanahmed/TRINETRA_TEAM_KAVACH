import React from 'react';
import { Target } from '../../types';
import { LiveDetectionResult } from '../../services/visionAiService';

interface DetectionOverlayProps {
  target?: Target;
  liveDetection?: LiveDetectionResult;
  isBreached?: boolean;
  isThermal?: boolean;
  isTripwireDisabled?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  target,
  liveDetection,
  isBreached = false,
  isThermal = false,
  isTripwireDisabled = false,
}) => {
  // Use live vision detection bounding box if available, otherwise fallback to target trajectory/mock
  const bbox = liveDetection?.bbox || {
    x: target?.trajectory[target.trajectory.length - 1]?.x || 42,
    y: target?.trajectory[target.trajectory.length - 1]?.y || 28,
    width: target?.trajectory[target.trajectory.length - 1]?.width || 24,
    height: target?.trajectory[target.trajectory.length - 1]?.height || 48,
  };

  const classification = liveDetection?.class || target?.classification || 'PERSON';
  const isHuman = ['PERSON', 'HUMAN'].includes(classification.toUpperCase());
  const breachState = !isTripwireDisabled && isHuman && (Boolean(liveDetection?.isTripwireBreach) || Boolean(isBreached));
  const confidence = liveDetection?.score || target?.confidence || 96.8;
  const targetId = liveDetection?.id || target?.id || 'TGT-V201';
  const anpr = liveDetection?.anpr || target?.anpr;

  const isVehicle = ['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'VEHICLE'].includes(classification.toUpperCase());
  const isMoving = liveDetection?.isMoving ?? (target?.speedKmh ? target.speedKmh > 5 : true);
  const speedKmh = liveDetection?.speedKmh || target?.speedKmh || (anpr?.speedKmh ?? 48);
  const bearingLabel = liveDetection?.bearingLabel || target?.bearing || anpr?.bearing || 'EASTBOUND';
  const vehicleColor = anpr?.vehicleColor || 'Dark Obsidian';

  const isFlagged = Boolean(anpr?.isFlagged);

  const borderColor = breachState || isFlagged
    ? 'border-error shadow-[0_0_16px_rgba(255,180,171,0.8)]'
    : isVehicle
    ? 'border-secondary shadow-[0_0_14px_rgba(149,212,176,0.6)]'
    : isThermal
    ? 'border-tertiary shadow-[0_0_10px_rgba(255,183,125,0.4)]'
    : 'border-primary shadow-[0_0_12px_rgba(173,198,255,0.6)]';

  const badgeBg = breachState || isFlagged
    ? 'bg-error-container/95 text-error border-error/90'
    : isVehicle
    ? 'bg-surface-container-lowest/95 text-secondary border-secondary/80'
    : isThermal
    ? 'bg-surface-container-lowest/95 text-tertiary border-tertiary/80'
    : 'bg-surface-container-lowest/95 text-primary border-primary/80';

  const getColorDot = (colorName: string) => {
    switch (colorName) {
      case 'Silver White': return 'bg-slate-200 border-slate-400';
      case 'Dark Obsidian': return 'bg-zinc-900 border-zinc-500';
      case 'Tactical Olive Green': return 'bg-emerald-600 border-emerald-400';
      case 'Crimson Red': return 'bg-rose-500 border-rose-300';
      case 'Navy Blue': return 'bg-blue-500 border-blue-300';
      case 'Steel Metallic Gray': return 'bg-slate-400 border-slate-300';
      case 'Desert Sand': return 'bg-amber-400 border-amber-200';
      default: return 'bg-secondary border-secondary';
    }
  };

  return (
    <div
      style={{
        left: `${bbox.x}%`,
        top: `${bbox.y}%`,
        width: `${bbox.width}%`,
        height: `${bbox.height}%`,
      }}
      className={`absolute border-2 rounded pointer-events-none will-change-[left,top,width,height] transition-all duration-75 ease-out ${borderColor}`}
    >
      {/* ========================================================================= */}
      {/* CLEAN VEHICLE IDENTIFICATION & COLOR LAYER (NO NUMBER PLATE CLUTTER IN VIDEO) */}
      {/* ========================================================================= */}
      {isVehicle ? (
        <div className="absolute bottom-[calc(100%+4px)] left-0 z-20 flex flex-col gap-0.5 select-none pointer-events-none">
          <div className={`backdrop-blur-md border rounded px-2 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.85)] flex items-center gap-1.5 font-mono text-[10px] ${badgeBg}`}>
            <span className="font-bold">{targetId}</span>
            <span className="text-outline">·</span>
            <span className="font-semibold uppercase tracking-wider">{classification}</span>
            <span className="text-outline">·</span>
            {/* Real-Time Vehicle Paint Color Identification */}
            <div className="flex items-center gap-1 bg-surface-container-high/80 px-1.5 py-0.2 rounded border border-surface-container-highest">
              <span className={`w-2 h-2 rounded-full border ${getColorDot(vehicleColor)}`} />
              <span className="font-bold text-[9px] text-on-surface uppercase">{vehicleColor}</span>
            </div>
            {/* Background ANPR Status Tag */}
            <div className="flex items-center gap-1 text-[8px] text-secondary font-bold pl-1 border-l border-surface-container-high">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span>ANPR RECORDED</span>
            </div>
          </div>
        </div>
      ) : (
        /* Human / Target Header Label */
        <div className="absolute bottom-[calc(100%+4px)] left-0 z-20 flex flex-col gap-0.5 select-none pointer-events-none">
          <div className={`backdrop-blur-md border rounded px-2 py-0.5 shadow-tactical-inset flex items-center gap-1.5 font-mono text-[10px] ${badgeBg}`}>
            <span className="font-bold">{targetId}</span>
            <span className="text-outline">·</span>
            <span className="font-semibold">{classification}</span>
            <span className="text-outline">·</span>
            <span className="font-semibold">{Math.round(confidence)}%</span>
            {breachState && (
              <span className="ml-1 px-1 py-0.2 rounded bg-error text-on-error font-bold text-[8px] animate-pulse">
                BREACH
              </span>
            )}
          </div>
        </div>
      )}

      {/* Target Bottom Telemetry (Speed & Direction) */}
      <div className="absolute top-[calc(100%+3px)] left-0 z-20 flex items-center gap-1.5 font-mono text-[9px] text-outline bg-surface-container-lowest/90 px-1.5 py-0.2 rounded border border-surface-container-high backdrop-blur-sm">
        <span className="text-on-surface font-semibold">{isMoving ? `${Math.round(speedKmh)} km/h` : 'STATIONARY'}</span>
        <span>·</span>
        <span className="text-primary font-bold">{bearingLabel}</span>
      </div>

      {/* Corner Reticle Accents */}
      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-current pointer-events-none" />
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-current pointer-events-none" />
      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-current pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-current pointer-events-none" />

      {/* Target Center Optical Reticle */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-3 h-3 border border-current rounded-full" />
        <div className="absolute w-5 h-[1px] bg-current" />
        <div className="absolute h-5 w-[1px] bg-current" />
      </div>
    </div>
  );
};
