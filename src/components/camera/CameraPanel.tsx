import React, { useState } from 'react';
import { Camera } from '../../types';
import { WebcamFeed } from './WebcamFeed';
import { ThermalFeedPlaceholder } from './ThermalFeedPlaceholder';
import { VideoStreamFeed } from './VideoStreamFeed';

interface CameraPanelProps {
  camera: Camera;
  showDetection?: boolean;
  opticalFilter?: 'STANDARD' | 'CONTRAST_ENHANCED' | 'HIGH_PASS';
}

export const CameraPanel: React.FC<CameraPanelProps> = ({
  camera,
  showDetection = true,
  opticalFilter = 'STANDARD',
}) => {
  const isRGB = camera.type === 'RGB';
  const [isStreamMode, setIsStreamMode] = useState<boolean>(!isRGB); // Default non-RGB to active stream/selector mode so users can instantly feed video/VLC

  const isOnline = isRGB ? camera.status === 'ONLINE' : isStreamMode;

  const getFilterClass = () => {
    switch (opticalFilter) {
      case 'CONTRAST_ENHANCED':
        return 'contrast-[1.35] brightness-105 saturate-[1.25]';
      case 'HIGH_PASS':
        return 'contrast-[1.9] brightness-110 saturate-[0.2]';
      case 'STANDARD':
      default:
        return '';
    }
  };

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
            {isRGB ? camera.name : isStreamMode ? 'CUSTOM FEED / VLC STREAM' : camera.name}
          </span>
          <span className="text-outline-variant">·</span>
          <span className="text-outline text-[11px]">{camera.id}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {/* Secondary Camera Mode Switcher (Standby vs Video/VLC Stream) */}
          {!isRGB && (
            <div className="flex items-center gap-1 bg-surface-container-high/80 rounded p-0.5 border border-surface-container-highest">
              <button
                onClick={() => setIsStreamMode(false)}
                className={`px-1.5 py-0.2 rounded text-[10px] transition-colors ${
                  !isStreamMode
                    ? 'bg-surface-container-lowest text-tertiary font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                STANDBY
              </button>
              <button
                onClick={() => setIsStreamMode(true)}
                className={`px-1.5 py-0.2 rounded text-[10px] transition-colors flex items-center gap-1 ${
                  isStreamMode
                    ? 'bg-tertiary text-on-tertiary font-bold'
                    : 'text-outline hover:text-tertiary'
                }`}
              >
                <span className="material-symbols-outlined text-[11px]">podcasts</span>
                <span>VIDEO / VLC</span>
              </button>
            </div>
          )}

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
      <div className={`w-full transition-all duration-300 ${getFilterClass()}`}>
        {isRGB ? (
          <WebcamFeed showDetection={showDetection} />
        ) : isStreamMode ? (
          <VideoStreamFeed
            showDetection={showDetection}
            onCloseStream={() => setIsStreamMode(false)}
          />
        ) : (
          <ThermalFeedPlaceholder onSelectStream={() => setIsStreamMode(true)} />
        )}
      </div>

      {/* Panel Telemetry Footer */}
      <div className="p-2 sm:p-2.5 px-3 sm:px-4 bg-surface-container-lowest/90 border-t border-surface-container-high/40 flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
        <span>FPS: {isOnline ? '29.97' : '0.00'}</span>
        <span className="hidden sm:inline">
          BITRATE: {isOnline ? '5.4 MB/s H.264 / METADATA' : '0.0 KB/s'}
        </span>
        <span className={isOnline ? 'text-secondary font-semibold' : 'text-outline font-semibold'}>
          STATE: {isOnline ? 'STREAM ACTIVE / VEHICLE AI LOCKED' : 'WAITING FOR INPUT'}
        </span>
      </div>
    </div>
  );
};
