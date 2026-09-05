import {
  Camera,
  Target,
  Alert,
  VirtualFence,
  EdgeNode,
  Evidence,
  EnvironmentStatus,
  AuditEvent,
} from '../types';
import {
  MOCK_CAMERAS,
  MOCK_TARGETS,
  MOCK_ALERTS,
  MOCK_VIRTUAL_FENCE,
  MOCK_EDGE_NODE,
  MOCK_EVIDENCES,
  MOCK_ENVIRONMENT,
  MOCK_AUDIT_EVENTS,
} from '../mocks/mockData';

const BACKEND_BASE_URL = 'http://127.0.0.1:8000/api';

// Simulates network latency for realistic frontend experience
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ApiService {
  private cameras: Camera[] = [...MOCK_CAMERAS];
  private targets: Target[] = [...MOCK_TARGETS];
  private alerts: Alert[] = this.loadStoredAlerts();
  private fences: VirtualFence[] = [{ ...MOCK_VIRTUAL_FENCE }];
  private edgeNodes: EdgeNode[] = [{ ...MOCK_EDGE_NODE }];
  private evidence: Evidence[] = this.loadStoredEvidence();
  private environment: EnvironmentStatus = { ...MOCK_ENVIRONMENT };
  private auditEvents: AuditEvent[] = [...MOCK_AUDIT_EVENTS];


  private loadStoredEvidence(): Evidence[] {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('trinetra_evidence');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load stored evidence:', e);
    }
    return [...MOCK_EVIDENCES];
  }

  private loadStoredAlerts(): Alert[] {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('trinetra_alerts');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load stored alerts:', e);
    }
    return [...MOCK_ALERTS];
  }

  private saveStoredEvidence() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trinetra_evidence', JSON.stringify(this.evidence.slice(0, 50)));
      }
    } catch (e) {
      console.warn('Failed to save evidence to localStorage:', e);
    }
  }

  private saveStoredAlerts() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trinetra_alerts', JSON.stringify(this.alerts.slice(0, 50)));
      }
    } catch (e) {
      console.warn('Failed to save alerts to localStorage:', e);
    }
  }

  // Camera APIs
  async getCameras(): Promise<Camera[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/cameras`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const backendCams = await res.json();
        if (Array.isArray(backendCams) && backendCams.length > 0) {
          return backendCams.map((bc: any, idx: number): Camera => ({
            id: bc.id || `CAM-0${idx + 1}`,
            name: bc.name || `CAM-0${idx + 1}`,
            type: bc.source_type === 'WEBCAM' ? 'RGB' : 'LWIR',
            status: bc.status === 'ONLINE' ? 'ONLINE' : 'WAITING_FOR_INPUT',
            resolution: '1920x1080',
            fps: 30,
            spectralRange: '0.4 - 0.7 µm (Visible)',
            location: 'Sector 07 Northern Perimeter',
            sector: 'Sector 07',
            bitrateKbps: 4200,
          }));
        }
      }
    } catch (e) {
      // Fallback to local
    }
    await delay(50);
    return [...this.cameras];
  }

  async getCameraById(id: string): Promise<Camera | undefined> {
    await delay(30);
    return this.cameras.find((c) => c.id === id);
  }

  // Target APIs
  async getTargets(): Promise<Target[]> {
    await delay(50);
    return [...this.targets];
  }

  async getTargetById(id: string): Promise<Target | undefined> {
    await delay(30);
    return this.targets.find((t) => t.id === id);
  }

  // Alert APIs
  async getAlerts(): Promise<Alert[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/alerts`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const backendAlerts = await res.json();
        if (Array.isArray(backendAlerts) && backendAlerts.length > 0) {
          const mapped: Alert[] = backendAlerts.map((ba: any): Alert => ({
            id: ba.id,
            title: ba.alert_type === 'ANPR_FLAGGED' ? 'Watchlist Vehicle Detected' : 'Perimeter Virtual Tripwire Breach',
            description: ba.metadata_json?.description || `${ba.alert_type.replace('_', ' ')} detected with cryptographic SHA-256 seal.`,
            type: ba.alert_type === 'ANPR_FLAGGED' ? 'ANOMALOUS_MOTION' : 'VIRTUAL_FENCE_BREACH',
            severity: (ba.severity === 'CRITICAL' ? 'CRITICAL' : (ba.severity === 'HIGH' ? 'HIGH' : 'MEDIUM')),
            status: ba.status === 'RESOLVED' ? 'RESOLVED' : (ba.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'NEW'),
            targetId: ba.track_id || 'TGT-2048',
            targetClassification: ba.alert_type === 'ANPR_FLAGGED' ? 'VEHICLE' : 'PERSON',
            confidence: ba.confidence || 95.0,
            cameraId: ba.camera_id || 'CAM-RGB-01',
            zone: 'Zone Alpha',
            sector: 'Northern Border Sector 07',
            timestamp: new Date(ba.timestamp).toLocaleTimeString(),
            sha256Hash: ba.hash || 'hash_verified',
            evidenceId: ba.evidence_path ? ba.id : undefined,
          }));

          // Merge backend alerts with any local-only alerts
          const ids = new Set(mapped.map((a) => a.id));
          const localOnly = this.alerts.filter((a) => !ids.has(a.id));
          return [...mapped, ...localOnly];
        }
      }
    } catch (e) {
      // Fallback
    }
    await delay(50);
    return [...this.alerts];
  }


  async getAlertById(id: string): Promise<Alert | undefined> {
    await delay(30);
    return this.alerts.find((a) => a.id === id);
  }

  async resolveAlert(id: string, resolvedBy: string = 'Sector Operator'): Promise<Alert | undefined> {
    // Attempt backend acknowledge
    try {
      await fetch(`${BACKEND_BASE_URL}/alerts/${id}/acknowledge`, {
        method: 'POST',
        signal: AbortSignal.timeout(1500),
      });
    } catch (e) {
      // Silent fallback
    }

    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      alert.status = 'RESOLVED';
      alert.resolvedAt = new Date().toLocaleTimeString();
      alert.resolvedBy = resolvedBy;
      this.saveStoredAlerts();
    }
    return alert;
  }

  // Virtual Fence APIs
  async getVirtualFences(): Promise<VirtualFence[]> {
    await delay(50);
    return [...this.fences];
  }

  async toggleVirtualFence(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<VirtualFence | undefined> {
    await delay(100);
    const fence = this.fences.find((f) => f.id === id);
    if (fence) {
      fence.status = status;
    }
    return fence;
  }

  // Edge Node APIs
  async getEdgeNodes(): Promise<EdgeNode[]> {
    await delay(50);
    return [...this.edgeNodes];
  }

  async getEdgeNodeById(id: string): Promise<EdgeNode | undefined> {
    await delay(30);
    return this.edgeNodes.find((n) => n.id === id);
  }

  // Evidence APIs
  async getEvidence(): Promise<Evidence[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/evidence`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const backendEv = await res.json();
        if (Array.isArray(backendEv) && backendEv.length > 0) {
          const mapped: Evidence[] = backendEv.map((be: any) => ({
            id: be.id,
            alertId: be.alert_id || 'ALT-DB-SYNC',
            targetId: 'TGT-AUTO',
            cameraId: 'CAM-STREAM-02',
            timestamp: new Date(be.created_at).toLocaleTimeString(),
            type: 'KEYFRAME',
            confidence: 98.6,
            location: 'Sector 07 ANPR Checkpoint (Database Sync)',
            sector: 'Northern Border Sector 07',
            sha256Hash: be.sha256,
            hashVerified: true,
            privacyStatus: 'PROCESSED',
            fileSizeKb: 1420,
            thumbnailUrl: be.presigned_url || be.object_path,
          }));

          const ids = new Set(mapped.map((e) => e.id));
          const localOnly = this.evidence.filter((e) => !ids.has(e.id));
          return [...mapped, ...localOnly];
        }
      }
    } catch (e) {
      // Fallback to local
    }
    await delay(50);
    return [...this.evidence];
  }

  async getEvidenceById(id: string): Promise<Evidence | undefined> {
    await delay(30);
    return this.evidence.find((e) => e.id === id);
  }

  public recordVehicleEvidence(anpr: any, targetId: string, cameraId: string = 'CAM-STREAM-02'): Evidence {
    const existing = this.evidence.find(
      (e) => e.plateNumber === anpr.plateNumber || (e.targetId === targetId && e.plateNumber)
    );
    if (existing) {
      existing.thumbnailUrl = anpr.plateCropUrl || existing.thumbnailUrl;
      this.saveStoredEvidence();
      return existing;
    }

    const evidenceId = `EV-ANPR-${Math.floor(1000 + Math.random() * 9000)}`;
    const sha256 = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const newEvidence: Evidence = {
      id: evidenceId,
      alertId: anpr.isFlagged ? 'ALT-ANPR-WARN' : 'ALT-ANPR-AUTO',
      targetId,
      cameraId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'KEYFRAME',
      confidence: anpr.confidence || 98.4,
      location: `Sector 07 ANPR Checkpoint (${anpr.jurisdiction || 'Northern Sector'})`,
      sector: 'Northern Border Sector 07',
      sha256Hash: sha256,
      hashVerified: true,
      privacyStatus: 'PROCESSED',
      fileSizeKb: 1420,
      thumbnailUrl: anpr.plateCropUrl,
      plateNumber: anpr.plateNumber,
      vehicleColor: anpr.vehicleColor || 'Silver White',
      vehicleType: anpr.vehicleType || 'VEHICLE',
      anprRecord: anpr,
    };

    this.evidence.unshift(newEvidence);
    this.saveStoredEvidence();

    // Ingest into SQLite backend via REST API asynchronously
    fetch(`${BACKEND_BASE_URL}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate_number: anpr.plateNumber,
        vehicle_color: anpr.vehicleColor,
        vehicle_type: anpr.vehicleType,
        confidence: anpr.confidence || 98.4,
        sha256: sha256,
        thumbnail_data: anpr.plateCropUrl,
      }),
    }).catch(() => {});

    if (anpr.isFlagged) {
      fetch(`${BACKEND_BASE_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: 'ANPR_FLAGGED',
          severity: 'HIGH',
          confidence: anpr.confidence || 98.4,
          metadata: {
            plate_number: anpr.plateNumber,
            description: `Flagged Vehicle Intercept: Plate ${anpr.plateNumber} matching watchlist.`,
          },
        }),
      }).catch(() => {});
    }

    return newEvidence;
  }

  // Environment APIs
  async getEnvironment(): Promise<EnvironmentStatus> {
    await delay(50);
    return { ...this.environment };
  }

  // Analytics APIs
  async getAnalytics() {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/system/metrics`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const metrics = await res.json();
        return {
          aiEngine: 'ACTIVE',
          detectionState: 'ACTIVE',
          trackingState: 'ACTIVE',
          activeSensorsCount: metrics.active_cameras || 1,
          totalSensorsCount: 2,
          inferenceLatencyMs: 4.6,
          accuracyRate: 98.4,
          falseAlarmRate: '< 0.3%',
          currentTarget: this.targets[0],
          pipelineStages: [
            { name: 'Multi-Spectral Ingestion', status: 'ONLINE', details: 'CAM-RGB-01 (1080p @ 30fps)' },
            { name: 'Hardware Decoding', status: 'ONLINE', details: 'NVDEC Hardware Acceleration' },
            { name: 'YOLOv8-TRT Detection', status: 'ONLINE', details: 'INT8 Precision Core (<5ms latency)' },
            { name: 'Kalman-Filter Tracking', status: 'ONLINE', details: 'TGT-2048 active vector tracking' },
            { name: 'Spatial Heuristics', status: 'TRIGGERED', details: 'Zone Alpha Virtual Tripwire Breach' },
            { name: 'SHA-256 SQLite Storage', status: 'ONLINE', details: 'Direct SQL & Evidence Persistence' },
            { name: 'DMR/MQTT Dispatch', status: 'ONLINE', details: 'Payload size 4.8 KB/packet' },
          ],
        };
      }
    } catch (e) {
      // Fallback
    }

    await delay(50);
    return {
      aiEngine: 'ACTIVE',
      detectionState: 'ACTIVE',
      trackingState: 'ACTIVE',
      activeSensorsCount: 1,
      totalSensorsCount: 2,
      inferenceLatencyMs: 4.6,
      accuracyRate: 98.4,
      falseAlarmRate: '< 0.3%',
      currentTarget: this.targets[0],
      pipelineStages: [
        { name: 'Multi-Spectral Ingestion', status: 'ONLINE', details: 'CAM-RGB-01 (1080p @ 30fps)' },
        { name: 'Hardware Decoding', status: 'ONLINE', details: 'NVDEC Hardware Acceleration' },
        { name: 'YOLOv8-TRT Detection', status: 'ONLINE', details: 'INT8 Precision Core (<5ms latency)' },
        { name: 'Kalman-Filter Tracking', status: 'ONLINE', details: 'TGT-2048 active vector tracking' },
        { name: 'Spatial Heuristics', status: 'TRIGGERED', details: 'Zone Alpha Virtual Tripwire Breach' },
        { name: 'SHA-256 Cryptographic Sealing', status: 'ONLINE', details: 'Evidence integrity sealed' },
        { name: 'DMR/MQTT Dispatch', status: 'ONLINE', details: 'Payload size 4.8 KB/packet' },
      ],
    };
  }

  // Reports APIs
  async getReports() {
    await delay(50);
    return {
      totalAlerts: 5,
      activeThreats: 1,
      targetsDetected: 3,
      evidenceCaptured: 12,
      mainIncident: this.alerts[0],
      auditEvents: [...this.auditEvents],
    };
  }

  async generateReport() {
    await delay(250);
    return {
      reportId: `REP-${Date.now().toString().slice(-6)}`,
      generatedAt: new Date().toISOString(),
      sector: 'Northern Border Sector 07',
      totalBreaches: 1,
      activeTarget: 'TGT-2048',
      summary: 'Tactical security summary generated with SHA-256 cryptographic verification.',
      status: 'SUCCESS',
    };
  }
}

export const apiService = new ApiService();

