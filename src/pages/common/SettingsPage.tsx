import React, { useState } from 'react';
import { Settings, Save, RotateCcw, Bell, ShieldCheck, CheckCircle2, Radio, Server } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { LIVE_MONITORING_CONFIG } from '../../config/monitoringConfig';

export const SettingsPage: React.FC = () => {

  const [pollInterval, setPollInterval] = useState<number>(LIVE_MONITORING_CONFIG.LIVE_POLL_INTERVAL_MS / 1000);
  const [offlineTimeout, setOfflineTimeout] = useState<number>(LIVE_MONITORING_CONFIG.DEVICE_TIMEOUT_MS / 1000);
  const [highHrThreshold, setHighHrThreshold] = useState<number>(100);
  const [criticalHrThreshold, setCriticalHrThreshold] = useState<number>(130);
  const [lowSpo2Threshold, setLowSpo2Threshold] = useState<number>(94);
  const [criticalSpo2Threshold, setCriticalSpo2Threshold] = useState<number>(90);
  const [tempHighThreshold, setTempHighThreshold] = useState<number>(37.5);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    LIVE_MONITORING_CONFIG.LIVE_POLL_INTERVAL_MS = pollInterval * 1000;
    LIVE_MONITORING_CONFIG.DEVICE_TIMEOUT_MS = offlineTimeout * 1000;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setPollInterval(3);
    setOfflineTimeout(30);
    setHighHrThreshold(100);
    setCriticalHrThreshold(130);
    setLowSpo2Threshold(94);
    setCriticalSpo2Threshold(90);
    setTempHighThreshold(37.5);
    LIVE_MONITORING_CONFIG.LIVE_POLL_INTERVAL_MS = 3000;
    LIVE_MONITORING_CONFIG.DEVICE_TIMEOUT_MS = 30000;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-cyan-400" />
            System & Telemetry Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure telemetry polling cadence, device timeout thresholds, and physiological alert boundaries
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Data Ingestion & Live Cadence */}
        <GlassCard className="p-5 sm:p-6 border-slate-800">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Radio className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Live Polling & Offline Detection
              </h3>
              <p className="text-xs text-slate-400">
                Configure frequency of requests to ThingSpeak endpoint and hardware presence timeouts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Live Data Polling Interval (seconds)
              </label>
              <select
                value={pollInterval}
                onChange={(e) => setPollInterval(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value={2}>2 seconds (High-frequency live polling)</option>
                <option value={3}>3 seconds (Recommended baseline)</option>
                <option value={5}>5 seconds (Standard balance)</option>
                <option value={10}>10 seconds (Low bandwidth)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Deduped by ThingSpeak entry ID so unchanged readings are not duplicated.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Hardware Disconnect Timeout (seconds)
              </label>
              <select
                value={offlineTimeout}
                onChange={(e) => setOfflineTimeout(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value={15}>15 seconds (Strict instantaneous)</option>
                <option value={30}>30 seconds (Standard recommended)</option>
                <option value={45}>45 seconds (Allows transient jitter)</option>
                <option value={60}>60 seconds (Relaxed)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                When telemetry age exceeds this duration, device status transitions to "OFFLINE".
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Card 2: Physiological Alert Thresholds */}
        <GlassCard className="p-5 sm:p-6 border-slate-800">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Bell className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Clinical Threshold Boundaries
              </h3>
              <p className="text-xs text-slate-400">
                Set patient vital boundaries for Warning (Amber) and Critical (Red) alerts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Heart Rate */}
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide block">
                Heart Rate Limits
              </span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  High HR Warning: {highHrThreshold} BPM
                </label>
                <input
                  type="range"
                  min={85}
                  max={120}
                  value={highHrThreshold}
                  onChange={(e) => setHighHrThreshold(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Critical Tachycardia: {criticalHrThreshold} BPM
                </label>
                <input
                  type="range"
                  min={120}
                  max={160}
                  value={criticalHrThreshold}
                  onChange={(e) => setCriticalHrThreshold(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            {/* SpO2 */}
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide block">
                SpO₂ Saturation Limits
              </span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Low SpO₂ Warning: {lowSpo2Threshold}%
                </label>
                <input
                  type="range"
                  min={92}
                  max={96}
                  value={lowSpo2Threshold}
                  onChange={(e) => setLowSpo2Threshold(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Critical Hypoxemia: {criticalSpo2Threshold}%
                </label>
                <input
                  type="range"
                  min={85}
                  max={92}
                  value={criticalSpo2Threshold}
                  onChange={(e) => setCriticalSpo2Threshold(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide block">
                Body Temp Limits
              </span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Fever Threshold: {tempHighThreshold}°C
                </label>
                <input
                  type="range"
                  step="0.1"
                  min={37.0}
                  max={39.0}
                  value={tempHighThreshold}
                  onChange={(e) => setTempHighThreshold(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-500 pt-3">
                Values &gt; 38.5°C automatically trigger high-priority clinical fever alert.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Card 3: Connected Infrastructure */}
        <GlassCard className="p-5 sm:p-6 border-slate-800">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <Server className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Hardware Channel & Security Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Connected MathWorks ThingSpeak IoT channel metadata
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Channel ID</span>
              <span className="font-bold text-white text-sm">3110138</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Read API Key</span>
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Protected in backend .env
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Registered Patient</span>
              <span className="font-bold text-cyan-300 text-xs">Ramesh Kumar (P-001)</span>
            </div>
          </div>
        </GlassCard>

        {/* Buttons Row */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
