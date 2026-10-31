import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity } from 'lucide-react';
import { VitalCard } from '../../components/vitals/VitalCard';
import { PPGWaveformCanvas } from '../../components/vitals/PPGWaveformCanvas';
import { ThingSpeakGraphs } from '../../components/thingspeak/ThingSpeakGraphs';
import { ThingSpeakDebugPanel } from '../../components/thingspeak/ThingSpeakDebugPanel';
import { GlassCard } from '../../components/common/GlassCard';
import { useVitals } from '../../context/VitalsContext';
import { LIVE_MONITORING_CONFIG } from '../../config/monitoringConfig';
import {
  fetchThingSpeakData,
  fetchLatestThingSpeakEntry,
  type ThingSpeakResponse,
  type ThingSpeakRecord,
  type ThingSpeakLatestReading,
} from '../../services/thingspeakService';

export const PatientLiveMonitoring: React.FC = () => {
  const { patients } = useVitals();
  const patient = patients.find((p) => p.id === 'P-001') || patients[0];

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

  const lastEntryIdRef = useRef<number | null>(null);
  const lastDataTimestampRef = useRef<string | null>(null);

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
      setApiError(err?.message || 'Failed to connect to telemetry service');
    } finally {
      setIsTsLoading(false);
    }
  }, [updateDeviceActivity]);

  useEffect(() => {
    loadThingSpeak();
  }, [loadThingSpeak]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetchLatestThingSpeakEntry();
        setLastFetchTime(new Date());

        if (res.success && res.entry) {
          setApiError(null);
          const entry = res.entry;

          if (lastEntryIdRef.current === null || entry.entry_id !== lastEntryIdRef.current) {
            lastEntryIdRef.current = entry.entry_id;
            lastDataTimestampRef.current = entry.timestamp_iso;
            setLastEntryId(entry.entry_id);

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

            setLiveRecords((prev) => {
              if (prev.some((r) => r.entry_id === entry.entry_id)) return prev;
              const updated = [...prev, entry];
              if (updated.length > LIVE_MONITORING_CONFIG.MAX_LIVE_POINTS) {
                return updated.slice(updated.length - LIVE_MONITORING_CONFIG.MAX_LIVE_POINTS);
              }
              return updated;
            });

            updateDeviceActivity(entry.timestamp_iso);
          } else {
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
  }, [autoRefreshEnabled, updateDeviceActivity]);

  useEffect(() => {
    const ageTicker = setInterval(() => {
      if (lastDataTimestampRef.current) {
        updateDeviceActivity(lastDataTimestampRef.current);
      }
    }, LIVE_MONITORING_CONFIG.AGE_TICK_INTERVAL_MS);

    return () => clearInterval(ageTicker);
  }, [updateDeviceActivity]);

  const lr = latestReading || tsData?.latest_reading;
  let displayHr = lr?.heart_rate ?? patient?.vitals.heartRate ?? 0;
  let displaySpo2 = lr?.spo2 ?? patient?.vitals.spo2 ?? 0;
  let displayTemp = lr?.temperature ?? patient?.vitals.temperature ?? 0;
  let overallStatus: 'STABLE' | 'WARNING' | 'CRITICAL' | 'OFFLINE' = 'STABLE';

  if (isDeviceOnline) {
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
  }

  const formatAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (mins < 60) return `${mins}m ${remainingSecs}s ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  const lastTimeString = lr?.time_label ? `Last received: ${lr.time_label}` : 'No recent transmission';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-cyan-400 animate-pulse" />
            Live Biometric Telemetry Station
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Continuous optical pulse, vital signs, and time-series telemetry from ThingSpeak Channel 3110138 • {lastTimeString}
          </p>
        </div>

        {/* Live Status Indicator */}
        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
          isDeviceOnline
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          <span className="relative flex h-2.5 w-2.5">
            {isDeviceOnline ? (
              <>
                <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400" />
            )}
          </span>
          <span>
            {isDeviceOnline ? `ONLINE • Live (${secondsSinceLastReading}s ago)` : `OFFLINE • (${formatAge(secondsSinceLastReading)})`}
          </span>
        </div>
      </div>

      {/* 4 Vital Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <VitalCard
          type="overallStatus"
          value={overallStatus}
          status={overallStatus}
          className="h-full"
        />
        <VitalCard
          type="heartRate"
          value={displayHr}
          unit="BPM"
          normalRange={
            isDeviceOnline
              ? 'Normal Range: 60-100 • Live ThingSpeak'
              : `ThingSpeak Recorded • Standby (${formatAge(secondsSinceLastReading)})`
          }
          className="h-full"
        />
        <VitalCard
          type="spo2"
          value={displaySpo2}
          unit="%"
          normalRange={
            isDeviceOnline
              ? 'Normal Range: 95-100 • Live ThingSpeak'
              : `ThingSpeak Recorded • Standby (${formatAge(secondsSinceLastReading)})`
          }
          className="h-full"
        />
        <VitalCard
          type="temperature"
          value={displayTemp}
          unit="°C"
          normalRange={
            isDeviceOnline
              ? 'Normal Range: 36.0-37.5 • Live ThingSpeak'
              : `ThingSpeak Recorded • Standby (${formatAge(secondsSinceLastReading)})`
          }
          className="h-full"
        />
      </div>

      {/* PPG Optical Waveform Station */}
      <GlassCard className="p-5 border-cyan-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              High-Frequency Optical Pulse Photoplethysmogram (PPG)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous systolic peak, dicrotic notch, and diastolic runoff modulated by genuine heart rate
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
              Sampling: 100 Hz
            </span>
          </div>
        </div>

        <PPGWaveformCanvas
          heartRate={displayHr}
          spo2={displaySpo2}
          signalQuality={isDeviceOnline ? 96 : 0}
          patientId={patient?.id || 'P-001'}
          showControls={true}
          isDeviceOnline={isDeviceOnline}
          sourceLabel="ThingSpeak Telemetry Channel 3110138"
        />
      </GlassCard>

      {/* 3 Interactive Time-Series Graphs with Big Window modal view */}
      <ThingSpeakGraphs
        records={liveRecords}
        hasPpgData={tsData?.has_ppg_data ?? false}
        isDeviceOnline={isDeviceOnline}
        secondsSinceLastReading={secondsSinceLastReading}
        lastReceivedTime={lr?.time_label}
        currentHr={displayHr}
        currentSpo2={displaySpo2}
      />

      {/* Debug Panel */}
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
    </div>
  );
};
