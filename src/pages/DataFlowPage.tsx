import React from 'react';

export const DataFlowPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">account_tree</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Network Topology & Constrained Data Flow
            </h1>
            <span className="font-mono text-[11px] text-outline">
              LOW-BANDWIDTH DIGITAL MOBILE RADIO (DMR) · EVENT-DRIVEN METADATA DISPATCH
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-lg bg-surface-container text-secondary border border-secondary/30 font-bold">
            BACKHAUL BANDWIDTH: 4.8 KB / ALERT
          </span>
        </div>
      </div>

      {/* End-to-End Visual Topology Stage */}
      <div className="p-6 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-6 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
          <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
            Decentralized Tactical Edge Ingestion & Mesh Transmission
          </span>
          <span className="text-secondary font-bold">ALL LINKS OPERATIONAL</span>
        </div>

        {/* Nodes Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stage 1: Field Sensors */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high shadow-tactical-inset flex flex-col gap-3">
            <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-1.5 flex items-center justify-between">
              <span>1. Field Multi-Spectral Sensors</span>
              <span className="text-primary text-[10px]">IN SITU</span>
            </span>

            <div className="flex flex-col gap-2">
              <div className="p-2.5 rounded bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-on-surface">CAM-RGB-01</div>
                  <div className="text-[10px] text-outline">Visible 1080p Optical</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-bold text-[10px]">
                  CONNECTED
                </span>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-tertiary">CAM-LWIR-01</div>
                  <div className="text-[10px] text-outline">Thermal FLIR Uncooled</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-tertiary font-bold text-[10px]">
                  WAITING FOR INPUT
                </span>
              </div>
            </div>
          </div>

          {/* Stage 2: Edge Node Processing */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-primary/40 shadow-tactical-inset flex flex-col gap-3">
            <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-1.5 flex items-center justify-between">
              <span>2. Tactical Edge Processor</span>
              <span className="text-secondary text-[10px]">JETSON ORIN</span>
            </span>

            <div className="flex flex-col gap-2">
              <div className="p-2 rounded bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between">
                <span>NVDEC Hardware Decoder</span>
                <span className="text-secondary font-bold">ONLINE</span>
              </div>
              <div className="p-2 rounded bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between">
                <span>YOLOv8-TRT INT8 Model</span>
                <span className="text-secondary font-bold">4.6ms</span>
              </div>
              <div className="p-2 rounded bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between">
                <span>Kalman Target Tracker</span>
                <span className="text-secondary font-bold">ONLINE</span>
              </div>
              <div className="p-2 rounded bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between">
                <span>SHA-256 Crypto Sealer</span>
                <span className="text-secondary font-bold">VERIFIED</span>
              </div>
            </div>
          </div>

          {/* Stage 3: Command Center Console */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high shadow-tactical-inset flex flex-col gap-3">
            <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-1.5 flex items-center justify-between">
              <span>3. Central Command Hub</span>
              <span className="text-primary text-[10px]">CONSOLE</span>
            </span>

            <div className="flex flex-col gap-2">
              <div className="p-2.5 rounded bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-on-surface">Tactical Dashboard</div>
                  <div className="text-[10px] text-outline">Real-Time Threat Visualizer</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-bold text-[10px]">
                  CONNECTED
                </span>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-on-surface">Evidence Vault</div>
                  <div className="text-[10px] text-outline">Immutable Audit Ledger</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-bold text-[10px]">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Protocol & Bandwidth Characteristics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2">
            Link Connection States & Physical Media
          </span>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-outline">
            <span>RGB Sensor → EDGE-01:</span>
            <span className="text-right text-secondary font-bold">CONNECTED (GigE/RTSP)</span>

            <span>LWIR Sensor → EDGE-01:</span>
            <span className="text-right text-tertiary font-bold">WAITING FOR INPUT</span>

            <span>EDGE-01 → Command Center:</span>
            <span className="text-right text-secondary font-bold">CONNECTED (DMR Mesh / MQTT)</span>

            <span>Transport Security:</span>
            <span className="text-right text-primary font-bold">AES-GCM-256 + SHA-256</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
          <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2">
            Bandwidth Compression Advantages
          </span>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-outline">
            <span>Legacy Raw Video Stream:</span>
            <span className="text-right text-outline line-through">~ 8,000 KB/s (High Bandwidth)</span>

            <span>TRINETRA Event Metadata:</span>
            <span className="text-right text-secondary font-bold">&lt; 4.8 KB / Alert (99.9% Savings)</span>

            <span>Tactical Packet Delivery:</span>
            <span className="text-right text-secondary font-bold">100% Guaranteed Delivery</span>

            <span>Network Reliability:</span>
            <span className="text-right text-primary font-bold">DMR Zero-Packet-Loss Mesh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
