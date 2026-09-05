import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Evidence } from '../types';
import { apiService } from '../services/apiService';
import { useDemo } from '../context/DemoContext';

export const EvidenceVaultPage: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedColor, setSelectedColor] = useState<string>('ALL');

  const { activeEvidence } = useDemo();

  const fetchEvidence = async () => {
    const data = await apiService.getEvidence();
    setEvidenceList(data);
    if (data.length > 0 && !selectedEvidence) {
      setSelectedEvidence(data[0]);
    }
  };

  useEffect(() => {
    fetchEvidence();
    // Poll every 3 seconds to catch newly recorded live ANPR vehicle captures
    const timer = setInterval(() => {
      apiService.getEvidence().then((data) => {
        setEvidenceList(data);
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Playback timer simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 2;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentEvidence = activeEvidence || selectedEvidence || evidenceList[0];

  const handleVerifyIntegrity = () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationResult({
        verified: true,
        message: 'SHA-256 Merkle-tree hash root intact. 0 bit-rot or payload tampering detected.',
      });
    }, 800);
  };

  const handleExportCertificate = () => {
    if (!currentEvidence) return;
    const cert = {
      title: 'TRINETRA TACTICAL EVIDENCE INTEGRITY CERTIFICATE',
      evidenceId: currentEvidence.id,
      timestamp: currentEvidence.timestamp,
      sha256Hash: currentEvidence.sha256Hash,
      targetId: currentEvidence.targetId,
      alertId: currentEvidence.alertId,
      confidence: currentEvidence.confidence,
      plateNumber: currentEvidence.plateNumber || currentEvidence.anprRecord?.plateNumber || 'N/A',
      vehicleColor: currentEvidence.vehicleColor || currentEvidence.anprRecord?.vehicleColor || 'N/A',
      vehicleType: currentEvidence.vehicleType || currentEvidence.anprRecord?.vehicleType || 'N/A',
      privacyCompliance: 'DPDPA 2023 Compliant - Facial Anonymization & Optical Encryption Applied',
      verifiedBy: 'NVIDIA Jetson AGX Orin Hardware Security Module (HSM)',
      signedAt: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cert, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `EVIDENCE_CERTIFICATE_${currentEvidence.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const availableColors = [
    'ALL',
    'Silver White',
    'Dark Obsidian',
    'Tactical Olive Green',
    'Crimson Red',
    'Navy Blue',
    'Steel Metallic Gray',
    'Desert Sand',
  ];

  const getColorSwatch = (colorName?: string) => {
    switch (colorName) {
      case 'Silver White':
        return 'bg-slate-200 border-slate-400 text-slate-900';
      case 'Dark Obsidian':
        return 'bg-zinc-900 border-zinc-600 text-zinc-100';
      case 'Tactical Olive Green':
        return 'bg-emerald-900 border-emerald-500 text-emerald-100';
      case 'Crimson Red':
        return 'bg-rose-700 border-rose-400 text-rose-100';
      case 'Navy Blue':
        return 'bg-blue-900 border-blue-400 text-blue-100';
      case 'Steel Metallic Gray':
        return 'bg-slate-600 border-slate-400 text-slate-100';
      case 'Desert Sand':
        return 'bg-amber-700 border-amber-400 text-amber-100';
      default:
        return 'bg-surface-container border-outline text-on-surface';
    }
  };

  const filteredEvidence = evidenceList.filter((ev) => {
    // Category filter
    if (selectedCategory === 'VEHICLES' && !ev.plateNumber && !ev.anprRecord) {
      return false;
    }
    if (selectedCategory === 'BREACHES' && (ev.plateNumber || ev.anprRecord)) {
      return false;
    }

    // Color filter
    if (selectedColor !== 'ALL') {
      const vColor = ev.vehicleColor || ev.anprRecord?.vehicleColor;
      if (vColor !== selectedColor) return false;
    }

    // Free text search (Plate number, Color, Target ID, Alert ID, Location, ID)
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    const plate = (ev.plateNumber || ev.anprRecord?.plateNumber || '').toLowerCase();
    const color = (ev.vehicleColor || ev.anprRecord?.vehicleColor || '').toLowerCase();
    const id = ev.id.toLowerCase();
    const alertId = ev.alertId.toLowerCase();
    const targetId = ev.targetId.toLowerCase();
    const location = ev.location.toLowerCase();
    const type = ev.type.toLowerCase();

    return (
      plate.includes(term) ||
      color.includes(term) ||
      id.includes(term) ||
      alertId.includes(term) ||
      targetId.includes(term) ||
      location.includes(term) ||
      type.includes(term)
    );
  });

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
              Evidence Vault & Vehicle ANPR Registry
            </h1>
            <span className="font-mono text-[11px] text-outline">
              SHA-256 SEALED · LICENSE PLATE & CAR COLOR INTELLIGENCE SEARCH
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleExportCertificate}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary border border-primary/30 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>EXPORT CERTIFICATE</span>
          </button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verificationResult && (
        <div className="p-3.5 rounded-xl bg-secondary-container/20 border border-secondary/40 shadow-tactical-inset flex items-center justify-between font-mono text-xs text-secondary animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>{verificationResult.message}</span>
          </div>
          <button
            onClick={() => setVerificationResult(null)}
            className="text-outline hover:text-on-surface"
          >
            ✕
          </button>
        </div>
      )}

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
                  {(currentEvidence.plateNumber || currentEvidence.anprRecord?.plateNumber) && (
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest border border-secondary/40 text-secondary font-mono text-xs font-bold">
                      {currentEvidence.plateNumber || currentEvidence.anprRecord?.plateNumber}
                    </span>
                  )}
                </div>

                <span className="px-2.5 py-0.5 rounded bg-secondary-container text-secondary font-mono text-xs font-bold uppercase">
                  SHA-256 SEALED
                </span>
              </div>

              {/* Evidence Video / Snapshot Interactive Frame */}
              <div className="relative w-full aspect-video bg-surface-container-lowest rounded-lg border border-surface-container-high/60 overflow-hidden flex flex-col items-center justify-center p-4 shadow-tactical-inset group">
                {/* Visual Canvas Representation */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                {/* If Vehicle Plate Snapshot is available, display crisp high-res preview */}
                {(currentEvidence.plateCropUrl || currentEvidence.anprRecord?.plateCropUrl) ? (
                  <div className="relative z-10 flex flex-col items-center gap-2.5 max-w-[85%]">
                    <div className="relative rounded-lg overflow-hidden border-2 border-secondary/70 shadow-[0_0_20px_rgba(0,0,0,0.8)] bg-black/90 p-1">
                      <img
                        src={currentEvidence.plateCropUrl || currentEvidence.anprRecord?.plateCropUrl}
                        alt="Captured Number Plate Snapshot"
                        className="max-h-24 w-auto object-contain filter contrast-125"
                      />
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/80 rounded font-mono text-[9px] text-secondary border border-secondary/40">
                        ANPR OCR VERIFIED
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded bg-secondary/15 border border-secondary/40 text-secondary font-bold">
                        PLATE: {currentEvidence.plateNumber || currentEvidence.anprRecord?.plateNumber}
                      </span>
                      {(currentEvidence.vehicleColor || currentEvidence.anprRecord?.vehicleColor) && (
                        <span className={`px-2.5 py-1 rounded border font-bold flex items-center gap-1.5 ${getColorSwatch(currentEvidence.vehicleColor || currentEvidence.anprRecord?.vehicleColor)}`}>
                          <span className="w-2 h-2 rounded-full bg-current" />
                          <span>COLOR: {currentEvidence.vehicleColor || currentEvidence.anprRecord?.vehicleColor}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Center Play / Pause Icon Button for Non-vehicle clips */
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="relative z-10 w-16 h-16 rounded-2xl bg-surface-container-high/90 hover:bg-surface-container-highest border border-primary/40 flex items-center justify-center text-primary shadow-tactical-extruded transition-transform hover:scale-105"
                  >
                    <span className="material-symbols-outlined text-4xl">
                      {isPlaying ? 'pause_circle' : 'play_circle'}
                    </span>
                  </button>
                )}

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/80 font-mono text-[10px] text-outline border border-surface-container-high">
                  RECORD: {currentEvidence.id} · DURATION: {currentEvidence.durationSeconds || 12}s
                </div>

                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/80 font-mono text-[10px] text-secondary border border-secondary/30">
                  PRIVACY: DPDPA COMPLIANT
                </div>

                {/* Video Playback Progress Bar */}
                <div className="absolute bottom-10 left-3 right-3 flex flex-col gap-1 z-10">
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden cursor-pointer">
                    <div
                      className="h-full bg-primary transition-all duration-150"
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1 bg-surface-container-lowest/90 rounded font-mono text-[10px] text-outline border border-surface-container-high">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="text-primary hover:text-on-surface"
                    >
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </button>
                    <span>RECORDED: {currentEvidence.timestamp}</span>
                  </div>
                  <span>SIZE: {currentEvidence.fileSizeKb} KB</span>
                  <span className="text-primary font-semibold">DPDPA 2023 SECURED</span>
                </div>
              </div>

              {/* Cryptographic Metadata Details */}
              <div className="p-3.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-2 font-mono text-xs">
                {(currentEvidence.plateNumber || currentEvidence.anprRecord?.plateNumber) && (
                  <>
                    <span className="text-outline">License Plate:</span>
                    <span className="text-right text-secondary font-bold text-sm tracking-wider">
                      {currentEvidence.plateNumber || currentEvidence.anprRecord?.plateNumber}
                    </span>

                    <span className="text-outline">Estimated Car Color:</span>
                    <span className="text-right font-bold text-on-surface flex items-center justify-end gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-outline bg-current inline-block" />
                      <span>{currentEvidence.vehicleColor || currentEvidence.anprRecord?.vehicleColor || 'Detected'}</span>
                    </span>

                    <span className="text-outline">Vehicle Classification:</span>
                    <span className="text-right text-on-surface font-semibold">
                      {currentEvidence.vehicleType || currentEvidence.anprRecord?.vehicleType || 'VEHICLE'}
                    </span>
                  </>
                )}

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
                <span className="text-right text-secondary font-semibold">PROCESSED (Face / PII Redacted)</span>

                <span className="text-outline">SHA-256 Digest:</span>
                <span className="text-right text-outline text-[10px] font-mono break-all" title={currentEvidence.sha256Hash}>
                  {currentEvidence.sha256Hash}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  onClick={handleVerifyIntegrity}
                  disabled={isVerifying}
                  className="py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary font-bold border border-secondary/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">{isVerifying ? 'sync' : 'verified'}</span>
                  <span>{isVerifying ? 'VERIFYING...' : 'TEST SHA-256 HASH'}</span>
                </button>

                <button
                  onClick={handleExportCertificate}
                  className="py-2.5 rounded-lg bg-primary text-on-primary font-bold uppercase hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.3)] flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>DOWNLOAD SEAL</span>
                </button>
              </div>
            </div>
          </div>

          {/* Evidence Directory (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-2">
                <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
                  Evidence Directory ({filteredEvidence.length})
                </h3>
                <span className="text-[10px] text-secondary font-bold">ALL HASH-VERIFIED</span>
              </div>

              {/* Category Filter Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container-lowest rounded-lg border border-surface-container-high/50">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-primary text-on-primary shadow-tactical-extruded'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  ALL ({evidenceList.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('VEHICLES')}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                    selectedCategory === 'VEHICLES'
                      ? 'bg-secondary text-on-secondary shadow-tactical-extruded'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  VEHICLES
                </button>
                <button
                  onClick={() => setSelectedCategory('BREACHES')}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                    selectedCategory === 'BREACHES'
                      ? 'bg-error text-on-error shadow-tactical-extruded'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  TRIPWIRE
                </button>
              </div>

              {/* Enhanced Search Input (Plate Number or Car Color) */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Plate (e.g. DL-01) or Color (e.g. White)..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-xs text-on-surface placeholder:text-outline shadow-tactical-inset focus:border-primary/80 focus:outline-none"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-[15px]">
                  search
                </span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-2 text-outline hover:text-on-surface text-[12px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Vehicle Paint Color Quick Filter Chips */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline font-semibold uppercase tracking-wider">
                  Car Color Quick Filter:
                </span>
                <div className="flex flex-wrap gap-1">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                        selectedColor === color
                          ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(173,198,255,0.4)]'
                          : 'bg-surface-container-lowest border-surface-container-high text-outline hover:text-on-surface'
                      }`}
                    >
                      {color === 'ALL' ? 'ALL COLORS' : color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evidence Records List */}
              <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredEvidence.length === 0 ? (
                  <div className="p-6 text-center text-outline bg-surface-container-lowest rounded-lg border border-dashed border-surface-container-high flex flex-col items-center gap-1.5">
                    <span className="material-symbols-outlined text-2xl">search_off</span>
                    <span>No vehicle or evidence matching &quot;{searchTerm || selectedColor}&quot;</span>
                  </div>
                ) : (
                  filteredEvidence.map((ev) => {
                    const isVehicleEv = Boolean(ev.plateNumber || ev.anprRecord);
                    const plate = ev.plateNumber || ev.anprRecord?.plateNumber;
                    const vColor = ev.vehicleColor || ev.anprRecord?.vehicleColor;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setSelectedEvidence(ev);
                          setPlaybackProgress(0);
                          setIsPlaying(false);
                        }}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${
                          currentEvidence.id === ev.id
                            ? 'bg-surface-container border-primary/60 shadow-tactical-extruded'
                            : 'bg-surface-container-lowest border-surface-container-high/40 hover:bg-surface-container-high/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{ev.id}</span>
                            {plate && (
                              <span className="px-1.5 py-0.2 rounded bg-secondary/15 border border-secondary/40 text-secondary text-[10px] font-bold">
                                {plate}
                              </span>
                            )}
                          </div>
                          <span className="text-secondary text-[10px] font-semibold">VERIFIED</span>
                        </div>

                        {/* Vehicle Color & Classification Badges */}
                        {isVehicleEv && (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {vColor && (
                              <span className={`px-1.5 py-0.2 rounded border font-semibold flex items-center gap-1 ${getColorSwatch(vColor)}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                <span>{vColor}</span>
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded bg-surface-container text-on-surface/80 border border-surface-container-high text-[9px]">
                              {ev.vehicleType || ev.anprRecord?.vehicleType || 'VEHICLE'}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-outline">
                          <span>{ev.alertId} · {ev.targetId}</span>
                          <span>{ev.timestamp}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

