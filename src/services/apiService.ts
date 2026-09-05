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
    await delay(50);
    return [...this.alerts];
  }

  async getAlertById(id: string): Promise<Alert | undefined> {
    await delay(30);
    return this.alerts.find((a) => a.id === id);
  }

  async resolveAlert(id: string, resolvedBy: string = 'Sector Operator'): Promise<Alert | undefined> {
    await delay(100);
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
      sha256Hash: Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
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
    return newEvidence;
  }

  // Environment APIs
  async getEnvironment(): Promise<EnvironmentStatus> {
    await delay(50);
    return { ...this.environment };
  }

  // Analytics APIs
  async getAnalytics() {
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
        { name: 'SHA-256 Hashing', status: 'ONLINE', details: 'Evidence integrity sealed' },
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
