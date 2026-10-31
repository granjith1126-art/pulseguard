import React, { useState, useEffect } from 'react';
import { Calendar, Download, RefreshCw, Heart, Droplets, Thermometer } from 'lucide-react';
import type { TimeRange } from '../../types/vitals';
import { dataService } from '../../services/dataService';
import type { HistoricalVitalPoint, VitalSummaryStats } from '../../services/dataService';
import { VitalTrendChart } from '../../components/charts/VitalTrendChart';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { HistoricalSessionViewer } from '../../components/vitals/HistoricalSessionViewer';

export const PatientHistory: React.FC = () => {
  const { user } = useAuth();
  const patientId = user?.patientId || user?.id || 'P-001';
  const patientName = user?.name || 'Ramesh Kumar';
  const isMockPatient = ['P-101', 'P-102', 'P-103', 'P-104'].includes(patientId);

  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyData, setHistoryData] = useState<{
    points: HistoricalVitalPoint[];
    hrStats: VitalSummaryStats;
    spo2Stats: VitalSummaryStats;
    tempStats: VitalSummaryStats;
  } | null>(null);

  const ranges: { id: TimeRange; label: string }[] = [
    { id: '1H', label: '1 Hour' },
    { id: '6H', label: '6 Hours' },
    { id: '12H', label: '12 Hours' },
    { id: '24H', label: '24 Hours' },
    { id: '7D', label: '7 Days' },
  ];

  useEffect(() => {
    setIsLoading(true);
    dataService.getPatientHistory(patientId, timeRange).then((data) => {
      setHistoryData(data);
      setIsLoading(false);
    });
  }, [patientId, timeRange]);

  const handleExportCSV = () => {
    if (!historyData) return;

    const headers = ['Timestamp', 'Time', 'HeartRate_BPM', 'SpO2_Percent', 'Temperature_C', 'RespirationRate'];
    const rows = historyData.points.map((p) => [
      p.timestamp,
      p.timeLabel,
      p.heartRate,
      p.spo2,
      p.temperature,
      p.respirationRate,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pulseguard_${patientName}_history_${timeRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isMockPatient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <HistoricalSessionViewer
          patientId={patientId}
          patientName={patientName}
          isDoctorView={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Time Range Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Health History & Trends
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Chronological physiological logs for {patientName} ({patientId})
          </p>
        </div>

        {/* Range Buttons & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  timeRange === r.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-semibold border border-cyan-500/30 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {historyData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-4 flex items-center justify-between border-slate-800">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Average Heart Rate</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {historyData.hrStats.average} <span className="text-xs text-slate-400 font-sans">BPM</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Min: {historyData.hrStats.min} • Max: {historyData.hrStats.max}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Heart className="w-5 h-5" />
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center justify-between border-slate-800">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Average SpO₂</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {historyData.spo2Stats.average} <span className="text-xs text-slate-400 font-sans">%</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Min: {historyData.spo2Stats.min}% • Max: {historyData.spo2Stats.max}%
              </div>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Droplets className="w-5 h-5" />
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center justify-between border-slate-800">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Average Temperature</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {historyData.tempStats.average} <span className="text-xs text-slate-400 font-sans">°C</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Min: {historyData.tempStats.min}°C • Max: {historyData.tempStats.max}°C
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Thermometer className="w-5 h-5" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Detailed Trend Charts */}
      {historyData && !isLoading ? (
        <div className="space-y-5">
          <VitalTrendChart
            title="Heart Rate Trend"
            data={historyData.points}
            dataKey="heartRate"
            color="rose"
            stats={historyData.hrStats}
            unit="BPM"
            timeRangeLabel={timeRange}
            minLimit={60}
            maxLimit={100}
          />

          <VitalTrendChart
            title="SpO₂ Oxygen Saturation Trend"
            data={historyData.points}
            dataKey="spo2"
            color="cyan"
            stats={historyData.spo2Stats}
            unit="%"
            timeRangeLabel={timeRange}
            minLimit={95}
          />

          <VitalTrendChart
            title="Body Temperature Trend"
            data={historyData.points}
            dataKey="temperature"
            color="green"
            stats={historyData.tempStats}
            unit="°C"
            timeRangeLabel={timeRange}
            maxLimit={37.5}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}
    </div>
  );
};
