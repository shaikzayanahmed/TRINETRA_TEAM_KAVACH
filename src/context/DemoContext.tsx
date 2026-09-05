import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Target, Alert, Evidence } from '../types';
import { MOCK_TARGET_2048, MOCK_ALERT_7821, MOCK_EVIDENCE_421 } from '../mocks/mockData';
import { wsService } from '../services/websocketService';

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
  setStepDirectly: (step: number) => void;
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
        setActiveTarget({ ...MOCK_TARGET_2048, status: 'DETECTED' });
        setIsDetectionVisible(true);
        setIsFenceBreached(false);
        wsService.emit('target_detected', MOCK_TARGET_2048);
        break;

      case 2:
        // Kalman tracking
        setActiveTarget({ ...MOCK_TARGET_2048, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(false);
        wsService.emit('target_updated', MOCK_TARGET_2048);
        break;

      case 3:
        // Virtual fence breach & alert
        setActiveTarget({ ...MOCK_TARGET_2048, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(true);
        setActiveAlert(MOCK_ALERT_7821);
        wsService.emit('alert_created', MOCK_ALERT_7821);
        break;

      case 4:
        // Evidence captured & SHA-256 verified
        setActiveTarget({ ...MOCK_TARGET_2048, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(true);
        setActiveAlert(MOCK_ALERT_7821);
        setActiveEvidence(MOCK_EVIDENCE_421);
        wsService.emit('evidence_captured', MOCK_EVIDENCE_421);
        break;

      case 5:
        // Complete state
        setActiveTarget({ ...MOCK_TARGET_2048, status: 'TRACKING' });
        setIsDetectionVisible(true);
        setIsFenceBreached(true);
        setActiveAlert(MOCK_ALERT_7821);
        setActiveEvidence(MOCK_EVIDENCE_421);
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

  const setStepDirectly = useCallback((targetStep: number) => {
    setStep(Math.max(0, Math.min(targetStep, 5)));
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
        setStepDirectly,
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
