import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Hospital,
  Phone,
  Cloud,
} from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import type { VitalStatus } from '../../types/vitals';
import { useLocation } from '../../context/LocationContext';
import { VitalCard } from '../../components/vitals/VitalCard';
import { PPGWaveformCanvas } from '../../components/vitals/PPGWaveformCanvas';
import { DeviceHealthCard } from '../../components/vitals/DeviceHealthCard';
import { GlassCard } from '../../components/common/GlassCard';
import { LocationPermissionBanner } from '../../components/location/LocationPermissionBanner';
import { EmergencyHospitalsCard } from '../../components/location/EmergencyHospitalsCard';
import { ThingSpeakDebugPanel } from '../../components/thingspeak/ThingSpeakDebugPanel';
import { ThingSpeakGraphs } from '../../components/thingspeak/ThingSpeakGraphs';
import { HistoricalSessionViewer } from '../../components/vitals/HistoricalSessionViewer';
import { useAuth } from '../../context/AuthContext';
import { LIVE_MONITORING_CONFIG } from '../../config/monitoringConfig';
import {
  fetchThingSpeakData,
  fetchLatestThingSpeakEntry,
  type ThingSpeakResponse,
  type ThingSpeakRecord,
  type ThingSpeakLatestReading,
} from '../../services/thingspeakService';

