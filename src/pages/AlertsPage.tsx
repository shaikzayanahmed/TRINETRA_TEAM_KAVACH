import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../types';
import { apiService } from '../services/apiService';
import { useDemo } from '../context/DemoContext';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const { activeAlert } = useDemo();

  const fetchAlerts = async () => {
    const data = await apiService.getAlerts();
    setAlerts(data);
    if (!selectedAlert && data.length > 0) {
      setSelectedAlert(data[0]);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (activeAlert) {
      setAlerts((prev) => {
        if (!prev.some((a) => a.id === activeAlert.id)) {
          return [activeAlert, ...prev];
        }
        return prev;
      });
      setSelectedAlert(activeAlert);
    }
  }, [activeAlert]);

  const handleResolve = async (id: string) => {
    await apiService.resolveAlert(id);
    await fetchAlerts();
    if (selectedAlert && selectedAlert.id === id) {
      setSelectedAlert((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
    }
  };

  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSimulateThreat = async () => {
    const newId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAlert: Alert = {
      id: newId,
      title: 'Perimeter Virtual Tripwire Breach',
      description: 'Dynamic neural network detection classified unauthorized intruder crossing Zone Alpha boundary in Sector 07.',
      type: 'VIRTUAL_FENCE_BREACH',
      severity: 'CRITICAL',
      status: 'NEW',
      targetId: `TGT-${Math.floor(2000 + Math.random() * 1000)}`,
      targetClassification: 'PERSON',
      confidence: 97.4,
      cameraId: 'CAM-RGB-01',
      zone: 'Zone Alpha',
      sector: 'Sector 07',
      timestamp: new Date().toLocaleTimeString(),
      evidenceId: `EV-${Math.floor(100 + Math.random() * 900)}`,
      sha256Hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };

    const saved = await apiService.createAlert(newAlert);
    setAlerts((prev) => [saved, ...prev]);
    setSelectedAlert(saved);
  };


  const handleResolveAll = async () => {
    setAlerts((prev) =>
      prev.map((a) => ({
        ...a,
        status: 'RESOLVED',
        resolvedAt: new Date().toLocaleTimeString(),
        resolvedBy: 'Sector Operator',
      }))
    );
    if (selectedAlert) {
      setSelectedAlert((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
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
        a.targetClassification.toLowerCase().includes(term)
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
              Tactical Alerts & Threat Management
            </h1>
            <span className="font-mono text-[11px] text-outline">
              REAL-TIME EVENT LOGGING · SHA-256 HASHED DISPATCH
            </span>
          </div>
        </div>

        {/* Quick Threat Generator & Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={handleSimulateThreat}
            className="px-3 py-1.5 rounded-lg bg-error text-on-error font-bold uppercase tracking-wider hover:bg-error/90 transition-all shadow-[0_0_12px_rgba(255,84,73,0.35)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_alert</span>
            <span>SIMULATE THREAT</span>
          </button>

          <button
            onClick={handleResolveAll}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 font-bold transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            <span>RESOLVE ALL</span>
          </button>

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
            placeholder="Search by Alert ID, target, class..."
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
                onClick={() => setSelectedAlert(alert)}
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
                    <span className="font-headline text-xs font-bold text-on-surface truncate">
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
                  <div className="text-right">{alert.timestamp}</div>
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
                  <span className="font-mono text-sm font-bold text-primary">{selectedAlert.id}</span>
                  <h2 className="font-headline text-sm font-bold text-on-surface uppercase mt-0.5">
                    {selectedAlert.title}
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded bg-error-container text-on-error font-mono text-xs font-bold uppercase">
                  {selectedAlert.severity}
                </span>
              </div>

              <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                {selectedAlert.description}
              </p>

              {/* Technical Telemetry Grid */}
              <div className="p-3 rounded-lg bg-surface-container-lowest shadow-tactical-inset grid grid-cols-2 gap-2 font-mono text-xs">
                <span className="text-outline">Target Identifier:</span>
                <span className="text-right text-primary font-bold">{selectedAlert.targetId}</span>

                <span className="text-outline">Classification:</span>
                <span className="text-right text-error font-bold">{selectedAlert.targetClassification}</span>

                <span className="text-outline">AI Confidence:</span>
                <span className="text-right text-secondary font-bold">{selectedAlert.confidence}%</span>

                <span className="text-outline">Camera Source:</span>
                <span className="text-right text-on-surface">{selectedAlert.cameraId}</span>

                <span className="text-outline">Perimeter Zone:</span>
                <span className="text-right text-primary font-semibold">{selectedAlert.zone}</span>

                <span className="text-outline">Timestamp:</span>
                <span className="text-right text-on-surface">{selectedAlert.timestamp}</span>

                <span className="text-outline">Evidence File:</span>
                <span className="text-right text-primary font-bold">{selectedAlert.evidenceId}</span>

                <span className="text-outline">SHA-256 Hash:</span>
                <span className="text-right text-outline text-[9px] font-mono truncate" title={selectedAlert.sha256Hash}>
                  {selectedAlert.sha256Hash.slice(0, 16)}...
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 font-mono text-xs">
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
                  [ VIEW EVIDENCE VAULT ]
                </Link>

                {selectedAlert.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleResolve(selectedAlert.id)}
                    className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary font-bold uppercase tracking-wider hover:bg-secondary/90 transition-all shadow-[0_0_12px_rgba(149,212,176,0.3)] flex items-center justify-center gap-1.5 mt-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>MARK THREAT RESOLVED</span>
                  </button>
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
