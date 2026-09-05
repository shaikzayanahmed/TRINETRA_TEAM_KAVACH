import React from 'react';
import { Target } from '../../types';

interface DetectionOverlayProps {
  target: Target;
  isBreached?: boolean;
  isThermal?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  target,
  isBreached = false,
  isThermal = false,
}) => {
  const borderColor = isBreached
    ? 'border-error shadow-[0_0_12px_rgba(255,180,171,0.6)]'
    : isThermal
    ? 'border-tertiary shadow-[0_0_10px_rgba(255,183,125,0.4)]'
    : 'border-primary shadow-[0_0_10px_rgba(173,198,255,0.5)]';

  const badgeColor = isBreached
    ? 'bg-error-container text-error border-error/80'
    : isThermal
    ? 'bg-surface-container-lowest/95 text-tertiary border-tertiary/80'
    : 'bg-surface-container-lowest/95 text-primary border-primary/80';

  return (
    <div
      className={`absolute left-[36%] sm:left-[42%] top-[24%] sm:top-[28%] w-[28%] sm:w-[22%] h-[52%] sm:h-[50%] border-2 rounded transition-all duration-300 pointer-events-none ${borderColor}`}
    >
      {/* Target Classification Header Tag */}
      <div
        className={`absolute -top-7 left-0 px-2 py-0.5 rounded border font-mono text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-[2px_2px_6px_rgba(0,0,0,0.8)] flex items-center gap-1.5 ${badgeColor}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span>{target.id} | {target.classification} | {target.confidence}%</span>
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

      {/* Bottom Coordinates Tag */}
      <div className="absolute -bottom-6 right-0 px-2 py-0.5 bg-surface-container-lowest/90 border border-surface-container-high rounded text-outline font-mono text-[9px] sm:text-[10px] whitespace-nowrap shadow-[2px_2px_6px_rgba(0,0,0,0.8)]">
        {isThermal ? (
          <span className="text-tertiary">HEAT: {target.heatSignatureApparent || '36.4°C APPARENT'}</span>
        ) : (
          <span>COORD: {target.coordinates.lat.toFixed(4)}, {target.coordinates.lng.toFixed(4)}</span>
        )}
      </div>
    </div>
  );
};
