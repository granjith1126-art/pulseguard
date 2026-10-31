import React, { useState } from 'react';
import { MapPin, CheckCircle2, Navigation, AlertCircle } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { GlassCard } from '../common/GlassCard';

export const LocationPermissionBanner: React.FC = () => {
  const { location, permissionState, requestLocation, dismissPrompt } = useLocation();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllow = async () => {
    setIsRequesting(true);
    await requestLocation();
    setIsRequesting(false);
  };

  // If already granted, show a subtle status pill
  if (permissionState === 'PERMISSION_GRANTED' && location) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Device Location Active: <strong className="text-white">{location.address || `${location.latitude.toFixed(5)}°, ${location.longitude.toFixed(5)}°`}</strong> (±{location.accuracy}m)
          </span>
        </div>
        <span className="text-[10px] text-emerald-400/80 font-mono hidden sm:inline-block">
          ● Ready for Emergency Assistance
        </span>
      </div>
    );
  }

  // If in initial PROMPT state
  if (permissionState === 'PROMPT') {
    return (
      <GlassCard className="p-4 sm:p-5 border-cyan-500/40 bg-gradient-to-r from-slate-900/90 via-cyan-950/30 to-slate-900/90 shadow-xl animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Device Location Permission
              </h4>
              <p className="text-xs text-slate-200 mt-0.5 max-w-2xl leading-relaxed">
                PulseGuard can use your current device location to help find nearby hospitals and dispatch emergency assistance if a critical monitoring alert occurs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            <button
              onClick={dismissPrompt}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={handleAllow}
              disabled={isRequesting}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isRequesting ? 'Requesting...' : 'Allow Location'}</span>
            </button>
          </div>
        </div>
      </GlassCard>
    );
  }

  // If DENIED, TIMEOUT, or UNAVAILABLE - show persistent enable button
  if (
    permissionState === 'PERMISSION_DENIED' ||
    permissionState === 'POSITION_UNAVAILABLE' ||
    permissionState === 'TIMEOUT' ||
    permissionState === 'ERROR'
  ) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Location access is disabled. Nearby hospital emergency guidance is unavailable.
          </span>
        </div>
        <button
          onClick={handleAllow}
          disabled={isRequesting}
          className="self-end sm:self-auto px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-bold transition-colors"
        >
          {isRequesting ? 'Accessing...' : 'Enable Location'}
        </button>
      </div>
    );
  }

  return null;
};
