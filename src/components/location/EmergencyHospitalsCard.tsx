import React, { useState } from 'react';
import {
  Hospital,
  Phone,
  Navigation,
  MapPin,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { GlassCard } from '../common/GlassCard';

interface EmergencyHospitalsCardProps {
  isCriticalAlert?: boolean;
  className?: string;
}

export const EmergencyHospitalsCard: React.FC<EmergencyHospitalsCardProps> = ({
  isCriticalAlert = false,
  className = '',
}) => {
  const {
    location,
    permissionState,
    errorMessage,
    nearbyHospitals,
    isLoadingHospitals,
    requestLocation,
  } = useLocation();

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await requestLocation();
    setIsRefreshing(false);
  };

  // Case 1: Location NOT yet granted or failed (NO mock/Bengaluru fallback allowed!)
  if (!location || permissionState !== 'PERMISSION_GRANTED') {
    return (
      <GlassCard
        className={`p-5 sm:p-6 space-y-4 border-slate-800 ${
          isCriticalAlert ? 'border-rose-500/50 glass-panel-danger-glow bg-rose-950/20' : ''
        } ${className}`}
      >
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">
              {permissionState === 'REQUESTING'
                ? 'Determining Your Device Location...'
                : 'Unable to Determine Device Location'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {errorMessage ||
                'PulseGuard requires your live device/browser location to calculate exact distances to nearby emergency hospitals and trauma centers.'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Locating...' : 'Enable / Refresh Location'}</span>
              </button>

              <a
                href="tel:108"
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/30 font-mono"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Ambulance (108 / 911)</span>
              </a>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  const isLowAccuracy = location.accuracy > 1000;

  return (
    <GlassCard
      className={`p-5 space-y-4 border-slate-800 ${
        isCriticalAlert ? 'border-rose-500/50 glass-panel-danger-glow bg-rose-950/20' : ''
      } ${className}`}
    >
      {/* Header with Location Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              isCriticalAlert
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            }`}
          >
            <Hospital className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Nearby Emergency Hospitals
              </h3>
              {isCriticalAlert && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-live-pulse-red">
                  URGENT DISPATCH
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {location.latitude.toFixed(5)}° N, {location.longitude.toFixed(5)}° E
              </span>
              <span className="text-emerald-400 ml-1 font-semibold">
                (Accuracy: ±{location.accuracy}m)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh My Location</span>
          </button>
        </div>
      </div>

      {/* Low Accuracy Warning (if accuracy > 1000m) */}
      {isLowAccuracy && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Location accuracy is low (±{location.accuracy}m). Please enable precise location/GPS in your browser/device settings.
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 text-[11px] font-bold"
          >
            Refresh
          </button>
        </div>
      )}

      {/* 24/7 National Emergency Ambulance Helpline */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs">
        <div className="flex items-center gap-2 text-rose-300 font-semibold">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>National Emergency Trauma & Ambulance Service</span>
        </div>
        <a
          href="tel:108"
          className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/30"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call 108 / 911</span>
        </a>
      </div>

      {/* Hospitals List sorted by calculated Haversine distance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span>{isLoadingHospitals ? 'Searching nearest hospitals...' : `Found ${nearbyHospitals.length} nearest medical centers`}</span>
          <span>Sorted by Real Distance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nearbyHospitals.map((hospital, idx) => (
            <div
              key={hospital.id || idx}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs leading-snug">
                        {hospital.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {hospital.address}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                    {hospital.distanceKm} km
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-300 mt-2 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>{hospital.phoneNumber || 'Phone number unavailable'}</span>
                </div>
              </div>

              {/* Action Buttons: Call & Google Maps Directions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                {hospital.phoneNumber ? (
                  <a
                    href={`tel:${hospital.phoneNumber.replace(/\s+/g, '')}`}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center justify-center gap-1.5 transition-colors text-[11px]"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800/50 text-slate-500 border border-slate-800 font-semibold flex items-center justify-center gap-1.5 text-[11px] cursor-not-allowed"
                  >
                    <span>No Direct Phone</span>
                  </button>
                )}

                <a
                  href={hospital.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center justify-center gap-1.5 transition-colors text-[11px]"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Directions</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable LOCATION DEBUG Section for Verification */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center justify-between w-full py-1.5 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            LOCATION DEBUG (Verification Diagnostics)
          </span>
          {showDebug ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDebug && (
          <div className="p-3 mt-2 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs font-mono space-y-1.5 animate-fade-in text-slate-300">
            <div>
              <span className="text-slate-500">Location Source:</span>{' '}
              <strong className="text-cyan-400">BROWSER GEOLOCATION (HTML5 navigator.geolocation)</strong>
            </div>
            <div>
              <span className="text-slate-500">Device Latitude:</span>{' '}
              <span className="text-white font-bold">{location.latitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-slate-500">Device Longitude:</span>{' '}
              <span className="text-white font-bold">{location.longitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-slate-500">Accuracy Radius:</span>{' '}
              <span className="text-emerald-400 font-bold">±{location.accuracy} meters</span>
            </div>
            <div>
              <span className="text-slate-500">GPS Timestamp:</span>{' '}
              <span className="text-slate-400">{new Date(location.timestamp).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>{' '}
              <span className="text-emerald-400 font-bold">{permissionState}</span>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
