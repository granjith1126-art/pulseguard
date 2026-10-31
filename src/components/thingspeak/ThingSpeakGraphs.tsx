import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Heart, Droplets, Thermometer, WifiOff, Maximize2, X } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { PPGWaveformCanvas } from '../vitals/PPGWaveformCanvas';
import type { ThingSpeakRecord } from '../../services/thingspeakService';

interface ThingSpeakGraphsProps {
  records: ThingSpeakRecord[];
  hasPpgData?: boolean;
  isDeviceOnline?: boolean;
  secondsSinceLastReading?: number;
  lastReceivedTime?: string;
  currentHr?: number;
  currentSpo2?: number;
}

export const ThingSpeakGraphs: React.FC<ThingSpeakGraphsProps> = ({
  records,
  isDeviceOnline = false,
  secondsSinceLastReading = 0,
  lastReceivedTime,
  currentHr,
  currentSpo2,
}) => {
  // Modal state for Big Window
  const [expandedGraph, setExpandedGraph] = useState<'heart_rate' | 'spo2' | 'temperature' | null>(null);

  // Close Big Window on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedGraph(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Prepare Heart Rate data points (exclude null or 0)
  const hrData = records
    .filter((r) => r.heart_rate !== null && r.heart_rate > 0)
    .map((r) => ({
      time: r.time_label,
      fullTime: r.datetime_label,
      value: r.heart_rate,
      entry_id: r.entry_id,
    }));

  // 2. Prepare SpO2 data points (exclude null or 0)
  const spo2Data = records
    .filter((r) => r.spo2 !== null && r.spo2 > 0)
    .map((r) => ({
      time: r.time_label,
      fullTime: r.datetime_label,
      value: r.spo2,
      entry_id: r.entry_id,
    }));

  // 3. Prepare Temperature data points (exclude null or 0)
  const tempData = records
    .filter((r) => r.temperature !== null && r.temperature > 0)
    .map((r) => ({
      time: r.time_label,
      fullTime: r.datetime_label,
      value: r.temperature,
      entry_id: r.entry_id,
    }));

  // Helper to compute summary stats
  const calcStats = (data: Array<{ value: number | null }>) => {
    const valid = data.map((d) => d.value).filter((v): v is number => v !== null);
    if (valid.length === 0) return { min: '--', max: '--', avg: '--' };
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const avg = (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
    return { min, max, avg };
  };

  const hrStats = calcStats(hrData);
  const spo2Stats = calcStats(spo2Data);
  const tempStats = calcStats(tempData);

  // Custom Chart Tooltip
  const renderTooltip = (unit: string, color: string) => {
    return ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
          <div className="bg-slate-900/95 border border-slate-700/80 px-3 py-2 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
            <div className="text-[10px] text-slate-400 mb-0.5">
              Entry #{item.entry_id} • {item.fullTime || item.time}
            </div>
            <div className="flex items-center gap-1.5 font-bold" style={{ color }}>
              <span>{item.value} {unit}</span>
            </div>
          </div>
        );
      }
      return null;
    };
  };

  return (
    <div className="space-y-6">
      {/* Device Offline Persistent Banner over Graphs */}
      {!isDeviceOnline && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center justify-between gap-3 shadow-lg shadow-rose-950/20 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-rose-300 uppercase tracking-wider">🔴 Device Disconnected</span>
              <span className="text-slate-300 ml-2">
                Waiting for sensor data... {secondsSinceLastReading > 0 ? `(${secondsSinceLastReading}s since last reading). ` : ''}Live graphs remain frozen.
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Last received: <span className="text-white font-semibold">{lastReceivedTime || 'Unknown'}</span>
          </div>
        </div>
      )}

      {/* 3 Main Vital Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Heart Rate vs Time */}
        <GlassCard className={`p-4 sm:p-5 flex flex-col justify-between transition-all ${
          isDeviceOnline ? 'border-rose-500/20' : 'border-slate-800 opacity-95'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div
                className="flex items-center gap-2 text-rose-400 cursor-pointer group"
                onClick={() => setExpandedGraph('heart_rate')}
                title="Click to open Big Window"
              >
                <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 group-hover:scale-105 transition-transform">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 group-hover:text-rose-300 transition-colors">
                    Heart Rate vs Time
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ThingSpeak field1 • Actual Values
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isDeviceOnline ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    FROZEN
                  </span>
                )}
                <button
                  onClick={() => setExpandedGraph('heart_rate')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                  title="Open in Big Window"
                >
                  <Maximize2 className="w-3 h-3 text-rose-400" />
                  <span className="hidden sm:inline">Big Window</span>
                </button>
              </div>
            </div>

            {/* Summary Stats Header */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 py-1.5 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800 mb-2">
              <span>Avg: <strong className="text-white">{hrStats.avg}</strong></span>
              <span>Min: <strong className="text-white">{hrStats.min}</strong></span>
              <span>Max: <strong className="text-white">{hrStats.max}</strong></span>
              <span className="text-rose-400 font-bold">BPM</span>
            </div>

            {/* Chart */}
            <div
              className="w-full h-44 mt-1 relative cursor-pointer group"
              onClick={() => setExpandedGraph('heart_rate')}
              title="Click graph to open in Big Window"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hrData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={isDeviceOnline ? 0.4 : 0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={renderTooltip('BPM', '#f43f5e')} />
                  <ReferenceLine y={100} stroke="rgba(244, 63, 94, 0.4)" strokeDasharray="3 3" />
                  <ReferenceLine y={60} stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#f43f5e"
                    strokeWidth={isDeviceOnline ? 2.5 : 2}
                    strokeDasharray={isDeviceOnline ? undefined : '4 2'}
                    fillOpacity={1}
                    fill="url(#hrGradient)"
                    dot={{ r: 3, fill: '#f43f5e', strokeWidth: 1, stroke: '#fff' }}
                    activeDot={{ r: 5, fill: '#fff', stroke: '#f43f5e', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 bg-transparent group-hover:bg-rose-500/[0.03] rounded-lg transition-colors pointer-events-none" />
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-400">
            {isDeviceOnline ? (
              <>
                <span className="text-emerald-400/90">● Real-time sensor stream active</span>
                <span>Normal: 60-100 BPM</span>
              </>
            ) : (
              <>
                <span className="text-rose-400">● Graph stopped (Device offline)</span>
                <span>Last: {lastReceivedTime || 'Unknown'}</span>
              </>
            )}
          </div>
        </GlassCard>

        {/* 2. SpO2 vs Time */}
        <GlassCard className={`p-4 sm:p-5 flex flex-col justify-between transition-all ${
          isDeviceOnline ? 'border-cyan-500/20' : 'border-slate-800 opacity-95'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div
                className="flex items-center gap-2 text-cyan-400 cursor-pointer group"
                onClick={() => setExpandedGraph('spo2')}
                title="Click to open Big Window"
              >
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 group-hover:text-cyan-300 transition-colors">
                    SpO₂ vs Time
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ThingSpeak field3 • Actual Values
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isDeviceOnline ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    FROZEN
                  </span>
                )}
                <button
                  onClick={() => setExpandedGraph('spo2')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                  title="Open in Big Window"
                >
                  <Maximize2 className="w-3 h-3 text-cyan-400" />
                  <span className="hidden sm:inline">Big Window</span>
                </button>
              </div>
            </div>

            {/* Summary Stats Header */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 py-1.5 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800 mb-2">
              <span>Avg: <strong className="text-white">{spo2Stats.avg}%</strong></span>
              <span>Min: <strong className="text-white">{spo2Stats.min}%</strong></span>
              <span>Max: <strong className="text-white">{spo2Stats.max}%</strong></span>
              <span className="text-cyan-400 font-bold">SaO₂</span>
            </div>

            {/* Chart */}
            <div
              className="w-full h-44 mt-1 relative cursor-pointer group"
              onClick={() => setExpandedGraph('spo2')}
              title="Click graph to open in Big Window"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spo2Data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spo2Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={isDeviceOnline ? 0.4 : 0.2} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[50, 105]} />
                  <Tooltip content={renderTooltip('%', '#38bdf8')} />
                  <ReferenceLine y={95} stroke="rgba(16, 185, 129, 0.5)" strokeDasharray="3 3" />
                  <ReferenceLine y={90} stroke="rgba(244, 63, 94, 0.4)" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#38bdf8"
                    strokeWidth={isDeviceOnline ? 2.5 : 2}
                    strokeDasharray={isDeviceOnline ? undefined : '4 2'}
                    fillOpacity={1}
                    fill="url(#spo2Gradient)"
                    dot={{ r: 3, fill: '#38bdf8', strokeWidth: 1, stroke: '#fff' }}
                    activeDot={{ r: 5, fill: '#fff', stroke: '#38bdf8', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 bg-transparent group-hover:bg-cyan-500/[0.03] rounded-lg transition-colors pointer-events-none" />
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-400">
            {isDeviceOnline ? (
              <>
                <span className="text-emerald-400/90">● Real-time sensor stream active</span>
                <span>Normal: 95% - 100%</span>
              </>
            ) : (
              <>
                <span className="text-rose-400">● Graph stopped (Device offline)</span>
                <span>Last: {lastReceivedTime || 'Unknown'}</span>
              </>
            )}
          </div>
        </GlassCard>

        {/* 3. Temperature vs Time */}
        <GlassCard className={`p-4 sm:p-5 flex flex-col justify-between transition-all ${
          isDeviceOnline ? 'border-amber-500/20' : 'border-slate-800 opacity-95'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div
                className="flex items-center gap-2 text-amber-400 cursor-pointer group"
                onClick={() => setExpandedGraph('temperature')}
                title="Click to open Big Window"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 group-hover:text-amber-300 transition-colors">
                    Temperature vs Time
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ThingSpeak field2 • Actual Values
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isDeviceOnline ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    FROZEN
                  </span>
                )}
                <button
                  onClick={() => setExpandedGraph('temperature')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                  title="Open in Big Window"
                >
                  <Maximize2 className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Big Window</span>
                </button>
              </div>
            </div>

            {/* Summary Stats Header */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 py-1.5 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800 mb-2">
              <span>Avg: <strong className="text-white">{tempStats.avg}°C</strong></span>
              <span>Min: <strong className="text-white">{tempStats.min}°C</strong></span>
              <span>Max: <strong className="text-white">{tempStats.max}°C</strong></span>
              <span className="text-amber-400 font-bold">Skin/Body</span>
            </div>

            {/* Chart */}
            <div
              className="w-full h-44 mt-1 relative cursor-pointer group"
              onClick={() => setExpandedGraph('temperature')}
              title="Click graph to open in Big Window"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={renderTooltip('°C', '#f59e0b')} />
                  <ReferenceLine y={37.5} stroke="rgba(244, 63, 94, 0.4)" strokeDasharray="3 3" />
                  <ReferenceLine y={36.0} stroke="rgba(56, 189, 248, 0.3)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={isDeviceOnline ? 2.5 : 2}
                    strokeDasharray={isDeviceOnline ? undefined : '4 2'}
                    dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                    activeDot={{ r: 5, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 bg-transparent group-hover:bg-amber-500/[0.03] rounded-lg transition-colors pointer-events-none" />
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-400">
            {isDeviceOnline ? (
              <>
                <span className="text-emerald-400/90">● Real-time sensor stream active</span>
                <span>Normal: 36.0°C - 37.5°C</span>
              </>
            ) : (
              <>
                <span className="text-rose-400">● Graph stopped (Device offline)</span>
                <span>Last: {lastReceivedTime || 'Unknown'}</span>
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {/* 4. Real-Time Physiological Optical PPG Waveform Section */}
      <div className="space-y-2">
        <PPGWaveformCanvas
          heartRate={currentHr ?? (isDeviceOnline ? (records[records.length - 1]?.heart_rate ?? 0) : 0)}
          spo2={currentSpo2 ?? (isDeviceOnline ? (records[records.length - 1]?.spo2 ?? 0) : 0)}
          isDeviceOnline={isDeviceOnline}
          sourceLabel="THINGSPEAK REAL-TIME SENSOR"
          showControls={true}
          className="border-cyan-500/20 bg-slate-950/90"
        />
      </div>

      {/* =========================================================================
          BIG WINDOW MODAL (EXPANDED HIGH-RESOLUTION VIEW)
          ========================================================================= */}
      {expandedGraph && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setExpandedGraph(null)}
        >
          <div
            className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  expandedGraph === 'heart_rate'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : expandedGraph === 'spo2'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {expandedGraph === 'heart_rate' && <Heart className="w-6 h-6 animate-pulse" />}
                  {expandedGraph === 'spo2' && <Droplets className="w-6 h-6 animate-pulse" />}
                  {expandedGraph === 'temperature' && <Thermometer className="w-6 h-6 animate-pulse" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-xl font-extrabold text-white uppercase tracking-wider">
                      {expandedGraph === 'heart_rate' && 'Heart Rate vs Time (BPM)'}
                      {expandedGraph === 'spo2' && 'SpO₂ Blood Oxygen Saturation vs Time (%)'}
                      {expandedGraph === 'temperature' && 'Body / Skin Temperature vs Time (°C)'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {expandedGraph === 'heart_rate' && 'ThingSpeak field1'}
                      {expandedGraph === 'spo2' && 'ThingSpeak field3'}
                      {expandedGraph === 'temperature' && 'ThingSpeak field2'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {isDeviceOnline ? '● Live Sensor Stream Active • Channel 3110138' : `🔴 Device Offline • Frozen Buffer (Last: ${lastReceivedTime || 'Unknown'})`}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setExpandedGraph(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
                title="Close Big Window (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase text-slate-500 font-bold">Current</span>
                <div className="text-lg font-bold text-white mt-0.5">
                  {expandedGraph === 'heart_rate' && `${currentHr ?? hrData[hrData.length - 1]?.value ?? 0} BPM`}
                  {expandedGraph === 'spo2' && `${currentSpo2 ?? spo2Data[spo2Data.length - 1]?.value ?? 0} %`}
                  {expandedGraph === 'temperature' && `${tempData[tempData.length - 1]?.value ?? 0} °C`}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase text-slate-500 font-bold">Average</span>
                <div className="text-lg font-bold text-white mt-0.5">
                  {expandedGraph === 'heart_rate' && `${hrStats.avg} BPM`}
                  {expandedGraph === 'spo2' && `${spo2Stats.avg} %`}
                  {expandedGraph === 'temperature' && `${tempStats.avg} °C`}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase text-slate-500 font-bold">Minimum</span>
                <div className="text-lg font-bold text-cyan-300 mt-0.5">
                  {expandedGraph === 'heart_rate' && `${hrStats.min} BPM`}
                  {expandedGraph === 'spo2' && `${spo2Stats.min} %`}
                  {expandedGraph === 'temperature' && `${tempStats.min} °C`}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase text-slate-500 font-bold">Maximum</span>
                <div className="text-lg font-bold text-rose-300 mt-0.5">
                  {expandedGraph === 'heart_rate' && `${hrStats.max} BPM`}
                  {expandedGraph === 'spo2' && `${spo2Stats.max} %`}
                  {expandedGraph === 'temperature' && `${tempStats.max} °C`}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase text-slate-500 font-bold">Buffer Records</span>
                <div className="text-lg font-bold text-slate-200 mt-0.5">
                  {expandedGraph === 'heart_rate' && `${hrData.length} pts`}
                  {expandedGraph === 'spo2' && `${spo2Data.length} pts`}
                  {expandedGraph === 'temperature' && `${tempData.length} pts`}
                </div>
              </div>
            </div>

            {/* Expanded Chart */}
            <div className="w-full h-[380px] sm:h-[460px] bg-slate-950/90 p-3 sm:p-4 rounded-xl border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                {expandedGraph === 'heart_rate' ? (
                  <AreaChart data={hrData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="expandedHrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={renderTooltip('BPM', '#f43f5e')} />
                    <ReferenceLine y={100} stroke="rgba(244, 63, 94, 0.5)" strokeDasharray="4 4" label={{ value: 'Tachycardia (100)', fill: '#f43f5e', fontSize: 10 }} />
                    <ReferenceLine y={60} stroke="rgba(56, 189, 248, 0.4)" strokeDasharray="4 4" label={{ value: 'Bradycardia (60)', fill: '#38bdf8', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#expandedHrGradient)"
                      dot={{ r: 4, fill: '#f43f5e', strokeWidth: 1.5, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#fff', stroke: '#f43f5e', strokeWidth: 3 }}
                    />
                  </AreaChart>
                ) : expandedGraph === 'spo2' ? (
                  <AreaChart data={spo2Data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="expandedSpo2Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[50, 105]} />
                    <Tooltip content={renderTooltip('%', '#38bdf8')} />
                    <ReferenceLine y={95} stroke="rgba(16, 185, 129, 0.5)" strokeDasharray="4 4" label={{ value: 'Normal Threshold (95%)', fill: '#10b981', fontSize: 10 }} />
                    <ReferenceLine y={90} stroke="rgba(244, 63, 94, 0.5)" strokeDasharray="4 4" label={{ value: 'Hypoxia (<90%)', fill: '#f43f5e', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#expandedSpo2Gradient)"
                      dot={{ r: 4, fill: '#38bdf8', strokeWidth: 1.5, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#fff', stroke: '#38bdf8', strokeWidth: 3 }}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={tempData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={renderTooltip('°C', '#f59e0b')} />
                    <ReferenceLine y={37.5} stroke="rgba(244, 63, 94, 0.5)" strokeDasharray="4 4" label={{ value: 'Fever (37.5°C)', fill: '#f43f5e', fontSize: 10 }} />
                    <ReferenceLine y={36.0} stroke="rgba(56, 189, 248, 0.4)" strokeDasharray="4 4" label={{ value: 'Hypothermia (36.0°C)', fill: '#38bdf8', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#fff', stroke: '#f59e0b', strokeWidth: 3 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800 font-mono">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">ESC</kbd> or click outside to close</span>
              <button
                onClick={() => setExpandedGraph(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
