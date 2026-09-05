// Web Speech API interfaces for TypeScript
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export type VoiceCommandHandler = (action: string, spokenText: string) => void;

export interface VoiceCommandDef {
  keywords: string[];
  action: string;
  label: string;
  response: string;
}

export const VOICE_COMMANDS: VoiceCommandDef[] = [
  // Navigation commands
  {
    keywords: ['surveillance', 'camera', 'cameras', 'live video', 'video feed', 'live feed'],
    action: 'NAV_SURVEILLANCE',
    label: 'Open Live Surveillance',
    response: 'Navigating to Live Surveillance console.',
  },
  {
    keywords: ['map', 'tactical map', 'radar', 'grid', 'sector map'],
    action: 'NAV_MAP',
    label: 'Open Tactical Map',
    response: 'Engaging Tactical Sector Radar Map.',
  },
  {
    keywords: ['command center', 'dashboard', 'home', 'main dashboard'],
    action: 'NAV_DASHBOARD',
    label: 'Open Command Center',
    response: 'Returning to primary Tactical Command Center.',
  },
  {
    keywords: ['alert', 'alerts', 'threats', 'intrusions', 'alarms'],
    action: 'NAV_ALERTS',
    label: 'Show Threat Alerts',
    response: 'Opening Critical Alerts feed.',
  },
  {
    keywords: ['evidence', 'evidence vault', 'cryptographic', 'recordings'],
    action: 'NAV_EVIDENCE',
    label: 'Open Evidence Vault',
    response: 'Accessing Cryptographically Verified Evidence Vault.',
  },
  {
    keywords: ['fence', 'virtual fence', 'tripwire', 'perimeter', 'boundary'],
    action: 'NAV_FENCE',
    label: 'Open Virtual Fence Config',
    response: 'Opening Virtual Fence and Polygon Calibration.',
  },
  {
    keywords: ['edge', 'edge node', 'nodes', 'jetson', 'hardware'],
    action: 'NAV_EDGE',
    label: 'Show Edge Nodes',
    response: 'Accessing Edge Node Telemetry and Jetson Orin status.',
  },
  {
    keywords: ['report', 'reports', 'audit', 'logs'],
    action: 'NAV_REPORTS',
    label: 'Generate Reports / Audit Log',
    response: 'Opening Tactical Audit Logs and Compliance Reports.',
  },
  {
    keywords: ['analytics', 'charts', 'statistics', 'metrics'],
    action: 'NAV_ANALYTICS',
    label: 'Show Analytics',
    response: 'Opening Sensor Analytics and Threat Trends.',
  },
  {
    keywords: ['data flow', 'network', 'pipeline', 'architecture'],
    action: 'NAV_DATA_FLOW',
    label: 'Show Data Pipeline',
    response: 'Displaying Lightweight Edge-to-Server Data Pipeline.',
  },
  {
    keywords: ['weather', 'environment', 'environmental', 'temperature'],
    action: 'NAV_ENVIRONMENT',
    label: 'Show Environmental Sensors',
    response: 'Opening Border Weather and Environmental Telemetry.',
  },

  // Tactical / Demo Simulation Actions
  {
    keywords: ['simulate breach', 'trigger breach', 'trigger alarm', 'test breach', 'breach', 'simulate intrusion'],
    action: 'SIMULATE_BREACH',
    label: 'Simulate Perimeter Breach',
    response: 'Warning: Simulated breach injected in Zone Alpha Sector 07.',
  },
  {
    keywords: ['start demo', 'run demo', 'begin demo', 'play demo'],
    action: 'DEMO_START',
    label: 'Start SIH Interactive Demo',
    response: 'Initiating Trinetra automated demonstration sequence.',
  },
  {
    keywords: ['next step', 'next demo', 'forward'],
    action: 'DEMO_NEXT',
    label: 'Next Demo Step',
    response: 'Advancing to next demonstration milestone.',
  },
  {
    keywords: ['previous step', 'prev step', 'back step'],
    action: 'DEMO_PREV',
    label: 'Previous Demo Step',
    response: 'Returning to previous demonstration step.',
  },
  {
    keywords: ['reset demo', 'stop demo', 'standby'],
    action: 'DEMO_RESET',
    label: 'Reset Demo to Standby',
    response: 'Demonstration reset to baseline standby.',
  },
  {
    keywords: ['status report', 'system status', 'report status', 'sitrep'],
    action: 'STATUS_REPORT',
    label: 'Speak Situational Status',
    response: 'Trinetra Tactical Sitrep: All 5 Jetson edge nodes operational. Sector 07 virtual tripwire armed. Encryption SHA-256 active.',
  },
  {
    keywords: ['help', 'commands', 'voice help', 'what can you do'],
    action: 'SHOW_HELP',
    label: 'Show Voice Commands Guide',
    response: 'Displaying available tactical voice commands.',
  },
];

