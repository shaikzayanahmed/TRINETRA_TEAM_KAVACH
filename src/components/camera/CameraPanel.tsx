import React from 'react';
import { Camera } from '../../types';
import { WebcamFeed } from './WebcamFeed';
import { ThermalFeedPlaceholder } from './ThermalFeedPlaceholder';

interface CameraPanelProps {
  camera: Camera;
  showDetection?: boolean;
}

export const CameraPanel: React.FC<CameraPanelProps> = ({ camera, showDetection = true }) => {
  const isRGB = camera.type === 'RGB';
  const isOnline = camera.status === 'ONLINE';

  return (
    <div className="rounded-xl overflow-hidden bg-surface-container-low border border-surface-container-high/60 shadow-[-3px_-3px_7px_rgba(255,255,255,0.03),4px_4px_10px_rgba(0,0,0,0.55)] flex flex-col select-none">
      {/* Panel Header */}
      <div className="h-9 px-3 sm:px-4 bg-surface-container-lowest border-b border-surface-container/70 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`font-semibold uppercase tracking-wider ${
              isRGB ? 'text-on-surface' : 'text-tertiary'
            }`}
          >
            {camera.name}
          </span>
          <span className="text-outline-variant">·</span>
          <span className="text-outline text-[11px]">{camera.id}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {isOnline ? (
            <span className="text-secondary font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              [LIVE]
            </span>
          ) : (
            <span className="text-tertiary font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              [WAITING]
            </span>
          )}
          <span className="text-outline-variant hidden sm:inline">·</span>
          <span className="text-on-surface-variant hidden sm:inline">{camera.resolution}</span>
        </div>
      </div>

      {/* Video Content */}
      <div className="w-full">
        {isRGB ? (
          <WebcamFeed showDetection={showDetection} />
        ) : (
          <ThermalFeedPlaceholder />
        )}
      </div>

      {/* Panel Telemetry Footer */}
      <div className="p-2 sm:p-2.5 px-3 sm:px-4 bg-surface-container-lowest/90 border-t border-surface-container-high/40 flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
        <span>FPS: {isOnline ? '29.97' : '0.00'}</span>
        <span className="hidden sm:inline">
          BITRATE: {isOnline ? '4.8 KB/s METADATA' : '0.0 KB/s'}
        </span>
        <span className={isOnline ? 'text-secondary font-semibold' : 'text-outline font-semibold'}>
          STATE: {isOnline ? 'LOCKED / ACTIVE' : 'WAITING FOR INPUT'}
        </span>
      </div>
    </div>
  );
};
