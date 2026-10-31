import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Patient, ClinicalAlert, MedicalEvent, VitalStatus } from '../types/vitals';
import { INITIAL_PATIENTS, INITIAL_ALERTS, INITIAL_EVENTS } from '../data/mockDatabase';
import { dataService } from '../services/dataService';
import { soundService } from '../services/soundService';
import { wsService } from '../services/websocketService';
import { fetchLatestThingSpeakEntry, type ThingSpeakLatestReading } from '../services/thingspeakService';
import { LIVE_MONITORING_CONFIG } from '../config/monitoringConfig';
import type { ConnectionState, TelemetryMessage } from '../services/websocketService';

export type DemoScenario = 'NORMAL' | 'WARNING' | 'CRITICAL';

interface VitalsContextType {
  patients: Patient[];
  selectedPatientId: string;
  selectedPatient: Patient | null;
  alerts: ClinicalAlert[];
  events: MedicalEvent[];
  totalPatientsCount: number;
  onlinePatientsCount: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  onlineDevicesCount: number;
  isSoundEnabled: boolean;
  isSearchOpen: boolean;
  isNotificationOpen: boolean;
  wsConnectionState: ConnectionState;
  isMatlabEngineActive: boolean;
  activeScenario: DemoScenario;
  isDeviceOnline: boolean;
  latestReading: ThingSpeakLatestReading | null;
  secondsSinceLastReading: number;
  setSelectedPatientId: (id: string) => void;
  setScenario: (scenario: DemoScenario) => void;
  toggleSound: () => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsNotificationOpen: (open: boolean) => void;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  refreshData: () => void;
}

const VitalsContext = createContext<VitalsContextType | undefined>(undefined);

