import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import { GlassCard } from '../../components/common/GlassCard';

interface DoctorAlertsPageProps {
  onSelectPatient: (patientId: string) => void;
}

export const DoctorAlertsPage: React.FC<DoctorAlertsPageProps> = ({ onSelectPatient }) => {
  const { alerts, acknowledgeAlert, isSoundEnabled, toggleSound } = useVitals();
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'RESOLVED'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING' && !a.acknowledged).length;
  const resolvedCount = alerts.filter((a) => a.severity === 'RESOLVED' || a.acknowledged).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
            Clinical Alerts Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time biometric anomaly triage and safety management
          </p>
        </div>

        {/* Audio Mute Switch */}
        <button
          onClick={toggleSound}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
            isSoundEnabled
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>Audio Alarm {isSoundEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Triage Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Alerts', count: alerts.length },
          { id: 'CRITICAL', label: 'Critical', count: criticalCount, isCrit: true },
          { id: 'WARNING', label: 'Warning', count: warningCount, isWarn: true },
          { id: 'RESOLVED', label: 'Resolved / Acked', count: resolvedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterSeverity(tab.id as typeof filterSeverity)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              filterSeverity === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                tab.isCrit && tab.count > 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <GlassCard className="p-12 text-center border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Active Clinical Alerts</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            All registered patients currently have vital measurements within standard physiological thresholds. Continuous surveillance is active.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL';
          const isWarning = alert.severity === 'WARNING';

          return (
            <GlassCard
              key={alert.id}
              className={`p-5 flex flex-col justify-between border-slate-800 transition-all ${
                isCritical && !alert.acknowledged
                  ? 'border-rose-500/40 glass-panel-danger-glow'
                  : isWarning && !alert.acknowledged
                  ? 'border-amber-500/40 glass-panel-warning-glow'
                  : 'opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-2 rounded-xl border ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">{alert.title}</h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {alert.patientName} • {alert.room}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">{alert.timeAgo}</span>
                </div>

                <p className="text-xs text-slate-300 my-3 leading-relaxed">{alert.message}</p>

                {/* Exceeded Value Badge */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono mb-4">
                  <span className="text-slate-400">Trigger Parameter:</span>
                  <span
                    className={`font-bold ${
                      isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {alert.value}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                {!alert.acknowledged && alert.severity !== 'RESOLVED' ? (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Acknowledged
                  </span>
                )}

                <button
                  onClick={() => onSelectPatient(alert.patientId)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Telemetry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
      )}
    </div>
  );
};
