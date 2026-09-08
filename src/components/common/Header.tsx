import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { soundService } from '../../services/soundService';
import { apiService } from '../../services/apiService';

export interface HeaderProps {
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette }) => {
  const { user } = useAuth();
  const { isFenceBreached } = useDemo();
  const [timeString, setTimeString] = useState<string>('');
  const [liveTargetCount, setLiveTargetCount] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(soundService.isMuted());

  const handleOpenPalette = () => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
    } else {
      window.dispatchEvent(new CustomEvent('open-ai-command-palette'));
    }
  };

  const handleToggleAudio = () => {
    const nextMuted = soundService.toggleMute();
    setIsAudioMuted(nextMuted);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' UTC+05:30'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Initial check of targets
    apiService.getTargets().then((tg) => setLiveTargetCount(tg.length));

    // Listen to live target update events
    const handleTargetsUpdated = (e: any) => {
      if (Array.isArray(e.detail?.targets)) {
        setLiveTargetCount(e.detail.targets.length);
      }
    };

    window.addEventListener('trinetra_targets_updated', handleTargetsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('trinetra_targets_updated', handleTargetsUpdated);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high/60 shadow-[0_4px_20px_rgba(0,0,0,0.55)] px-4 lg:px-6 flex items-center justify-between font-mono text-xs select-none tactical-glass-accent">
      {/* Brand & Sector */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isFenceBreached ? 'bg-error animate-ping' : 'bg-secondary animate-pulse'}`} />
          <span className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface">
            TRINETRA
          </span>
          <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono font-semibold border border-primary/20">
            EDGE-AI
          </span>
        </div>
        <span className="text-outline-variant hidden md:inline">|</span>
        <div className="hidden md:flex items-center gap-1 text-[11px]">
          <span className="text-outline">SEC:</span>
          <span className="text-primary font-semibold truncate max-w-[140px] xl:max-w-none">07 (NORTHERN LEH)</span>
        </div>
      </div>

      {/* Center AI Command Palette Launcher */}
      <button
        onClick={handleOpenPalette}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-primary/40 text-outline hover:text-on-surface shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] hover:border-primary/80 transition-all flex-shrink-0 group tactical-glow-hover"
      >
        <span className="material-symbols-outlined text-[16px] text-primary group-hover:scale-110 transition-transform">
          smart_toy
        </span>
        <span className="text-[11px] font-mono font-bold text-primary tracking-wider group-hover:text-primary">
          KAVACH BOT
        </span>
        <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest border border-surface-container-highest text-[10px] text-primary font-mono font-bold">
          Ctrl+K
        </kbd>
      </button>

      {/* Telemetry Status Bar */}
      <div className="flex items-center gap-2 sm:gap-2.5 text-[11px] flex-nowrap flex-shrink-0">
        {/* Real-time Target Tracking Counter */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[10px] transition-all ${
            liveTargetCount > 0
              ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_rgba(173,198,255,0.3)]'
              : 'bg-surface-container text-outline border border-surface-container-high'
          }`}
          title={liveTargetCount > 0 ? `${liveTargetCount} Active Target(s) Being Tracked by YOLOv8` : '0 Active Targets · Sector Clear'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${liveTargetCount > 0 ? 'bg-primary animate-ping' : 'bg-outline'}`} />
          <span>🎯 {liveTargetCount > 0 ? `LIVE TARGETS: ${liveTargetCount}` : '0 TARGETS (CLEAR)'}</span>
        </div>

        {/* Audio Alarm Mute / Unmute Button */}
        <button
          onClick={handleToggleAudio}
          className={`flex items-center gap-1 px-2 py-1 rounded font-bold text-[10px] transition-all border ${
            isAudioMuted
              ? 'bg-surface-container text-outline border-surface-container-high hover:text-on-surface'
              : 'bg-error/15 text-error border-error/40 shadow-[0_0_8px_rgba(255,180,171,0.3)] hover:bg-error/25'
          }`}
          title={isAudioMuted ? 'Alarm Sound: Muted (Click to Enable)' : 'Alarm Sound: Active (Click to Mute / Test)'}
        >
          <span className="material-symbols-outlined text-[13px]">
            {isAudioMuted ? 'volume_off' : 'volume_up'}
          </span>
          <span className="hidden sm:inline">{isAudioMuted ? 'ALARM: MUTED' : 'ALARM: ACTIVE'}</span>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-secondary font-semibold text-[10px]">ONLINE</span>
        </div>

        {isFenceBreached && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-error-container text-on-error font-bold animate-pulse border border-error/40 text-[10px]">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            <span>BREACH</span>
          </div>
        )}

        {/* Live Tactical Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high text-primary font-semibold border border-primary/20 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] text-[10px]">
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          <span>{timeString || '14:32:18 UTC+05:30'}</span>
        </div>

        {/* User Callsign Indicator */}
        <div className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded bg-surface-container text-on-surface-variant text-[10px]">
          <span className="text-outline">OP:</span>
          <span className="text-on-surface font-semibold">{user?.callsign || 'SIH-UNIT-ALPHA'}</span>
        </div>
      </div>
    </header>
  );
};