export const VitalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('P-001');
  const [alerts, setAlerts] = useState<ClinicalAlert[]>(INITIAL_ALERTS);
  const [events, setEvents] = useState<MedicalEvent[]>(INITIAL_EVENTS);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [wsConnectionState, setWsConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [isMatlabEngineActive, setIsMatlabEngineActive] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario>('NORMAL');

  // ThingSpeak Global Telemetry State
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [latestReading, setLatestReading] = useState<ThingSpeakLatestReading | null>(null);
  const [secondsSinceLastReading, setSecondsSinceLastReading] = useState<number>(0);

  const lastEntryIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<string | null>(null);

  // Centralized ThingSpeak live polling loop
  useEffect(() => {
    const pollThingSpeak = async () => {
      try {
        const res = await fetchLatestThingSpeakEntry();
        if (res.success && res.entry) {
          const entry = res.entry;
          const ts = new Date(entry.timestamp_iso).getTime();
          const now = Date.now();
          const ageMs = !isNaN(ts) ? Math.max(0, now - ts) : 999999;
          const ageSec = Math.floor(ageMs / 1000);
          setSecondsSinceLastReading(ageSec);

          const isOnline = ageMs < LIVE_MONITORING_CONFIG.DEVICE_TIMEOUT_MS;
          setIsDeviceOnline(isOnline);
          lastTimestampRef.current = entry.timestamp_iso;

          const newReading: ThingSpeakLatestReading = {
            heart_rate: entry.heart_rate,
            spo2: entry.spo2,
            temperature: entry.temperature,
            timestamp_iso: entry.timestamp_iso,
            time_label: entry.time_label,
            datetime_label: entry.datetime_label,
            entry_id: entry.entry_id,
          };
          setLatestReading(newReading);

          // Calculate clinical status
          let status: VitalStatus = 'OFFLINE';
          const hr = entry.heart_rate ?? 0;
          const spo2 = entry.spo2 ?? 0;
          const temp = entry.temperature ?? 0;

          if (isOnline) {
            if (hr === 0 && spo2 === 0) {
              status = 'WARNING';
            } else if (hr > 130 || (spo2 > 0 && spo2 < 88) || temp > 38.5) {
              status = 'CRITICAL';
            } else if (hr > 100 || (spo2 > 0 && spo2 < 93) || temp > 37.5) {
              status = 'WARNING';
            } else {
              status = 'STABLE';
            }
          } else {
            status = 'OFFLINE';
          }

          // Update patient in state
          setPatients((prevList) =>
            prevList.map((p) => {
              if (p.id === 'P-001') {
                const prevHR = p.sparklineHR || [];
                const prevSpO2 = p.sparklineSpO2 || [];
                const prevTemp = p.sparklineTemp || [];

                const newHR = isOnline && hr > 0 ? [...prevHR.slice(-19), hr] : prevHR;
                const newSpO2 = isOnline && spo2 > 0 ? [...prevSpO2.slice(-19), spo2] : prevSpO2;
                const newTemp = isOnline && temp > 0 ? [...prevTemp.slice(-19), temp] : prevTemp;

                return {
                  ...p,
                  status,
                  lastUpdatedSecondsAgo: ageSec,
                  vitals: {
                    ...p.vitals,
                    heartRate: hr,
                    spo2,
                    temperature: temp,
                    timestamp: entry.timestamp_iso,
                    timeString: entry.time_label,
                    signalQuality: isOnline ? 96 : 0,
                  },
                  sparklineHR: newHR,
                  sparklineSpO2: newSpO2,
                  sparklineTemp: newTemp,
                  deviceStatus: {
                    ...p.deviceStatus,
                    status: isOnline ? 'Online' : 'Offline',
                    lastSync: isOnline ? `${entry.time_label} (Live)` : `Offline (${ageSec}s ago)`,
                  },
                };
              }
              return p;
            })
          );

          // Sync to data service
          dataService.updatePatientFromThingSpeak('P-001', {
            heartRate: hr,
            spo2,
            temperature: temp,
            timestamp: entry.timestamp_iso,
            timeString: entry.time_label,
            isOnline,
            status,
          });

          // Check if genuinely new reading for entry_id tracking
          if (lastEntryIdRef.current !== entry.entry_id) {
            lastEntryIdRef.current = entry.entry_id;
          }
        }
      } catch (err) {
        // Fallback gracefully on network timeout
      }
    };

    pollThingSpeak();
    const interval = setInterval(pollThingSpeak, LIVE_MONITORING_CONFIG.LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Second-by-second age ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      if (lastTimestampRef.current) {
        const ts = new Date(lastTimestampRef.current).getTime();
        if (!isNaN(ts)) {
          const ageMs = Math.max(0, Date.now() - ts);
          const ageSec = Math.floor(ageMs / 1000);
          setSecondsSinceLastReading(ageSec);
          if (ageMs >= LIVE_MONITORING_CONFIG.DEVICE_TIMEOUT_MS) {
            setIsDeviceOnline(false);
          }
        }
      }
    }, LIVE_MONITORING_CONFIG.AGE_TICK_INTERVAL_MS);

    return () => clearInterval(ticker);
  }, []);

  // Connect WebSocket when selected patient changes
  useEffect(() => {
    wsService.connect(selectedPatientId);

    const unsubStatus = wsService.subscribeStatus((state, matlabActive) => {
      setWsConnectionState(state);
      setIsMatlabEngineActive(matlabActive);
    });

    const unsubTelemetry = wsService.subscribeTelemetry((msg: TelemetryMessage) => {
      if (msg.patient_id === selectedPatientId) {
        setActiveScenario(msg.scenario);
      }
    });

    return () => {
      unsubStatus();
      unsubTelemetry();
    };
  }, [selectedPatientId]);

  // Initial fetch of alerts & events from data service
  useEffect(() => {
    dataService.getAlerts().then(setAlerts);
    dataService.getEvents().then(setEvents);

    const unsubscribe = dataService.subscribeToPatients((updatedPatients) => {
      if (updatedPatients.length > 0) {
        setPatients(updatedPatients);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const setScenario = useCallback((scenario: DemoScenario) => {
    setActiveScenario(scenario);
    wsService.setScenario(scenario);
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || INITIAL_PATIENTS[0];

  const totalPatientsCount = patients.length;
  const onlinePatientsCount = patients.filter((p) => p.status !== 'OFFLINE').length;
  const activeAlerts = alerts.filter((a) => !a.acknowledged && a.severity !== 'RESOLVED');
  const activeAlertsCount = activeAlerts.length;
  const criticalAlertsCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;
  const onlineDevicesCount = patients.filter((p) => p.deviceStatus.status === 'Online').length;

  const toggleSound = () => {
    const newState = soundService.toggleMute();
    setIsSoundEnabled(newState);
  };

  const acknowledgeAlert = async (alertId: string) => {
    await dataService.acknowledgeAlert(alertId);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)));
  };

  const refreshData = () => {
    dataService.getAlerts().then(setAlerts);
    dataService.getEvents().then(setEvents);
  };

  return (
    <VitalsContext.Provider
      value={{
        patients,
        selectedPatientId,
        selectedPatient,
        alerts,
        events,
        totalPatientsCount,
        onlinePatientsCount,
        activeAlertsCount,
        criticalAlertsCount,
        onlineDevicesCount,
        isSoundEnabled,
        isSearchOpen,
        isNotificationOpen,
        wsConnectionState,
        isMatlabEngineActive,
        activeScenario,
        isDeviceOnline,
        latestReading,
        secondsSinceLastReading,
        setSelectedPatientId,
        setScenario,
        toggleSound,
        setIsSearchOpen,
        setIsNotificationOpen,
        acknowledgeAlert,
        refreshData,
      }}
    >
      {children}
    </VitalsContext.Provider>
  );
};

export const useVitals = (): VitalsContextType => {
  const context = useContext(VitalsContext);
  if (!context) {
    throw new Error('useVitals must be used within a VitalsProvider');
  }
  return context;
};
