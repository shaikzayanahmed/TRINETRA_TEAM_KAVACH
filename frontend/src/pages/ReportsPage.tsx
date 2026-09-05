import React, { useState, useEffect } from 'react';
import { AuditEvent } from '../types';
import { apiService } from '../services/apiService';

export const ReportsPage: React.FC = () => {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchReports = async () => {
      const data = await apiService.getReports();
      setAuditEvents(data.auditEvents);
    };
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    const result = await apiService.generateReport();
    setReportData(result);
    setReportGenerated(true);
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    const reportText = `=====================================================
TRINETRA TACTICAL INCIDENT & PERIMETER REPORT
Report ID: ${reportData.reportId}
Generated At: ${reportData.generatedAt}
Sector: ${reportData.sector}
=====================================================
SUMMARY:
${reportData.summary}

ACTIVE TARGET: ${reportData.activeTarget}
BREACHES RECORDED: ${reportData.totalBreaches}
CRYPTOGRAPHIC MERKLE ROOT:
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

STATUS: ${reportData.status} (DPDPA AUDIT READY)
=====================================================`;

    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportText);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TRINETRA_REPORT_${reportData.reportId}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportLedger = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AUDIT_LEDGER_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredEvents = auditEvents.filter((ev) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      ev.id.toLowerCase().includes(term) ||
      ev.eventType.toLowerCase().includes(term) ||
      ev.details.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-xl">description</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
              Reports & Immutable Audit Trail
            </h1>
            <span className="font-mono text-[11px] text-outline">
              CRYPTOGRAPHIC CHAIN OF CUSTODY · STATUTORY COMPLIANCE LOGS
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={handleExportLedger}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary border border-primary/30 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>EXPORT LEDGER (JSON)</span>
          </button>

          <button
            onClick={handleGenerateReport}
            className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.3)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">summarize</span>
            <span>GENERATE REPORT</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1">
          <span className="text-outline text-[11px] uppercase">Total Alerts</span>
          <span className="text-3xl font-bold text-on-surface">5</span>
          <span className="text-[10px] text-outline">Last 24 Hours</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1">
          <span className="text-outline text-[11px] uppercase">Active Threats</span>
          <span className="text-3xl font-bold text-error">1</span>
          <span className="text-[10px] text-error font-bold">ALT-7821</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1">
          <span className="text-outline text-[11px] uppercase">Targets Detected</span>
          <span className="text-3xl font-bold text-primary">3</span>
          <span className="text-[10px] text-outline">Sector 07</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col items-center text-center gap-1">
          <span className="text-outline text-[11px] uppercase">Evidence Captured</span>
          <span className="text-3xl font-bold text-secondary">12</span>
          <span className="text-[10px] text-secondary">SHA-256 Verified</span>
        </div>
      </div>

      {/* Generated Report Modal / Card */}
      {reportGenerated && reportData && (
        <div className="p-5 rounded-xl bg-surface-container border border-primary/40 shadow-tactical-extruded flex flex-col gap-3 font-mono text-xs animate-fadeIn">
          <div className="flex items-center justify-between border-b border-surface-container-high/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              <span className="font-bold text-on-surface">INCIDENT REPORT GENERATED: {reportData.reportId}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadReport}
                className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold border border-primary/30 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>DOWNLOAD TXT</span>
              </button>
              <button onClick={() => setReportGenerated(false)} className="text-outline hover:text-on-surface">
                ✕
              </button>
            </div>
          </div>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            {reportData.summary} Sector: {reportData.sector}. Primary Interception Target: {reportData.activeTarget} in Zone Alpha.
          </p>
          <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-outline gap-2">
            <span className="truncate max-w-sm">CHAIN HASH: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
            <span className="text-secondary font-bold">STATUS: DPDPA AUDIT READY</span>
          </div>
        </div>
      )}

      {/* Main Incident Card */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-error/30 shadow-tactical-plate flex flex-col gap-3 font-mono text-xs">
        <span className="font-bold text-on-surface uppercase border-b border-surface-container-high/40 pb-2 flex items-center justify-between">
          <span>Primary Incident Telemetry — ALT-7821</span>
          <span className="px-2 py-0.5 rounded bg-error-container text-on-error font-bold uppercase text-[10px]">
            HIGH PRIORITY
          </span>
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div>
            <span className="text-outline">TARGET:</span>
            <div className="text-primary font-bold text-sm">TGT-2048</div>
          </div>
          <div>
            <span className="text-outline">CLASSIFICATION:</span>
            <div className="text-error font-bold text-sm">PERSON</div>
          </div>
          <div>
            <span className="text-outline">CONFIDENCE:</span>
            <div className="text-secondary font-bold text-sm">96.8%</div>
          </div>
          <div>
            <span className="text-outline">TIMESTAMP:</span>
            <div className="text-on-surface font-semibold text-sm">14:32:18</div>
          </div>
        </div>
      </div>

      {/* Audit Trail Table with Search */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-tactical-plate flex flex-col gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-surface-container-high/40 pb-2 gap-2">
          <span className="font-bold text-on-surface uppercase">
            Immutable Cryptographic Audit Events ({filteredEvents.length})
          </span>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="pl-7 pr-2 py-1 rounded bg-surface-container-lowest border border-surface-container-high text-xs text-on-surface placeholder:text-outline shadow-tactical-inset"
            />
            <span className="material-symbols-outlined absolute left-2 top-1 text-outline text-[14px]">
              search
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-primary font-bold">{event.timestamp}</span>
                <span className="font-bold text-on-surface">{event.eventType}</span>
                <span className="text-outline text-[11px] hidden md:inline">· {event.details}</span>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-outline font-mono truncate max-w-[140px]" title={event.sha256Hash}>
                  {event.sha256Hash.slice(0, 12)}...
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-bold">
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

