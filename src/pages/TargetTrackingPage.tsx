import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target } from '../types';
import { apiService } from '../services/apiService';
import { useDemo } from '../context/DemoContext';

export const TargetTrackingPage: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isKalmanRecalculating, setIsKalmanRecalculating] = useState<boolean>(false);
  const [kalmanStatus, setKalmanStatus] = useState<string | null>(null);

  const { activeTarget, isFenceBreached } = useDemo();

  useEffect(() => {
    const fetchTargets = async () => {
      const data = await apiService.getTargets();
      setTargets(data);
      setSelectedTarget(data[0]);
    };
    fetchTargets();
  }, []);

  const currentTarget = activeTarget || selectedTarget;

  const handleRecalculateKalman = () => {
    setIsKalmanRecalculating(true);
    setKalmanStatus(null);
    setTimeout(() => {
      setIsKalmanRecalculating(false);
      setKalmanStatus('State covariance matrix updated. Innovation residual: < 0.024.');
    }, 600);
  };

  const handleExportTrack = () => {
    if (!currentTarget) return;
    const trackData = {
      targetId: currentTarget.id,
      classification: currentTarget.classification,
      coordinates: currentTarget.coordinates,
      trajectory: currentTarget.trajectory,
      speedKmh: currentTarget.speedKmh,
      bearing: currentTarget.bearing,
      firstDetectedAt: currentTarget.firstDetectedAt,
      lastSeenAt: currentTarget.lastSeenAt,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trackData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TARGET_GPS_TRACK_${currentTarget.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredTargets = targets.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.id.toLowerCase().includes(term) ||
      t.classification.toLowerCase().includes(term) ||
      t.status.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">person_search</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Target Tracking & Sensor Correlation
            </h1>
            <span className="font-mono text-[11px] text-outline">
              KALMAN FILTER TRAJECTORY ESTIMATION · OPTICAL + THERMAL CROSS-REGISTRATION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleExportTrack}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary border border-primary/30 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>EXPORT TRACK (JSON)</span>
          </button>
        </div>
      </div>

      {/* Kalman Status Banner */}
      {kalmanStatus && (
        <div className="p-3.5 rounded-xl bg-surface-container border border-secondary/40 shadow-tactical-inset flex items-center justify-between font-mono text-xs text-secondary animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>{kalmanStatus}</span>
          </div>
          <button onClick={() => setKalmanStatus(null)} className="text-outline hover:text-on-surface">
            ✕
          </button>
        </div>
      )}

      {/* Target Details Grid */}
      {currentTarget && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Target Telemetry Card (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg font-bold text-primary">{currentTarget.id}</span>
                  <span className="px-2.5 py-0.5 rounded bg-error-container text-error font-mono text-xs font-bold uppercase">
                    {currentTarget.classification}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded font-mono text-xs font-bold uppercase ${
                    isFenceBreached
                      ? 'bg-error text-surface-container-lowest animate-pulse'
                      : 'bg-surface-container text-secondary border border-secondary/30'
                  }`}
                >
                  {isFenceBreached ? 'TRIPWIRE BREACH' : currentTarget.status}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-1">
                  <span className="text-outline text-[10px] uppercase">Confidence</span>
                  <span className="text-secondary text-lg font-bold">{currentTarget.confidence}%</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-1">
                  <span className="text-outline text-[10px] uppercase">Est. Speed</span>
                  <span className="text-primary text-lg font-bold">{currentTarget.speedKmh || 4.2} km/h</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset flex flex-col gap-1">
                  <span className="text-outline text-[10px] uppercase">Bearing</span>
                  <span className="text-on-surface text-lg font-bold">{currentTarget.bearing || '142° SE'}</span>
                </div>
              </div>

              {/* Kinematic & Sensor Position Details */}
              <div className="p-3.5 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-2 font-mono text-xs">
                <span className="text-outline">Camera Source:</span>
                <span className="text-right text-primary font-bold">{currentTarget.cameraId}</span>

                <span className="text-outline">Assigned Sector:</span>
                <span className="text-right text-on-surface">{currentTarget.sector}</span>

                <span className="text-outline">Current Coordinates:</span>
                <span className="text-right text-primary font-bold">
                  {currentTarget.coordinates.lat.toFixed(4)}° N, {currentTarget.coordinates.lng.toFixed(4)}° E
                </span>

                <span className="text-outline">First Detected:</span>
                <span className="text-right text-on-surface">{currentTarget.firstDetectedAt}</span>

                <span className="text-outline">Last Telemetry:</span>
                <span className="text-right text-secondary font-semibold">{currentTarget.lastSeenAt}</span>

                <span className="text-outline">Associated Alert:</span>
                <span className="text-right text-error font-bold">
                  <Link to="/alerts" className="underline hover:text-error/80">
                    {currentTarget.alertId || 'ALT-7821'}
                  </Link>
                </span>

                <span className="text-outline">Associated Evidence:</span>
                <span className="text-right text-primary font-bold">
                  <Link to="/evidence" className="underline hover:text-primary/80">
                    {currentTarget.evidenceId || 'EV-00421'}
                  </Link>
                </span>
              </div>

              {/* Kalman Filter Recompute Action */}
              <div className="flex gap-2">
                <button
                  onClick={handleRecalculateKalman}
                  disabled={isKalmanRecalculating}
                  className="w-full py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary font-mono text-xs font-semibold border border-secondary/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">{isKalmanRecalculating ? 'sync' : 'auto_fix_high'}</span>
                  <span>{isKalmanRecalculating ? 'CALCULATING KALMAN RECURSION...' : 'RECALCULATE KALMAN VECTOR'}</span>
                </button>
              </div>
            </div>

            {/* Trajectory Waypoints History */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-2">
                <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
                  Detection & Trajectory History
                </h3>
                <span className="font-mono text-[10px] text-outline">KALMAN RECURSIVE ESTIMATE</span>
              </div>

              <div className="flex flex-col gap-1.5 font-mono text-xs">
                {currentTarget.trajectory && currentTarget.trajectory.length > 0 ? (
                  currentTarget.trajectory.map((point, idx) => (
                    <div
                      key={idx}
                      className="p-2 px-3 rounded bg-surface-container-lowest border border-surface-container-high/40 flex items-center justify-between"
                    >
                      <span className="text-primary font-bold">{point.timestamp}</span>
                      <span className="text-on-surface">
                        LAT: {point.lat.toFixed(4)} · LNG: {point.lng.toFixed(4)}
                      </span>
                      <span className="text-secondary text-[11px] font-semibold">VECTOR LOCKED</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-outline text-xs">No historical waypoints.</div>
                )}
              </div>
            </div>
          </div>

          {/* Target List & Quick Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-2">
                <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
                  Target Directory ({filteredTargets.length})
                </h3>
                <span className="font-mono text-[10px] text-outline">SECTOR 07</span>
              </div>

              {/* Target Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter targets..."
                  className="w-full pl-7 pr-2 py-1 rounded bg-surface-container-lowest border border-surface-container-high font-mono text-xs text-on-surface placeholder:text-outline shadow-tactical-inset"
                />
                <span className="material-symbols-outlined absolute left-2 top-1 text-outline text-[14px]">
                  search
                </span>
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs">
                {filteredTargets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTarget(t)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      currentTarget?.id === t.id
                        ? 'bg-surface-container border-primary/60 shadow-tactical-extruded'
                        : 'bg-surface-container-lowest border-surface-container-high/40 hover:bg-surface-container-high/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{t.id}</span>
                      <span className="text-on-surface">· {t.classification}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-secondary font-bold">{t.confidence}%</span>
                      <span className="text-outline text-[10px] uppercase">[{t.status}]</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical Directives Card */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-2 font-mono text-xs">
              <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-1.5">
                Tactical Operator Actions
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link
                  to="/surveillance"
                  className="py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold border border-primary/20 text-center transition-colors"
                >
                  [ SURVEILLANCE ]
                </Link>
                <Link
                  to="/map"
                  className="py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold border border-primary/20 text-center transition-colors"
                >
                  [ MAP VECTOR ]
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

