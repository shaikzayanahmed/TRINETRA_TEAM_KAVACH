import React from 'react';

interface ThermalFeedPlaceholderProps {
  onSelectStream?: () => void;
}

export const ThermalFeedPlaceholder: React.FC<ThermalFeedPlaceholderProps> = ({ onSelectStream }) => {
  return (
    <div className="relative w-full aspect-video bg-surface-container-lowest overflow-hidden flex flex-col items-center justify-center p-6 select-none border border-surface-container-high/40">
      {/* Thermal Sensor Raster Grid (Simulated calibrated IR uncooled detector matrix) */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8c909f_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Center Status Icon & Messages */}
      <div className="relative z-10 flex flex-col items-center text-center gap-3 max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-tertiary/30 flex items-center justify-center shadow-[inset_1px_1px_4px_rgba(0,0,0,0.7)]">
          <span className="material-symbols-outlined text-3xl text-tertiary">thermostat</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-headline text-sm font-bold text-on-surface uppercase tracking-wider">
            Thermal Camera Not Connected
          </span>
          <span className="font-mono text-xs text-tertiary font-semibold">
            [ WAITING FOR LWIR INPUT ]
          </span>
          <p className="font-mono text-[11px] text-outline mt-1 leading-relaxed">
            Secondary LWIR sensor input is in standby. You can feed a custom demo video or VLC network stream for live vehicle AI recognition.
          </p>
        </div>

        {/* Action Buttons to Activate Custom Feed or Upload Video */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {onSelectStream && (
            <button
              onClick={onSelectStream}
              className="px-3.5 py-2 rounded-xl bg-tertiary text-on-tertiary font-mono text-xs font-bold uppercase tracking-wider hover:bg-tertiary/90 transition-all shadow-[0_0_12px_rgba(255,183,125,0.25)] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">podcasts</span>
              <span>VLC STREAM / URL</span>
            </button>
          )}

          <label className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-mono text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.25)] flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span>UPLOAD VIDEO FILE</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/mkv,.mp4,.webm,.mov,.mkv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                import('../../services/globalMediaStreamService').then(({ globalMediaStreamService }) => {
                  globalMediaStreamService.setActiveMedia({
                    videoSrc: url,
                    fileName: file.name,
                    isPlaying: true,
                    currentTime: 0,
                    isLooping: true,
                    spectralFilter: 'OPTICAL',
                    filterMode: 'MOVING_VEHICLES',
                  });
                  if (onSelectStream) onSelectStream();
                });
              }}
            />
          </label>
        </div>

        {/* Integration Ready Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container border border-surface-container-high font-mono text-[10px] text-on-surface-variant">
          <span className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse" />
          <span>PORT: /dev/video1 (STANDBY) · 8-14 μm</span>
        </div>
      </div>

      {/* Sensor Metadata Tag */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/85 font-mono text-[10px] text-outline border border-surface-container-high/70">
        SENSOR B: LWIR THERMAL (8-14 μm) | 640x512 FLIR
      </div>

      {/* Waiting Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-lowest/85 font-mono text-[10px] border border-tertiary/30">
        <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
        <span className="text-tertiary font-bold">[STANDBY]</span>
      </div>
    </div>
  );
};
