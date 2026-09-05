export interface CommandItem {
  id: string;
  category: 'NAVIGATION' | 'SIMULATION' | 'TELEMETRY' | 'AI_INTEL';
  title: string;
  description: string;
  keywords: string[];
  action: string;
  shortcut?: string;
  route?: string;
  aiResponse?: string;
}

export const SYSTEM_COMMANDS: CommandItem[] = [
  // Navigation
  {
    id: 'nav-surveillance',
    category: 'NAVIGATION',
    title: 'Open Live Surveillance',
    description: 'Switch to live RGB & thermal vision feeds with YOLOv8 detection overlay',
    keywords: ['surveillance', 'camera', 'cameras', 'live feed', 'video', 'rgb', 'thermal', 'cctv', 'stream'],
    action: 'NAVIGATE',
    route: '/surveillance',
    shortcut: 'G S',
  },
  {
    id: 'nav-map',
    category: 'NAVIGATION',
    title: 'Open Tactical Sector Map',
    description: 'View 2D radar grid, geo-coordinates, perimeter zones, and tracked target vectors',
    keywords: ['map', 'radar', 'grid', 'tactical map', 'sector 07', 'coordinates', 'geospatial', 'zones'],
    action: 'NAVIGATE',
    route: '/map',
    shortcut: 'G M',
  },
  {
    id: 'nav-dashboard',
    category: 'NAVIGATION',
    title: 'Open Command Center Dashboard',
    description: 'Primary tactical overview with threat counters, active targets, and quick actions',
    keywords: ['dashboard', 'command center', 'home', 'overview', 'main', 'console'],
    action: 'NAVIGATE',
    route: '/dashboard',
    shortcut: 'G D',
  },
  {
    id: 'nav-alerts',
    category: 'NAVIGATION',
    title: 'View Threat Alerts Feed',
    description: 'Real-time list of perimeter breaches, target classifications, and alert acknowledgements',
    keywords: ['alerts', 'threats', 'alarms', 'breaches', 'incidents', 'notifications', 'intrusions'],
    action: 'NAVIGATE',
    route: '/alerts',
    shortcut: 'G A',
  },
  {
    id: 'nav-fence',
    category: 'NAVIGATION',
    title: 'Configure Virtual Fence & Tripwires',
    description: 'Spatial polygon boundary calibration and intrusion tripwire zones',
    keywords: ['fence', 'virtual fence', 'tripwire', 'polygon', 'boundary', 'perimeter', 'calibration', 'zones'],
    action: 'NAVIGATE',
    route: '/virtual-fence',
    shortcut: 'G F',
  },
  {
    id: 'nav-edge',
    category: 'NAVIGATION',
    title: 'Inspect Edge Nodes Telemetry',
    description: 'NVIDIA Jetson Orin health, GPU/CPU utilization, thermal wattage, and INT8 runtime',
    keywords: ['edge', 'edge node', 'jetson', 'orin', 'hardware', 'gpu', 'cpu', 'power', 'health', 'nodes'],
    action: 'NAVIGATE',
    route: '/edge-node',
    shortcut: 'G E',
  },
  {
    id: 'nav-evidence',
    category: 'NAVIGATION',
    title: 'Access Evidence Vault',
    description: 'Cryptographic SHA-256 sealed keyframes and DPDPA statutory face-redacted logs',
    keywords: ['evidence', 'vault', 'sha-256', 'hash', 'dpdpa', 'privacy', 'audit', 'cryptographic', 'records'],
    action: 'NAVIGATE',
    route: '/evidence',
    shortcut: 'G V',
  },
  {
    id: 'nav-reports',
    category: 'NAVIGATION',
    title: 'Generate Tactical Reports & Logs',
    description: 'Immutable audit trail, compliance reports, and shift handover briefings',
    keywords: ['reports', 'audit', 'logs', 'compliance', 'export', 'summary', 'history'],
    action: 'NAVIGATE',
    route: '/reports',
    shortcut: 'G R',
  },
  {
    id: 'nav-analytics',
    category: 'NAVIGATION',
    title: 'View Threat Analytics & Trends',
    description: 'Classification distribution, diurnal heatmaps, and false-alarm rejection metrics',
    keywords: ['analytics', 'charts', 'trends', 'metrics', 'statistics', 'graphs', 'performance'],
    action: 'NAVIGATE',
    route: '/analytics',
    shortcut: 'G Y',
  },
  {
    id: 'nav-dataflow',
    category: 'NAVIGATION',
    title: 'Inspect Edge-to-Server Data Pipeline',
    description: 'Architecture diagram of zero-cloud bandwidth optimization (<5 KB/alert)',
    keywords: ['data flow', 'pipeline', 'network', 'bandwidth', 'mqtt', 'dmr', 'architecture', 'payload'],
    action: 'NAVIGATE',
    route: '/data-flow',
  },
  {
    id: 'nav-environment',
    category: 'NAVIGATION',
    title: 'Check Environmental Sensors',
    description: 'Border meteorological telemetry: ambient temperature, wind, barometric pressure',
    keywords: ['weather', 'environment', 'temperature', 'wind', 'humidity', 'sensors', 'altitude'],
    action: 'NAVIGATE',
    route: '/environment',
  },

  // Tactical Actions & Simulations
  {
    id: 'sim-breach',
    category: 'SIMULATION',
    title: 'Simulate Perimeter Breach in Zone Alpha',
    description: 'Trigger an immediate simulated virtual tripwire breach and generate high-priority alert',
    keywords: ['simulate breach', 'trigger breach', 'test intrusion', 'alarm test', 'breach test', 'simulate attack', 'tripwire breach'],
    action: 'TRIGGER_BREACH',
    shortcut: 'S B',
    aiResponse: 'SIMULATION ENGAGED: Injected virtual fence breach event in Sector 07 Zone Alpha. Alert ALT-7821 dispatched to console.',
  },
  {
    id: 'sim-start-demo',
    category: 'SIMULATION',
    title: 'Start 5-Step SIH Demonstration Sequence',
    description: 'Run automated end-to-end detection, Kalman tracking, breach, and evidence sealing flow',
    keywords: ['start demo', 'run demo', 'begin demo', 'play demo', 'sih demo', 'presentation mode'],
    action: 'DEMO_START',
    shortcut: 'S D',
    aiResponse: 'DEMO SEQUENCE ENGAGED: Starting Trinetra 5-step automated tactical border interception flow.',
  },
  {
    id: 'sim-next-step',
    category: 'SIMULATION',
    title: 'Advance to Next Demo Step',
    description: 'Jump to the next milestone in the SIH demonstration pipeline',
    keywords: ['next step', 'advance demo', 'forward demo', 'next milestone'],
    action: 'DEMO_NEXT',
    shortcut: 'N',
    aiResponse: 'ADVANCING: Moving to next tactical pipeline demonstration stage.',
  },
  {
    id: 'sim-reset',
    category: 'SIMULATION',
    title: 'Reset Demo & Standby Telemetry',
    description: 'Clear all active alerts and restore radar to baseline surveillance',
    keywords: ['reset demo', 'clear alerts', 'stop demo', 'standby', 'reset system', 'restart'],
    action: 'DEMO_RESET',
    shortcut: 'R',
    aiResponse: 'SYSTEM RESET: Cleared simulated targets. All 5 edge nodes restored to standby surveillance.',
  },

  // Tactical AI Q&A Intelligence
  {
    id: 'ai-latency',
    category: 'AI_INTEL',
    title: 'Query: Inference Latency & FPS',
    description: 'Deep INT8 YOLOv8 benchmark on NVIDIA Jetson Orin NX',
    keywords: ['latency', 'fps', 'inference speed', 'how fast', 'performance benchmark', 'speed'],
    action: 'AI_ANSWER',
    aiResponse: 'INFERENCE METRICS: Trinetra executes INT8-quantized YOLOv8 on NVIDIA Jetson Orin NX at ~3.2ms per frame (30 FPS sustained) with <15W power draw.',
  },
  {
    id: 'ai-bandwidth',
    category: 'AI_INTEL',
    title: 'Query: Bandwidth & Data Consumption',
    description: 'Lightweight JSON metadata transmission over constrained tactical networks',
    keywords: ['bandwidth', 'data usage', 'payload size', 'network efficiency', 'kb per alert', 'data transfer'],
    action: 'AI_ANSWER',
    aiResponse: 'BANDWIDTH OPTIMIZATION: Raw video is never streamed across borders. Only cryptographically hashed event JSON (~4.8 KB/alert) is transmitted via tactical DMR/LoRa/MQTT.',
  },
  {
    id: 'ai-dpdpa',
    category: 'AI_INTEL',
    title: 'Query: Statutory DPDPA & Privacy Protection',
    description: 'Automated biometric face redaction at the edge source',
    keywords: ['privacy', 'dpdpa', 'face blur', 'redaction', 'compliance', 'biometrics', 'legal'],
    action: 'AI_ANSWER',
    aiResponse: 'PRIVACY BY DESIGN: Non-target civilian faces are automatically blurred at the edge camera source before evidence isolation, ensuring statutory DPDPA compliance.',
  },
  {
    id: 'ai-crypto',
    category: 'AI_INTEL',
    title: 'Query: Cryptographic Evidence Integrity',
    description: 'SHA-256 keyframe hashing chain of custody',
    keywords: ['sha-256', 'hash', 'cryptography', 'evidence integrity', 'chain of custody', 'tamper proof'],
    action: 'AI_ANSWER',
    aiResponse: 'EVIDENCE INTEGRITY: Every breach keyframe is hashed using SHA-256 directly on the ruggedized edge node, creating a tamper-proof forensic audit trail.',
  },
  {
    id: 'ai-status',
    category: 'AI_INTEL',
    title: 'Query: Complete Situational Status (SITREP)',
    description: 'Live briefing on border sector, online cameras, and armed virtual tripwires',
    keywords: ['status', 'sitrep', 'system status', 'health check', 'state', 'report'],
    action: 'AI_ANSWER',
    aiResponse: 'SITREP NORTHERN SECTOR 07: 5/5 Edge nodes online (Leh North Post). Virtual tripwire armed. Primary camera CAM-RGB-01 streaming. Crypto pipeline verified.',
  },
];

