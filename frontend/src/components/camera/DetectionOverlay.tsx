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

  const breachState = !isTripwireDisabled && (liveDetection?.isTripwireBreach || isBreached);
  const classification = liveDetection?.class || target?.classification || 'PERSON';
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

  const badgeColor = breachState || isFlagged
    ? 'bg-error-container text-error border-error/90'
    : isVehicle
    ? 'bg-surface-container-lowest/95 text-secondary border-secondary/80'
    : isThermal
    ? 'bg-surface-container-lowest/95 text-tertiary border-tertiary/80'
    : 'bg-surface-container-lowest/95 text-primary border-primary/80';

  const isAnalyzed = Boolean(
    anpr?.isAnalyzed &&
    anpr?.plateNumber &&
    anpr.plateNumber !== 'ANALYZING...' &&
    anpr.plateNumber !== 'ACQUIRING...'
  );

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
      {/* CROPPED NUMBER PLATE & TACTICAL ANPR CARD DISPLAYED DIRECTLY ABOVE THE CAR */}
      {/* ONLY DISPLAYED FOR MOVING CARS WITH LIVE ANALYSIS */}
      {/* ========================================================================= */}
      {isVehicle && isMoving && isAnalyzed && anpr ? (
        <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center select-none pointer-events-auto">
          {/* Main Tactical ANPR Floating Card */}
          <div className={`backdrop-blur-md border rounded-md p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.9)] flex flex-col gap-1 min-w-[200px] max-w-[250px] text-on-surface ${
            isFlagged
              ? 'bg-error-container/95 border-error text-error'
              : 'bg-surface-container-lowest/95 border-secondary/70'
          }`}>
            {/* Top Bar: Target ID & Motion Status & Vehicle Color */}
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono border-b border-surface-container-high/80 pb-0.5">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isFlagged ? 'bg-error animate-ping' : 'bg-secondary animate-pulse'}`} />
                <span className="font-bold text-secondary">{targetId}</span>
                <span className="text-outline">·</span>
                <span className="text-on-surface/80 uppercase">{classification}</span>
                {anpr.vehicleColor && (
                  <span className="text-outline text-[8px]">({anpr.vehicleColor})</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className={`px-1 py-0.2 rounded font-bold text-[8px] ${
                  isFlagged
                    ? 'bg-error text-on-error animate-pulse'
                    : 'bg-secondary/20 text-secondary border border-secondary/40'
                }`}>
                  {anpr.securityClearance}
                </span>
              </div>
            </div>

            {/* Clean High-Visibility Plate Number Display (Text Only - No Image Crop) */}
            <div className="px-2.5 py-1 bg-surface-container-lowest/90 rounded border border-secondary/50 flex items-center justify-between gap-2 shadow-tactical-inset">
              <span className="font-mono text-[12px] font-extrabold tracking-widest text-primary">
                {anpr.plateNumber}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary text-[8px] font-bold font-mono border border-secondary/40">
                {anpr.confidence}% OCR
              </span>
            </div>

            {/* Bottom Telemetry: Moving Speed & Heading Vector */}
            <div className="flex items-center justify-between text-[8px] font-mono text-outline pt-0.5">
              <div className="flex items-center gap-1 font-bold text-secondary">
                <span className="material-symbols-outlined text-[10px]">speed</span>
                <span>{speedKmh} KM/H</span>
                <span className="text-outline font-normal">| {bearingLabel}</span>
              </div>
              <div className="text-outline">
                {anpr.stateCode} SECTOR
              </div>
            </div>
          </div>

          {/* Optical Connecting Anchor Line pointing down to top of car */}
          <div className="flex flex-col items-center">
            <div className="w-[1.5px] h-2 bg-secondary/80 shadow-[0_0_4px_rgba(149,212,176,0.8)]" />
            <div className="w-1.5 h-1.5 rotate-45 -mt-0.5 bg-secondary shadow-[0_0_4px_rgba(149,212,176,0.8)]" />
          </div>
        </div>
      ) : (
        /* Lightweight classification header for non-moving / stationary cars or humans */
        <div
          className={`absolute -top-7 left-0 px-2 py-0.5 rounded border font-mono text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-[2px_2px_6px_rgba(0,0,0,0.8)] flex items-center gap-1.5 ${badgeColor}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${breachState ? 'bg-error animate-ping' : 'bg-current animate-pulse'}`} />
          <span>{targetId} | {classification} {isVehicle && isMoving ? '· MOVING' : `| ${confidence}%`}</span>
        </div>
      )}

      {/* Reticle Corner Marks on Bounding Box */}
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-current" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-current" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-current" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-current" />

      {/* Center Target Lock Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none flex items-center justify-center opacity-80">
        <div className="w-full h-[1px] bg-current" />
        <div className="h-full w-[1px] bg-current absolute" />
      </div>

      {/* Moving Velocity Direction Arrow (Inside Vehicle Box) */}
      {isVehicle && isMoving && (
        <div className="absolute top-1 right-1 px-1 py-0.2 rounded bg-surface-container-lowest/80 border border-secondary/40 text-[8px] font-mono text-secondary font-bold flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[10px] animate-pulse">navigation</span>
          <span>{speedKmh} KM/H</span>
        </div>
      )}

      {/* Bottom Coordinates & Breach Tag */}
      <div className="absolute -bottom-6 right-0 px-2 py-0.5 bg-surface-container-lowest/90 border border-surface-container-high rounded text-outline font-mono text-[9px] sm:text-[10px] whitespace-nowrap shadow-[2px_2px_6px_rgba(0,0,0,0.8)]">
        {isThermal ? (
          <span className="text-tertiary">HEAT: {target?.heatSignatureApparent || '36.4°C APPARENT'}</span>
        ) : (
          <span>
            {breachState ? (
              <strong className="text-error">TRIPWIRE BREACH</strong>
            ) : (
              `COORD: ${(34.2911 + (bbox.x - 50) * 0.0002).toFixed(4)}, ${(77.7533 + (bbox.y - 50) * 0.0002).toFixed(4)}`
            )}
          </span>
        )}
      </div>
    </div>
  );
};
