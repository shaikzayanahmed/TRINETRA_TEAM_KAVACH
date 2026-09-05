export type WebSocketEventType =
  | 'target_detected'
  | 'target_updated'
  | 'alert_created'
  | 'alert_updated'
  | 'evidence_captured'
  | 'camera_status_changed'
  | 'edge_status_changed'
  | 'heartbeat';

export interface WebSocketMessage<T = unknown> {
  event: WebSocketEventType;
  payload: T;
  timestamp: string;
}

type EventCallback<T = unknown> = (data: T) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<WebSocketEventType, Set<EventCallback>> = new Map();
  private wsUrl: string;
  private isConnected: boolean = false;

  constructor() {
    this.wsUrl = import.meta.env?.VITE_WS_URL || 'ws://localhost:8000/ws/telemetry';
  }

  connect(): void {
    try {
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        return;
      }

      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.emit(message.event, message.payload);
        } catch {
          // ignore non-json messages
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  subscribe<T = unknown>(event: WebSocketEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback as EventCallback);

    return () => {
      set.delete(callback as EventCallback);
    };
  }

  emit<T = unknown>(event: WebSocketEventType, payload: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in WebSocket subscriber for event ${event}:`, e);
        }
      });
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();
