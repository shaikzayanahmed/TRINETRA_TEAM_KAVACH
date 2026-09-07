import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Target, Alert, Evidence } from '../types';
import { wsService } from '../services/websocketService';
import { apiService } from '../services/apiService';

const SIMULATED_TARGET: Target = {
  id: 'TGT-2048',
  classification: 'PERSON',
  confidence: 96.8,
  status: 'TRACKING',
  firstDetectedAt: new Date().toLocaleTimeString(),
  lastSeenAt: new Date().toLocaleTimeString(),
  cameraId: 'CAM-RGB-01',
  sector: 'Northern Border Sector 07',
  zone: 'Zone Alpha',
  coordinates: {
    lat: 34.2911,
    lng: 77.7533,
  },
  heatSignatureApparent: '36.4°C Apparent',
  speedKmh: 4.2,
  bearing: '142° SE',
  trajectory: [
    { lat: 34.2902, lng: 77.7521, x: 38, y: 40, width: 22, height: 46, timestamp: new Date().toLocaleTimeString() },
  ],
};

export interface DemoStepInfo {
  step: number;
  title: string;
  description: string;
  durationMs: number;
}

export const DEMO_STEPS: DemoStepInfo[] = [
  {
    step: 0,
    title: 'Standby / Live Feeds',
    description: 'Laptop RGB camera online. LWIR Thermal in standby. Sector perimeter secure.',
    durationMs: 4000,
  },
  {
    step: 1,
    title: 'YOLOv8 Target Detection',
    description: 'Edge AI detects PERSON signature in Sector 07. Confidence: 96.8%.',
    durationMs: 4500,
  },
  {
    step: 2,
    title: 'Kalman-Filter Vector Tracking',
    description: 'Active tracking locked on TGT-2048. Coordinate velocity calculated.',
    durationMs: 4500,
  },
  {
    step: 3,
    title: 'Zone Alpha Tripwire Breach',
    description: 'Target breaches virtual fence boundary. Alert ALT-7821 triggered (HIGH).',
    durationMs: 5000,
  },
  {
    step: 4,
    title: 'Evidence Encapsulation & SHA-256',
    description: 'Evidence EV-00421 isolated, face blurred for DPDPA, SHA-256 integrity verified.',
    durationMs: 5000,
  },
  {
    step: 5,
    title: 'Command Center & Network Dispatch',
    description: 'Telemetry dispatched to tactical console via lightweight DMR/MQTT packet (4.8 KB).',
    durationMs: 0,
  },
];

