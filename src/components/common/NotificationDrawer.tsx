import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle, Volume2, VolumeX, Clock, ArrowRight } from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
}) => {
  const { alerts, events, acknowledgeAlert, isSoundEnabled, toggleSound } = useVitals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-cyan-500/20 shadow-2xl glass-panel flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Alerts & Notifications</h3>
                <p className="text-xs text-slate-400">Live clinical anomaly stream</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                title={isSoundEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
                className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                  isSoundEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Active Alerts Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Active Clinical Alerts
                </h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {alerts.filter((a) => !a.acknowledged).length} Pending
                </span>
              </div>

              <div className="space-y-2.5">
                {alerts.map((alert) => {
                  const isCritical = alert.severity === 'CRITICAL';
                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        alert.acknowledged
                          ? 'bg-slate-900/40 border-slate-800/80 opacity-60'
                          : isCritical
                          ? 'bg-rose-500/10 border-rose-500/40 shadow-lg shadow-rose-500/5'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isCritical ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            >
                              {alert.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              • {alert.timeAgo}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-semibold mt-0.5">
                            {alert.patientName} ({alert.room})
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">{alert.message}</p>
                          <div className="mt-2 text-xs font-mono font-bold text-white bg-slate-950/60 px-2 py-1 rounded inline-block">
                            Value: <span className={isCritical ? 'text-rose-400' : 'text-amber-400'}>{alert.value}</span>
                          </div>
                        </div>

                        {!alert.acknowledged ? (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                          >
                            Ack
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Acked
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onSelectPatient(alert.patientId);
                          onClose();
                        }}
                        className="mt-3 w-full py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        View Patient Telemetry <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Medical Events Feed */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Recent System Events
              </h4>

              <div className="space-y-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-2.5 text-xs"
                  >
                    <span className="font-mono text-[11px] text-cyan-400 mt-0.5">
                      {evt.timeString}
                    </span>
                    <div className="flex-1">
                      <span className="font-semibold text-slate-200">{evt.patientName}</span>
                      <span className="text-slate-400"> — {evt.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
