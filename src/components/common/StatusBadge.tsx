import React from 'react';
import type { VitalStatus } from '../../types/vitals';

interface StatusBadgeProps {
  status: VitalStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true,
}) => {
  const normalized = status.toUpperCase();

  let bgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let dotClass = 'bg-emerald-400';
  let pulseClass = 'animate-live-pulse';
  let label = 'STABLE';

  if (normalized === 'ONLINE' || normalized === 'STABLE') {
    bgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    dotClass = 'bg-emerald-400';
    pulseClass = 'animate-live-pulse';
    label = normalized === 'ONLINE' ? 'Online' : 'STABLE';
  } else if (normalized === 'WARNING') {
    bgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotClass = 'bg-amber-400';
    pulseClass = 'animate-pulse';
    label = 'Warning';
  } else if (normalized === 'CRITICAL') {
    bgClass = 'bg-rose-500/15 text-rose-400 border-rose-500/40';
    dotClass = 'bg-rose-500';
    pulseClass = 'animate-live-pulse-red';
    label = 'Critical';
  } else if (normalized === 'OFFLINE') {
    bgClass = 'bg-slate-700/30 text-slate-400 border-slate-600/30';
    dotClass = 'bg-slate-500';
    pulseClass = '';
    label = 'Offline';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium gap-1.5',
    md: 'px-2.5 py-1 text-xs font-semibold gap-2',
    lg: 'px-3.5 py-1.5 text-sm font-bold gap-2.5 tracking-wider',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bgClass} ${sizeClasses[size]} backdrop-blur-sm transition-all duration-300`}
    >
      <span className="relative flex h-2 w-2">
        {showPulse && pulseClass && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass} ${pulseClass}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
      </span>
      <span>{label}</span>
    </span>
  );
};
