export type CameraType = 'RGB' | 'LWIR';
export type CameraStatus = 'ONLINE' | 'WAITING_FOR_INPUT' | 'OFFLINE' | 'ERROR';

export interface Camera {
  id: string;
  name: string;
  type: CameraType;
  status: CameraStatus;
  resolution: string;
  fps: number;
  spectralRange: string;
  location: string;
  sector: string;
  bitrateKbps: number;
}

export type TargetClassification = 'PERSON' | 'VEHICLE' | 'ANIMAL' | 'UNKNOWN';
export type TargetStatus = 'DETECTED' | 'TRACKING' | 'LOST' | 'INTERCEPTED';

export interface TargetPosition {
  lat: number;
  lng: number;
  x: number; // percentage in frame (0-100)
  y: number; // percentage in frame (0-100)
  width: number;
  height: number;
  timestamp: string;
}

export interface AnprRecord {
  plateNumber: string;
  confidence: number;
  stateCode: string;
  jurisdiction: string;
  vehicleType: string;
  isFlagged: boolean;
  securityClearance: 'AUTHORIZED' | 'SUSPICIOUS' | 'UNREGISTERED';
  flagReason?: string;
  plateCropUrl?: string;
  speedKmh?: number;
  motionStatus?: 'MOVING' | 'STATIONARY';
  bearing?: string;
}

export interface Target {
  id: string;
  classification: TargetClassification;
  confidence: number;
  status: TargetStatus;
  firstDetectedAt: string;
  lastSeenAt: string;
  cameraId: string;
  sector: string;
  zone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  heatSignatureApparent?: string;
  trajectory: TargetPosition[];
  speedKmh?: number;
  bearing?: string;
  alertId?: string;
  evidenceId?: string;
  anpr?: AnprRecord;
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
export type AlertType = 'VIRTUAL_FENCE_BREACH' | 'LOITERING' | 'ANOMALOUS_MOTION' | 'SENSOR_TAMPER';

export interface Alert {
  id: string;
  title: string;
  description: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  targetId: string;
  targetClassification: TargetClassification;
  confidence: number;
  cameraId: string;
  zone: string;
  sector: string;
  timestamp: string;
  resolvedAt?: string;
  resolvedBy?: string;
  evidenceId: string;
  sha256Hash: string;
}

export interface VirtualFencePoint {
  x: number;
  y: number;
  lat: number;
  lng: number;
}

export interface VirtualFence {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CALIBRATING';
  sector: string;
  confidenceThreshold: number;
  assignedCameras: string[];
  points: VirtualFencePoint[];
  breachCount: number;
  lastBreachTimestamp?: string;
}

export interface EdgeNode {
  id: string;
  name: string;
  sector: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  aiEngineStatus: 'ACTIVE' | 'IDLE' | 'ERROR';
  hardwareModel: string;
  accelerator: string;
  inferenceLatencyMs: number;
  powerConsumptionW: number;
  temperatureC: number;
  storageUsagePercent: number;
  bandwidthUsageKbpkt: number;
  connectedSensors: string[];
  firmwareVersion: string;
  uptime: string;
}

export interface Evidence {
  id: string;
  alertId: string;
  targetId: string;
  cameraId: string;
  timestamp: string;
  type: 'VIDEO_CLIP' | 'KEYFRAME' | 'METADATA_BUNDLE';
  confidence: number;
  location: string;
  sector: string;
  sha256Hash: string;
  hashVerified: boolean;
  privacyStatus: 'PROCESSED' | 'PURGED' | 'RAW';
  fileSizeKb: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

export interface EnvironmentStatus {
  temperatureC: number;
  visibility: 'Good' | 'Moderate' | 'Poor';
  weather: 'Clear' | 'Snow' | 'Fog' | 'Windy';
  windSpeedKmh: number;
  aiDetectionCondition: 'NORMAL' | 'DEGRADED' | 'ADAPTED';
  rgbCameraCondition: 'GOOD' | 'FAIR' | 'OBSTRUCTED';
  lwirCameraCondition: 'NOT_CONNECTED' | 'GOOD' | 'CALIBRATING';
  lastUpdated: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  details: string;
  actor: string;
  sha256Hash: string;
  status: 'VERIFIED' | 'LOGGED' | 'FLAGGED';
}

export interface User {
  id: string;
  callsign: string;
  name: string;
  role: 'SECTOR_OPERATOR' | 'TACTICAL_COMMANDER' | 'SYSTEM_ADMIN';
  unit: string;
  sector: string;
  securityClearance: 'RESTRICTED' | 'SECRET' | 'TOP_SECRET';
}

export interface DemoState {
  isRunning: boolean;
  step: number; // 0: Idle, 1: Detection, 2: Tracking, 3: Breach, 4: Alert & Evidence, 5: Complete
  stepTitle: string;
  autoPlay: boolean;
  activeTarget: Target | null;
  activeAlert: Alert | null;
  activeEvidence: Evidence | null;
}
