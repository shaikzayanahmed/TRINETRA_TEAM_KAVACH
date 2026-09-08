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
  const breachState = !isTripwireDisabled && (Boolean(liveDetection?.isTripwireBreach) || Boolean(isBreached));
  const confidence = liveDetection?.score || target?.confidence || 96.8;
  const targetId = liveDetection?.id || target?.id || 'TGT-V201';
  const anpr = liveDetection?.anpr || target?.anpr;

  const isVehicle = ['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'VEHICLE'].includes(classification.toUpperCase());
  const isMoving = liveDetection?.isMoving ?? (target?.speedKmh ? target.speedKmh > 5 : true);
  const speedKmh = liveDetection?.speedKmh || target?.speedKmh || (anpr?.speedKmh ?? 48);
  const bearingLabel = liveDetection?.bearingLabel || target?.bearing || anpr?.bearing || 'EASTBOUND';

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
      {/* VEHICLE IDENTIFICATION & ATTRIBUTE LAYER */}
      {/* ========================================================================= */}
      {isVehicle ? (
        <div className="absolute bottom-[calc(100%+4px)] left-0 z-20 flex flex-col gap-0.5 select-none pointer-events-none">
          <div className={`backdrop-blur-md border rounded px-2 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.85)] flex items-center gap-1.5 font-mono text-[10px] ${badgeBg}`}>
            <span className="font-bold">{targetId}</span>
            <span className="text-outline">·</span>
            <span className="font-semibold uppercase tracking-wider">{classification}</span>
            <span className="text-outline">·</span>
            <span className="font-semibold">{Math.round(confidence)}%</span>
            {breachState && (
              <span className="ml-1 px-1 py-0.2 rounded bg-error text-on-error font-bold text-[8px] animate-pulse">
                PERIMETER BREACH
              </span>
            )}
            {isFlagged && (
              <span className="ml-1 px-1 py-0.2 rounded bg-error text-on-error font-bold text-[8px] animate-pulse">
                FLAGGED
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Human / Person Header Label */
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

      {/* ========================================================================= */}
      {/* VEHICLE LICENSE PLATE OPTICAL ZOOM AREA & ANPR MAGNIFIER */}
      {/* ========================================================================= */}
      {isVehicle && (
        <>
          {/* Zoomed Number Plate Target Area Bracket */}
          <div className="absolute top-[58%] left-[18%] w-[64%] h-[28%] border border-secondary/80 bg-secondary/10 rounded flex flex-col items-center justify-between p-0.5 shadow-[0_0_8px_rgba(149,212,176,0.4)] pointer-events-none">
            <div className="w-full flex items-center justify-between px-1">
              <span className="font-mono text-[7px] text-secondary font-bold tracking-wider">
                🔍 3.5x OPTICAL ZOOM
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
            </div>

            {/* If plate number is detected, show high-contrast plate readout */}
            {anpr?.plateNumber ? (
              <div className="px-1.5 py-0.2 bg-black/90 border border-secondary text-secondary font-mono text-[9px] font-bold tracking-widest rounded shadow-sm">
                {anpr.plateNumber}
              </div>
            ) : (
              <div className="text-[7px] text-secondary/80 font-mono tracking-widest animate-pulse">
                SCANNING PLATE...
              </div>
            )}

            {/* Corner Bracket Accents for Optical Plate Zone */}
            <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l border-secondary" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 border-t border-r border-secondary" />
            <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 border-b border-l border-secondary" />
            <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r border-secondary" />
          </div>

          {/* High-Resolution Plate Zoom Popout Preview (Right Flank) */}
          {anpr?.plateCropUrl && (
            <div className="absolute -right-[145px] top-0 z-30 w-[140px] p-1.5 rounded-lg bg-surface-container-lowest/95 border border-secondary/70 shadow-2xl backdrop-blur-md flex flex-col gap-1 pointer-events-none">
              <div className="flex items-center justify-between font-mono text-[8px] text-secondary font-bold">
                <span>ZOOMED PLATE CROP</span>
                <span>3.5x</span>
              </div>
              <div className="relative w-full h-11 bg-black rounded overflow-hidden border border-secondary/40 flex items-center justify-center p-0.5">
                <img
                  src={anpr.plateCropUrl}
                  alt="Zoomed Plate"
                  className="w-full h-full object-contain filter contrast-125 brightness-110"
                />
              </div>
              <div className="font-mono text-[9px] font-bold text-center text-on-surface bg-surface-container-high/80 rounded py-0.5 tracking-wider border border-surface-container-highest">
                {anpr.plateNumber}
              </div>
            </div>
          )}
        </>
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