export const PatientDashboard: React.FC = () => {
  const { patients, alerts, wsConnectionState, activeScenario, setScenario } = useVitals();
  const { location } = useLocation();
  const [showHospitalsDrawer, setShowHospitalsDrawer] = useState<boolean>(false);

  // Telemetry Data Mode: default to THINGSPEAK as instructed for this phase
  const [telemetryMode] = useState<'THINGSPEAK' | 'MATLAB'>('THINGSPEAK');

  // ThingSpeak state
  const [tsData, setTsData] = useState<ThingSpeakResponse | null>(null);
  const [liveRecords, setLiveRecords] = useState<ThingSpeakRecord[]>([]);
  const [latestReading, setLatestReading] = useState<ThingSpeakLatestReading | null>(null);
  const [lastEntryId, setLastEntryId] = useState<number | null>(null);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [secondsSinceLastReading, setSecondsSinceLastReading] = useState<number>(0);
  const [isTsLoading, setIsTsLoading] = useState<boolean>(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [apiError, setApiError] = useState<string | null>(null);

  // Refs to avoid stale closures in intervals
  const lastEntryIdRef = useRef<number | null>(null);
  const lastDataTimestampRef = useRef<string | null>(null);

  // Helper to re-evaluate hardware activity from timestamp
  const updateDeviceActivity = useCallback((isoTimestamp?: string | null) => {
    if (!isoTimestamp) {
      setIsDeviceOnline(false);
      return;
    }
    const ts = new Date(isoTimestamp).getTime();
    if (isNaN(ts)) {
      setIsDeviceOnline(false);
      return;
    }
    const diffMs = Math.max(0, Date.now() - ts);
    const ageSec = Math.floor(diffMs / 1000);
    setSecondsSinceLastReading(ageSec);
    setIsDeviceOnline(diffMs < LIVE_MONITORING_CONFIG.DEVICE_TIMEOUT_MS);
  }, []);

  // 1. Initial full fetch to get metadata, field mapping, and recent historical records
  const loadThingSpeak = useCallback(async () => {
    setIsTsLoading(true);
    setApiError(null);
    try {
      const res = await fetchThingSpeakData(LIVE_MONITORING_CONFIG.MAX_LIVE_POINTS);
      setTsData(res);
      setLastFetchTime(new Date());

      if (res.records && res.records.length > 0) {
        setLiveRecords(res.records);
        const lastRec = res.records[res.records.length - 1];
        lastEntryIdRef.current = lastRec.entry_id;
        lastDataTimestampRef.current = lastRec.timestamp_iso;
        setLastEntryId(lastRec.entry_id);

        if (res.latest_reading) {
          setLatestReading(res.latest_reading);
        } else {
          setLatestReading({
            heart_rate: lastRec.heart_rate,
            spo2: lastRec.spo2,
            temperature: lastRec.temperature,
            timestamp_iso: lastRec.timestamp_iso,
            time_label: lastRec.time_label,
            datetime_label: lastRec.datetime_label,
            entry_id: lastRec.entry_id,
          });
        }

        updateDeviceActivity(lastRec.timestamp_iso);
      } else if (res.latest_reading) {
        lastEntryIdRef.current = res.latest_reading.entry_id;
        lastDataTimestampRef.current = res.latest_reading.timestamp_iso;
        setLastEntryId(res.latest_reading.entry_id);
        setLatestReading(res.latest_reading);
        updateDeviceActivity(res.latest_reading.timestamp_iso);
      }
    } catch (err: any) {
      console.error('Failed to fetch ThingSpeak data:', err);
      setApiError(err?.message || 'Failed to connect to telemetry service');
    } finally {
      setIsTsLoading(false);
    }
  }, [updateDeviceActivity]);

  // Initial load
  useEffect(() => {
    loadThingSpeak();
  }, [loadThingSpeak]);

  // 2. High-frequency live polling (checks every 2-3 seconds for genuinely new readings)
  useEffect(() => {
    if (!autoRefreshEnabled || telemetryMode !== 'THINGSPEAK') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetchLatestThingSpeakEntry();
        setLastFetchTime(new Date());

        if (res.success && res.entry) {
          setApiError(null);
          const entry = res.entry;

          // Check if this is a genuinely new reading
          if (lastEntryIdRef.current === null || entry.entry_id !== lastEntryIdRef.current) {
            // New reading arrived!
            lastEntryIdRef.current = entry.entry_id;
            lastDataTimestampRef.current = entry.timestamp_iso;
            setLastEntryId(entry.entry_id);

            // Update latest reading
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

            // Update liveRecords for graphs without duplicates
            setLiveRecords((prev) => {
              if (prev.some((r) => r.entry_id === entry.entry_id)) return prev;
              const updated = [...prev, entry];
              if (updated.length > LIVE_MONITORING_CONFIG.MAX_LIVE_POINTS) {
                return updated.slice(updated.length - LIVE_MONITORING_CONFIG.MAX_LIVE_POINTS);
              }
              return updated;
            });

            // Update online state with the new reading timestamp
            updateDeviceActivity(entry.timestamp_iso);
          } else {
            // Same entry_id: Repeated reading!
            // Strictly do NOT append to liveRecords, live graph remains static.
            // Just update age ticker
            updateDeviceActivity(lastDataTimestampRef.current);
          }
        } else if (!res.success && res.message) {
          setApiError(res.message);
        }
      } catch (err: any) {
        setApiError(err?.message || 'Error polling latest reading');
      }
    }, LIVE_MONITORING_CONFIG.LIVE_POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [autoRefreshEnabled, telemetryMode, updateDeviceActivity]);

  // 3. Second-by-second age ticker and offline detection
  useEffect(() => {
    const ageTicker = setInterval(() => {
      if (lastDataTimestampRef.current) {
        updateDeviceActivity(lastDataTimestampRef.current);
      }
    }, LIVE_MONITORING_CONFIG.AGE_TICK_INTERVAL_MS);

    return () => clearInterval(ageTicker);
  }, [updateDeviceActivity]);

  // Helper to format age
  const formatAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (mins < 60) return `${mins}m ${remainingSecs}s ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  // Resolve active patient: authenticated patient ID by default
  const { user } = useAuth();
  const currentPatientId = user?.patientId || user?.id || 'P-001';
  const patient = patients.find((p) => p.id === currentPatientId) || patients[0];
  const patientAlerts = alerts.filter((a) => a.patientId === patient?.id);
  const isMockPatient = ['P-101', 'P-102', 'P-103', 'P-104'].includes(patient?.id);

  // Compute display vitals based on active mode
  let displayHr: number = patient?.vitals.heartRate ?? 0;
  let displaySpo2: number = patient?.vitals.spo2 ?? 0;
  let displayTemp: number = patient?.vitals.temperature ?? 0;
  let displayLastUpdated: string = 'Just now';
  let overallStatus: VitalStatus = patient?.status ?? 'STABLE';

  if (!isMockPatient && telemetryMode === 'THINGSPEAK') {
    const lr = latestReading || tsData?.latest_reading;
    if (lr) {
      displayHr = lr.heart_rate ?? patient?.vitals.heartRate ?? 0;
      displaySpo2 = lr.spo2 ?? patient?.vitals.spo2 ?? 0;
      displayTemp = lr.temperature ?? patient?.vitals.temperature ?? 0;

      const timeStr = lr.time_label || 'Live';

      if (isDeviceOnline) {
        displayLastUpdated = `${timeStr} (${secondsSinceLastReading}s ago)`;

        if (displayHr === 0 && displaySpo2 === 0) {
          overallStatus = 'WARNING';
        } else if (displayHr > 130 || (displaySpo2 > 0 && displaySpo2 < 88) || displayTemp > 38.5) {
          overallStatus = 'CRITICAL';
        } else if (displayHr > 100 || (displaySpo2 > 0 && displaySpo2 < 93) || displayTemp > 37.5) {
          overallStatus = 'WARNING';
        } else {
          overallStatus = 'STABLE';
        }
      } else {
        overallStatus = 'OFFLINE';
        displayLastUpdated = `${timeStr} • Standby (${formatAge(secondsSinceLastReading)})`;
      }
    }
  } else if (isMockPatient) {
    displayHr = patient?.vitals.heartRate ?? 72;
    displaySpo2 = patient?.vitals.spo2 ?? 98;
    displayTemp = patient?.vitals.temperature ?? 36.8;
    overallStatus = 'OFFLINE';
    displayLastUpdated = `${patient?.vitals.timeString || 'Recorded'} • Offline (Telemetry Archive)`;
  }

  const isCritical = overallStatus === 'CRITICAL';

  if (!patient) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Location Permission Banner */}
      <LocationPermissionBanner />

      {/* Patient Greeting & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Hello, {patient.name} <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isMockPatient
              ? `Patient ID: ${patient.id} • Age: ${patient.emergencyInfo?.age || 21} • Assigned Cardiologist: ${patient.assignedDoctor}`
              : telemetryMode === 'THINGSPEAK'
              ? `Live MathWorks ThingSpeak Channel 3110138 Telemetry (${displayLastUpdated})`
              : 'Local physiological monitoring engine'}
          </p>
        </div>

        {/* Action Controls & Emergency Nearby Button */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowHospitalsDrawer(!showHospitalsDrawer)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Hospital className="w-4 h-4 text-rose-400" />
            <span>{showHospitalsDrawer ? 'Hide Nearby Hospitals' : 'Emergency Nearby Hospitals'}</span>
          </button>

          {/* Telemetry Source Pill */}
          <div
            className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-mono backdrop-blur-md transition-all ${
              isMockPatient
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : telemetryMode === 'THINGSPEAK'
                ? isDeviceOnline
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-900/80 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isMockPatient ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400" />
              ) : telemetryMode === 'THINGSPEAK' ? (
                isDeviceOnline ? (
                  <>
                    <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400" />
                )
              ) : (
                <>
                  <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
                </>
              )}
            </span>
            <div className="text-left">
              <div className="font-semibold text-[11px] leading-none">
                {isMockPatient
                  ? '🔴 Device Offline (Disconnected)'
                  : telemetryMode === 'THINGSPEAK'
                  ? isDeviceOnline
                    ? '🟢 Device Connected'
                    : '🔴 Device Disconnected'
                  : 'WebSocket Live'}
              </div>
              <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                {isMockPatient
                  ? 'Hardware Disconnected • Historical Archive'
                  : telemetryMode === 'THINGSPEAK'
                  ? isDeviceOnline
                    ? `Live • Last: ${secondsSinceLastReading}s ago`
                    : 'Waiting for sensor data...'
                  : wsConnectionState}
              </div>
            </div>
            <Cloud className="w-3.5 h-3.5 ml-1 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Emergency Nearby Hospitals Card */}
      {(showHospitalsDrawer || isCritical) && (
        <div className="animate-fade-in">
          <EmergencyHospitalsCard isCriticalAlert={isCritical} />
        </div>
      )}

      {/* 4 Major Current Value Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Overall Status */}
        <VitalCard
          type="overallStatus"
          value={overallStatus}
          status={overallStatus}
          className="h-full"
        />

        {/* Heart Rate Card */}
        <VitalCard
          type="heartRate"
          value={displayHr}
          unit="BPM"
          normalRange={
            isMockPatient
              ? `Archived Reading • Device Offline`
              : isDeviceOnline
              ? `Normal Range: 60-100 • Live (${displayLastUpdated})`
              : `ThingSpeak Recorded • Standby (${formatAge(secondsSinceLastReading)})`
          }
          className="h-full"
        />

        {/* SpO2 Card */}
        <VitalCard
          type="spo2"
          value={displaySpo2}
          unit="%"
          normalRange={
            isMockPatient
              ? `Archived Reading • Device Offline`
              : isDeviceOnline
              ? `Normal Range: 95-100 • Live (${displayLastUpdated})`
              : `ThingSpeak Recorded • Standby (${formatAge(secondsSinceLastReading)})`
          }
          className="h-full"
        />

        {/* Temperature Card */}
        <VitalCard
          type="temperature"
          value={displayTemp}
          unit="°C"
          normalRange={
            isMockPatient
              ? `Archived Reading • Device Offline`
              : isDeviceOnline
              ? `Normal Range: 36.0-37.5 • Live (${displayLastUpdated})`
              : `ThingSpeak Recorded • Standby (${formatAge(secondsSinceLastReading)})`
          }
          className="h-full"
        />
      </div>

      {/* Primary Telemetry View */}
      {isMockPatient ? (
        <div className="space-y-6">
          <HistoricalSessionViewer
            patientId={patient.id}
            patientName={patient.name}
            isDoctorView={false}
          />
        </div>
      ) : telemetryMode === 'THINGSPEAK' ? (
        <div className="space-y-6">
          {/* Development-Only Debug Panel as requested */}
          <ThingSpeakDebugPanel
            data={tsData}
            isLoading={isTsLoading}
            onRefresh={loadThingSpeak}
            autoRefreshEnabled={autoRefreshEnabled}
            onToggleAutoRefresh={setAutoRefreshEnabled}
            lastFetchTime={lastFetchTime}
            isDeviceOnline={isDeviceOnline}
            secondsSinceLastReading={secondsSinceLastReading}
            deviceTimeoutSec={Math.round(LIVE_MONITORING_CONFIG.DEVICE_TIMEOUT_MS / 1000)}
            pollIntervalSec={Math.round(LIVE_MONITORING_CONFIG.LIVE_POLL_INTERVAL_MS / 1000)}
            apiError={apiError}
            lastEntryId={lastEntryId}
          />

          {/* Actual ThingSpeak Time-Series Graphs */}
          <ThingSpeakGraphs
            records={liveRecords}
            hasPpgData={tsData?.has_ppg_data ?? false}
            isDeviceOnline={isDeviceOnline}
            secondsSinceLastReading={secondsSinceLastReading}
            lastReceivedTime={latestReading?.time_label || tsData?.latest_reading?.time_label}
            currentHr={displayHr}
            currentSpo2={displaySpo2}
          />
        </div>
      ) : (
        /* MATLAB Simulation Mode with PPG Waveform */
        <div className="space-y-6">
          {/* Scenario simulator */}
          <GlassCard className="p-3.5 sm:p-4 border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">MATLAB Test Scenarios:</span>
              <p className="text-[11px] text-slate-400">Select scenario to modulate synthetic optical waveform:</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScenario('NORMAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeScenario === 'NORMAL'
                    ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                🟢 NORMAL
              </button>
              <button
                onClick={() => setScenario('WARNING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeScenario === 'WARNING'
                    ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                🟡 WARNING
              </button>
              <button
                onClick={() => setScenario('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeScenario === 'CRITICAL'
                    ? 'bg-rose-500/30 border-rose-500 text-rose-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                🔴 CRITICAL TEST
              </button>
            </div>
          </GlassCard>

          <PPGWaveformCanvas
            heartRate={patient.vitals.heartRate}
            spo2={patient.vitals.spo2}
            signalQuality={patient.vitals.signalQuality}
            patientId={patient.id}
            showControls={true}
          />
        </div>
      )}

      {/* Bottom Row: About Device, Motivation, Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* About Your Device */}
        <div className="lg:col-span-1">
          <DeviceHealthCard
            device={{
              ...patient.deviceStatus,
              status: isMockPatient ? 'Offline' : telemetryMode === 'THINGSPEAK' ? (isDeviceOnline ? 'Online' : 'Offline') : patient.deviceStatus.status,
              lastSync: isMockPatient ? 'Device Disconnected (Offline)' : telemetryMode === 'THINGSPEAK' ? (isDeviceOnline ? 'Live Active' : `Offline (${formatAge(secondsSinceLastReading)})`) : patient.deviceStatus.lastSync
            }}
            className="h-full"
          />
        </div>

        {/* Motivational Card */}
        <GlassCard className="p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-cyan-950/40 border-cyan-500/20">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Health Tip of the Day</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              Stay Healthy & Hydrated!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Keep monitoring your vitals regularly, maintain steady deep breathing, and drink at least 2.5L of water daily.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Prescribed by: {patient.assignedDoctor}</span>
            <span className="text-cyan-400 font-medium">Daily Goal: 100%</span>
          </div>

          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        </GlassCard>

        {/* Recent Alerts */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Alerts & Location Status
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {patientAlerts.length} Alerts
              </span>
            </div>

            {patientAlerts.length === 0 ? (
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-400">No active alerts</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {location ? `Location: ${location.address || `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`}` : 'Normal baseline telemetry recorded.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {patientAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{alert.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{alert.timeAgo}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Emergency Contact:</span>
            <div className="flex items-center gap-1.5 text-slate-200 font-medium">
              <span>{patient.emergencyInfo?.emergencyContactName || 'Sunita Kumar'}</span>
              <a
                href={`tel:${patient.emergencyInfo?.emergencyContactNumber || '+919845067890'}`}
                className="text-rose-400 hover:underline inline-flex items-center gap-0.5 text-[11px]"
              >
                <Phone className="w-3 h-3" />
              </a>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
