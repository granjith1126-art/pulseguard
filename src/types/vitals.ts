export type VitalStatus = 'STABLE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export type TimeRange = '1H' | '6H' | '12H' | '24H' | '7D';

export interface VitalSnapshot {
  timestamp: string;
  timeString: string;
  heartRate: number; // BPM
  spo2: number; // %
  temperature: number; // °C
  respirationRate?: number; // Breaths/min
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  perfusionIndex: number; // % (MAX30102)
  signalQuality: number; // %
  batteryLevel: number; // %
}

export interface PPGPoint {
  time: number; // relative time / index
  timeLabel: string;
  value: number; // normalized voltage / optical signal -3.0 to +3.0
  isSystolicPeak?: boolean;
}

export interface DeviceTelemetry {
  deviceId: string;
  status: 'Online' | 'Offline' | 'Poor Signal' | 'Error';
  batteryPercent: number;
  signalStrengthPercent: number;
  rssiDbm: number;
  lastSync: string;
  uptime: string;
  firmwareVersion: string;
  packetsReceived: number;
  packetLossRate: number; // e.g. 0.02%
  sensorModel: string; // "MAX30102 Optical + Medical NTC"
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  patientName: string;
  room: string;
  parameter: 'Heart Rate' | 'SpO2' | 'Temperature' | 'Device' | 'Battery';
  title: string;
  message: string;
  value: string;
  severity: 'CRITICAL' | 'WARNING' | 'RESOLVED';
  timestamp: string;
  timeAgo: string;
  acknowledged: boolean;
}

export interface MedicalEvent {
  id: string;
  timestamp: string;
  timeString: string;
  patientId: string;
  patientName: string;
  type: 'VITAL_READING' | 'ALERT_TRIGGERED' | 'DEVICE_CONNECTED' | 'STATUS_CHANGE';
  description: string;
  severity?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'INFO';
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorName: string;
  timestamp: string;
  title: string;
  content: string;
  category: 'Observation' | 'Prescription' | 'Follow-up' | 'Emergency';
}

export interface EmergencyInformation {
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
}

export interface Patient {
  id: string; // e.g. 'P-001'
  name: string;
  email?: string;
  room: string; // e.g. 'Room 204'
  ward: string; // e.g. 'Cardiology ICU'
  deviceId: string; // e.g. 'PG-001-204'
  status: VitalStatus;
  assignedDoctor: string;
  doctorTitle: string;
  admissionDate: string;
  emergencyInfo: EmergencyInformation;
  vitals: VitalSnapshot;
  sparklineHR: number[];
  sparklineSpO2: number[];
  sparklineTemp: number[];
  deviceStatus: DeviceTelemetry;
  lastUpdatedSecondsAgo: number;
  alertsCount: number;
}
