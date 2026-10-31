export interface TelemetryVitals {
  heart_rate: number;
  spo2: number;
  temperature: number;
  respiration_rate: number;
  perfusion_index: number;
  signal_quality: number;
}

export interface TelemetryPPG {
  raw_samples: number[];
  processed_samples: number[];
  sample_rate_hz: number;
  chunk_size: number;
  is_live_sensor?: boolean;
  sensor_source?: string;
  finger_detected?: boolean;
  sensor_model?: string;
  label?: string;
}

export interface TelemetryMessage {
  type: 'vital_update';
  patient_id: string;
  timestamp: string;
  scenario: 'NORMAL' | 'WARNING' | 'CRITICAL';
  status: 'STABLE' | 'WARNING' | 'CRITICAL';
  vitals: TelemetryVitals;
  ppg: TelemetryPPG;
  engine: {
    matlab_connected: boolean;
    generator_source: string;
    processor_source: string;
  };
}

export type ConnectionState = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'FALLBACK';

type TelemetryListener = (msg: TelemetryMessage) => void;
type StatusListener = (status: ConnectionState, matlabConnected: boolean) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private currentPatientId: string = 'P-001';
  private reconnectTimer: number | null = null;
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private connectionState: ConnectionState = 'DISCONNECTED';
  private isMatlabConnected: boolean = false;
  private isExplicitlyClosed: boolean = false;

  public connect(patientId: string = 'P-001') {
    this.currentPatientId = patientId;
    this.isExplicitlyClosed = false;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.currentPatientId === patientId) return;
      this.socket.close();
    }

    const wsUrl = `ws://localhost:8000/ws/monitoring/${patientId}`;
    this.setConnectionState('CONNECTING', this.isMatlabConnected);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setConnectionState('CONNECTED', this.isMatlabConnected);
        if (this.reconnectTimer) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: TelemetryMessage = JSON.parse(event.data);
          if (data.type === 'vital_update') {
            this.isMatlabConnected = data.engine?.matlab_connected || false;
            this.setConnectionState('CONNECTED', this.isMatlabConnected);
            this.telemetryListeners.forEach((cb) => cb(data));
          }
        } catch {}
      };

      this.socket.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.setConnectionState('DISCONNECTED', false);
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.setConnectionState('DISCONNECTED', false);
      };
    } catch {
      this.setConnectionState('DISCONNECTED', false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.currentPatientId);
    }, 2500);
  }

  public setScenario(scenario: 'NORMAL' | 'WARNING' | 'CRITICAL') {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'set_scenario', scenario }));
    }

    // Also send HTTP POST for reliability
    fetch('http://localhost:8000/api/monitoring/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: this.currentPatientId, scenario }),
    }).catch(() => {});
  }

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionState, this.isMatlabConnected);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setConnectionState(state: ConnectionState, matlab: boolean) {
    this.connectionState = state;
    this.isMatlabConnected = matlab;
    this.statusListeners.forEach((cb) => cb(state, matlab));
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setConnectionState('DISCONNECTED', false);
  }
}

export const wsService = new WebSocketService();
