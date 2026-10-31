import React from 'react';
import { Wifi, Battery, Signal, Cpu } from 'lucide-react';
import type { DeviceTelemetry } from '../../types/vitals';
import { GlassCard } from '../common/GlassCard';

interface DeviceHealthCardProps {
  device: DeviceTelemetry;
  className?: string;
}

export const DeviceHealthCard: React.FC<DeviceHealthCardProps> = ({ device, className = '' }) => {
  const isOnline = device.status === 'Online';

  return (
    <GlassCard className={`p-4 sm:p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            About Your Device
          </h4>
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
          Sync: {device.lastSync}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* 1. Battery */}
        <div className="space-y-1.5 bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Battery className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Battery</span>
            </span>
            <span className="font-mono font-bold text-slate-200 text-xs">{device.batteryPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 sm:h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                device.batteryPercent > 50
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : device.batteryPercent > 20
                  ? 'bg-amber-400'
                  : 'bg-rose-500 animate-pulse'
              }`}
              style={{ width: `${device.batteryPercent}%` }}
            />
          </div>
        </div>

        {/* 2. Signal Strength */}
        <div className="space-y-1.5 bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Signal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Signal</span>
            </span>
            <span className="font-mono font-bold text-cyan-300 text-xs">
              {device.signalStrengthPercent > 80 ? 'Good' : 'Normal'}
            </span>
          </div>
          <div className="flex items-center gap-1 pt-0.5">
            {[1, 2, 3, 4].map((bar) => {
              const active = device.signalStrengthPercent >= bar * 25;
              return (
                <div
                  key={bar}
                  className={`h-1.5 sm:h-2 flex-1 rounded-sm ${
                    active ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)]' : 'bg-slate-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 3. Device Status */}
        <div className="space-y-1.5 bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Status</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-live-pulse' : 'bg-slate-500'
                }`}
              />
              {isOnline ? 'Active' : 'Offline'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            {isOnline ? 'Telemetry Live' : 'Disconnected'}
          </div>
        </div>

        {/* 4. Device ID */}
        <div className="space-y-1.5 bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Node ID</span>
            </span>
            <span className="font-mono font-bold text-xs text-cyan-300 truncate" title={device.deviceId}>
              {device.deviceId}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            Channel 3110138
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
