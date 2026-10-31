import React, { useState, useEffect } from 'react';
import {
  Users,
  Wifi,
  AlertTriangle,
  Bell,
  Cpu,
  Search,
  Activity,
  Heart,
  Droplets,
  Thermometer,
  Radio,
  Clock,
  ExternalLink,
  HeartHandshake,
  Phone,
  User,
  X,
  MapPin,
  Navigation,
} from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import { GlassCard } from '../../components/common/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MiniSparkline } from '../../components/charts/MiniSparkline';
import { PPGWaveformCanvas } from '../../components/vitals/PPGWaveformCanvas';
import { VitalTrendChart } from '../../components/charts/VitalTrendChart';
import { dataService } from '../../services/dataService';
import type { HistoricalVitalPoint, VitalSummaryStats } from '../../services/dataService';

interface DoctorDashboardProps {
  onNavigateToPatient: (patientId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  onNavigateToPatient,
  onNavigateTab,
}) => {
  const {
    patients,
    setSelectedPatientId,
    selectedPatient,
    alerts,
    events,
    totalPatientsCount,
    onlinePatientsCount,
    activeAlertsCount,
    criticalAlertsCount,
    onlineDevicesCount,
    wsConnectionState,
    isMatlabEngineActive,
    activeScenario,
    setScenario,
  } = useVitals();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [patientTab, setPatientTab] = useState<'live' | 'trends' | 'history' | 'events' | 'notes'>('live');
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [historyData, setHistoryData] = useState<{
    points: HistoricalVitalPoint[];
    hrStats: VitalSummaryStats;
    spo2Stats: VitalSummaryStats;
    tempStats: VitalSummaryStats;
  } | null>(null);

  // Load 1H trends for the currently selected patient
  useEffect(() => {
    if (selectedPatient) {
      dataService.getPatientHistory(selectedPatient.id, '1H').then(setHistoryData);
    }
  }, [selectedPatient?.id]);

  // Filter patients for overview table
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.room.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'ALL') return matchesSearch;
    if (filterStatus === 'CRITICAL') return matchesSearch && p.status === 'CRITICAL';
    if (filterStatus === 'WARNING') return matchesSearch && p.status === 'WARNING';
    if (filterStatus === 'ONLINE') return matchesSearch && p.status === 'STABLE';
    return matchesSearch;
  });

  const activePatient = selectedPatient || patients[0];
  if (!activePatient) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* MATLAB Telemetry & Clinical Scenario Simulator Bar */}
      <GlassCard className="p-3.5 sm:p-4 border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">MATLAB Clinical Engine Stream</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold">
                {isMatlabEngineActive ? 'ENGINE CONNECTED' : 'SIMULATION MODE'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {wsConnectionState === 'CONNECTED' ? '● WebSocket Active' : '○ Standby'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Active Patient: <strong className="text-white">{activePatient.name} ({activePatient.id})</strong> • Test scenario:
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setScenario('NORMAL')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeScenario === 'NORMAL'
                ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            🟢 NORMAL
          </button>
          <button
            onClick={() => setScenario('WARNING')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeScenario === 'WARNING'
                ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            🟡 WARNING
          </button>
          <button
            onClick={() => setScenario('CRITICAL')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeScenario === 'CRITICAL'
                ? 'bg-rose-500/30 border-rose-500 text-rose-300 shadow-md shadow-rose-500/30 animate-pulse'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            🔴 CRITICAL TEST
          </button>
        </div>
      </GlassCard>

      {/* Top 5 KPI Stat Blocks (Exactly Matching Reference Image) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Patients */}
        <GlassCard className="p-4 sm:p-5 flex flex-col justify-between border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Patients
            </span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
              {totalPatientsCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">All wards</span>
          </div>
        </GlassCard>

        {/* Card 2: Patients Online */}
        <GlassCard className="p-4 sm:p-5 flex flex-col justify-between border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Patients Online
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              onlinePatientsCount > 0
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-slate-400 bg-slate-800 border-slate-700'
            }`}>
              {totalPatientsCount > 0 ? `${Math.round((onlinePatientsCount / totalPatientsCount) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-extrabold font-mono ${
              onlinePatientsCount > 0 ? 'text-emerald-400' : 'text-slate-500'
            }`}>
              {onlinePatientsCount}
            </span>
            {onlinePatientsCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            )}
          </div>
        </GlassCard>

        {/* Card 3: Active Alerts */}
        <GlassCard className="p-4 sm:p-5 flex flex-col justify-between border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Alerts
            </span>
            <button
              onClick={() => onNavigateTab('alerts')}
              className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono">
              {activeAlertsCount}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
        </GlassCard>

        {/* Card 4: Critical Alerts */}
        <GlassCard className={`p-4 sm:p-5 flex flex-col justify-between border-slate-800 ${
          criticalAlertsCount > 0 ? 'border-rose-500/30 glass-panel-danger-glow' : ''
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              criticalAlertsCount > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              Critical Alerts
            </span>
            <Bell className={`w-4 h-4 ${
              criticalAlertsCount > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-500'
            }`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-extrabold font-mono ${
              criticalAlertsCount > 0 ? 'text-rose-400 text-glow-rose' : 'text-slate-400'
            }`}>
              {criticalAlertsCount}
            </span>
            {criticalAlertsCount > 0 ? (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded uppercase">
                Immediate Action
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">
                None Active
              </span>
            )}
          </div>
        </GlassCard>

        {/* Card 5: Devices Online */}
        <GlassCard className="p-4 sm:p-5 flex flex-col justify-between border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Devices Online
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              onlineDevicesCount > 0
                ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                : 'text-slate-400 bg-slate-800 border-slate-700'
            }`}>
              {totalPatientsCount > 0 ? `${Math.round((onlineDevicesCount / totalPatientsCount) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-extrabold font-mono ${
              onlineDevicesCount > 0 ? 'text-cyan-400' : 'text-slate-500'
            }`}>
              {onlineDevicesCount}
            </span>
            <Wifi className={`w-4 h-4 ${onlineDevicesCount > 0 ? 'text-cyan-400' : 'text-slate-600'}`} />
          </div>
        </GlassCard>
      </div>

      {/* Main Command Center Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / MAIN COLUMN (8 of 12 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: PATIENTS OVERVIEW Table */}
          <GlassCard className="p-5 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                  Patients Overview
                </h3>
                <span className="text-xs text-slate-400 font-mono">({patients.length} Registered)</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onNavigateTab('patients')}
                  className="text-xs text-cyan-400 hover:underline font-semibold"
                >
                  View All Patients
                </button>

                {/* Inline Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900/90 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-36 sm:w-44"
                  />
                </div>

                {/* Filter Dropdown */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter Patients by Status"
                  className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="WARNING">Warning</option>
                  <option value="ONLINE">Stable</option>
                </select>
              </div>
            </div>

            {/* Patients Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">HR (BPM)</th>
                    <th className="py-2.5 px-3">SpO₂ (%)</th>
                    <th className="py-2.5 px-3">Temp (°C)</th>
                    <th className="py-2.5 px-3 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredPatients.slice(0, 5).map((patient) => {
                    const isSelected = patient.id === activePatient.id;
                    const isCritical = patient.status === 'CRITICAL';
                    const isWarning = patient.status === 'WARNING';

                    return (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/10 text-white font-semibold'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        {/* Patient Name & ID */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-sans font-bold text-xs text-cyan-400">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-sans font-semibold text-slate-200">
                                {patient.name}
                              </div>
                              <div className="text-[10px] text-slate-400">{patient.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 font-sans">
                          <StatusBadge status={patient.status} size="sm" />
                        </td>

                        {/* HR with Mini Sparkline */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={isCritical ? 'text-rose-400 font-bold' : ''}>
                              {patient.vitals.heartRate}
                            </span>
                            <MiniSparkline
                              data={patient.sparklineHR}
                              color={isCritical ? 'rose' : isWarning ? 'amber' : 'green'}
                              width={48}
                              height={16}
                            />
                          </div>
                        </td>

                        {/* SpO2 with Mini Sparkline */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={isCritical ? 'text-rose-400 font-bold' : ''}>
                              {patient.vitals.spo2}%
                            </span>
                            <MiniSparkline
                              data={patient.sparklineSpO2}
                              color={isCritical ? 'rose' : 'cyan'}
                              width={48}
                              height={16}
                            />
                          </div>
                        </td>

                        {/* Temperature with Mini Sparkline */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={isCritical ? 'text-rose-400 font-bold' : ''}>
                              {patient.vitals.temperature}°C
                            </span>
                            <MiniSparkline
                              data={patient.sparklineTemp}
                              color={isCritical ? 'rose' : 'green'}
                              width={48}
                              height={16}
                            />
                          </div>
                        </td>

                        {/* Last Updated */}
                        <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                          {patient.lastUpdatedSecondsAgo} sec ago
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Section 2: Selected Patient Detailed Monitoring Workspace */}
          <GlassCard className="p-5 border-cyan-500/20">
            {/* Active Patient Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-[1.5px]">
                  <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-bold text-sm text-cyan-300">
                    {activePatient.id}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {activePatient.name} ({activePatient.id})
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
                      Live Monitoring
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Device ID: <strong className="text-cyan-400">{activePatient.deviceId}</strong> • Room: {activePatient.room} • {activePatient.ward}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmergencyModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
                  <span>Emergency Info</span>
                </button>
                <button
                  onClick={() => onNavigateToPatient(activePatient.id)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <span>Full Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 my-4 border-b border-slate-800/80 pb-2">
              {[
                { id: 'live', label: 'Live View' },
                { id: 'trends', label: 'Trends' },
                { id: 'history', label: 'History' },
                { id: 'events', label: 'Events' },
                { id: 'notes', label: 'Notes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPatientTab(tab.id as typeof patientTab)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    patientTab === tab.id
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Live PPG + Current Vitals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
              {/* PPG Waveform (8 cols) */}
              <div className="lg:col-span-8">
                <PPGWaveformCanvas
                  heartRate={activePatient.vitals.heartRate}
                  spo2={activePatient.vitals.spo2}
                  signalQuality={activePatient.vitals.signalQuality}
                  patientId={activePatient.id}
                  showControls={true}
                  isCompact={false}
                />
              </div>

              {/* CURRENT VITALS Column (4 cols) */}
              <div className="lg:col-span-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
                  Current Vitals
                </div>

                {/* Heart Rate */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                      <Heart className="w-4 h-4 animate-heartbeat" />
                    </div>
                    <span className="text-xs text-slate-300 font-medium">Heart Rate</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-white">
                    {activePatient.vitals.heartRate} <span className="text-[10px] text-slate-400">BPM</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-slate-300 font-medium">SpO₂</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-cyan-300">
                    {activePatient.vitals.spo2}%
                  </div>
                </div>

                {/* Temperature */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-slate-300 font-medium">Temperature</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-emerald-300">
                    {activePatient.vitals.temperature}°C
                  </div>
                </div>

                {/* Signal Quality */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                      <Radio className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-slate-300 font-medium">Signal Quality</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-purple-300">
                    {activePatient.vitals.signalQuality}%
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Trend Graphs (1H) */}
            {historyData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <VitalTrendChart
                  title="Heart Rate Trend"
                  data={historyData.points}
                  dataKey="heartRate"
                  color="rose"
                  stats={historyData.hrStats}
                  unit="BPM"
                  timeRangeLabel="1H"
                  showStatsHeader={false}
                />

                <VitalTrendChart
                  title="SpO₂ Trend"
                  data={historyData.points}
                  dataKey="spo2"
                  color="cyan"
                  stats={historyData.spo2Stats}
                  unit="%"
                  timeRangeLabel="1H"
                  showStatsHeader={false}
                />

                <VitalTrendChart
                  title="Temperature Trend"
                  data={historyData.points}
                  dataKey="temperature"
                  color="green"
                  stats={historyData.tempStats}
                  unit="°C"
                  timeRangeLabel="1H"
                  showStatsHeader={false}
                />
              </div>
            )}
          </GlassCard>
        </div>

        {/* RIGHT SIDEBAR / SIDE COLUMN (4 of 12 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Alerts Card */}
          <GlassCard className="p-5 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                  Active Alerts
                </h4>
              </div>
              <button
                onClick={() => onNavigateTab('alerts')}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-6 px-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 mb-2">
                    ✓
                  </div>
                  <div className="text-xs font-semibold text-slate-200">No Active Alerts</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    All biometric parameters are within baseline limits.
                  </p>
                </div>
              ) : (
                alerts.slice(0, 3).map((alert) => {
                  const isCritical = alert.severity === 'CRITICAL';
                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedPatientId(alert.patientId)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isCritical
                          ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20'
                          : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={isCritical ? 'text-rose-400' : 'text-amber-400'}>
                            {isCritical ? '🔴' : '🟡'} {alert.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{alert.timeAgo}</span>
                      </div>

                      <div className="text-xs text-slate-300 font-medium mt-1">
                        {alert.patientName}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Value:</span>
                        <span className={`font-bold ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                          {alert.value}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>

          {/* Recent Events Card */}
          <GlassCard className="p-5 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                  Recent Events
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Live feed</span>
            </div>

            <div className="space-y-3">
              {events.slice(0, 5).map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-3 text-xs p-2 rounded-lg bg-slate-900/40 border border-slate-800/60"
                >
                  <span className="font-mono text-[11px] text-cyan-400 whitespace-nowrap mt-0.5">
                    {evt.timeString}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-200">{evt.patientName}</span>
                    <span className="text-slate-400"> — {evt.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Device Status Card */}
          <GlassCard className="p-5 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                  Device Status
                </h4>
              </div>
              <span className="text-[11px] font-mono text-cyan-300">
                {activePatient.deviceId}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Battery */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Battery</span>
                  <span className="font-mono font-bold text-slate-200">
                    {activePatient.deviceStatus.batteryPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${activePatient.deviceStatus.batteryPercent}%` }}
                  />
                </div>
              </div>

              {/* Signal Strength */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Signal Strength</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {activePatient.deviceStatus.signalStrengthPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${activePatient.deviceStatus.signalStrengthPercent}%` }}
                  />
                </div>
              </div>

              {/* Status and Uptime */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 text-[11px]">Device Status</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
                    {activePatient.deviceStatus.status}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Uptime</span>
                  <div className="font-mono font-semibold text-slate-200 mt-0.5">
                    {activePatient.deviceStatus.uptime}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Bottom Feature Cards (3 Cards from Reference Image) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 pt-2">
        <GlassCard className="p-5 flex items-start gap-4 border-cyan-500/20 bg-gradient-to-br from-slate-900/80 to-cyan-950/20">
          <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Real-Time Monitoring
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Live data from all connected devices with instant updates
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-start gap-4 border-rose-500/20 bg-gradient-to-br from-slate-900/80 to-rose-950/20">
          <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Smart Alerts
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              AI-powered alerts for critical conditions and anomalies
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-start gap-4 border-purple-500/20 bg-gradient-to-br from-slate-900/80 to-purple-950/20">
          <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Comprehensive Analytics
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Detailed insights and trends for better decision making
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Emergency Information Modal */}
      {showEmergencyModal && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-2xl p-6 glass-panel shadow-2xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Emergency Information</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Patient: <strong className="text-white">{activePatient.name}</strong> ({activePatient.id})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowEmergencyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Age</span>
                <p className="font-mono font-bold text-white text-base">
                  {activePatient.emergencyInfo?.age || 58} Yrs
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Gender</span>
                <p className="font-bold text-white text-base">
                  {activePatient.emergencyInfo?.gender || 'Male'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-rose-400" /> Emergency Contact
                </span>
                <p className="font-bold text-white text-sm">
                  {activePatient.emergencyInfo?.emergencyContactName || 'Sunita Kumar'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block mb-1">Relationship</span>
                <p className="font-bold text-slate-200 text-sm">
                  {activePatient.emergencyInfo?.relationship || 'Spouse'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 col-span-2">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-rose-400" /> Emergency Contact Number
                </span>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="font-mono font-bold text-rose-400 text-base">
                    {activePatient.emergencyInfo?.emergencyContactNumber || '+91 98450 67890'}
                  </span>
                  <a
                    href={`tel:${activePatient.emergencyInfo?.emergencyContactNumber || '+919845067890'}`}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/30"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Contact</span>
                  </a>
                </div>
              </div>

              {/* Patient Browser Device Location */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Patient Device Browser Location
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Live Session GPS
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="font-mono text-slate-300">
                    <div>Coordinates: <strong className="text-white">12.9716° N, 77.5946° E</strong> (±15m)</div>
                    <div className="text-[11px] text-slate-400">Bannerghatta Main Rd, ICU Emergency Radius</div>
                  </div>
                  <a
                    href="https://www.google.com/maps?q=12.9716,77.5946"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-center transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
