import { MOCK_USER, MOCK_CAMERAS, MOCK_ALERTS } from '../mocks/mockData';

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
  isLearned?: boolean;
}

export interface LearnedMemory {
  aliases: { [phrase: string]: string }; // phrase -> commandId
  usageFrequency: { [commandId: string]: number }; // commandId -> count
  totalInteractions: number;
  lastLearnedAt: string | null;
}

const STORAGE_KEY = 'trinetra_ai_learned_memory_v1';

export const SYSTEM_COMMANDS: CommandItem[] = [
  // Navigation
  {
    id: 'nav-surveillance',
    category: 'NAVIGATION',
    title: 'Open Live Surveillance',
    description: 'Switch to live RGB & thermal vision feeds with YOLOv8 detection overlay',
    keywords: ['surveillance', 'camera', 'cameras', 'live feed', 'video', 'rgb', 'thermal', 'cctv', 'stream', 'cams'],
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
  private memory: LearnedMemory;

  constructor() {
    this.memory = this.loadMemory();
  }

  private loadMemory(): LearnedMemory {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to load learned AI memory from localStorage', e);
      }
    }
    return {
      aliases: {},
      usageFrequency: {},
      totalInteractions: 0,
      lastLearnedAt: null,
    };
  }

  private saveMemory(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
      } catch (e) {
        console.warn('Failed to save learned AI memory to localStorage', e);
      }
    }
  }

  public getMemoryStats(): LearnedMemory {
    return { ...this.memory };
  }

  public clearMemory(): void {
    this.memory = {
      aliases: {},
      usageFrequency: {},
      totalInteractions: 0,
      lastLearnedAt: null,
    };
    this.saveMemory();
  }

  // Learn a new custom phrase mapping explicitly or via auto-binding
  public learnAlias(phrase: string, commandId: string): boolean {
    const cleanPhrase = phrase.trim().toLowerCase();
    const targetCommand = SYSTEM_COMMANDS.find((c) => c.id === commandId);
    if (!cleanPhrase || !targetCommand) return false;

    this.memory.aliases[cleanPhrase] = commandId;
    this.memory.lastLearnedAt = new Date().toISOString();
    this.saveMemory();
    return true;
  }

  // Track command execution to boost ranking and learn from user query
  public recordCommandExecution(commandId: string, userQuery?: string): void {
    this.memory.totalInteractions += 1;
    this.memory.usageFrequency[commandId] = (this.memory.usageFrequency[commandId] || 0) + 1;

    // Auto-learn association if the query was unique and not already a standard keyword
    if (userQuery) {
      const clean = userQuery.trim().toLowerCase();
      if (clean.length > 1 && !clean.includes('learn') && !clean.includes('teach')) {
        const standardCommand = SYSTEM_COMMANDS.find((c) => c.id === commandId);
        if (standardCommand && !standardCommand.keywords.includes(clean)) {
          this.memory.aliases[clean] = commandId;
          this.memory.lastLearnedAt = new Date().toISOString();
        }
      }
    }

    this.saveMemory();
  }

  // Parse explicit teaching syntax e.g. 'learn "cams" = "surveillance"' or 'teach "red alert" = "simulate breach"'
  public parseTeachingCommand(input: string): { success: boolean; message: string } | null {
    const clean = input.trim().toLowerCase();
    const teachPattern = /^(?:learn|teach)\s+["']?([^"']+)["']?\s*=\s*["']?([^"']+)["']?$/i;
    const match = clean.match(teachPattern);

    if (!match) return null;

    const alias = match[1].trim().toLowerCase();
    const targetQuery = match[2].trim().toLowerCase();

    // Find target command matching targetQuery
    const matchedCommand = SYSTEM_COMMANDS.find((c) =>
      c.title.toLowerCase().includes(targetQuery) ||
      c.keywords.some((k) => k.toLowerCase() === targetQuery || targetQuery.includes(k.toLowerCase()))
    );

    if (matchedCommand) {
      this.learnAlias(alias, matchedCommand.id);
      return {
        success: true,
        message: `LEARNING SUCCESSFUL: Registered alias "${alias}" -> [${matchedCommand.title}]. The AI will now trigger this command when you type "${alias}".`,
      };
    } else {
      return {
        success: false,
        message: `LEARNING ERROR: Target command "${targetQuery}" not found. Try mapping to "surveillance", "map", "alerts", or "simulate breach".`,
      };
    }
  }

  public searchCommands(query: string): CommandItem[] {
    const cleanQuery = query.trim().toLowerCase();

    // Check if query matches any learned alias
    const learnedCommandId = this.memory.aliases[cleanQuery];

    // Build list of commands with frequency & learned weights
    let commands = SYSTEM_COMMANDS.map((cmd) => {
      const freq = this.memory.usageFrequency[cmd.id] || 0;
      const isLearnedMatch = cmd.id === learnedCommandId;
      return {
        ...cmd,
        isLearned: isLearnedMatch,
        _weight: freq + (isLearnedMatch ? 50 : 0),
      };
    });

    if (cleanQuery) {
      commands = commands.filter((cmd) => {
        if (cmd.isLearned) return true;
        const matchTitle = cmd.title.toLowerCase().includes(cleanQuery);
        const matchDesc = cmd.description.toLowerCase().includes(cleanQuery);
        const matchKeywords = cmd.keywords.some((kw) => kw.toLowerCase().includes(cleanQuery) || cleanQuery.includes(kw.toLowerCase()));
        return matchTitle || matchDesc || matchKeywords;
      });
    }

    // Sort by learned weight & frequency
    commands.sort((a, b) => b._weight - a._weight);

    return commands;
  }

  // Dynamic Context-Aware Reply Generator
  public generateDynamicAiReply(prompt: string): string {
    const clean = prompt.trim().toLowerCase();

    // 1. Who is operator / User info
    if (clean.includes('who') && (clean.includes('user') || clean.includes('operator') || clean.includes('aryan') || clean.includes('logged'))) {
      return `OPERATOR PROFILE: ${MOCK_USER.name} (${MOCK_USER.callsign}) · Unit: ${MOCK_USER.unit} · Clearance: ${MOCK_USER.securityClearance} · Sector: ${MOCK_USER.sector}.`;
    }

    // 2. Camera status inquiry
    if (clean.includes('camera') || clean.includes('sensor status') || clean.includes('cctv')) {
      const activeCount = MOCK_CAMERAS.filter((c) => c.status === 'ONLINE').length;
      return `SENSOR TELEMETRY: ${activeCount}/${MOCK_CAMERAS.length} cameras active. Primary: CAM-RGB-01 (1080p @ 30 FPS, Latency: 3.2ms). Thermal: CAM-LWIR-01 (640x512 Uncooled FLIR, Standby).`;
    }

    // 3. Alerts & Threat counts
    if (clean.includes('how many') && (clean.includes('threat') || clean.includes('alert') || clean.includes('incident'))) {
      return `TACTICAL INCIDENT COUNT: ${MOCK_ALERTS.length} total incident logs in current 24-hour cycle. 1 HIGH priority perimeter intrusion (ALT-7821) in Zone Alpha.`;
    }

    // 4. Identity & System capabilities
    if (clean.includes('who are you') || clean.includes('what are you') || clean.includes('what can you do')) {
      return `SYSTEM IDENTIFICATION: I am TRINETRA TACTICAL AI (v2.4-CORE). I manage real-time edge INT8 YOLOv8 inference, spatial virtual tripwires, SHA-256 evidence integrity, and self-learning tactical command routing. You can type commands or ask any border telemetry question.`;
    }

    // 5. Greeting
    if (clean.startsWith('hi') || clean.startsWith('hello') || clean.startsWith('hey')) {
      return `GREETINGS OPERATOR: Tactical AI Console online and monitoring Sector 07. Type a command (e.g. 'surveillance', 'map', 'simulate breach') or teach a custom alias using: learn "alias" = "command".`;
    }

    // Default conversational AI fallback
    return `TRINETRA AI: Tactical query "${prompt}" analyzed against Northern Sector 07 edge telemetry. All subsystems nominal. You can execute navigation, simulate events, or teach custom aliases using: learn "your phrase" = "action".`;
  }

  public parseNaturalPrompt(prompt: string): { matchedCommand: CommandItem | null; aiDirectAnswer?: string } {
    const clean = prompt.trim().toLowerCase();
    if (!clean) return { matchedCommand: null };

    // 1. Check explicit teaching command
    const teachResult = this.parseTeachingCommand(prompt);
    if (teachResult) {
      return {
        matchedCommand: null,
        aiDirectAnswer: teachResult.message,
      };
    }

    // 2. Check learned alias memory first
    const learnedCommandId = this.memory.aliases[clean];
    if (learnedCommandId) {
      const cmd = SYSTEM_COMMANDS.find((c) => c.id === learnedCommandId);
      if (cmd) {
        this.recordCommandExecution(cmd.id, prompt);
        return {
          matchedCommand: { ...cmd, isLearned: true },
          aiDirectAnswer: `[LEARNED ACTION]: Executing ${cmd.title} (Mapped to "${prompt}").`,
        };
      }
    }

    // 3. Check direct keyword match
    const matched = SYSTEM_COMMANDS.find((cmd) => {
      return cmd.keywords.some((kw) => clean.includes(kw) || kw.includes(clean));
    });

    if (matched) {
      this.recordCommandExecution(matched.id, prompt);
      return {
        matchedCommand: matched,
        aiDirectAnswer: matched.aiResponse,
      };
    }

    // 4. Generate dynamic context-aware answer
    const dynamicReply = this.generateDynamicAiReply(prompt);
    return {
      matchedCommand: null,
      aiDirectAnswer: dynamicReply,
    };
  }
}

export const commandService = new CommandPromptService();
