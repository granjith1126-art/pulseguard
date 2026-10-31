import React, { useState } from 'react';
import { FileText, Printer, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useVitals } from '../../context/VitalsContext';
import { GlassCard } from '../../components/common/GlassCard';

export const DoctorReportsPage: React.FC = () => {
  const { patients } = useVitals();
  const [selectedPatientId, setSelectedPatientId] = useState('P-001');
  const [startDate, setStartDate] = useState('2026-08-24');
  const [endDate, setEndDate] = useState('2026-08-29');
  const [reportGenerated, setReportGenerated] = useState(true);

  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const handleGenerateReport = () => {
    setReportGenerated(true);
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {}
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            Medical Telemetry Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Generate and export official biometric monitoring summaries for clinical records
          </p>
        </div>

        {reportGenerated && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Print PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Report Generator Controls Form */}
      <GlassCard className="p-5 border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Report Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Select Patient */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Select Patient</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id} - {p.room})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Monitoring Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Monitoring End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Official Clinical Report Preview Card */}
      {reportGenerated && (
        <GlassCard className="p-6 sm:p-8 border-cyan-500/30 bg-[#0a0f1d] print:bg-white print:text-black shadow-2xl relative overflow-hidden">
          {/* Hospital Watermark & Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-bold text-xl">
                PG
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-wider">
                  PULSEGUARD MEDICAL TELEMETRY CENTER
                </h2>
                <p className="text-xs text-cyan-400 font-mono">
                  Smart IoT Patient Monitoring • Cardiology & ICU Services
                </p>
              </div>
            </div>

            <div className="text-right text-xs font-mono text-slate-400">
              <div>Report Ref: <strong className="text-white">RPT-2026-0829-01</strong></div>
              <div>Generated: {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* Patient Demographics Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400">Patient Name:</span>
              <p className="font-bold text-white mt-0.5">{patient.name}</p>
            </div>
            <div>
              <span className="text-slate-400">Patient ID & Room:</span>
              <p className="font-bold text-cyan-300 font-mono mt-0.5">{patient.id} • {patient.room}</p>
            </div>
            <div>
              <span className="text-slate-400">Age / Gender:</span>
              <p className="font-bold text-white mt-0.5">
                {patient.emergencyInfo?.age || 58} Yrs / {patient.emergencyInfo?.gender || 'Male'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Monitoring Device:</span>
              <p className="font-bold text-emerald-400 font-mono mt-0.5">{patient.deviceId}</p>
            </div>
          </div>

          {/* Monitoring Period & Executive Summary */}
          <div className="space-y-4 my-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Monitoring Period: {startDate} – {endDate}
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ● Overall Status: {patient.status}
              </span>
            </div>

            {/* Vital Statistics Summary Table */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase">Average HR</span>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1">78 <span className="text-xs font-sans text-slate-400">BPM</span></div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">60-100 Normal</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase">Average SpO₂</span>
                <div className="text-xl font-bold font-mono text-cyan-300 mt-1">97.8%</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">&gt;95% Target</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase">Average Temp</span>
                <div className="text-xl font-bold font-mono text-emerald-300 mt-1">36.8°C</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Normothermic</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase">Total Alerts</span>
                <div className="text-xl font-bold font-mono text-amber-300 mt-1">2</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">All Resolved</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase">Device Uptime</span>
                <div className="text-xl font-bold font-mono text-purple-300 mt-1">98.4%</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Reliable Link</span>
              </div>
            </div>
          </div>

          {/* Clinical Assessment & Doctor Sign-off */}
          <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Physician Clinical Evaluation
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                Continuous optical PPG and temperature telemetry reveal stable cardiovascular hemodynamic parameters.
                No persistent nocturnal hypoxia or arrhythmia noted during the selected interval. Continue current medication protocol.
              </p>
            </div>

            <div className="flex flex-col justify-end text-right">
              <div className="inline-block self-end border-b border-cyan-500/40 pb-2 w-48 text-center font-display text-cyan-400 font-bold text-sm tracking-wider">
                Dr. Smith, M.D.
              </div>
              <div className="text-xs font-semibold text-white mt-1">Dr. Smith</div>
              <div className="text-[11px] text-slate-400">Chief Cardiologist & Telemetry Director</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">PulseGuard Verified Digital Signature</div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
