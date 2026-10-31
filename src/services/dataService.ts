import type { Patient, ClinicalAlert, MedicalEvent, ClinicalNote, TimeRange } from '../types/vitals';
import { INITIAL_PATIENTS, INITIAL_ALERTS, INITIAL_EVENTS, INITIAL_CLINICAL_NOTES } from '../data/mockDatabase';
import { fetchThingSpeakData } from './thingspeakService';
import {
  getPatientHistoricalSessions,
  getHistoricalSession,
  getSessionByDateAndType,
  type HistoricalSession,
} from '../data/historicalSessionsData';

export interface HistoricalVitalPoint {
  timestamp: string;
  timeLabel: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  respirationRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  entry_id?: number;
}

export interface VitalSummaryStats {
  parameter: string;
  current: number;
  average: number;
  min: number;
  max: number;
  unit: string;
  status: 'STABLE' | 'WARNING' | 'CRITICAL';
}

export interface IDataService {
  getPatients(): Promise<Patient[]>;
  getPatientById(id: string): Promise<Patient | undefined>;
  getAlerts(): Promise<ClinicalAlert[]>;
  getEvents(): Promise<MedicalEvent[]>;
  getClinicalNotes(patientId: string): Promise<ClinicalNote[]>;
  addClinicalNote(note: Omit<ClinicalNote, 'id' | 'timestamp'>): Promise<ClinicalNote>;
  acknowledgeAlert(alertId: string): Promise<void>;
  updatePatientFromThingSpeak(
    patientId: string,
    vitals: {
      heartRate: number;
      spo2: number;
      temperature: number;
      timestamp: string;
      timeString: string;
      isOnline: boolean;
      status: 'STABLE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
      sparklineHR?: number[];
      sparklineSpO2?: number[];
      sparklineTemp?: number[];
    }
  ): void;
  getPatientHistory(patientId: string, range: TimeRange): Promise<{
    points: HistoricalVitalPoint[];
    hrStats: VitalSummaryStats;
    spo2Stats: VitalSummaryStats;
    tempStats: VitalSummaryStats;
  }>;
  getPatientSessions(patientId: string): Promise<HistoricalSession[]>;
  getSessionDetail(patientId: string, sessionId: string): Promise<HistoricalSession | undefined>;
  getSessionByDateAndType(patientId: string, date: string, sessionType: 'Morning' | 'Evening'): Promise<HistoricalSession | undefined>;
}

class TelemetryDataService implements IDataService {
  private patients: Patient[] = [...INITIAL_PATIENTS];
  private alerts: ClinicalAlert[] = [...INITIAL_ALERTS];
  private events: MedicalEvent[] = [...INITIAL_EVENTS];
  private notes: ClinicalNote[] = [...INITIAL_CLINICAL_NOTES];
  private subscribers: Set<(patients: Patient[]) => void> = new Set();

