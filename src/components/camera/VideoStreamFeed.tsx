import React, { useRef, useState } from 'react';
import { useLiveVision } from '../../hooks/useLiveVision';
import { DetectionFilterMode } from '../../services/visionAiService';
import { DetectionOverlay } from './DetectionOverlay';

interface VideoStreamFeedProps {
  showDetection?: boolean;
  onCloseStream?: () => void;
}

type SpectralFilter = 'OPTICAL' | 'FLIR_IRONBOW' | 'WHITE_HOT' | 'GREEN_NVG';

const DEMO_PRESETS = [
  {
    id: 'highway',
    label: 'Highway Traffic & Vehicles',
    description: 'Multi-lane highway with cars, trucks, and buses',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'convoy',
    label: 'Tactical Convoy Recon',
    description: 'Vehicle checkpoint approach and movement',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  },
  {
    id: 'patrol',
    label: 'Urban Perimeter Recon',
    description: 'High-speed urban vehicle transit loop',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
];

export const VideoStreamFeed: React.FC<VideoStreamFeedProps> = ({
  showDetection = true,
  onCloseStream,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoSrc, setVideoSrc] = useState<string>('');
  const [streamUrlInput, setStreamUrlInput] = useState<string>('http://localhost:8080');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [spectralFilter, setSpectralFilter] = useState<SpectralFilter>('OPTICAL');
  const [useLiveAi, setUseLiveAi] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<DetectionFilterMode>('MOVING_VEHICLES');
  const [showVlcGuide, setShowVlcGuide] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Live Vision AI Object Detection + ANPR Hook
  const { isModelReady, liveDetections, lastInferenceTimeMs, fps } = useLiveVision(videoRef, {
    enabled: showDetection && useLiveAi && !!videoSrc && isPlaying,
    detectionIntervalMs: 60,
    filterMode,
  });

  // Handle local video file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setHasError(null);
    setSelectedFileName(file.name);

    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
    setIsLoading(false);
  };

  // Handle URL stream connection
  const handleConnectStream = (urlToConnect?: string) => {
    const targetUrl = (urlToConnect || streamUrlInput).trim();
    if (!targetUrl) return;

    setIsLoading(true);
    setHasError(null);
    setSelectedFileName(targetUrl.split('/').pop() || 'Network Stream');

    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }

    setVideoSrc(targetUrl);
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Playback error:', err);
        setHasError('Unable to autoplay: Please click Play or check video format/CORS.');
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Time formatting helper (MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle video events
  const onTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsLoading(false);
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasError(null);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Spectral filter CSS style
  const getFilterStyle = (): React.CSSProperties => {
    switch (spectralFilter) {
      case 'FLIR_IRONBOW':
        return {
          filter: 'hue-rotate(280deg) saturate(3.5) contrast(1.8) brightness(0.9)',
        };
      case 'WHITE_HOT':
        return {
          filter: 'grayscale(100%) invert(85%) contrast(2.2) brightness(0.85)',
        };
      case 'GREEN_NVG':
        return {
          filter: 'sepia(100%) hue-rotate(85deg) saturate(4.0) contrast(1.5) brightness(0.9)',
        };
      default:
        return {
          filter: 'contrast(1.05) brightness(0.95)',
        };
    }
  };

  // Count vehicles in live detections
  const vehicleCount = liveDetections.filter((d) =>
    ['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE'].includes(d.class.toUpperCase())
  ).length;

  return (
    <div className="relative w-full aspect-video bg-surface-container-lowest overflow-hidden flex flex-col justify-between select-none border border-surface-container-high/60 group">
      {/* Hidden File Input for Local Video Selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/mkv,.mp4,.webm,.mov,.mkv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Main Video Element */}
      {videoSrc ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            loop={isLooping}
            muted={isMuted}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onError={() => {
              setHasError('Stream load failed. Verify VLC stream is active or file format is supported.');
              setIsLoading(false);
            }}
            style={getFilterStyle()}
            className="w-full h-full object-cover transition-all duration-300"
          />

          {/* FLIR / NVG Scanline Vignette Layer */}
          {spectralFilter !== 'OPTICAL' && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.85)_100%)] opacity-80" />
          )}

          {/* Tactical Crosshair / Optical Reticle */}
          <div className="absolute inset-0 pointer-events-none opacity-25">
            <div className="w-full h-full border border-primary/30 grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-primary/20" />
              <div className="border-r border-b border-primary/20" />
              <div className="border-b border-primary/20" />
              <div className="border-r border-b border-primary/20" />
              <div className="border-r border-b border-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 border border-primary/40 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                </div>
              </div>
              <div className="border-b border-primary/20" />
              <div className="border-r border-primary/20" />
              <div className="border-r border-primary/20" />
              <div />
            </div>
          </div>

          {/* Real-time AI Detections & ANPR Badges Over Video */}
          {showDetection &&
            useLiveAi &&
            liveDetections.map((det) => (
              <DetectionOverlay
                key={det.id}
                liveDetection={det}
                isBreached={false}
                isTripwireDisabled={true}
                isThermal={spectralFilter !== 'OPTICAL'}
              />
            ))}
        </div>
      ) : (
        /* Source Selector & Upload Landing Screen */
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-surface-container-lowest to-surface-container-low text-center gap-3">
          {/* Sensor Header */}
          <div className="flex items-center gap-2 text-tertiary font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="font-bold tracking-wider uppercase">[ SECONDARY FEED INPUT SELECTOR ]</span>
          </div>

          <h2 className="font-headline text-base sm:text-lg font-bold text-on-surface">
            Demonstrate Real-Time Vehicle & ANPR Detection
          </h2>
          <p className="font-mono text-xs text-outline max-w-md">
            Stream local demo surveillance videos, play recorded convoy / traffic footage, or connect your live VLC Media Player stream.
          </p>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-lg mt-1">
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-primary/30 hover:border-primary text-left transition-all flex flex-col gap-1.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] group/btn"
            >
              <div className="flex items-center justify-between text-primary">
                <span className="material-symbols-outlined text-2xl group-hover/btn:scale-110 transition-transform">upload_file</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/20 font-semibold">LOCAL</span>
              </div>
              <span className="font-headline text-xs font-bold text-on-surface">Select Video File</span>
              <span className="font-mono text-[10px] text-outline">MP4, WebM, MOV, MKV</span>
            </button>

            {/* VLC / Network Stream Button */}
            <button
              onClick={() => {
                setShowVlcGuide(true);
              }}
              className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-tertiary/30 hover:border-tertiary text-left transition-all flex flex-col gap-1.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] group/btn"
            >
              <div className="flex items-center justify-between text-tertiary">
                <span className="material-symbols-outlined text-2xl group-hover/btn:scale-110 transition-transform">podcasts</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-tertiary/20 font-semibold">VLC</span>
              </div>
              <span className="font-headline text-xs font-bold text-on-surface">VLC Stream / URL</span>
              <span className="font-mono text-[10px] text-outline">HTTP / HLS / IP Cam</span>
            </button>

            {/* Sample Demo Clip Button */}
            <button
              onClick={() => handleConnectStream(DEMO_PRESETS[0].url)}
              className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-secondary/30 hover:border-secondary text-left transition-all flex flex-col gap-1.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] group/btn"
            >
              <div className="flex items-center justify-between text-secondary">
                <span className="material-symbols-outlined text-2xl group-hover/btn:scale-110 transition-transform">smart_display</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-secondary/20 font-semibold">DEMO</span>
              </div>
              <span className="font-headline text-xs font-bold text-on-surface">Load Demo Footage</span>
              <span className="font-mono text-[10px] text-outline">Highway Traffic Loop</span>
            </button>
          </div>

          {/* Direct Stream URL Bar */}
          <div className="w-full max-w-lg flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base">link</span>
              <input
                type="text"
                value={streamUrlInput}
                onChange={(e) => setStreamUrlInput(e.target.value)}
                placeholder="http://localhost:8080/stream.mp4 or stream URL"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-container-highest text-on-surface font-mono text-xs focus:outline-none focus:border-tertiary"
              />
            </div>
            <button
              onClick={() => handleConnectStream()}
              className="px-3 py-1.5 rounded-lg bg-tertiary text-on-tertiary font-mono text-xs font-bold uppercase hover:bg-tertiary/90 transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              <span>Connect</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Header HUD Bar (Over Video) */}
      {videoSrc && (
        <div className="relative z-20 px-3 py-2 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-bold uppercase tracking-wider text-secondary">
              CAM-STREAM-02
            </span>
            <span className="text-white/40">·</span>
            <span className="text-white/80 text-[11px] truncate max-w-[140px] sm:max-w-xs">
              {selectedFileName || 'CUSTOM STREAM'}
            </span>

            {/* Real-time Moving Vehicle / Clutter rejection status */}
            {useLiveAi && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/50 text-[10px] font-bold">
                <span className="material-symbols-outlined text-[12px] animate-pulse">directions_car</span>
                <span>
                  {filterMode === 'MOVING_VEHICLES'
                    ? `${vehicleCount} MOVING CAR${vehicleCount !== 1 ? 'S' : ''} [NOISE FILTER ACTIVE]`
                    : `${vehicleCount} VEHICLE${vehicleCount !== 1 ? 'S' : ''}`}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Target Filter Mode Selector (Moving Cars vs All Vehicles vs All Targets) */}
            {useLiveAi && (
              <div className="flex items-center gap-0.5 bg-black/70 backdrop-blur rounded p-0.5 border border-white/20 text-[9px] font-mono">
                <button
                  onClick={() => setFilterMode('MOVING_VEHICLES')}
                  title="Only Detect Moving Cars & Filter Out Clutter"
                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                    filterMode === 'MOVING_VEHICLES'
                      ? 'bg-secondary text-black font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[11px]">motion_sensor_active</span>
                  <span>MOVING CARS</span>
                </button>

                <button
                  onClick={() => setFilterMode('ALL_VEHICLES')}
                  title="Detect All Vehicles (Moving & Static)"
                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                    filterMode === 'ALL_VEHICLES'
                      ? 'bg-secondary text-black font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[11px]">directions_car</span>
                  <span>ALL VEHICLES</span>
                </button>

                <button
                  onClick={() => setFilterMode('ALL_OBJECTS')}
                  title="Detect All Recognized Objects"
                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                    filterMode === 'ALL_OBJECTS'
                      ? 'bg-secondary text-black font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[11px]">grid_view</span>
                  <span>ALL</span>
                </button>
              </div>
            )}

            {/* Spectral Filter Switcher */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur rounded p-0.5 border border-white/20 text-[10px]">
              {(['OPTICAL', 'FLIR_IRONBOW', 'WHITE_HOT', 'GREEN_NVG'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSpectralFilter(filter)}
                  title={`Switch to ${filter}`}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                    spectralFilter === filter
                      ? 'bg-tertiary text-black font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {filter === 'OPTICAL'
                    ? 'RGB'
                    : filter === 'FLIR_IRONBOW'
                    ? 'FLIR'
                    : filter === 'WHITE_HOT'
                    ? 'W-HOT'
                    : 'NVG'}
                </button>
              ))}
            </div>

            {/* AI Mode Switcher */}
            <button
              onClick={() => setUseLiveAi((prev) => !prev)}
              title="Toggle Real-Time Vehicle Vision & ANPR"
              className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                useLiveAi
                  ? 'bg-secondary text-black border-secondary'
                  : 'bg-black/60 text-white/60 border-white/20'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {useLiveAi ? 'psychology' : 'visibility_off'}
              </span>
              <span>{useLiveAi ? 'AI ON' : 'AI OFF'}</span>
            </button>

            {/* Change / Change Source Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload New Video File"
              className="p-1 rounded bg-black/60 hover:bg-black/90 border border-white/20 text-white/80 hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
            </button>

            {/* Reset / Close Stream */}
            {onCloseStream && (
              <button
                onClick={onCloseStream}
                title="Return to Standby"
                className="p-1 rounded bg-black/60 hover:bg-error/80 border border-white/20 text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Interactive Transport & Telemetry Bar (Over Video) */}
      {videoSrc && (
        <div className="relative z-20 px-3 py-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-1.5 font-mono text-white text-xs">
          {/* Scrubber Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/70">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-tertiary"
            />
            <span className="text-[10px] text-white/70">{formatTime(duration)}</span>
          </div>

          {/* Transport Controls & Telemetry Tags */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  {isMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>

              <button
                onClick={() => setIsLooping((prev) => !prev)}
                title="Loop Video"
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  isLooping
                    ? 'bg-primary/30 text-primary border-primary/50'
                    : 'text-white/50 border-white/20'
                }`}
              >
                LOOP: {isLooping ? 'ON' : 'OFF'}
              </button>

              {/* Speed Switcher */}
              <div className="hidden sm:flex items-center gap-1 text-[10px]">
                {[0.5, 1, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-1.5 py-0.5 rounded ${
                      playbackRate === rate ? 'bg-tertiary text-black font-bold' : 'text-white/60'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time AI Latency & Resolution Status */}
            <div className="flex items-center gap-2 text-[10px]">
              {isModelReady && useLiveAi && (
                <div className="flex items-center gap-1 text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  <span>AI: {lastInferenceTimeMs || 10}ms ({fps || 15} FPS)</span>
                </div>
              )}
              <span className="hidden sm:inline text-white/50">|</span>
              <span className="text-white/70 uppercase">
                {spectralFilter.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {hasError && (
        <div className="absolute top-12 left-4 right-4 z-30 p-2.5 rounded-lg bg-error-container/95 border border-error text-error text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">warning</span>
            <span>{hasError}</span>
          </div>
          <button
            onClick={() => setHasError(null)}
            className="text-error font-bold px-1 hover:underline"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-surface-container-lowest/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 font-mono text-xs text-tertiary">
          <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
          <span>BUFFERING SURVEILLANCE FEED...</span>
        </div>
      )}

      {/* VLC Media Player Step-by-step Setup Modal */}
      {showVlcGuide && (
        <div className="absolute inset-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto">
          <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">help</span>
              <h3 className="font-headline text-sm font-bold text-on-surface uppercase">
                How to Stream Video from VLC Media Player
              </h3>
            </div>
            <button
              onClick={() => setShowVlcGuide(false)}
              className="p-1 rounded hover:bg-surface-container-high text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-mono text-[11px] text-on-surface-variant my-2">
            <div className="p-3 rounded-lg bg-surface-container border border-surface-container-high flex flex-col gap-1">
              <span className="text-tertiary font-bold">Step 1: Open VLC Media Player</span>
              <p className="text-outline text-[10px]">
                Go to menu: <strong>Media &rarr; Stream... (Ctrl+S)</strong>. Click <strong>Add...</strong> and select your video file (e.g., vehicle traffic or highway surveillance clip).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-surface-container-high flex flex-col gap-1">
              <span className="text-tertiary font-bold">Step 2: Set Output to HTTP</span>
              <p className="text-outline text-[10px]">
                Click <strong>Stream &rarr; Next</strong>. In Destination Setup, select <strong>HTTP</strong> and click <strong>Add</strong>. Set Port to <strong>8080</strong> and Path to <strong>/</strong> (or <strong>/stream.mp4</strong>).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-surface-container-high flex flex-col gap-1">
              <span className="text-tertiary font-bold">Step 3: Transcode to Video - H.264 + MP3 (MP4)</span>
              <p className="text-outline text-[10px]">
                Click Next, choose Profile <strong>Video - H.264 + MP3 (MP4)</strong>, and click <strong>Stream</strong>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-surface-container-high flex flex-col gap-1">
              <span className="text-tertiary font-bold">Step 4: Connect in Trinetra</span>
              <p className="text-outline text-[10px]">
                Enter <strong>http://localhost:8080</strong> in the input box below and click <strong>Connect</strong>. The live stream will render with real-time vehicle AI and ANPR!
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-surface-container-high pt-2">
            <button
              onClick={() => handleConnectStream(DEMO_PRESETS[0].url)}
              className="px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-mono text-xs hover:bg-surface-container-highest transition-colors"
            >
              Or Use Online Highway Demo
            </button>
            <button
              onClick={() => setShowVlcGuide(false)}
              className="px-4 py-1.5 rounded-lg bg-tertiary text-on-tertiary font-mono text-xs font-bold uppercase hover:bg-tertiary/90 transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
