import React from 'react';
import { Target } from '../../types';
import { LiveDetectionResult } from '../../services/visionAiService';

interface DetectionOverlayProps {
  target?: Target;
  liveDetection?: LiveDetectionResult;
  isBreached?: boolean;
  isThermal?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  target,
  liveDetection,
  isBreached = false,
  isThermal = false,
}) => {
  // Use live vision detection bounding box if available, otherwise fallback to target trajectory/mock
  const bbox = liveDetection?.bbox || {
    x: target?.trajectory[target.trajectory.length - 1]?.x || 42,
    y: target?.trajectory[target.trajectory.length - 1]?.y || 28,
    width: target?.trajectory[target.trajectory.length - 1]?.width || 24,
    height: target?.trajectory[target.trajectory.length - 1]?.height || 48,
  };

  const breachState = liveDetection?.isTripwireBreach || isBreached;
  const classification = liveDetection?.class || target?.classification || 'PERSON';
  const confidence = liveDetection?.score || target?.confidence || 96.8;
  const targetId = liveDetection?.id || target?.id || 'TGT-H101';
  const anpr = liveDetection?.anpr || target?.anpr;

  const isVehicle = ['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'VEHICLE'].includes(classification.toUpperCase());

  const borderColor = breachState || (anpr && anpr.isFlagged)
    ? 'border-error shadow-[0_0_15px_rgba(255,180,171,0.7)]'
    : isVehicle
    ? 'border-secondary shadow-[0_0_12px_rgba(149,212,176,0.5)]'
    : isThermal
    ? 'border-tertiary shadow-[0_0_10px_rgba(255,183,125,0.4)]'
    : 'border-primary shadow-[0_0_12px_rgba(173,198,255,0.6)]';

  const badgeColor = breachState || (anpr && anpr.isFlagged)
    ? 'bg-error-container text-error border-error/90'
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
      className={`absolute border-2 rounded transition-all duration-75 pointer-events-none ${borderColor}`}
    >
      {/* Target Classification Header Tag */}
      <div
        className={`absolute -top-7 left-0 px-2 py-0.5 rounded border font-mono text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-[2px_2px_6px_rgba(0,0,0,0.8)] flex items-center gap-1.5 ${badgeColor}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${breachState ? 'bg-error animate-ping' : 'bg-current animate-pulse'}`} />
        <span>{targetId} | {classification} | {confidence}%</span>
      </div>

      {/* Reticle Corner Marks */}
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-current" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-current" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-current" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-current" />

      {/* Center Target Lock Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none flex items-center justify-center opacity-80">
        <div className="w-full h-[1px] bg-current" />
        <div className="h-full w-[1px] bg-current absolute" />
      </div>

      {/* ANPR Dedicated License Plate HUD Telemetry Box */}
      {anpr && (
        <div className="absolute -bottom-8 left-0 px-2 py-0.5 rounded bg-surface-container-lowest/95 border border-secondary/60 shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-mono text-[9px] sm:text-[10px] whitespace-nowrap flex items-center gap-1.5 z-20">
          <span className="material-symbols-outlined text-[13px] text-secondary">directions_car</span>
          <span className="font-bold text-on-surface tracking-wider uppercase">
            {anpr.plateNumber}
          </span>
          <span className="text-outline">|</span>
          <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
            anpr.isFlagged
              ? 'bg-error-container text-error border border-error/50 animate-pulse'
              : 'bg-secondary/20 text-secondary border border-secondary/40'
          }`}>
            {anpr.stateCode} · {anpr.securityClearance}
          </span>
        </div>
      )}

      {/* Bottom Coordinates Tag */}
      <div className={`absolute ${anpr ? '-bottom-14' : '-bottom-6'} right-0 px-2 py-0.5 bg-surface-container-lowest/90 border border-surface-container-high rounded text-outline font-mono text-[9px] sm:text-[10px] whitespace-nowrap shadow-[2px_2px_6px_rgba(0,0,0,0.8)]`}>
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

