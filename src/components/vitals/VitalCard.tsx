import React, { useState, useEffect } from 'react';
import { Heart, Activity, Thermometer, Droplet, ShieldCheck, AlertTriangle, WifiOff } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import type { VitalStatus } from '../../types/vitals';

export type VitalType = 'heartRate' | 'spo2' | 'temperature' | 'overallStatus' | 'signalQuality';

interface VitalCardProps {
  type: VitalType;
  value: number | string;
  unit?: string;
  status?: VitalStatus;
  normalRange?: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
  onClick?: () => void;
}

export const VitalCard: React.FC<VitalCardProps> = ({
  type,
  value,
  unit = '',
  status = 'STABLE',
  normalRange,
  className = '',
  onClick,
}) => {
  const [prevValue, setPrevValue] = useState<number | string>(value);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (value !== prevValue) {
      setIsUpdating(true);
      setPrevValue(value);
      const timer = setTimeout(() => setIsUpdating(false), 800);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  if (type === 'overallStatus') {
    const isStable = status === 'STABLE';
    const isCritical = status === 'CRITICAL';
    const isOffline = status === 'OFFLINE';

    return (
      <GlassCard
        className={`p-5 flex flex-col justify-between ${
          isCritical
            ? 'glass-panel-danger-glow border-rose-500/40'
            : isStable
            ? 'glass-panel-glow border-emerald-500/30'
            : isOffline
            ? 'border-slate-700/50'
            : 'glass-panel-warning-glow border-amber-500/35'
        } ${className}`}
        onClick={onClick}
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Overall Status
          </span>
          <div className="mt-2 flex items-center justify-between">
            <h2
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isCritical
                  ? 'text-rose-400 text-glow-rose'
                  : isStable
                  ? 'text-emerald-400 text-glow-green'
                  : isOffline
                  ? 'text-slate-400'
                  : 'text-amber-400 text-glow-orange'
              }`}
            >
              {status}
            </h2>
            <div
              className={`p-2.5 rounded-xl border ${
                isCritical
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : isStable
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : isOffline
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              {isCritical ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : isStable ? (
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              ) : isOffline ? (
                <WifiOff className="w-6 h-6" />
              ) : (
                <Activity className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {isCritical
            ? '⚠️ Critical parameters require immediate attention'
            : isStable
            ? 'All parameters are normal'
            : isOffline
            ? 'Telemetry node is currently disconnected'
            : 'Parameters nearing threshold boundary'}
        </p>
      </GlassCard>
    );
  }

  // Parameter Configurations
  const configs = {
    heartRate: {
      title: 'Heart Rate',
      defaultUnit: 'BPM',
      defaultRange: 'Normal Range: 60-100',
      icon: Heart,
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      valueColor: 'text-white',
      accentGlow: 'text-glow-rose',
      pulseAnimation: 'animate-heartbeat',
    },
    spo2: {
      title: 'SpO₂',
      defaultUnit: '%',
      defaultRange: 'Normal Range: 95-100',
      icon: Droplet,
      iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      valueColor: 'text-white',
      accentGlow: 'text-glow-cyan',
      pulseAnimation: '',
    },
    temperature: {
      title: 'Temperature',
      defaultUnit: '°C',
      defaultRange: 'Normal Range: 36.0-37.5',
      icon: Thermometer,
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      valueColor: 'text-white',
      accentGlow: 'text-glow-green',
      pulseAnimation: '',
    },
    signalQuality: {
      title: 'Signal Quality',
      defaultUnit: '%',
      defaultRange: 'Quality: >90% Optimal',
      icon: Activity,
      iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      valueColor: 'text-white',
      accentGlow: 'text-glow-purple',
      pulseAnimation: '',
    },
  };

  const config = configs[type as keyof typeof configs] || configs.heartRate;
  const IconComponent = config.icon;

  return (
    <GlassCard
      className={`p-5 flex flex-col justify-between border-slate-800/80 hover:border-slate-700 transition-all ${
        isUpdating ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {config.title}
        </span>
        <div className={`p-2 rounded-xl border ${config.iconBg}`}>
          <IconComponent className={`w-4 h-4 ${config.pulseAnimation}`} />
        </div>
      </div>

      <div className="my-3 flex items-baseline gap-2">
        <span
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight transition-transform duration-300 font-mono ${
            config.valueColor
          } ${isUpdating ? 'scale-105' : 'scale-100'}`}
        >
          {value}
        </span>
        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          {unit || config.defaultUnit}
        </span>
      </div>

      <div className="text-xs text-slate-400">
        {normalRange || config.defaultRange}
      </div>
    </GlassCard>
  );
};
