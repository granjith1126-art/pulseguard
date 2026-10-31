export interface ThingSpeakFieldMeta {
  field_key: string;
  label: string;
  metric: 'heart_rate' | 'temperature' | 'spo2' | 'ppg' | 'unknown';
  unit: string;
}

export interface ThingSpeakRecord {
  entry_id: number;
  timestamp_iso: string;
  time_label: string;
  datetime_label: string;
  heart_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  ppg_sample: number | null;
  raw_fields: Record<string, string | null>;
}

export interface ThingSpeakLatestReading {
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  timestamp_iso: string | null;
  time_label: string;
  datetime_label: string;
  entry_id: number | null;
}

export interface ThingSpeakResponse {
  success: boolean;
  status: 'connected' | 'error' | 'disconnected';
  channel_id: string;
  channel_name: string;
  records_count: number;
  first_timestamp: string | null;
  latest_timestamp: string | null;
  detected_fields: Record<string, ThingSpeakFieldMeta>;
  has_ppg_data: boolean;
  latest_reading: ThingSpeakLatestReading | null;
  records: ThingSpeakRecord[];
  error_type?: string;
  message?: string;
}

export async function fetchThingSpeakData(limit?: number): Promise<ThingSpeakResponse> {
  const query = limit ? `?limit=${limit}` : '';
  const endpoints = [
    `/api/thingspeak/data${query}`,
    `http://127.0.0.1:8000/api/thingspeak/data${query}`,
    `http://localhost:8000/api/thingspeak/data${query}`,
  ];

  let lastError: Error | null = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data: ThingSpeakResponse = await response.json();
      return data;
    } catch (err: any) {
      lastError = err;
    }
  }

  // If all failed, return structured network error
  return {
    success: false,
    status: 'error',
    channel_id: '3110138',
    channel_name: 'Unknown',
    records_count: 0,
    first_timestamp: null,
    latest_timestamp: null,
    detected_fields: {},
    has_ppg_data: false,
    latest_reading: null,
    records: [],
    error_type: 'NETWORK_FAILURE',
    message: lastError ? `Could not connect to FastAPI backend: ${lastError.message}` : 'Network failure',
  };
}

export interface ThingSpeakLatestResponse {
  success: boolean;
  channel_id: string;
  entry: ThingSpeakRecord | null;
  status?: string;
  message?: string;
}

export async function fetchLatestThingSpeakEntry(): Promise<ThingSpeakLatestResponse> {
  const endpoints = [
    '/api/thingspeak/latest',
    'http://127.0.0.1:8000/api/thingspeak/latest',
    'http://localhost:8000/api/thingspeak/latest',
  ];

  let lastError: Error | null = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data: ThingSpeakLatestResponse = await response.json();
      return data;
    } catch (err: any) {
      lastError = err;
    }
  }

  return {
    success: false,
    channel_id: '3110138',
    entry: null,
    status: 'error',
    message: lastError ? lastError.message : 'Network error',
  };
}