interface DemoContextType {
  isRunning: boolean;
  step: number;
  stepInfo: DemoStepInfo;
  autoPlay: boolean;
  activeTarget: Target | null;
  activeAlert: Alert | null;
  activeEvidence: Evidence | null;
  isFenceBreached: boolean;
  isDetectionVisible: boolean;
  startDemo: () => void;
  nextStep: () => void;
  prevStep: () => void;
  resetDemo: () => void;
  toggleAutoPlay: () => void;
  triggerBreach: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);

  const [activeTarget, setActiveTarget] = useState<Target | null>(null);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<Evidence | null>(null);
  const [isFenceBreached, setIsFenceBreached] = useState<boolean>(false);
  const [isDetectionVisible, setIsDetectionVisible] = useState<boolean>(false);

  // Listen to live vision detections crossing the boundary and alert resolutions
  useEffect(() => {
    const handleLiveBreach = (e: any) => {
      if (e.detail?.alert && e.detail?.evidence) {
        if (e.detail.alert.cameraId === 'CAM-RGB-01') {
          setIsFenceBreached(true);
        }
        setActiveAlert(e.detail.alert);
        setActiveEvidence(e.detail.evidence);
      }
    };

    const handleAlertResolved = (e: any) => {
      if (e.detail?.hasActiveBreach === false) {
        setIsFenceBreached(false);
        setActiveAlert(null);
        setActiveTarget((prev) => (prev ? { ...prev, status: 'TRACKING' } : null));
      } else if (e.detail?.id && activeAlert?.id === e.detail.id) {
        setIsFenceBreached(false);
        setActiveAlert(null);
        setActiveTarget((prev) => (prev ? { ...prev, status: 'TRACKING' } : null));
      }
    };

    const handleBreachCleared = () => {
      setIsFenceBreached(false);
      setActiveAlert(null);
      setActiveTarget((prev) => (prev ? { ...prev, status: 'TRACKING' } : null));
    };

    window.addEventListener('trinetra_live_breach', handleLiveBreach);
    window.addEventListener('trinetra_alert_resolved', handleAlertResolved);
    window.addEventListener('trinetra_breach_cleared', handleBreachCleared);

    return () => {
      window.removeEventListener('trinetra_live_breach', handleLiveBreach);
      window.removeEventListener('trinetra_alert_resolved', handleAlertResolved);
      window.removeEventListener('trinetra_breach_cleared', handleBreachCleared);
    };
  }, [activeAlert]);

  // Apply step changes
  useEffect(() => {
    switch (step) {
      case 0:
        // Idle standby
        setActiveTarget(null);
        setActiveAlert(null);
        setActiveEvidence(null);
        setIsFenceBreached(false);
        setIsDetectionVisible(false);
        break;

      case 1:
        // Target detected
        setActiveTarget({ ...SIMULATED_TARGET, status: 'DETECTED' });
        setIsDetectionVisible(true);
        setIsFenceBreached(false);
        wsService.emit('target_detected', SIMULATED_TARGET);
        break;

      case 2:
        // Kalman tracking
        setActiveTarget({ ...SIMULATED_TARGET, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(false);
        wsService.emit('target_updated', SIMULATED_TARGET);
        break;

      case 3:
        // Virtual fence breach & alert + MinIO snapshot + MQTT broadcast
        setActiveTarget({ ...SIMULATED_TARGET, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(true);
        {
          const activeFence = apiService.getActiveFenceSync();
          const zoneName = activeFence?.name || 'Sector 07 Zone Alpha';
          const { alert, evidence } = apiService.recordBreachEvidenceAndAlert({
            targetId: 'TGT-2048',
            cameraId: 'CAM-RGB-01',
            zoneName,
            confidence: 98.4,
          });
          setActiveAlert(alert);
          setActiveEvidence(evidence);
          wsService.emit('alert_created', alert);
          try {
            window.dispatchEvent(
              new CustomEvent('trinetra_live_breach', {
                detail: { alert, evidence, targetId: 'TGT-2048', zoneName, timestamp: new Date().toISOString() },
              })
            );
          } catch (e) {}
        }
        break;

      case 4:
        // Evidence captured & SHA-256 verified
        setActiveTarget({ ...SIMULATED_TARGET, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(true);
        if (activeEvidence) {
          wsService.emit('evidence_captured', activeEvidence);
        }
        break;

      case 5:
        // Complete state
        setActiveTarget({ ...SIMULATED_TARGET, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(true);
        break;
    }
  }, [step]);

  // Autoplay timer
  useEffect(() => {
    if (!isRunning || !autoPlay) return;

    if (step >= 5) {
      return;
    }

    const currentDuration = DEMO_STEPS[step].durationMs;
    if (currentDuration <= 0) return;

    const timer = setTimeout(() => {
      setStep((prev) => Math.min(prev + 1, 5));
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [isRunning, step, autoPlay]);

  const startDemo = useCallback(() => {
    setIsRunning(true);
    setStep(1);
  }, []);

  const nextStep = useCallback(() => {
    setIsRunning(true);
    setStep((prev) => Math.min(prev + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const resetDemo = useCallback(() => {
    setIsRunning(false);
    setStep(0);
    setActiveTarget(null);
    setActiveAlert(null);
    setActiveEvidence(null);
    setIsFenceBreached(false);
    setIsDetectionVisible(false);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => !prev);
  }, []);

  const triggerBreach = useCallback(() => {
    setIsRunning(false);
    setStep(3);
  }, []);

  return (
    <DemoContext.Provider
      value={{
        isRunning,
        step,
        stepInfo: DEMO_STEPS[step],
        autoPlay,
        activeTarget,
        activeAlert,
        activeEvidence,
        isFenceBreached,
        isDetectionVisible,
        startDemo,
        nextStep,
        prevStep,
        resetDemo,
        toggleAutoPlay,
        triggerBreach,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = (): DemoContextType => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
