import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, VirtualFence } from '../types';
import { apiService } from '../services/apiService';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [fences, setFences] = useState<VirtualFence[]>([]);
  const [selectedFenceId, setSelectedFenceId] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'VIDEO' | 'FENCE_PRESET' | 'TIMELINE' | 'TELEMETRY'>('VIDEO');
  const [mediaViewMode, setMediaViewMode] = useState<'VIDEO' | 'PHOTO'>('VIDEO');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { activeAlert } = useDemo();
  const { isOperator, isAdmin } = useAuth();

  const fetchAlerts = async () => {
    const data = await apiService.getAlerts();
    setAlerts(data);
    if (!selectedAlert && data.length > 0) {
      setSelectedAlert(data[0]);
    }
  };

  const loadFences = async () => {
    const list = await apiService.getVirtualFences();
    setFences(list);
    const active = apiService.getActiveFenceSync();
    if (active) setSelectedFenceId(active.id);
  };

  useEffect(() => {
    fetchAlerts();
    loadFences();
    const interval = setInterval(fetchAlerts, 3000);

    const handleLiveBreach = (e: any) => {
      if (e.detail?.alert) {
        setAlerts((prev) => [e.detail.alert, ...prev.filter((a) => a.id !== e.detail.alert.id)]);
        setSelectedAlert(e.detail.alert);
      }
    };

    window.addEventListener('trinetra_live_breach', handleLiveBreach);
    return () => {
      clearInterval(interval);
      window.removeEventListener('trinetra_live_breach', handleLiveBreach);
    };
  }, []);

  useEffect(() => {
    if (activeAlert) {
      setAlerts((prev) => {
        const existingIdx = prev.findIndex((a) => a.id === activeAlert.id || a.targetId === activeAlert.targetId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = activeAlert;
          return updated;
        }
        return [activeAlert, ...prev];
      });
      setSelectedAlert(activeAlert);
    }
  }, [activeAlert]);

  // Video progress animation timer
  useEffect(() => {
    let timer: any;
    if (isVideoPlaying) {
      timer = setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setIsVideoPlaying(false);
            return 0;
          }
          return prev + 2.5;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isVideoPlaying]);

  const handleResolve = async (id: string) => {
    await apiService.resolveAlert(id);
    await fetchAlerts();
    if (selectedAlert && selectedAlert.id === id) {
      setSelectedAlert((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
    }
  };

  const handleSimulateThreat = async () => {
    const chosenFence = fences.find((f) => f.id === selectedFenceId) || apiService.getActiveFenceSync();
    const newId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAlert: Partial<Alert> = {
      id: newId,
      title: `VIRTUAL FENCE BREACH [${chosenFence.name}]`,
      description: `Target penetrated armed virtual perimeter preset [${chosenFence.name} (${chosenFence.type || 'POLYGON'})]. Real-time vector tracking engaged.`,
      type: 'VIRTUAL_FENCE_BREACH',
      severity: 'CRITICAL',
      status: 'NEW',
      targetId: `TGT-${Math.floor(2000 + Math.random() * 1000)}`,
      targetClassification: 'PERSON',
      confidence: 97.8,
      cameraId: chosenFence.assignedCameras?.[0] || 'CAM-RGB-01',
      zone: chosenFence.name,
      sector: chosenFence.sector || 'Northern Border Sector 07',
      fenceId: chosenFence.id,
      fenceName: chosenFence.name,
      fenceType: chosenFence.type || 'POLYGON',
      fencePreset: `${chosenFence.name} (${chosenFence.type || 'POLYGON'})`,
      fencePoints: chosenFence.points,
      timestamp: new Date().toLocaleTimeString(),
      evidenceId: `EV-${Math.floor(100 + Math.random() * 900)}`,
      sha256Hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };

    const saved = await apiService.createAlert(newAlert);
    setAlerts((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
    setSelectedAlert(saved);
  };

  const handleResolveAll = async () => {
    const updated = await apiService.resolveAllAlerts('Sector Operator');
    setAlerts(updated);
    if (selectedAlert) {
      setSelectedAlert((prev) => (prev ? { ...prev, status: 'RESOLVED', resolvedAt: new Date().toLocaleTimeString() } : null));
    }
  };

  const handleExportAlerts = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(alerts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TRINETRA_ALERTS_LOG_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        a.id.toLowerCase().includes(term) ||
        a.title.toLowerCase().includes(term) ||
        a.targetId.toLowerCase().includes(term) ||
        a.targetClassification.toLowerCase().includes(term) ||
        (a.fenceName && a.fenceName.toLowerCase().includes(term)) ||
        (a.timelineTag && a.timelineTag.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-error/40 flex items-center justify-center text-error shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">notifications_active</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Tactical Alerts & Intercept
            </h1>
            <span className="font-mono text-[11px] text-outline">
              VIRTUAL FENCE PRESET BINDING · TIMELINE LOGGING · FORENSIC VIDEO DB
            </span>
          </div>
        </div>

        {/* Quick Threat Generator with Virtual Fence Preset Selector */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {isOperator || isAdmin ? (
            <>
              {/* Virtual Fence Preset Selector for Incursion Simulation */}
              <div className="flex items-center gap-1.5 bg-surface-container border border-surface-container-high rounded-lg px-2 py-1">
                <span className="text-outline text-[11px]">PRESET:</span>
                <select
                  value={selectedFenceId}
                  onChange={(e) => setSelectedFenceId(e.target.value)}
                  className="bg-transparent text-primary font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {fences.map((f) => (
                    <option key={f.id} value={f.id} className="bg-surface-container-lowest text-on-surface">
                      {f.name} ({f.type || 'POLYGON'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSimulateThreat}
                className="px-3 py-1.5 rounded-lg bg-error text-on-error font-bold uppercase tracking-wider hover:bg-error/90 transition-all shadow-[0_0_12px_rgba(255,84,73,0.35)] flex items-center gap-1.5"
                title="Trigger simulated perimeter breach on selected Virtual Fence Preset"
              >
                <span className="material-symbols-outlined text-[16px]">add_alert</span>
                <span>SIMULATE BREACH</span>
              </button>

              <button
                onClick={handleResolveAll}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 font-bold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                <span>RESOLVE ALL</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-surface-container/60 border border-surface-container-high text-outline flex items-center gap-1.5 text-[11px]">
              <span className="material-symbols-outlined text-[15px]">visibility</span>
              <span>READ-ONLY SURVEILLANCE · OPERATOR PRIVILEGES REQUIRED TO DISPATCH</span>
            </div>
          )}

          <button
            onClick={handleExportAlerts}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary border border-primary/30 transition-colors flex items-center gap-1"
            title="Export Alerts as JSON"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>EXPORT</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Alert ID, Target, Fence Preset, Timeline Tag..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface placeholder:text-outline text-xs focus:outline-none focus:border-primary shadow-tactical-inset"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1.5 text-outline text-[16px]">
            search
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface focus:outline-none focus:border-primary shadow-tactical-inset"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface focus:outline-none focus:border-primary shadow-tactical-inset"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="NEW">NEW</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          {(filterSeverity !== 'ALL' || filterStatus !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setFilterSeverity('ALL');
                setFilterStatus('ALL');
                setSearchTerm('');
              }}
              className="px-2 py-1.5 rounded bg-surface-container text-outline hover:text-on-surface"
              title="Reset Filters"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      {/* Main Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Alerts List (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-container-low border border-surface-container-high/60 text-center font-mono text-xs text-outline">
              No matching alerts found for selected filter criteria.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  setSelectedAlert(alert);
                  setIsVideoPlaying(false);
                  setVideoProgress(0);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  selectedAlert?.id === alert.id
                    ? 'bg-surface-container border-primary/60 shadow-tactical-extruded'
                    : 'bg-surface-container-low border-surface-container-high/50 hover:bg-surface-container-high/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                          ? 'text-error animate-pulse'
                          : 'text-tertiary'
                      }`}
                    >
                      warning
                    </span>
                    <span className="font-mono text-xs font-bold text-primary">{alert.id}</span>
                    <span className="font-headline text-xs font-bold text-on-surface truncate max-w-[220px] sm:max-w-xs">
                      {alert.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                          ? 'bg-error-container text-on-error'
                          : 'bg-surface-container-high text-tertiary'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                        alert.status === 'NEW'
                          ? 'bg-error text-surface-container-lowest font-bold animate-pulse'
                          : alert.status === 'RESOLVED'
                          ? 'bg-surface-container text-secondary'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                </div>

                {/* Virtual Fence Preset Badge */}
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest border border-primary/30 text-primary font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">fence</span>
                    <span>PRESET: {alert.fenceName || alert.zone} {alert.fenceType ? `(${alert.fenceType})` : ''}</span>
                  </span>

                  {alert.timelineTag && (
                    <span className="px-2 py-0.5 rounded bg-primary/15 border border-primary/40 text-primary font-bold">
                      {alert.timelineTag}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-outline pt-1 border-t border-surface-container-high/40">
                  <div>
                    Target: <strong className="text-on-surface">{alert.targetId}</strong> ({alert.targetClassification})
                  </div>
                  <div>
                    Conf: <strong className="text-secondary">{alert.confidence}%</strong>
                  </div>
                  <div>
                    Zone: <strong className="text-primary">{alert.zone}</strong>
                  </div>
                  <div className="text-right">
                    {alert.lastBreachTimestamp ? `Latest: ${alert.lastBreachTimestamp}` : alert.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Alert Detail Inspector Panel (5 cols) */}
        <div className="lg:col-span-5">
          {selectedAlert ? (
            <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-2.5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{selectedAlert.id}</span>
                    <span className="px-2 py-0.2 rounded bg-surface-container-high border border-primary/30 text-primary font-mono text-[10px] font-bold">
                      {selectedAlert.targetId}
                    </span>
                  </div>
                  <h2 className="font-headline text-sm font-bold text-on-surface uppercase mt-0.5">
                    {selectedAlert.title}
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded bg-error-container text-on-error font-mono text-xs font-bold uppercase">
                  {selectedAlert.severity}
                </span>
              </div>

              {/* Inspector Tab Switcher */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container-lowest rounded-lg border border-surface-container-high font-mono text-xs">
                <button
                  onClick={() => setActiveInspectorTab('VIDEO')}
                  className={`py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeInspectorTab === 'VIDEO'
                      ? 'bg-primary text-on-primary shadow-tactical-extruded'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">videocam</span>
                  <span>VIDEO</span>
                </button>
                <button
                  onClick={() => setActiveInspectorTab('FENCE_PRESET')}
                  className={`py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeInspectorTab === 'FENCE_PRESET'
                      ? 'bg-primary text-on-primary shadow-tactical-extruded'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">fence</span>
                  <span>PRESET</span>
                </button>
                <button
                  onClick={() => setActiveInspectorTab('TIMELINE')}
                  className={`py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeInspectorTab === 'TIMELINE'
                      ? 'bg-primary text-on-primary shadow-tactical-extruded'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">history</span>
                  <span>TIMELINE</span>
                </button>
                <button
                  onClick={() => setActiveInspectorTab('TELEMETRY')}
                  className={`py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeInspectorTab === 'TELEMETRY'
                      ? 'bg-primary text-on-primary shadow-tactical-extruded'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">analytics</span>
                  <span>DATA</span>
                </button>
              </div>

              {/* TAB 1: Short Video Clip & Photo Snapshot Keyframe Player */}
              {activeInspectorTab === 'VIDEO' && (
                <div className="flex flex-col gap-2.5">
                  {/* Media View Mode Switcher: Video vs Photo */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1 bg-surface-container-lowest p-0.5 rounded-lg border border-surface-container-high font-mono text-[10px]">
                      <button
                        onClick={() => setMediaViewMode('VIDEO')}
                        className={`px-2.5 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                          mediaViewMode === 'VIDEO'
                            ? 'bg-primary text-on-primary shadow-tactical-extruded'
                            : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">videocam</span>
                        <span>FORENSIC VIDEO CLIP</span>
                      </button>
                      <button
                        onClick={() => setMediaViewMode('PHOTO')}
                        className={`px-2.5 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                          mediaViewMode === 'PHOTO'
                            ? 'bg-primary text-on-primary shadow-tactical-extruded'
                            : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                        <span>PHOTO KEYFRAME</span>
                      </button>
                    </div>

                    {/* Download Evidence Snapshot / Video */}
                    <a
                      href={selectedAlert.thumbnailUrl || selectedAlert.videoClipUrl || '#'}
                      download={`TRINETRA_${selectedAlert.id}_${mediaViewMode}.jpg`}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high border border-primary/30 text-primary font-mono text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Download Evidence File"
                    >
                      <span className="material-symbols-outlined text-[12px]">download</span>
                      <span>DOWNLOAD {mediaViewMode}</span>
                    </a>
                  </div>

                  <div className="relative w-full aspect-video bg-surface-container-lowest rounded-lg border border-surface-container-high/70 overflow-hidden flex flex-col items-center justify-center shadow-tactical-inset group">
                    {mediaViewMode === 'PHOTO' && (selectedAlert.thumbnailUrl || selectedAlert.timeline?.[0]?.snapshotUrl) ? (
                      /* High-Resolution Forensic Photo Snapshot Keyframe */
                      <div className="relative w-full h-full flex items-center justify-center bg-surface-container-lowest">
                        <img
                          src={selectedAlert.thumbnailUrl || selectedAlert.timeline?.[0]?.snapshotUrl}
                          alt="Forensic Breach Snapshot Keyframe"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[9px] text-primary border border-primary/30">
                          ● TAMPER-PROOF PHOTO KEYFRAME
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[9px] text-secondary border border-secondary/30">
                          DPDPA 2023 TAMPER-PROOF
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 bg-surface-container-lowest/90 rounded flex items-center justify-between font-mono text-[9px] text-outline border border-surface-container-high">
                          <span>TARGET: {selectedAlert.targetId} (PERSON)</span>
                          <span>SHA-256: {selectedAlert.sha256Hash?.slice(0, 16)}...</span>
                        </div>
                      </div>
                    ) : selectedAlert.videoClipUrl && (selectedAlert.videoClipUrl.startsWith('blob:') || selectedAlert.videoClipUrl.startsWith('data:video')) ? (
                      /* Real HTML5 WebM Video Clip from Database */
                      <video
                        src={selectedAlert.videoClipUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-cover"
                      />
                    ) : selectedAlert.thumbnailUrl ? (
                      /* Snapshot Image Fallback */
                      <div className="relative w-full h-full flex items-center justify-center bg-surface-container-lowest">
                        <img
                          src={selectedAlert.thumbnailUrl}
                          alt="Forensic Breach Snapshot Keyframe"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[9px] text-primary border border-primary/30">
                          ● EVIDENCE KEYFRAME PHOTO
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[9px] text-secondary border border-secondary/30">
                          SHA-256 SEALED
                        </div>
                      </div>
                    ) : (
                      /* Synthesizing Video Simulator */
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-surface-container-lowest p-3">
                        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center border border-primary/20 rounded p-2">
                          <div className="w-12 h-12 rounded-full border-2 border-primary/60 flex items-center justify-center text-primary mb-2 shadow-[0_0_15px_rgba(173,198,255,0.25)]">
                            <span className="material-symbols-outlined text-2xl">person_search</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-on-surface">
                            PRESET: {selectedAlert.fenceName || selectedAlert.zone}
                          </span>
                          <span className="font-mono text-[10px] text-outline mt-0.5">
                            Target: {selectedAlert.targetId} · {selectedAlert.timestamp}
                          </span>

                          <button
                            onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                            className="mt-3 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-mono text-xs font-bold flex items-center gap-1.5 shadow-tactical-extruded hover:bg-primary/90 transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isVideoPlaying ? 'pause' : 'play_arrow'}
                            </span>
                            <span>{isVideoPlaying ? 'PAUSE CLIP' : 'PLAY RECORDED CLIP (4s)'}</span>
                          </button>
                        </div>

                        <div className="absolute bottom-7 left-3 right-3 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-100"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>

                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[9px] text-primary border border-primary/30">
                          ● DATABASE STORED VIDEO CLIP
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[9px] text-secondary border border-secondary/30">
                          DPDPA 2023 TAMPER-PROOF
                        </div>
                        <div className="absolute bottom-1 left-3 right-3 flex items-center justify-between font-mono text-[9px] text-outline">
                          <span>LENGTH: 00:04.00</span>
                          <span>SHA-256 HASH VERIFIED</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high/60 font-mono text-[11px] flex items-center justify-between">
                    <span className="text-outline">Database Storage:</span>
                    <span className="text-secondary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">database</span>
                      <span>PHOTO & VIDEO PERSISTED IN FORENSIC VAULT</span>
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: Virtual Fence Preset Geometry & Radar Map */}
              {activeInspectorTab === 'FENCE_PRESET' && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 font-mono text-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-primary/20 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">fence</span>
                        <span className="text-primary font-bold">
                          {selectedAlert.fenceName || selectedAlert.zone}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono text-[10px] font-bold">
                        {selectedAlert.fenceType || 'POLYGON'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-outline">Assigned Camera:</span>{' '}
                        <strong className="text-on-surface">{selectedAlert.cameraId}</strong>
                      </div>
                      <div>
                        <span className="text-outline">Armed Sector:</span>{' '}
                        <strong className="text-on-surface">{selectedAlert.sector}</strong>
                      </div>
                      <div>
                        <span className="text-outline">Min AI Confidence:</span>{' '}
                        <strong className="text-secondary">{selectedAlert.confidence}%</strong>
                      </div>
                      <div>
                        <span className="text-outline">Armed Geometry:</span>{' '}
                        <strong className="text-primary">{selectedAlert.fencePoints?.length || 4} Nodes</strong>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Mini Fence SVG Canvas */}
                  <div className="relative w-full h-44 bg-surface-container-lowest rounded-lg border border-surface-container-high/70 overflow-hidden flex items-center justify-center shadow-tactical-inset p-2">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Grid Background */}
                      <defs>
                        <pattern id="radarGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,229,255,0.08)" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100" height="100" fill="url(#radarGrid)" />

                      {/* Fence Preset Polygon / Tripwire */}
                      {selectedAlert.fencePoints && selectedAlert.fencePoints.length >= 2 ? (
                        <>
                          <polygon
                            points={selectedAlert.fencePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill={selectedAlert.fenceType === 'TRIPWIRE' ? 'none' : 'rgba(255, 51, 102, 0.2)'}
                            stroke="#ff3366"
                            strokeWidth="1.8"
                            strokeDasharray={selectedAlert.fenceType === 'TRIPWIRE' ? '3,2' : 'none'}
                          />
                          {selectedAlert.fencePoints.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="2.5" fill="#ff3366" stroke="#ffffff" strokeWidth="0.8" />
                              <text x={p.x + 3} y={p.y - 2} fill="#ffffff" fontSize="4.5" fontFamily="monospace" fontWeight="bold">
                                N{i + 1}
                              </text>
                            </g>
                          ))}
                        </>
                      ) : (
                        <>
                          <polygon points="30,30 70,30 70,70 30,70" fill="rgba(255, 51, 102, 0.2)" stroke="#ff3366" strokeWidth="1.8" />
                          <circle cx="30" cy="30" r="2.5" fill="#ff3366" />
                          <circle cx="70" cy="30" r="2.5" fill="#ff3366" />
                          <circle cx="70" cy="70" r="2.5" fill="#ff3366" />
                          <circle cx="30" cy="70" r="2.5" fill="#ff3366" />
                        </>
                      )}

                      {/* Target Breach Marker */}
                      <circle cx="50" cy="48" r="4" fill="#ff5449" className="animate-ping" opacity="0.6" />
                      <circle cx="50" cy="48" r="2.5" fill="#ff5449" stroke="#ffffff" strokeWidth="0.8" />
                      <text x="56" y="49" fill="#ff5449" fontSize="4" fontFamily="monospace" fontWeight="bold">
                        BREACH INTRUSION ({selectedAlert.targetId})
                      </text>
                    </svg>

                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[9px] text-primary border border-primary/30">
                      PRESET: {selectedAlert.fenceName || 'Armed Geofence'}
                    </div>
                  </div>

                  <Link
                    to="/virtual-fence"
                    className="w-full py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono text-xs font-bold border border-primary/30 text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>OPEN & EDIT IN VIRTUAL FENCE STUDIO</span>
                  </Link>
                </div>
              )}

              {/* TAB 3: Single-Person Consolidated Timeline Log */}
              {activeInspectorTab === 'TIMELINE' && (
                <div className="flex flex-col gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 font-mono text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">timeline</span>
                      <span className="text-primary font-bold">
                        {selectedAlert.timelineTag || `⚡ ${selectedAlert.breachCount || 1} BREACH EVENTS`}
                      </span>
                    </div>
                    <span className="text-[10px] text-secondary font-bold">[1 ALERT · CHRONO LOG]</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-2 font-mono text-xs">
                    {(selectedAlert.timeline && selectedAlert.timeline.length > 0) ? (
                      selectedAlert.timeline.map((evt, idx) => (
                        <div
                          key={evt.id || idx}
                          className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high/70 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <span>EVENT #{idx + 1}: {evt.action.replace('_', ' ')}</span>
                            </span>
                            <span className="text-outline text-[10px]">{evt.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant leading-tight">
                            {evt.details}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-outline pt-1 border-t border-surface-container-high/30">
                            <span>Preset: <strong className="text-on-surface">{evt.fenceName || evt.zone}</strong></span>
                            <span>Conf: <strong className="text-secondary">{evt.confidence}%</strong></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high text-outline text-center text-xs">
                        Initial boundary breach recorded at {selectedAlert.timestamp}. Subsequent timeline events for {selectedAlert.targetId} will aggregate here.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Technical Telemetry Grid */}
              {activeInspectorTab === 'TELEMETRY' && (
                <div className="flex flex-col gap-2.5">
                  <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                    {selectedAlert.description}
                  </p>

                  <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-2 font-mono text-xs">
                    <span className="text-outline">Target Identifier:</span>
                    <span className="text-right text-primary font-bold">{selectedAlert.targetId}</span>

                    <span className="text-outline">Classification:</span>
                    <span className="text-right text-error font-bold">{selectedAlert.targetClassification}</span>

                    <span className="text-outline">Fence Preset:</span>
                    <span className="text-right text-primary font-bold">{selectedAlert.fenceName || selectedAlert.zone}</span>

                    <span className="text-outline">Geometry Type:</span>
                    <span className="text-right text-secondary font-bold">{selectedAlert.fenceType || 'POLYGON'}</span>

                    <span className="text-outline">AI Confidence:</span>
                    <span className="text-right text-secondary font-bold">{selectedAlert.confidence}%</span>

                    <span className="text-outline">Breach Incursions:</span>
                    <span className="text-right text-primary font-bold">{selectedAlert.breachCount || 1} Events</span>

                    <span className="text-outline">Camera Source:</span>
                    <span className="text-right text-on-surface">{selectedAlert.cameraId}</span>

                    <span className="text-outline">First Detected:</span>
                    <span className="text-right text-on-surface">{selectedAlert.timestamp}</span>

                    <span className="text-outline">Latest Incursion:</span>
                    <span className="text-right text-on-surface">{selectedAlert.lastBreachTimestamp || selectedAlert.timestamp}</span>

                    <span className="text-outline">Evidence File:</span>
                    <span className="text-right text-primary font-bold">{selectedAlert.evidenceId}</span>

                    <span className="text-outline">SHA-256 Hash:</span>
                    <span className="text-right text-outline text-[9px] font-mono truncate" title={selectedAlert.sha256Hash}>
                      {selectedAlert.sha256Hash.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 font-mono text-xs mt-1">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/surveillance"
                    className="py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold border border-primary/20 text-center transition-colors"
                  >
                    [ SURVEILLANCE ]
                  </Link>
                  <Link
                    to="/map"
                    className="py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold border border-primary/20 text-center transition-colors"
                  >
                    [ VIEW ON MAP ]
                  </Link>
                </div>

                <Link
                  to="/evidence"
                  className="py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold border border-primary/20 text-center transition-colors"
                >
                  [ VIEW EVIDENCE VAULT & DB CLIPS ]
                </Link>

                {selectedAlert.status !== 'RESOLVED' && (
                  isOperator || isAdmin ? (
                    <button
                      onClick={() => handleResolve(selectedAlert.id)}
                      className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary font-bold uppercase tracking-wider hover:bg-secondary/90 transition-all shadow-[0_0_12px_rgba(149,212,176,0.3)] flex items-center justify-center gap-1.5 mt-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>MARK THREAT RESOLVED</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-lg bg-surface-container-lowest border border-surface-container-high text-outline text-[11px] font-mono text-center flex items-center justify-center gap-1.5 mt-1">
                      <span className="material-symbols-outlined text-[15px] text-outline">lock</span>
                      <span>READ-ONLY · OPERATOR PRIVILEGE REQUIRED TO RESOLVE</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-surface-container-low border border-surface-container-high/60 text-center font-mono text-xs text-outline">
              Select an alert from the list to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