class VoiceControlService {
  private recognition: any = null;
  private isListening: boolean = false;
  private listeners: Set<VoiceCommandHandler> = new Set();
  private isSupported: boolean = false;
  private ttsMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const windowRef = window as unknown as IWindow;
      const SpeechRecognition = windowRef.SpeechRecognition || windowRef.webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          const lastIndex = event.results.length - 1;
          const transcript = event.results[lastIndex][0].transcript.trim().toLowerCase();
          this.processTranscript(transcript);
        };

        this.recognition.onerror = (event: any) => {
          console.warn('[Trinetra Voice] Recognition error:', event.error);
        };

        this.recognition.onend = () => {
          // Restart if still flagged as listening
          if (this.isListening) {
            try {
              this.recognition.start();
            } catch (err) {
              // Ignore restart error
            }
          }
        };
      }
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public startListening(onCommand?: VoiceCommandHandler): boolean {
    if (!this.isSupported || !this.recognition) return false;

    if (onCommand) {
      this.subscribe(onCommand);
    }

    try {
      this.isListening = true;
      this.recognition.start();
      this.speakFeedback('Tactical voice command listener engaged. Ready for instructions.');
      return true;
    } catch (err) {
      // If already started
      return true;
    }
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore
      }
    }
  }

  public toggleListening(onCommand?: VoiceCommandHandler): boolean {
    if (this.isListening) {
      this.stopListening();
      this.speakFeedback('Voice command listener in standby.');
      return false;
    } else {
      return this.startListening(onCommand);
    }
  }

  public subscribe(handler: VoiceCommandHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  public toggleMute(): boolean {
    this.ttsMuted = !this.ttsMuted;
    if (!this.ttsMuted) {
      this.speakFeedback('Tactical audio confirmations enabled.');
    }
    return this.ttsMuted;
  }

  public getIsMuted(): boolean {
    return this.ttsMuted;
  }

  public processTranscript(transcript: string): void {
    console.log('[Trinetra Voice Heard]:', transcript);

    // Find best matching command
    let matchedCommand: VoiceCommandDef | null = null;

    for (const cmd of VOICE_COMMANDS) {
      for (const kw of cmd.keywords) {
        if (transcript.includes(kw)) {
          matchedCommand = cmd;
          break;
        }
      }
      if (matchedCommand) break;
    }

    if (matchedCommand) {
      this.speakFeedback(matchedCommand.response);
      this.listeners.forEach((fn) => fn(matchedCommand!.action, transcript));
    } else {
      this.speakFeedback(`Command not recognized: "${transcript}". Say "help" for command list.`);
      this.listeners.forEach((fn) => fn('UNRECOGNIZED', transcript));
    }
  }

  public speakFeedback(text: string): void {
    if (this.ttsMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Crisp tactical delivery
      utterance.pitch = 0.95; // Slightly deeper military radio tone
      utterance.volume = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Trinetra TTS Error]:', err);
    }
  }
}

export const voiceService = new VoiceControlService();
