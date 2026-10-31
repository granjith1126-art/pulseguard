import React from 'react';
import { Terminal, AlertTriangle, RefreshCw } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import type { ThingSpeakResponse } from '../../services/thingspeakService';

interface ThingSpeakDebugPanelProps {
  data: ThingSpeakResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: (enabled: boolean) => void;
  lastFetchTime?: Date;
  isDeviceOnline?: boolean;
  secondsSinceLastReading?: number;
  deviceTimeoutSec?: number;
  pollIntervalSec?: number;
  apiError?: string | null;
  lastEntryId?: number | null;
}

export const ThingSpeakDebugPanel: React.FC<ThingSpeakDebugPanelProps> = ({
  data,
  isLoading,
  onRefresh,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  lastFetchTime,
  isDeviceOnline = false,
  secondsSinceLastReading = 0,
  deviceTimeoutSec = 30,
  pollIntervalSec = 3,
  apiError,
  lastEntryId,
}) => {
  // Format timestamps nicely
  const formatTime = (iso?: string | null) => {
    if (!iso) return 'None';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch {
      return iso;
    }
  };

  const formatAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (mins < 60) return `${mins}m ${remainingSecs}s ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  return (
    <GlassCard className="p-4 sm:p-5 border-amber-500/30 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-amber-950/20 text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                ThingSpeak Cloud Telemetry
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 border border-amber-500/25 text-amber-300">
                Development Debug Panel
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
              <span>Read API Key safely secured in backend .env</span>
              <span>•</span>
              <span>Fast Polling: {pollIntervalSec}s</span>
              <span>•</span>
              <span>Timeout: {deviceTimeoutSec}s</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefreshEnabled}
              onChange={(e) => onToggleAutoRefresh(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Live Polling ({pollIntervalSec}s)</span>
          </label>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-mono font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Polling...' : 'Poll Now'}</span>
          </button>
        </div>
      </div>

      {/* API Warning (Non-blocking: distinguishes API hiccups from device disconnects) */}
      {apiError && (
        <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 font-mono">
            <div className="font-bold text-amber-200">ThingSpeak API Notice: Temporary Connection Glitch</div>
            <div className="text-[11px] text-amber-300/90 leading-relaxed">{apiError}</div>
            <div className="text-[10px] text-amber-400/80">
              Retrying in {pollIntervalSec}s. Device activity clock continues using last valid timestamp.
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs font-mono">
        {/* 1. Device Activity Status */}
        <div className={`p-3 rounded-xl border transition-all ${
          isDeviceOnline
            ? 'bg-emerald-950/30 border-emerald-500/40'
            : 'bg-rose-950/30 border-rose-500/40'
        }`}>
          <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Device Hardware Status</div>
          <div className="flex items-center gap-2 mt-1">
            {isDeviceOnline ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 font-bold">DEVICE CONNECTED</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-400 font-bold">DEVICE DISCONNECTED</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-300 mt-1">
            {isDeviceOnline
              ? `Last upload: ${formatAge(secondsSinceLastReading)}`
              : `Waiting for sensor data... (${formatAge(secondsSinceLastReading)})`}
          </div>
        </div>

        {/* 2. Channel & Entry ID */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Channel & Entry ID</div>
          <div className="text-base font-bold text-cyan-400 mt-1 flex items-center justify-between">
            <span>{data?.channel_id || '3110138'}</span>
            <span className="text-xs text-slate-300 font-normal">#{lastEntryId ?? data?.latest_reading?.entry_id ?? '--'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Cloud: <span className="text-white font-semibold">{data?.channel_name || 'Heart rate'}</span>
          </div>
        </div>

        {/* 3. Records In Rolling Window */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Live Buffer Window</div>
          <div className="text-base font-bold text-white mt-1">
            {data?.records_count ?? 0} <span className="text-xs text-slate-400 font-normal">unique points</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            Last polled: {lastFetchTime ? lastFetchTime.toLocaleTimeString() : 'Just now'}
          </div>
        </div>

        {/* 4. Timestamp Range & Timeout */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Latest Timestamp</div>
          <div className="text-[11px] text-slate-200 mt-1 truncate" title={data?.latest_timestamp || ''}>
            {formatTime(data?.latest_timestamp)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Timeout limit: <span className="text-amber-400">{deviceTimeoutSec}s</span>
          </div>
        </div>
      </div>

      {/* Detected Fields Section */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Detected Channel Fields & Configurable Mapping:</span>
          <span className="text-[11px] text-slate-400 font-normal">
            Genuinely new readings only • Duplicate entry IDs ignored
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
          {/* Field 1 */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Field 1</div>
            <div className="text-slate-200 font-semibold mt-0.5">
              "{data?.detected_fields?.field1?.label || 'heart beat'}"
            </div>
            <div className="text-[11px] text-rose-400 font-bold mt-0.5">
              → Heart Rate ({data?.detected_fields?.field1?.unit || 'BPM'})
            </div>
          </div>

          {/* Field 2 */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Field 2</div>
            <div className="text-slate-200 font-semibold mt-0.5">
              "{data?.detected_fields?.field2?.label || 'temp'}"
            </div>
            <div className="text-[11px] text-amber-400 font-bold mt-0.5">
              → Temperature ({data?.detected_fields?.field2?.unit || '°C'})
            </div>
          </div>

          {/* Field 3 */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Field 3</div>
            <div className="text-slate-200 font-semibold mt-0.5">
              "{data?.detected_fields?.field3?.label || 'spo2'}"
            </div>
            <div className="text-[11px] text-cyan-400 font-bold mt-0.5">
              → Blood Oxygen Saturation ({data?.detected_fields?.field3?.unit || '%'})
            </div>
          </div>

          {/* Field 4 */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Field 4</div>
            <div className="text-slate-400 font-semibold mt-0.5">
              {data?.detected_fields?.field4?.label ? `"${data.detected_fields.field4.label}"` : 'None'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {data?.has_ppg_data ? '→ PPG Optical Waveform' : '→ No Raw PPG Field'}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
