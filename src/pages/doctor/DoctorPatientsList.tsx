import React, { useState } from 'react';
import { Users, Search, LayoutGrid, List, ArrowRight, Cpu } from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import { GlassCard } from '../../components/common/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MiniSparkline } from '../../components/charts/MiniSparkline';

interface DoctorPatientsListProps {
  onSelectPatient: (patientId: string) => void;
}

export const DoctorPatientsList: React.FC<DoctorPatientsListProps> = ({ onSelectPatient }) => {
  const { patients } = useVitals();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const wards = Array.from(new Set(patients.map((p) => p.ward)));

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.deviceId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'STABLE' && p.status === 'STABLE') ||
      (statusFilter === 'WARNING' && p.status === 'WARNING') ||
      (statusFilter === 'CRITICAL' && p.status === 'CRITICAL') ||
      (statusFilter === 'OFFLINE' && p.status === 'OFFLINE');

    const matchesWard = wardFilter === 'ALL' || p.ward === wardFilter;

    return matchesSearch && matchesStatus && matchesWard;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-cyan-400" />
            Patient Directory & Wards
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Monitoring {patients.length} telemetry-connected patients across hospital wards
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl border transition-colors ${
              viewMode === 'grid'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-xl border transition-colors ${
              viewMode === 'table'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-3 border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID (P-001), Room, or Device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Patient Status"
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="ALL">All Health Status</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="WARNING">🟡 Warning Only</option>
            <option value="STABLE">🟢 Stable Only</option>
            <option value="OFFLINE">⚪ Offline Only</option>
          </select>

          {/* Ward filter */}
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            aria-label="Filter by Hospital Ward"
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="ALL">All Hospital Wards</option>
            {wards.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing <strong className="text-white">{filtered.length}</strong> of {patients.length}
        </span>
      </GlassCard>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((patient) => {
            const isCritical = patient.status === 'CRITICAL';
            const isWarning = patient.status === 'WARNING';

            return (
              <GlassCard
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={`p-5 cursor-pointer flex flex-col justify-between border-slate-800/80 hover:border-cyan-500/40 hover:-translate-y-1 transition-all ${
                  isCritical ? 'border-rose-500/30 glass-panel-danger-glow' : isWarning ? 'border-amber-500/30' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-cyan-400">
                        {patient.id}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm">{patient.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {patient.room} • {patient.ward}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={patient.status} size="sm" />
                  </div>

                  {/* Vitals Summary Row */}
                  <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Heart Rate</span>
                      <div className={`font-bold text-sm ${isCritical ? 'text-rose-400' : 'text-white'}`}>
                        {patient.vitals.heartRate} <span className="text-[9px] text-slate-400">BPM</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">SpO₂</span>
                      <div className={`font-bold text-sm ${isCritical ? 'text-rose-400' : 'text-cyan-300'}`}>
                        {patient.vitals.spo2}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Temp</span>
                      <div className={`font-bold text-sm ${isCritical ? 'text-rose-400' : 'text-emerald-300'}`}>
                        {patient.vitals.temperature}°C
                      </div>
                    </div>
                  </div>

                  {/* Sparklines */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">HR Sparkline:</span>
                    <MiniSparkline
                      data={patient.sparklineHR}
                      color={isCritical ? 'rose' : isWarning ? 'amber' : 'green'}
                      width={90}
                      height={18}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px] flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    {patient.deviceId}
                  </span>
                  <span className="text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Monitor <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <GlassCard className="p-5 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-3">Patient ID</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Ward / Room</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Heart Rate</th>
                  <th className="py-3 px-3">SpO₂</th>
                  <th className="py-3 px-3">Temperature</th>
                  <th className="py-3 px-3">Device ID</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => onSelectPatient(patient.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-cyan-300 font-bold">{patient.id}</td>
                    <td className="py-3 px-3 font-sans font-semibold text-white">{patient.name}</td>
                    <td className="py-3 px-3 text-slate-400">{patient.ward} • {patient.room}</td>
                    <td className="py-3 px-3 font-sans">
                      <StatusBadge status={patient.status} size="sm" />
                    </td>
                    <td className="py-3 px-3">{patient.vitals.heartRate} BPM</td>
                    <td className="py-3 px-3 text-cyan-300">{patient.vitals.spo2}%</td>
                    <td className="py-3 px-3 text-emerald-300">{patient.vitals.temperature}°C</td>
                    <td className="py-3 px-3 text-slate-400">{patient.deviceId}</td>
                    <td className="py-3 px-3 text-right">
                      <button className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-semibold">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
