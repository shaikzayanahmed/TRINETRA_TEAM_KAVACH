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
  vehicleColor?: string;
  isFlagged: boolean;
  securityClearance: 'AUTHORIZED' | 'SUSPICIOUS' | 'UNREGISTERED';
  flagReason?: string;
  plateCropUrl?: string;
  speedKmh?: number;
  motionStatus?: 'MOVING' | 'STATIONARY';
  bearing?: string;
  isAnalyzed?: boolean;
  evidenceId?: string;
  plateBbox?: {
    x: number; // percentage relative to vehicle bbox (0-100)
    y: number; // percentage relative to vehicle bbox (0-100)
    width: number; // percentage relative to vehicle bbox (0-100)
    height: number; // percentage relative to vehicle bbox (0-100)
  };
  minioStorage?: {
    bucket: string;
    objectKey: string;
    status: 'SEALED' | 'SYNCED' | 'QUEUED';
    endpoint: string;
  };
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

export interface AlertTimelineEvent {
  id: string;
  timestamp: string;
  timeMs?: number;
  action:
    | 'INITIAL_BREACH'
    | 'RE_BREACH'
    | 'ZONE_TRANSIT'
    | 'LOITERING'
    | 'EVIDENCE_RECORDED'
    | 'TARGET_TRACKED'
    | 'PTZ_TRACKING_LOCKED'
    | 'AUDIO_WARNING_BROADCAST'
    | 'QRF_VECTOR_DEPLOYED'
    | 'SECTOR_LOCKDOWN_SEAL'
    | string;
  details: string;

  confidence: number;
  zone: string;
  fenceId?: string;
  fenceName?: string;
  fenceType?: FenceGeometryType;
  fencePoints?: VirtualFencePoint[];
  evidenceId?: string;
  videoClipUrl?: string;
  snapshotUrl?: string;
  coordinates?: { lat: number; lng: number };
}

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
  fenceId?: string;
  fenceName?: string;
  fenceType?: FenceGeometryType;
  fencePreset?: string;
  fencePoints?: VirtualFencePoint[];
  timestamp: string;
  lastBreachTimestamp?: string;
  breachCount?: number;
  timeline?: AlertTimelineEvent[];
  timelineTag?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  evidenceId: string;
  thumbnailUrl?: string;
  plateNumber?: string;
  plateCropUrl?: string;
  vehicleColor?: string;
  vehicleType?: string;
  anprRecord?: AnprRecord;
  zoneName?: string;
  videoClipUrl?: string;
  videoDurationSeconds?: number;
  databaseStored?: boolean;
  sha256Hash: string;
}


export type FenceGeometryType = 'TRIPWIRE' | 'POLYGON' | '3D_SURROUNDING';
export type FenceSourceTarget = 'CAM-RGB-01' | 'CAM-LWIR-01' | 'MEDIA_FILE' | 'TACTICAL_MAP';

export interface VirtualFencePoint {
  x: number; // percentage in frame (0-100) or canvas pixel
  y: number; // percentage in frame (0-100) or canvas pixel
  lat?: number; // PostGIS WGS-84 Latitude
  lng?: number; // PostGIS WGS-84 Longitude
  label?: string;
}

export interface VirtualFence {
  id: string;
  name: string;
  type?: FenceGeometryType;
  sourceTarget?: FenceSourceTarget;
  status: 'ACTIVE' | 'INACTIVE' | 'CALIBRATING';
  sector: string;
  confidenceThreshold: number;
  assignedCameras: string[];
  points: VirtualFencePoint[];
  heightMeters?: number; // For 3D volumetric virtual surrounding
  postgisWkt?: string; // e.g. POLYGON((...)) or LINESTRING(...)
  breachCount: number;
  lastBreachTimestamp?: string;
  color?: string;
  direction?: 'BIDIRECTIONAL' | 'ENTRY_ONLY' | 'EXIT_ONLY';
}

export interface EdgeNode {
  id: string;
  name: string;
  sector: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  aiEngineStatus?: 'ACTIVE' | 'IDLE' | 'ERROR';
  hardwareModel?: string;
  accelerator?: string;
  inferenceLatencyMs?: number;
  powerConsumptionW?: number;
  temperatureC: number;
  storageUsagePercent: number;
  bandwidthUsageKbpkt?: number;
  connectedSensors?: string[];
  firmwareVersion: string;
  uptime?: string;
  ipAddress?: string;
  macAddress?: string;
  cpuUsagePercent?: number;
  gpuUsagePercent?: number;
  memoryUsagePercent?: number;
  uptimeSeconds?: number;
  assignedCameras?: string[];
  aiModelsLoaded?: string[];
}

