import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Activity,
  Heart,
  Droplets,
  Thermometer,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Download,
  Database,
  Stethoscope,
  User,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { GlassCard } from '../common/GlassCard';
import {
  getPatientHistoricalSessions,
  type HistoricalSession,
  type HistoricalReading,
} from '../../data/historicalSessionsData';

interface HistoricalSessionViewerProps {
  patientId: string;
  patientName: string;
  isDoctorView?: boolean;
}

export const HistoricalSessionViewer: React.FC<HistoricalSessionViewerProps> = ({
  patientId,
  patientName,
  isDoctorView = false,
}) => {
  const sessions = useMemo(() => {
    return getPatientHistoricalSessions(patientId);
  }, [patientId]);

  // Extract unique dates available for this patient
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => set.add(s.date));
    return Array.from(set).sort();
  }, [sessions]);

  // State for selected date and session type
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return availableDates[0] || '2026-10-05';
  });

  const [selectedSessionType, setSelectedSessionType] = useState<'Morning' | 'Evening'>('Morning');
  const [activeParameter, setActiveParameter] = useState<'ALL' | 'HR' | 'SPO2' | 'TEMP' | 'BP' | 'RESP'>('ALL');
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(0);

  // Active session object
  const currentSession: HistoricalSession | undefined = useMemo(() => {
    return (
      sessions.find(
        (s) => s.date === selectedDate && s.sessionType === selectedSessionType
      ) || sessions[0]
    );
  }, [sessions, selectedDate, selectedSessionType]);

  const readings = currentSession?.readings || [];

  // Abnormal points range for ReferenceArea
  const abnormalWindow = useMemo(() => {
    if (!currentSession?.hasAbnormalEvent || !readings.length) return null;
    const abnPoints = readings.filter((r) => r.isAbnormal);
    if (!abnPoints.length) return null;
    return {
      startTime: abnPoints[0].timeLabel,
      endTime: abnPoints[abnPoints.length - 1].timeLabel,
      reason: abnPoints[0].abnormalReason || currentSession.abnormalDescription || 'Abnormal Vital Episode',
    };
  }, [currentSession, readings]);

  // Handle Export CSV for this session
  const handleExportCSV = () => {
    if (!currentSession || !readings.length) return;

    const headers = [
      'Index',
      'Timestamp_ISO',
      'Time_Label',
      'HeartRate_BPM',
      'SpO2_Percent',
      'Temperature_C',
      'BloodPressure_Systolic',
      'BloodPressure_Diastolic',
      'RespirationRate_min',
      'IsAbnormal',
      'Clinical_Note',
    ];

    const rows = readings.map((r) => [
      r.index,
      r.timestamp,
      `"${r.timeLabel}"`,
      r.heartRate,
      r.spo2,
      r.temperature,
      r.bloodPressureSystolic,
      r.bloodPressureDiastolic,
      r.respirationRate,
      r.isAbnormal ? 'TRUE' : 'FALSE',
      `"${r.abnormalReason || 'Normal'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pulseguard_${patientName}_${currentSession.date}_${currentSession.sessionType}_session.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered readings for log table
  const filteredReadings = useMemo(() => {
    if (!tableSearch.trim()) return readings;
    const q = tableSearch.toLowerCase();
    return readings.filter(
      (r) =>
        r.timeLabel.toLowerCase().includes(q) ||
        r.heartRate.toString().includes(q) ||
        r.spo2.toString().includes(q) ||
        (r.abnormalReason && r.abnormalReason.toLowerCase().includes(q))
    );
  }, [readings, tableSearch]);

  const pagedReadings = useMemo(() => {
    const start = tablePage * 25;
    return filteredReadings.slice(start, start + 25);
  }, [filteredReadings, tablePage]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!sessions.length) {
    return (
      <GlassCard className="p-8 text-center border-slate-800">
        <Database className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">No Historical Telemetry Found</h3>
        <p className="text-xs text-slate-400 mt-1">
          No archived monitoring sessions recorded for patient {patientName} ({patientId}).
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Verification & Source Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Patient Historical Monitoring Repository
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                SYNTHETIC DEMO DATA
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                isDoctorView
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {isDoctorView ? <Stethoscope className="w-3 h-3" /> : <User className="w-3 h-3" />}
                <span>{isDoctorView ? 'Physician Review' : 'Patient Self-View'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous 15-second time-series physiological archive • Shared between Doctor & Patient Portals
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
        >
          <Download className="w-4 h-4" />
          <span>Export Session CSV</span>
        </button>
      </div>

      {/* Date & Session Pickers */}
      <GlassCard className="p-4 sm:p-5 border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 1. Date Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              1. Select Monitoring Date ({availableDates.length} Days Available)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {availableDates.map((dateStr) => {
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setTablePage(0);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/30'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 opacity-70" />
                    <span>{formatDateDisplay(dateStr)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Session Selector (Morning vs Evening) */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              2. Select Monitoring Session (2 Sessions / Day)
            </label>
            <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setSelectedSessionType('Morning');
                  setTablePage(0);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedSessionType === 'Morning'
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🌅</span>
                <span>Morning (8:00 AM – 11:30 AM)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedSessionType('Evening');
                  setTablePage(0);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedSessionType === 'Evening'
                    ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🌇</span>
                <span>Evening (5:00 PM – 8:30 PM)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Session Metadata Info Row */}
        {currentSession && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Patient Profile</span>
              <span className="text-slate-200 font-bold">{patientName} (Age 21)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Session Duration</span>
              <span className="text-cyan-300 font-bold font-mono">3h 30m (210 mins)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Discrete Readings</span>
              <span className="text-emerald-300 font-bold font-mono">841 points @ 15s</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Clinical Event Status</span>
              {currentSession.hasAbnormalEvent ? (
                <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Demo Event (~10m)</span>
                </span>
              ) : (
                <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Normal Baseline</span>
                </span>
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Abnormal Event Callout Banner (if applicable) */}
      {currentSession?.hasAbnormalEvent && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-lg shadow-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 uppercase tracking-wide">
                  Clinical Demonstration Marker: Temporary Physiological Fluctuation
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Approx. 10 Minutes Duration
                </span>
              </div>
              <p className="text-amber-200/90 mt-1 leading-relaxed">
                {currentSession.abnormalDescription ||
                  'Temporary mild vital sign elevation recorded during this session. Normal resting baseline was subsequently restored spontaneously without prolonged critical deviation.'}
              </p>
              {abnormalWindow && (
                <p className="text-[11px] font-mono text-amber-400/80 mt-1">
                  Event Window: {abnormalWindow.startTime} → {abnormalWindow.endTime} (Points highlighted below)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Parameter Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Parameters' },
          { id: 'HR', label: 'Heart Rate (BPM)' },
          { id: 'SPO2', label: 'SpO₂ Saturation (%)' },
          { id: 'TEMP', label: 'Temperature (°C)' },
          { id: 'BP', label: 'Blood Pressure (mmHg)' },
          { id: 'RESP', label: 'Respiration (/min)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveParameter(tab.id as typeof activeParameter)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              activeParameter === tab.id
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Primary Graphs */}
      {currentSession && readings.length > 0 && (
        <div className="space-y-6">
          {/* 1. HEART RATE CHART */}
          {(activeParameter === 'ALL' || activeParameter === 'HR') && (
            <GlassCard className="p-5 border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span>Heart Rate Time-Series Profile (841 Readings)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Resting baseline ~{currentSession.stats.heartRate.avg} BPM with natural sinus variability
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">Min: <strong className="text-white">{currentSession.stats.heartRate.min}</strong></span>
                  <span className="text-slate-400">Avg: <strong className="text-cyan-300">{currentSession.stats.heartRate.avg}</strong></span>
                  <span className="text-slate-400">Max: <strong className="text-rose-400">{currentSession.stats.heartRate.max}</strong></span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={readings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      interval={80}
                    />
                    <YAxis stroke="#64748b" fontSize={10} domain={[50, 150]} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload as HistoricalReading;
                          return (
                            <div className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-xl text-xs">
                              <div className="font-mono text-slate-400 mb-1">{dataPoint.timeLabel}</div>
                              <div className="font-bold text-rose-400">
                                Heart Rate: {dataPoint.heartRate} BPM
                              </div>
                              {dataPoint.isAbnormal && (
                                <div className="mt-1 text-[11px] text-amber-300 font-semibold">
                                  ⚠️ {dataPoint.abnormalReason}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Tachycardia Threshold (100 BPM)', fill: '#f59e0b', fontSize: 10 }} />
                    <ReferenceLine y={60} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'Normal Baseline Lower Limit (60 BPM)', fill: '#38bdf8', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fill="url(#hrGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          {/* 2. SPO2 CHART */}
          {(activeParameter === 'ALL' || activeParameter === 'SPO2') && (
            <GlassCard className="p-5 border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span>Oxygen Saturation (SpO₂) Continuous Profile</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Typical healthy saturation range 96–99%
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">Min: <strong className="text-cyan-400">{currentSession.stats.spo2.min}%</strong></span>
                  <span className="text-slate-400">Avg: <strong className="text-cyan-300">{currentSession.stats.spo2.avg}%</strong></span>
                  <span className="text-slate-400">Max: <strong className="text-white">{currentSession.stats.spo2.max}%</strong></span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={readings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      interval={80}
                    />
                    <YAxis stroke="#64748b" fontSize={10} domain={[88, 100]} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload as HistoricalReading;
                          return (
                            <div className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-xl text-xs">
                              <div className="font-mono text-slate-400 mb-1">{dataPoint.timeLabel}</div>
                              <div className="font-bold text-cyan-300">
                                SpO₂ Saturation: {dataPoint.spo2}%
                              </div>
                              {dataPoint.isAbnormal && (
                                <div className="mt-1 text-[11px] text-amber-300 font-semibold">
                                  ⚠️ {dataPoint.abnormalReason}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={95} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Clinical Normal Lower Limit (95%)', fill: '#10b981', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="spo2"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="url(#spo2Grad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          {/* 3. TEMPERATURE CHART */}
          {(activeParameter === 'ALL' || activeParameter === 'TEMP') && (
            <GlassCard className="p-5 border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-emerald-400" />
                    <span>Body Temperature Profile (°C)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Typical baseline core temperature 36.5–37.2°C
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">Min: <strong className="text-white">{currentSession.stats.temperature.min}°C</strong></span>
                  <span className="text-slate-400">Avg: <strong className="text-emerald-300">{currentSession.stats.temperature.avg}°C</strong></span>
                  <span className="text-slate-400">Max: <strong className="text-amber-400">{currentSession.stats.temperature.max}°C</strong></span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={readings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      interval={80}
                    />
                    <YAxis stroke="#64748b" fontSize={10} domain={[35.5, 39.0]} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload as HistoricalReading;
                          return (
                            <div className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-xl text-xs">
                              <div className="font-mono text-slate-400 mb-1">{dataPoint.timeLabel}</div>
                              <div className="font-bold text-emerald-300">
                                Temperature: {dataPoint.temperature}°C
                              </div>
                              {dataPoint.isAbnormal && (
                                <div className="mt-1 text-[11px] text-amber-300 font-semibold">
                                  ⚠️ {dataPoint.abnormalReason}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={37.5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Elevated Threshold (37.5°C)', fill: '#f59e0b', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#tempGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          {/* 4. BLOOD PRESSURE & RESPIRATION RATE */}
          {(activeParameter === 'ALL' || activeParameter === 'BP' || activeParameter === 'RESP') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Blood Pressure Line Chart */}
              {(activeParameter === 'ALL' || activeParameter === 'BP') && (
                <GlassCard className="p-5 border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-blue-400" />
                        <span>Blood Pressure (Systolic / Diastolic)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Typical range: 110-125 / 70-82 mmHg
                      </p>
                    </div>
                    <div className="text-xs font-mono text-blue-300">
                      Avg: {currentSession.stats.bloodPressureSystolic.avg}/{currentSession.stats.bloodPressureDiastolic.avg}
                    </div>
                  </div>

                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={readings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                        <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={10} tickLine={false} interval={120} />
                        <YAxis stroke="#64748b" fontSize={10} domain={[60, 150]} tickLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="bloodPressureSystolic" name="Systolic" stroke="#60a5fa" strokeWidth={1.8} dot={false} />
                        <Line type="monotone" dataKey="bloodPressureDiastolic" name="Diastolic" stroke="#3b82f6" strokeWidth={1.8} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}

              {/* Respiration Rate Chart */}
              {(activeParameter === 'ALL' || activeParameter === 'RESP') && (
                <GlassCard className="p-5 border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span>Respiration Rate (Breaths / min)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Resting rate: 12-20 breaths/min
                      </p>
                    </div>
                    <div className="text-xs font-mono text-purple-300">
                      Avg: {currentSession.stats.respirationRate.avg} /min
                    </div>
                  </div>

                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={readings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c084fc" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                        <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={10} tickLine={false} interval={120} />
                        <YAxis stroke="#64748b" fontSize={10} domain={[10, 30]} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="respirationRate" stroke="#c084fc" strokeWidth={1.8} fill="url(#respGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </div>
      )}

      {/* Complete Historical Telemetry Readings Table */}
      <GlassCard className="p-5 border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Discrete Session Readings ({readings.length} Logged Entries)
            </h3>
            <p className="text-xs text-slate-400">
              Complete 15-second telemetry data stream recorded during this session
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setTablePage(0);
              }}
              placeholder="Search by time, value, status..."
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">HR (BPM)</th>
                <th className="py-2.5 px-3">SpO₂ (%)</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3">BP (Sys/Dia)</th>
                <th className="py-2.5 px-3">Resp (/min)</th>
                <th className="py-2.5 px-3">Clinical Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {pagedReadings.map((r) => (
                <tr
                  key={r.index}
                  className={r.isAbnormal ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40'}
                >
                  <td className="py-2 px-3 text-slate-500 font-sans">{r.index + 1}</td>
                  <td className="py-2 px-3 text-slate-300 font-bold">{r.timeLabel}</td>
                  <td className="py-2 px-3 text-rose-300 font-bold">{r.heartRate}</td>
                  <td className="py-2 px-3 text-cyan-300 font-bold">{r.spo2}%</td>
                  <td className="py-2 px-3 text-emerald-300 font-bold">{r.temperature}°C</td>
                  <td className="py-2 px-3 text-blue-300">
                    {r.bloodPressureSystolic}/{r.bloodPressureDiastolic}
                  </td>
                  <td className="py-2 px-3 text-purple-300">{r.respirationRate}</td>
                  <td className="py-2 px-3">
                    {r.isAbnormal ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⚠️ {r.abnormalReason}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-sans text-[11px]">Normal Baseline</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>
            Showing {pagedReadings.length ? tablePage * 25 + 1 : 0}–
            {Math.min((tablePage + 1) * 25, filteredReadings.length)} of {filteredReadings.length} readings
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTablePage((p) => Math.max(0, p - 1))}
              disabled={tablePage === 0}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-cyan-300">
              Page {tablePage + 1} of {Math.ceil(filteredReadings.length / 25) || 1}
            </span>
            <button
              onClick={() =>
                setTablePage((p) =>
                  (p + 1) * 25 < filteredReadings.length ? p + 1 : p
                )
              }
              disabled={(tablePage + 1) * 25 >= filteredReadings.length}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
