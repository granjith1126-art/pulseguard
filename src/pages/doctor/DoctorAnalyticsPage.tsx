import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { GlassCard } from '../../components/common/GlassCard';

export const DoctorAnalyticsPage: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<'24H' | '7D' | '30D'>('7D');

  // Distribution data
  const statusDistribution = [
    { name: 'Stable (9)', value: 9, color: '#10b981' },
    { name: 'Warning (2)', value: 2, color: '#fbbf24' },
    { name: 'Critical (1)', value: 1, color: '#f43f5e' },
    { name: 'Offline (1)', value: 1, color: '#64748b' },
  ];

  // Hourly alert volume trend
  const alertTrends = [
    { hour: '00:00', alerts: 0, normalReadings: 240 },
    { hour: '04:00', alerts: 1, normalReadings: 235 },
    { hour: '08:00', alerts: 3, normalReadings: 245 },
    { hour: '12:00', alerts: 4, normalReadings: 260 },
    { hour: '16:00', alerts: 2, normalReadings: 250 },
    { hour: '20:00', alerts: 1, normalReadings: 242 },
  ];

  // Ward average comparison
  const wardAverages = [
    { ward: 'Cardiology ICU', avgHR: 77, avgSpO2: 97.6, avgTemp: 36.9 },
    { ward: 'CCU Critical', avgHR: 112, avgSpO2: 91.0, avgTemp: 38.1 },
    { ward: 'Post-Op', avgHR: 72, avgSpO2: 99.0, avgTemp: 36.5 },
    { ward: 'General Ward', avgHR: 83, avgSpO2: 96.5, avgTemp: 37.1 },
    { ward: 'Maternity', avgHR: 80, avgSpO2: 98.0, avgTemp: 36.9 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Biometric Analytics & Population Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Statistical distribution of vital parameters, anomaly frequencies, and ward metrics
          </p>
        </div>

        {/* Range switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {(['24H', '7D', '30D'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                selectedRange === r
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Analytics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Population Mean HR</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">79.2 <span className="text-xs text-slate-400 font-sans">BPM</span></div>
          <span className="text-[11px] text-emerald-400 mt-1 block">✓ Within normal cardiac limits</span>
        </GlassCard>

        <GlassCard className="p-4 border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Mean SpO₂ Saturation</span>
          <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">97.4 <span className="text-xs text-slate-400 font-sans">%</span></div>
          <span className="text-[11px] text-cyan-400 mt-1 block">96.8% compliant</span>
        </GlassCard>

        <GlassCard className="p-4 border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Telemetry Uptime</span>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">99.8 <span className="text-xs text-slate-400 font-sans">%</span></div>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">184,200 Packets processed</span>
        </GlassCard>

        <GlassCard className="p-4 border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-semibold">Anomaly Index</span>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">3.4 <span className="text-xs text-slate-400 font-sans">%</span></div>
          <span className="text-[11px] text-amber-400 mt-1 block">1 Critical patient under care</span>
        </GlassCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Health Distribution (Donut / Pie) */}
        <GlassCard className="p-5 border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
            Patient Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Hourly Alert Volume Frequency */}
        <GlassCard className="p-5 border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
            Anomaly Incident Frequency by Time of Day
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Bar dataKey="alerts" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Triggered Alerts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Ward Comparison Table */}
      <GlassCard className="p-5 border-slate-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
          Comparative Ward Telemetry Benchmark
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase">
                <th className="py-2.5 px-3">Ward / Unit</th>
                <th className="py-2.5 px-3">Avg Heart Rate</th>
                <th className="py-2.5 px-3">Avg SpO₂</th>
                <th className="py-2.5 px-3">Avg Temperature</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {wardAverages.map((w, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-sans font-semibold text-white">{w.ward}</td>
                  <td className="py-3 px-3 text-rose-400">{w.avgHR} BPM</td>
                  <td className="py-3 px-3 text-cyan-300">{w.avgSpO2}%</td>
                  <td className="py-3 px-3 text-emerald-300">{w.avgTemp}°C</td>
                  <td className="py-3 px-3">
                    {w.avgSpO2 < 95 ? (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded">
                        High Attention
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                        Stable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