export interface PersonForensics {
  estimatedHeightCm: number;
  heightVarianceCm: number;
  complexion: 'FAIR' | 'MEDIUM_WHEATISH' | 'DARK_DUSKY' | 'UNRESOLVED';
  clothingUpper: {
    type: string;
    color: string;
    pattern?: string;
  };
  clothingLower: {
    type: string;
    color: string;
  };
  footwear?: {
    type: string;
    color: string;
  };
  faceCovering: {
    isMasked: boolean;
    maskType: 'BALACLAVA' | 'N95_SURGICAL' | 'CLOTH_MASK' | 'NECK_GAITER' | 'NONE';
    headwear: 'CAP' | 'HELMET' | 'HOOD_UP' | 'BEANIE' | 'NONE';
    eyewear: 'SUNGLASSES' | 'SPECTACLES' | 'BALLISTIC_GOGGLES' | 'NONE';
  };
  carriedItems: {
    hasBackpack: boolean;
    bagType: 'TACTICAL_RUCKSACK' | 'DUFFEL_BAG' | 'SLING_BAG' | 'HANDHELD_POUCH' | 'NONE';
    bagColor?: string;
    hasSuspiciousObject: boolean;
    suspiciousObjectType: 'PRY_TOOL' | 'METALLIC_CONTAINER' | 'WIRE_CUTTER' | 'CONCEALED_WEAPON' | 'NONE';
    suspiciousObjectDetail?: string;
  };
  gaitPosture: 'RUNNING' | 'CROUCHING_SNEAKING' | 'RAPID_WALKING' | 'LOITERING_STANDING';
  confidenceScore: number;
}

export interface VehicleForensics {
  brand: string;
  model: string;
  bodyType: 'SUV' | 'SEDAN' | 'HATCHBACK' | 'PICKUP' | 'COMMERCIAL_VAN' | 'MILITARY_CONVOY' | 'TRUCK';
  color: string;
  distinguishingFeatures: string[];
  tintedGlassPercent?: number;
  occupantCountEstimated?: number;
  anprMatchConfidence?: number;
}

export interface ForensicIntelligence {
  subjectType: 'PERSON' | 'VEHICLE' | 'HYBRID_MULTI';
  person?: PersonForensics;
  vehicle?: VehicleForensics;
  aiModelEngine: string;
  inferenceFps: number;
  lightingCondition: 'DAYLIGHT' | 'LOW_LIGHT_NVG' | 'THERMAL_INFRARED';
  threatLevelAssessment: 'CRITICAL_SUSPECT' | 'FLAGGED_PERSON_OF_INTEREST' | 'ELEVATED_WATCH' | 'ROUTINE';
  summaryNarration: string;
}

export interface Evidence {
  id: string;
  alertId: string;
  targetId: string;
  cameraId: string;
  timestamp: string;
  timeMs?: number;
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
  videoClipUrl?: string;
  videoBufferBase64?: string;
  timeline?: AlertTimelineEvent[];
  databaseStored?: boolean;
  plateCropUrl?: string;
  plateNumber?: string;
  vehicleColor?: string;
  vehicleType?: string;
  anprRecord?: AnprRecord;
  forensics?: ForensicIntelligence;
}

export interface EnvironmentStatus {
  temperatureC: number;
  visibility?: 'Good' | 'Moderate' | 'Poor';
  visibilityMeters?: number;
  weather?: 'Clear' | 'Snow' | 'Fog' | 'Windy';
  precipitation?: 'NONE' | 'LIGHT_SNOW' | 'HEAVY_SNOW' | 'RAIN' | 'HAIL' | string;
  windSpeedKmh: number;
  humidityPercent?: number;
  ambientLux?: number;
  uvIndex?: number;
  atmosphericPressureHpa?: number;
  aiDetectionCondition?: 'NORMAL' | 'DEGRADED' | 'ADAPTED';
  rgbCameraCondition?: 'GOOD' | 'FAIR' | 'OBSTRUCTED';
  lwirCameraCondition?: 'NOT_CONNECTED' | 'GOOD' | 'CALIBRATING';
  lastUpdated: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  details: string;
  actor: string;
  sha256Hash: string;
  status?: 'VERIFIED' | 'LOGGED' | 'FLAGGED';
  verified?: boolean;
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'SYSTEM_ADMIN' | 'TACTICAL_COMMANDER' | 'SECTOR_OPERATOR';

export interface User {
  id: string;
  username: string;
  callsign: string;
  name: string;
  email?: string;
  role: UserRole;
  unit: string;
  sector: string;
  securityClearance: 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  databaseConnected?: boolean;
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
