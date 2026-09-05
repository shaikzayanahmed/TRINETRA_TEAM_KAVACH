import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Evidence } from '../types';
import { apiService } from '../services/apiService';
import { useDemo } from '../context/DemoContext';

export const EvidenceVaultPage: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const { activeEvidence } = useDemo();

  useEffect(() => {
    const fetchEvidence = async () => {
      const data = await apiService.getEvidence();
      setEvidenceList(data);
      setSelectedEvidence(data[0]);
    };
    fetchEvidence();
  }, []);

  const currentEvidence = activeEvidence || selectedEvidence;

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">fingerprint</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Evidence Vault & Cryptographic Integrity
            </h1>
            <span className="font-mono text-[11px] text-outline">
              SHA-256 HASH CHAIN · DPDPA BIOMETRIC PRIVACY ANONYMIZATION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-lg bg-surface-container text-secondary border border-secondary/30 font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>SHA-256 VERIFIED</span>
          </span>
        </div>
      </div>

      {/* Main Evidence Details Layout */}
      {currentEvidence && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Evidence Inspector (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg font-bold text-primary">{currentEvidence.id}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono text-xs font-semibold">
                    {currentEvidence.type}
                  </span>
                </div>

                <span className="px-2.5 py-0.5 rounded bg-secondary-container text-secondary font-mono text-xs font-bold uppercase">
                  SHA-256 VERIFIED
                </span>
              </div>

              {/* Evidence Video Simulation Player Frame */}
              <div className="relative w-full aspect-video bg-surface-container-lowest rounded-lg border border-surface-container-high/60 overflow-hidden flex flex-col items-center justify-center p-6 shadow-tactical-inset">
                <div className="w-14 h-14 rounded-2xl bg-surface-container border border-primary/40 flex items-center justify-center text-primary shadow-tactical-extruded">
                  <span className="material-symbols-outlined text-3xl">play_circle</span>
                </div>

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/80 font-mono text-[10px] text-outline border border-surface-container-high">
                  CLIP: {currentEvidence.id} · DURATION: {currentEvidence.durationSeconds || 12}s
                </div>

                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/80 font-mono text-[10px] text-secondary border border-secondary/30">
                  PRIVACY: PROCESSED (FACE BLURRED)
                </div>

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1 bg-surface-container-lowest/90 rounded font-mono text-[10px] text-outline border border-surface-container-high">
                  <span>RECORDED: {currentEvidence.timestamp}</span>
                  <span>SIZE: {currentEvidence.fileSizeKb} KB</span>
                  <span className="text-primary font-semibold">DPDPA COMPLIANT</span>
                </div>
              </div>

              {/* Cryptographic Metadata Details */}
              <div className="p-3.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-2 font-mono text-xs">
                <span className="text-outline">Associated Alert:</span>
                <span className="text-right text-error font-bold">
                  <Link to="/alerts" className="underline hover:text-error/80">
                    {currentEvidence.alertId}
                  </Link>
                </span>

                <span className="text-outline">Target Identifier:</span>
                <span className="text-right text-primary font-bold">
                  <Link to="/targets" className="underline hover:text-primary/80">
                    {currentEvidence.targetId}
                  </Link>
                </span>

                <span className="text-outline">Camera Source:</span>
                <span className="text-right text-on-surface">{currentEvidence.cameraId}</span>

                <span className="text-outline">Capture Location:</span>
                <span className="text-right text-on-surface text-[11px] truncate">{currentEvidence.location}</span>

                <span className="text-outline">Inference Confidence:</span>
                <span className="text-right text-secondary font-bold">{currentEvidence.confidence}%</span>

                <span className="text-outline">Privacy Anonymization:</span>
                <span className="text-right text-secondary font-semibold">PROCESSED (Face Blurred)</span>

                <span className="text-outline">SHA-256 Digest:</span>
                <span className="text-right text-outline text-[10px] font-mono break-all" title={currentEvidence.sha256Hash}>
                  {currentEvidence.sha256Hash}
                </span>
              </div>
            </div>
          </div>

          {/* Evidence Directory (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3 font-mono text-xs">
              <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface border-b border-surface-container-high/50 pb-2">
                Recent Cryptographic Evidence Records
              </h3>

              <div className="flex flex-col gap-2">
                {evidenceList.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvidence(ev)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                      currentEvidence.id === ev.id
                        ? 'bg-surface-container border-primary/60 shadow-tactical-extruded'
                        : 'bg-surface-container-lowest border-surface-container-high/40 hover:bg-surface-container-high/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{ev.id}</span>
                      <span className="text-secondary text-[10px] font-semibold">VERIFIED</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-outline">
                      <span>{ev.alertId} · {ev.targetId}</span>
                      <span>{ev.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