export class CommandPromptService {
  public searchCommands(query: string): CommandItem[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return SYSTEM_COMMANDS.slice(0, 8); // Return default popular actions
    }

    return SYSTEM_COMMANDS.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(cleanQuery);
      const matchDesc = cmd.description.toLowerCase().includes(cleanQuery);
      const matchKeywords = cmd.keywords.some((kw) => kw.toLowerCase().includes(cleanQuery) || cleanQuery.includes(kw.toLowerCase()));
      return matchTitle || matchDesc || matchKeywords;
    });
  }

  public parseNaturalPrompt(prompt: string): { matchedCommand: CommandItem | null; aiDirectAnswer?: string } {
    const clean = prompt.trim().toLowerCase();
    if (!clean) return { matchedCommand: null };

    // Check direct matching command
    const matched = SYSTEM_COMMANDS.find((cmd) => {
      return cmd.keywords.some((kw) => clean.includes(kw) || kw.includes(clean));
    });

    if (matched) {
      return {
        matchedCommand: matched,
        aiDirectAnswer: matched.aiResponse,
      };
    }

    // Default conversational AI fallback for tactical inquiries
    return {
      matchedCommand: null,
      aiDirectAnswer: `TRINETRA AI: Tactical intent for "${prompt}" parsed. Use "surveillance", "map", "simulate breach", or "status" to trigger direct subsystem actions.`,
    };
  }
}

export const commandService = new CommandPromptService();