  constructor() {
    // Zero artificial simulated wander. Patient vitals driven strictly by genuine telemetry.
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => cb([...this.patients]));
  }

  public subscribeToPatients(callback: (patients: Patient[]) => void): () => void {
    this.subscribers.add(callback);
    callback([...this.patients]);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public async getPatients(): Promise<Patient[]> {
    return [...this.patients];
  }

  public async getPatientById(id: string): Promise<Patient | undefined> {
    return this.patients.find((p) => p.id === id);
  }

  public async getAlerts(): Promise<ClinicalAlert[]> {
    return [...this.alerts];
  }

  public async getEvents(): Promise<MedicalEvent[]> {
    return [...this.events];
  }

  public async getClinicalNotes(patientId: string): Promise<ClinicalNote[]> {
    return this.notes.filter((n) => n.patientId === patientId);
  }

  public async addClinicalNote(noteData: Omit<ClinicalNote, 'id' | 'timestamp'>): Promise<ClinicalNote> {
    const newNote: ClinicalNote = {
      ...noteData,
      id: `NOTE-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString(),
    };
    this.notes.unshift(newNote);
    return newNote;
  }

  public async acknowledgeAlert(alertId: string): Promise<void> {
    this.alerts = this.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a));
  }

  /**
   * Synchronize patient data with genuine telemetry received from ThingSpeak
   */
  public updatePatientFromThingSpeak(
    patientId: string,
    data: {
      heartRate: number;
      spo2: number;
      temperature: number;
      timestamp: string;
      timeString: string;
      isOnline: boolean;
      status: 'STABLE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
      sparklineHR?: number[];
      sparklineSpO2?: number[];
      sparklineTemp?: number[];
    }
  ): void {
    this.patients = this.patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          status: data.status,
          lastUpdatedSecondsAgo: data.isOnline ? 0 : 30,
          vitals: {
            ...p.vitals,
            heartRate: data.heartRate,
            spo2: data.spo2,
            temperature: data.temperature,
            timestamp: data.timestamp,
            timeString: data.timeString,
            signalQuality: data.isOnline ? 96 : 0,
          },
          deviceStatus: {
            ...p.deviceStatus,
            status: data.isOnline ? 'Online' : 'Offline',
            lastSync: data.isOnline ? 'Live Active' : 'Disconnected',
          },
          sparklineHR: data.sparklineHR || p.sparklineHR,
          sparklineSpO2: data.sparklineSpO2 || p.sparklineSpO2,
          sparklineTemp: data.sparklineTemp || p.sparklineTemp,
        };
      }
      return p;
    });

    this.notifySubscribers();
  }

  public async getPatientSessions(patientId: string): Promise<HistoricalSession[]> {
    return getPatientHistoricalSessions(patientId);
  }

  public async getSessionDetail(patientId: string, sessionId: string): Promise<HistoricalSession | undefined> {
    return getHistoricalSession(patientId, sessionId);
  }

  public async getSessionByDateAndType(
    patientId: string,
    date: string,
    sessionType: 'Morning' | 'Evening'
  ): Promise<HistoricalSession | undefined> {
    return getSessionByDateAndType(patientId, date, sessionType);
  }

  /**
   * Retrieves genuine historical telemetry points from ThingSpeak (for P-001)
   * or the complete historical session repository (for P-101, P-102, P-103, P-104).
   */
  public async getPatientHistory(patientId: string, range: TimeRange): Promise<{
    points: HistoricalVitalPoint[];
    hrStats: VitalSummaryStats;
    spo2Stats: VitalSummaryStats;
    tempStats: VitalSummaryStats;
  }> {
    const patient = this.patients.find((p) => p.id === patientId) || this.patients[0];

    // Check if patient has mock historical sessions (P-101 to P-104)
    const mockSessions = getPatientHistoricalSessions(patientId);
    if (mockSessions && mockSessions.length > 0) {
      // Pick the latest completed session by default (or sample across sessions if wide range)
      const targetSession = mockSessions[mockSessions.length - 1];
      const readings = targetSession.readings || [];
      
      const points: HistoricalVitalPoint[] = readings.map((r) => ({
        timestamp: r.timestamp,
        timeLabel: r.timeLabel,
        heartRate: r.heartRate,
        spo2: r.spo2,
        temperature: r.temperature,
        respirationRate: r.respirationRate,
        bloodPressureSystolic: r.bloodPressureSystolic,
        bloodPressureDiastolic: r.bloodPressureDiastolic,
      }));

      const hrStats: VitalSummaryStats = {
        parameter: 'HR',
        current: targetSession.stats.heartRate.avg,
        average: targetSession.stats.heartRate.avg,
        min: targetSession.stats.heartRate.min,
        max: targetSession.stats.heartRate.max,
        unit: 'BPM',
        status: targetSession.hasAbnormalEvent ? 'WARNING' : 'STABLE',
      };

      const spo2Stats: VitalSummaryStats = {
        parameter: 'SpO2',
        current: targetSession.stats.spo2.avg,
        average: targetSession.stats.spo2.avg,
        min: targetSession.stats.spo2.min,
        max: targetSession.stats.spo2.max,
        unit: '%',
        status: targetSession.stats.spo2.min < 94 ? 'WARNING' : 'STABLE',
      };

      const tempStats: VitalSummaryStats = {
        parameter: 'Temp',
        current: targetSession.stats.temperature.avg,
        average: targetSession.stats.temperature.avg,
        min: targetSession.stats.temperature.min,
        max: targetSession.stats.temperature.max,
        unit: '°C',
        status: targetSession.stats.temperature.max > 37.8 ? 'WARNING' : 'STABLE',
      };

      return { points, hrStats, spo2Stats, tempStats };
    }

    try {
      // Determine how many records to fetch based on range
      let limit = 120;
      if (range === '1H') limit = 30;
      else if (range === '24H') limit = 80;
      else if (range === '7D') limit = 120;

      const tsData = await fetchThingSpeakData(limit);

      if (tsData.success && tsData.records && tsData.records.length > 0) {
        const points: HistoricalVitalPoint[] = tsData.records.map((r) => ({
          timestamp: r.timestamp_iso,
          timeLabel: r.time_label,
          heartRate: r.heart_rate ?? 0,
          spo2: r.spo2 ?? 0,
          temperature: r.temperature ?? 0,
          entry_id: r.entry_id,
        }));

        // Compute genuine statistical metrics
        const validHR = points.map((p) => p.heartRate).filter((v) => v > 0);
        const validSpO2 = points.map((p) => p.spo2).filter((v) => v > 0);
        const validTemp = points.map((p) => p.temperature).filter((v) => v > 0);

        const calcStats = (vals: number[], curr: number, unit: string, param: string): VitalSummaryStats => {
          if (vals.length === 0) {
            return { parameter: param, current: curr, average: 0, min: 0, max: 0, unit, status: 'STABLE' };
          }
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
          let status: 'STABLE' | 'WARNING' | 'CRITICAL' = 'STABLE';
          if (param === 'HR' && (curr > 130 || (curr > 0 && curr < 45))) status = 'CRITICAL';
          else if (param === 'HR' && (curr > 100 || (curr > 0 && curr < 55))) status = 'WARNING';
          if (param === 'SpO2' && curr > 0 && curr < 90) status = 'CRITICAL';
          else if (param === 'SpO2' && curr > 0 && curr < 94) status = 'WARNING';
          if (param === 'Temp' && curr > 38.5) status = 'CRITICAL';
          else if (param === 'Temp' && curr > 37.5) status = 'WARNING';
          return { parameter: param, current: curr, average: avg, min, max, unit, status };
        };

        return {
          points,
          hrStats: calcStats(validHR, patient.vitals.heartRate, 'BPM', 'HR'),
          spo2Stats: calcStats(validSpO2, patient.vitals.spo2, '%', 'SpO2'),
          tempStats: calcStats(validTemp, patient.vitals.temperature, '°C', 'Temp'),
        };
      }
    } catch (err) {
      console.warn('Failed to fetch actual ThingSpeak history, returning empty history:', err);
    }

    // Honest empty-data state when genuine records unavailable - no fabricated values
    return {
      points: [],
      hrStats: { parameter: 'HR', current: 0, average: 0, min: 0, max: 0, unit: 'BPM', status: 'STABLE' },
      spo2Stats: { parameter: 'SpO2', current: 0, average: 0, min: 0, max: 0, unit: '%', status: 'STABLE' },
      tempStats: { parameter: 'Temp', current: 0, average: 0, min: 0, max: 0, unit: '°C', status: 'STABLE' },
    };
  }
}

export const dataService = new TelemetryDataService();
