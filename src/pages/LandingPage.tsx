import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-body">
      {/* Top Header */}
      <header className="w-full bg-surface-container-lowest/90 backdrop-blur border-b border-surface-container-high/60 px-6 py-3.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="TRINETRA Logo" className="h-9 w-9 object-contain filter drop-shadow-[0_0_8px_rgba(173,198,255,0.4)]" />
          <div className="flex flex-col">
            <span className="font-headline text-base font-extrabold tracking-wider uppercase text-on-surface">
              TRINETRA
            </span>
            <span className="font-mono text-[10px] text-primary font-semibold tracking-widest uppercase">
              EDGE-AI BORDER SURVEILLANCE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono text-xs font-semibold border border-primary/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] transition-all"
          >
            OPERATOR LOGIN
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-mono text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(173,198,255,0.35)] flex items-center gap-1.5"
          >
            <span>ENTER COMMAND CENTER</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-primary/30 font-mono text-xs text-primary mb-6 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span>DECENTRALIZED EDGE-AI THREAT INTERCEPTION PLATFORM</span>
        </div>

        <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-on-surface max-w-4xl leading-tight">
          Tactical Edge-Native Border Security & Surveillance
        </h1>

        <p className="font-body text-base sm:text-lg text-on-surface-variant max-w-2xl mt-6 leading-relaxed">
          High-precision multi-sensor surveillance engineered for remote perimeters. Eliminates cloud-dependency by processing raw visual and thermal streams directly on ruggedized edge nodes, transmitting only cryptographically hashed metadata over constrained networks.
        </p>

        {/* CTA Group */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-headline text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(173,198,255,0.4)] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span>LAUNCH COMMAND CENTER</span>
          </Link>
          <Link
            to="/surveillance"
            className="px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-headline text-sm font-semibold border border-primary/30 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.6)] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">videocam</span>
            <span>VIEW LIVE SURVEILLANCE</span>
          </Link>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-16 max-w-4xl">
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-secondary">&lt; 5 ms</span>
            <span className="font-mono text-xs text-outline mt-1 uppercase">Inference Latency</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-primary">&lt; 5 KB</span>
            <span className="font-mono text-xs text-outline mt-1 uppercase">Payload / Alert</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-tertiary">SHA-256</span>
            <span className="font-mono text-xs text-outline mt-1 uppercase">Evidence Integrity</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-secondary">DPDPA</span>
            <span className="font-mono text-xs text-outline mt-1 uppercase">Privacy by Design</span>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-16 px-6 bg-surface-container-lowest border-y border-surface-container-high/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl font-bold uppercase tracking-wide text-on-surface">
              Core Architectural Pillars
            </h2>
            <p className="font-body text-sm text-outline mt-2">
              Engineered for zero bandwidth dependency and zero false alarms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">memory</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface uppercase tracking-wide">
                Hardware-Aware Edge AI
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                Executes deep INT8 quantized YOLOv8 neural networks natively on low-power edge nodes (NVIDIA Jetson Orin), keeping total power under 15W without continuous HD raw video streaming.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">fence</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface uppercase tracking-wide">
                Spatial Virtual Tripwires
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                Operators define calibrated polygon boundaries. Upon boundary breach, the edge node isolates keyframes and packages coordinates into lightweight event-driven JSON payloads.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface uppercase tracking-wide">
                Evidence Integrity & Privacy
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                All evidence clips are cryptographically sealed with SHA-256 checksums at the edge source. Biometric faces of non-targets are automatically blurred for statutory DPDPA compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 px-6 bg-surface-container-lowest border-t border-surface-container-high/60 text-center font-mono text-xs text-outline">
        <span>TRINETRA EDGE-AI SURVEILLANCE · SIH 2024 · RESTRICTED USE</span>
      </footer>
    </div>
  );
};
