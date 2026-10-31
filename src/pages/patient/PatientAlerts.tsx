import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Phone, Hospital } from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import { GlassCard } from '../../components/common/GlassCard';
import { EmergencyHospitalsCard } from '../../components/location/EmergencyHospitalsCard';

export const PatientAlerts: React.FC = () => {
  const { alerts, patients } = useVitals();
  const patient = patients.find((p) => p.id === 'P-001') || patients[0];
  const patientAlerts = alerts.filter((a) => a.patientId === 'P-001');

  const [showHospitals, setShowHospitals] = useState<boolean>(true);

  const emergencyInfo = patient?.emergencyInfo || {
    age: 58,
    gender: 'Male',
    emergencyContactName: 'Sunita Kumar',
    emergencyContactNumber: '+91 98450 67890',
    relationship: 'Spouse',
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
            Alerts & Emergency Safety Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Personal physiological safety warnings, emergency response contacts, and hospital guidance
          </p>
        </div>

        <button
          onClick={() => setShowHospitals(!showHospitals)}
          className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Hospital className="w-4 h-4 text-rose-400" />
          <span>{showHospitals ? 'Hide Nearby Hospitals' : 'View Nearby Hospitals'}</span>
        </button>
      </div>

      {/* Emergency Contacts Banner */}
      <GlassCard className="p-5 sm:p-6 border-rose-500/30 bg-gradient-to-r from-rose-950/20 via-slate-900/60 to-slate-900/90">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Phone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                Designated Emergency Contact
              </span>
              <h3 className="text-base font-bold text-white">
                {emergencyInfo.emergencyContactName} ({emergencyInfo.relationship})
              </h3>
              <p className="text-xs font-mono text-cyan-300 mt-0.5">
                {emergencyInfo.emergencyContactNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <a
              href={`tel:${emergencyInfo.emergencyContactNumber}`}
              className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Call Contact Now</span>
            </a>
            <a
              href="tel:108"
              className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Hospital className="w-4 h-4 text-rose-400" />
              <span>Dial 108 (Ambulance)</span>
            </a>
          </div>
        </div>
      </GlassCard>

      {/* Nearby Hospitals Component */}
      {showHospitals && (
        <div className="animate-fade-in">
          <EmergencyHospitalsCard />
        </div>
      )}

      {/* Active Alerts List */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Active Physiological Alerts ({patientAlerts.length})
        </h3>

        {patientAlerts.length === 0 ? (
          <GlassCard className="p-8 text-center border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">All Parameters Normal</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No clinical safety alerts are currently active for your monitoring session. Your continuous telemetry is synchronized.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {patientAlerts.map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';
              return (
                <GlassCard
                  key={alert.id}
                  className={`p-4 border ${
                    isCrit ? 'border-rose-500/40 bg-rose-950/10' : 'border-amber-500/30 bg-amber-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isCrit ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                        <p className="text-xs text-slate-300 mt-0.5">{alert.message}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{alert.timestamp}</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
