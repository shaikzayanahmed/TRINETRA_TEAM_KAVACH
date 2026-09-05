import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface PerimeterNode {
  id: string;
  name: string;
  type: 'SENSOR' | 'JETSON' | 'TRIPWIRE' | 'RELAY';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  status: 'ONLINE' | 'ACTIVE' | 'ARMED';
  latency: string;
}

const PERIMETER_NODES: PerimeterNode[] = [
  { id: 'N-01', name: 'Leh North Edge-01', type: 'JETSON', x: 20, y: 35, status: 'ONLINE', latency: '3.1ms' },
  { id: 'N-02', name: 'Thermal Post Bravo', type: 'SENSOR', x: 78, y: 28, status: 'ACTIVE', latency: '4.2ms' },
  { id: 'N-03', name: 'Ridge Tripwire Alpha', type: 'TRIPWIRE', x: 35, y: 72, status: 'ARMED', latency: '1.8ms' },
  { id: 'N-04', name: 'Kavach Relay Node', type: 'RELAY', x: 68, y: 68, status: 'ONLINE', latency: '2.5ms' },
  { id: 'N-05', name: 'Valley Radar Sentry', type: 'SENSOR', x: 50, y: 20, status: 'ACTIVE', latency: '3.8ms' },
];

export const LandingPage: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, normX: 0.5, normY: 0.5 });
  const [activeNode, setActiveNode] = useState<PerimeterNode | null>(null);
  const [cardRotations, setCardRotations] = useState<{ [key: string]: { x: number; y: number } }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Smooth mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = x / rect.width;
    const normY = y / rect.height;

    setMousePos({ x, y, normX, normY });
  }, []);

  // Card 3D tilt calculation on hover
  const handleCardMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -7; // max 7 deg
    const rotateY = ((x - centerX) / centerX) * 7;

    setCardRotations((prev) => ({
      ...prev,
      [id]: { x: rotateX, y: rotateY },
    }));
  };

  const handleCardMouseLeave = (id: string) => {
    setCardRotations((prev) => ({
      ...prev,
      [id]: { x: 0, y: 0 },
    }));
  };

  // Canvas radar backdrop with subtle interactive particle connection to cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.012;

      // Draw subtle tactical grid lines
      ctx.strokeStyle = 'rgba(140, 144, 159, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Tactical Radar nodes and connections to mouse
      const targetMouseX = mousePos.x;
      const targetMouseY = mousePos.y;

      PERIMETER_NODES.forEach((node) => {
        const nx = (node.x / 100) * canvas.width;
        const ny = (node.y / 100) * canvas.height;

        const distToMouse = Math.hypot(targetMouseX - nx, targetMouseY - ny);
        const maxDist = 240;

        // Subtle interactive laser tether from mouse to node if in proximity
        if (distToMouse < maxDist && targetMouseX > 0 && targetMouseY > 0) {
          const alpha = (1 - distToMouse / maxDist) * 0.35;
          ctx.strokeStyle = `rgba(173, 198, 255, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(targetMouseX, targetMouseY);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          ctx.setLineDash([]);

          // Halo ring around nearby node
          ctx.strokeStyle = `rgba(149, 212, 176, ${alpha * 0.8})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(nx, ny, 16 + Math.sin(angle * 3) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw node center
        ctx.fillStyle = node.type === 'TRIPWIRE' ? '#ffb77d' : node.type === 'JETSON' ? '#adc6ff' : '#95d4b0';
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Node pulse circle
        ctx.strokeStyle = 'rgba(173, 198, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nx, ny, 8 + (Math.sin(angle + nx) + 1) * 3, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Subtle tactical cursor ring
      if (targetMouseX > 0 && targetMouseY > 0) {
        ctx.strokeStyle = 'rgba(173, 198, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(targetMouseX, targetMouseY, 28, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.strokeStyle = 'rgba(173, 198, 255, 0.35)';
        ctx.beginPath();
        ctx.moveTo(targetMouseX - 10, targetMouseY);
        ctx.lineTo(targetMouseX + 10, targetMouseY);
        ctx.moveTo(targetMouseX, targetMouseY - 10);
        ctx.lineTo(targetMouseX, targetMouseY + 10);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [mousePos]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-surface text-on-surface flex flex-col font-body overflow-x-hidden select-none"
    >
      {/* Interactive Ambient Spotlight (Follows Mouse subtly) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, rgba(173, 198, 255, 0.055), transparent 75%)`,
        }}
      />

      {/* Interactive Background Radar Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 w-full h-full opacity-70"
      />

      {/* Top Header */}
      <header className="relative z-10 w-full bg-surface-container-lowest/90 backdrop-blur border-b border-surface-container-high/60 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="TRINETRA Logo"
            className="h-9 w-9 object-contain filter drop-shadow-[0_0_8px_rgba(173,198,255,0.4)] transition-transform hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-headline text-base font-extrabold tracking-wider uppercase text-on-surface">
              TRINETRA
            </span>
            <span className="font-mono text-[10px] text-primary font-semibold tracking-widest uppercase">
              EDGE-AI BORDER SURVEILLANCE
            </span>
          </div>
        </div>

        {/* Live HUD Coordinate Tracker */}
        <div className="hidden md:flex items-center gap-4 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-high/50 font-mono text-[10px] text-outline">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-secondary font-bold">RADAR ACTIVE</span>
          </div>
          <span className="text-surface-container-highest">|</span>
          <span>LAT: {(34.1526 + (mousePos.normY - 0.5) * 0.04).toFixed(4)}°N</span>
          <span>LON: {(77.5771 + (mousePos.normX - 0.5) * 0.04).toFixed(4)}°E</span>
          <span className="text-surface-container-highest">|</span>
          <span className="text-primary">GRID: SECTOR 07</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono text-xs font-semibold border border-primary/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] hover:shadow-[0_0_10px_rgba(173,198,255,0.25)] transition-all"
          >
            OPERATOR LOGIN
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-mono text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(173,198,255,0.35)] hover:shadow-[0_0_22px_rgba(173,198,255,0.55)] flex items-center gap-1.5 group"
          >
            <span>ENTER COMMAND CENTER</span>
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden pt-16 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low/90 backdrop-blur border border-primary/30 font-mono text-xs text-primary mb-6 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] hover:border-primary/60 transition-all cursor-default">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span>DECENTRALIZED EDGE-AI THREAT INTERCEPTION PLATFORM</span>
        </div>

        <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-on-surface max-w-4xl leading-tight drop-shadow-md">
          Tactical Edge-Native Border Security & Surveillance
        </h1>

        <p className="font-body text-base sm:text-lg text-on-surface-variant max-w-2xl mt-6 leading-relaxed">
          High-precision multi-sensor surveillance engineered for remote perimeters. Eliminates cloud-dependency by processing raw visual and thermal streams directly on ruggedized edge nodes, transmitting only cryptographically hashed metadata over constrained networks.
        </p>

        {/* CTA Group */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-headline text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(173,198,255,0.4)] hover:shadow-[0_0_30px_rgba(173,198,255,0.65)] hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span>LAUNCH COMMAND CENTER</span>
          </Link>
          <Link
            to="/surveillance"
            className="px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-headline text-sm font-semibold border border-primary/30 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.6)] hover:shadow-[0_0_15px_rgba(173,198,255,0.25)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">videocam</span>
            <span>VIEW LIVE SURVEILLANCE</span>
          </Link>
        </div>

        {/* Interactive Interactive Perimeter Nodes Strip */}
        <div className="mt-12 w-full max-w-4xl p-3.5 rounded-xl bg-surface-container-low/80 backdrop-blur border border-surface-container-high/60 shadow-tactical-plate flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[20px] animate-spin-slow">radar</span>
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-on-surface uppercase">Live Perimeter Telemetry</span>
              <span className="font-mono text-[10px] text-outline">Move mouse across grid to engage spatial sensor laser lock</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PERIMETER_NODES.map((node) => (
              <button
                key={node.id}
                onMouseEnter={() => setActiveNode(node)}
                onMouseLeave={() => setActiveNode(null)}
                className={`px-2.5 py-1 rounded-md font-mono text-[10px] border transition-all flex items-center gap-1.5 ${
                  activeNode?.id === node.id
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(173,198,255,0.4)]'
                    : 'bg-surface-container-high/60 border-surface-container-highest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${node.type === 'TRIPWIRE' ? 'bg-tertiary' : 'bg-secondary'}`} />
                <span>{node.name}</span>
                <span className="text-outline">({node.latency})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Strip with 3D Tilt Effect */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8 max-w-4xl perspective-[1000px]">
          {[
            { id: 'm1', val: '< 5 ms', label: 'Inference Latency', color: 'text-secondary', icon: 'speed' },
            { id: 'm2', val: '< 5 KB', label: 'Payload / Alert', color: 'text-primary', icon: 'compress' },
            { id: 'm3', val: 'SHA-256', label: 'Evidence Integrity', color: 'text-tertiary', icon: 'verified' },
            { id: 'm4', val: 'DPDPA', label: 'Privacy by Design', color: 'text-secondary', icon: 'shield' },
          ].map((item) => {
            const rot = cardRotations[item.id] || { x: 0, y: 0 };
            return (
              <div
                key={item.id}
                onMouseMove={(e) => handleCardMouseMove(item.id, e)}
                onMouseLeave={() => handleCardMouseLeave(item.id)}
                style={{
                  transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
                  transition: 'transform 0.15s ease-out',
                  transformStyle: 'preserve-3d',
                }}
                className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate hover:border-primary/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.7)] flex flex-col items-center cursor-default transition-colors group"
              >
                <span className={`font-mono text-2xl lg:text-3xl font-bold ${item.color} group-hover:scale-105 transition-transform`}>
                  {item.val}
                </span>
                <span className="font-mono text-xs text-outline mt-1 uppercase group-hover:text-on-surface transition-colors">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Architectural Pillars with Interactive Hover Sheen */}
      <section className="relative z-10 py-16 px-6 bg-surface-container-lowest/90 backdrop-blur border-y border-surface-container-high/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl font-bold uppercase tracking-wide text-on-surface">
              Core Architectural Pillars
            </h2>
            <p className="font-body text-sm text-outline mt-2">
              Engineered for zero bandwidth dependency and zero false alarms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 perspective-[1000px]">
            {[
              {
                id: 'p1',
                icon: 'memory',
                title: 'Hardware-Aware Edge AI',
                desc: 'Executes deep INT8 quantized YOLOv8 neural networks natively on low-power edge nodes (NVIDIA Jetson Orin), keeping total power under 15W without continuous HD raw video streaming.',
              },
              {
                id: 'p2',
                icon: 'fence',
                title: 'Spatial Virtual Tripwires',
                desc: 'Operators define calibrated polygon boundaries. Upon boundary breach, the edge node isolates keyframes and packages coordinates into lightweight event-driven JSON payloads.',
              },
              {
                id: 'p3',
                icon: 'verified_user',
                title: 'Evidence Integrity & Privacy',
                desc: 'All evidence clips are cryptographically sealed with SHA-256 checksums at the edge source. Biometric faces of non-targets are automatically blurred for statutory DPDPA compliance.',
              },
            ].map((pillar) => {
              const rot = cardRotations[pillar.id] || { x: 0, y: 0 };
              return (
                <div
                  key={pillar.id}
                  onMouseMove={(e) => handleCardMouseMove(pillar.id, e)}
                  onMouseLeave={() => handleCardMouseLeave(pillar.id)}
                  style={{
                    transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
                    transition: 'transform 0.15s ease-out',
                    transformStyle: 'preserve-3d',
                  }}
                  className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex flex-col gap-3 transition-colors group cursor-default"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_12px_rgba(173,198,255,0.4)] transition-all">
                    <span className="material-symbols-outlined text-2xl">{pillar.icon}</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-on-surface uppercase tracking-wide group-hover:text-primary transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto py-6 px-6 bg-surface-container-lowest border-t border-surface-container-high/60 text-center font-mono text-xs text-outline flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full">
        <span>TRINETRA EDGE-AI SURVEILLANCE · SIH 2026 · RESTRICTED USE</span>
        <div className="flex items-center gap-3 mt-2 sm:mt-0 text-[11px]">
          <span className="text-secondary font-semibold">● SYSTEM ONLINE</span>
          <span className="text-outline">SEC LEVEL: RESTRICTED</span>
        </div>
      </footer>
    </div>
  );
};

