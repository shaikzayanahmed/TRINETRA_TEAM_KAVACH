import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';

interface TacticalMapViewerProps {
  interactive?: boolean;
  compact?: boolean;
}

export const TacticalMapViewer: React.FC<TacticalMapViewerProps> = ({
  interactive = true,
  compact = false,
}) => {
  const { activeTarget, isFenceBreached, activeAlert } = useDemo();
  const [zoom, setZoom] = useState<number>(1);
  const [showFence, setShowFence] = useState<boolean>(true);
  const [showSensors, setShowSensors] = useState<boolean>(true);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);

  return (
    <div className={`relative w-full ${compact ? 'h-64' : 'h-[500px] lg:h-[620px]'} bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-container-high/60 shadow-[-3px_-3px_7px_rgba(255,255,255,0.03),4px_4px_10px_rgba(0,0,0,0.55)] select-none`}>
      {/* Topographic Background & Tactical Grid */}
      <svg
        className="w-full h-full"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.3s ease' }}
      >
        <defs>
          <pattern id="tacticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#262a32" strokeWidth="0.75" strokeDasharray="2 2" />
          </pattern>
          <linearGradient id="fenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isFenceBreached ? '#ffb4ab' : '#adc6ff'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isFenceBreached ? '#ff5449' : '#3b82f6'} stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isFenceBreached ? '#ff5449' : '#adc6ff'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isFenceBreached ? '#93000a' : '#002e6a'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base Grid Layer */}
        <rect width="100%" height="100%" fill="#0a0e16" />
        <rect width="100%" height="100%" fill="url(#tacticalGrid)" />

        {/* Topographic Contour Lines (Leh Valley Terrain) */}
        <g stroke="#1c2028" strokeWidth="1.2" fill="none" opacity="0.8">
          <path d="M 50 120 Q 200 80, 400 130 T 750 90" />
          <path d="M 30 220 Q 250 180, 480 240 T 780 190" />
          <path d="M 20 340 Q 300 290, 520 360 T 770 310" />
          <path d="M 80 430 Q 350 400, 580 440 T 740 420" />
        </g>

        {/* Range Rings around EDGE-01 */}
        {showRangeRings && (
          <g stroke="#31353d" strokeWidth="1" fill="none" strokeDasharray="4 4" opacity="0.6">
            <circle cx="380" cy="260" r="100" />
            <circle cx="380" cy="260" r="200" />
            <circle cx="380" cy="260" r="300" />
            <text x="485" y="255" fill="#8c909f" fontSize="9" fontFamily="JetBrains Mono">1.0 KM</text>
            <text x="585" y="255" fill="#8c909f" fontSize="9" fontFamily="JetBrains Mono">2.0 KM</text>
            <text x="685" y="255" fill="#8c909f" fontSize="9" fontFamily="JetBrains Mono">3.0 KM</text>
          </g>
        )}

        {/* International Boundary / Physical Fence Line */}
        <g stroke="#424754" strokeWidth="2" strokeDasharray="8 4" fill="none">
          <path d="M 80 80 L 260 170 L 460 210 L 680 340 L 760 440" />
          <text x="120" y="85" fill="#8c909f" fontSize="10" fontFamily="JetBrains Mono" letterSpacing="1">
            IB FENCE LINE (SECTOR 07)
          </text>
        </g>

        {/* Virtual Tripwire / Zone Alpha Polygon */}
        {showFence && (
          <g>
            <polygon
              points="200,160 420,180 500,320 280,300"
              fill={isFenceBreached ? 'rgba(147, 0, 10, 0.25)' : 'rgba(59, 130, 246, 0.12)'}
              stroke="url(#fenceGradient)"
              strokeWidth={isFenceBreached ? '2.5' : '1.8'}
              strokeDasharray={isFenceBreached ? 'none' : '6 3'}
            />
            <text
              x="290"
              y="235"
              fill={isFenceBreached ? '#ffb4ab' : '#adc6ff'}
              fontSize="11"
              fontFamily="JetBrains Mono"
              fontWeight="bold"
            >
              ZONE ALPHA [VIRTUAL TRIPWIRE]
            </text>
          </g>
        )}

        {/* Sensors & Edge Nodes */}
        {showSensors && (
          <g>
            {/* EDGE-01 Node */}
            <g transform="translate(380, 260)">
              <rect x="-14" y="-14" width="28" height="28" rx="6" fill="#181c24" stroke="#95d4b0" strokeWidth="2" />
              <circle cx="0" cy="0" r="4" fill="#95d4b0" />
              <text x="18" y="4" fill="#dfe2ed" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">
                EDGE-01
              </text>
              <text x="18" y="16" fill="#95d4b0" fontSize="9" fontFamily="JetBrains Mono">
                ONLINE · AI ACTIVE
              </text>
            </g>

            {/* CAM-RGB-01 */}
            <g transform="translate(260, 170)">
              <circle cx="0" cy="0" r="10" fill="#181c24" stroke="#adc6ff" strokeWidth="2" />
              <circle cx="0" cy="0" r="3" fill="#adc6ff" />
              <path d="M 0 -10 L 40 -40 M 0 10 L 40 40" stroke="#adc6ff" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
              <text x="-40" y="-14" fill="#adc6ff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                CAM-RGB-01
              </text>
            </g>

            {/* CAM-LWIR-01 */}
            <g transform="translate(460, 210)">
              <circle cx="0" cy="0" r="10" fill="#181c24" stroke="#ffb77d" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="0" cy="0" r="3" fill="#ffb77d" opacity="0.6" />
              <text x="14" y="-10" fill="#ffb77d" fontSize="10" fontFamily="JetBrains Mono">
                CAM-LWIR-01 (WAITING)
              </text>
            </g>
          </g>
        )}

        {/* Active Target / Alert Position */}
        {activeTarget && (
          <g transform="translate(340, 220)">
            {/* Target Pulse */}
            <circle cx="0" cy="0" r="24" fill="url(#targetGlow)" className="animate-ping" opacity="0.7" />
            <circle cx="0" cy="0" r="8" fill={isFenceBreached ? '#ff5449' : '#adc6ff'} stroke="#0f131b" strokeWidth="2" />
            {/* Motion Vector Line */}
            <line x1="0" y1="0" x2="25" y2="20" stroke={isFenceBreached ? '#ffb4ab' : '#adc6ff'} strokeWidth="2" />
            <polygon points="25,20 20,12 14,18" fill={isFenceBreached ? '#ffb4ab' : '#adc6ff'} />

            {/* Callout Box */}
            <rect
              x="12"
              y="-32"
              width="130"
              height="28"
              rx="4"
              fill="#0a0e16"
              stroke={isFenceBreached ? '#ff5449' : '#adc6ff'}
              strokeWidth="1.2"
            />
            <text x="18" y="-18" fill={isFenceBreached ? '#ffb4ab' : '#adc6ff'} fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
              {activeTarget.id} · {activeTarget.classification}
            </text>
            <text x="18" y="-7" fill="#dfe2ed" fontSize="9" fontFamily="JetBrains Mono">
              {activeTarget.confidence}% · {isFenceBreached ? 'TRIPWIRE BREACH' : 'TRACKING'}
            </text>
          </g>
        )}
      </svg>

      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest/90 border border-surface-container-high font-mono text-xs shadow-md">
        <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
        <div>
          <span className="font-bold text-on-surface">NORTHERN BORDER SECTOR 07</span>
          <div className="text-[10px] text-outline">GPS: 34°17′28″N, 77°45′12″E · ELEV: 3,420M</div>
        </div>
      </div>

      {/* Map Controls */}
      {interactive && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 font-mono text-xs">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container-lowest/90 border border-surface-container-high shadow-md">
            <button
              onClick={() => setZoom((prev) => Math.min(prev + 0.25, 2.0))}
              title="Zoom In"
              className="w-7 h-7 rounded bg-surface-container hover:bg-surface-container-highest text-primary flex items-center justify-center"
            >
              +
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.75))}
              title="Zoom Out"
              className="w-7 h-7 rounded bg-surface-container hover:bg-surface-container-highest text-primary flex items-center justify-center"
            >
              -
            </button>
            <button
              onClick={() => setZoom(1)}
              title="Reset View"
              className="px-2 h-7 rounded bg-surface-container hover:bg-surface-container-highest text-outline text-[10px] flex items-center justify-center"
            >
              RESET
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-1 px-2 rounded-lg bg-surface-container-lowest/90 border border-surface-container-high text-[10px]">
            <button
              onClick={() => setShowFence((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded ${showFence ? 'bg-primary/20 text-primary' : 'text-outline'}`}
            >
              FENCE
            </button>
            <button
              onClick={() => setShowSensors((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded ${showSensors ? 'bg-secondary/20 text-secondary' : 'text-outline'}`}
            >
              SENSORS
            </button>
            <button
              onClick={() => setShowRangeRings((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded ${showRangeRings ? 'bg-primary/20 text-primary' : 'text-outline'}`}
            >
              RINGS
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 hidden md:flex items-center gap-3 p-1.5 px-2.5 rounded-lg bg-surface-container-lowest/90 border border-surface-container-high font-mono text-[10px] text-outline">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span>EDGE NODE</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>OPTICAL RGB</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-tertiary" />
          <span>LWIR (STANDBY)</span>
        </div>
        {activeAlert && (
          <div className="flex items-center gap-1 text-error font-bold">
            <span className="w-2 h-2 rounded-full bg-error animate-ping" />
            <span>BREACH: ALT-7821</span>
          </div>
        )}
      </div>
    </div>
  );
};
