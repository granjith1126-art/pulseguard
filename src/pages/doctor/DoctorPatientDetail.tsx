import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  Droplets,
  Thermometer,
  Activity,
  Download,
  Plus,
  HeartHandshake,
  Phone,
  User,
  X,
  Send,
  Sliders,
  History,
  FileText,
  Clock,
  MapPin,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import type { TimeRange } from '../../types/vitals';
import type { HistoricalVitalPoint, VitalSummaryStats } from '../../services/dataService';
import { dataService } from '../../services/dataService';
import { GlassCard } from '../../components/common/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PPGWaveformCanvas } from '../../components/vitals/PPGWaveformCanvas';
import { DeviceHealthCard } from '../../components/vitals/DeviceHealthCard';
import { VitalTrendChart } from '../../components/charts/VitalTrendChart';
import { HistoricalSessionViewer } from '../../components/vitals/HistoricalSessionViewer';

interface DoctorPatientDetailProps {
  patientId: string;
  onBack: () => void;
}

export const DoctorPatientDetail: React.FC<DoctorPatientDetailProps> = ({
  patientId,
  onBack,
}) => {
  const { patients } = useVitals();
  const patient = patients.find((p) => p.id === patientId) || patients[0];
  const isMockPatient = ['P-101', 'P-102', 'P-103', 'P-104'].includes(patient?.id);

  const [activeTab, setActiveTab] = useState<'live' | 'trends' | 'history' | 'events' | 'notes' | 'device'>(
    isMockPatient ? 'history' : 'live'
  );
  const [timeRange, setTimeRange] = useState<TimeRange>('1H');

  const [historyData, setHistoryData] = useState<{
    points: HistoricalVitalPoint[];
    hrStats: VitalSummaryStats;
    spo2Stats: VitalSummaryStats;
    tempStats: VitalSummaryStats;
  } | null>(null);

  // Emergency Information Modal State
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  // Notes state
  const [clinicalNotes, setClinicalNotes] = useState<Array<{
    id: string;
    patientId: string;
    doctorName: string;
    timestamp: string;
    title: string;
    content: string;
    category: 'Observation' | 'Prescription' | 'Follow-up' | 'Emergency';
  }>>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'Observation' | 'Prescription' | 'Follow-up' | 'Emergency'>('Observation');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (!patient) return;
    dataService.getPatientHistory(patient.id, timeRange).then(setHistoryData);
    dataService.getClinicalNotes(patient.id).then(setClinicalNotes);
  }, [patient?.id, timeRange]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim() || !patient) return;

    const note = await dataService.addClinicalNote({
      patientId: patient.id,
      doctorName: 'Dr. Anil Kumar',
      title: newNoteTitle,
      content: newNoteContent,
      category: newNoteCategory,
    });

    setClinicalNotes((prev) => [note, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  const handleExportCSV = () => {
    if (!historyData || !patient) return;

    const headers = ['Timestamp', 'Time', 'HeartRate_BPM', 'SpO2_Percent', 'Temperature_C', 'RespirationRate', 'SystolicBP', 'DiastolicBP'];
    const rows = historyData.points.map((p) => [
      p.timestamp,
      p.timeLabel,
      p.heartRate,
      p.spo2,
      p.temperature,
      p.respirationRate,
      p.bloodPressureSystolic,
      p.bloodPressureDiastolic,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${patient.name}_${patient.id}_telemetry_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!patient) return null;

  const emergencyInfo = patient.emergencyInfo || {
    age: 58,
    gender: 'Male',
    emergencyContactName: 'Sunita Kumar',
    emergencyContactNumber: '+91 98450 67890',
    relationship: 'Spouse',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Patients</span>
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-wide">
                {patient.name}
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {patient.id}
              </span>
              <StatusBadge status={patient.status} size="sm" />
            </div>
            {/* Clean physiological header without age/gender */}
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Device: <strong className="text-cyan-400">{patient.deviceId}</strong> • Room: {patient.room} • {patient.ward}
            </p>
          </div>
        </div>

        {/* Action Buttons & View Emergency Info */}
        <div className="flex items-center gap-2.5">
          {/* Dedicated View Emergency Information Button */}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-all shadow-sm shadow-rose-500/10"
          >
            <HeartHandshake className="w-4 h-4 text-rose-400" />
            <span>View Emergency Info</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Export History</span>
          </button>
        </div>
      </div>

      {/* Real-time Physiological Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Heart Rate */}
        <GlassCard className="p-3.5 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
            <Heart className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Heart Rate</span>
            <div className="font-mono font-bold text-lg text-rose-300">
              {patient.vitals.heartRate} <span className="text-xs font-normal text-slate-400">BPM</span>
            </div>
          </div>
        </GlassCard>

        {/* SpO2 */}
        <GlassCard className="p-3.5 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">SpO₂</span>
            <div className="font-mono font-bold text-lg text-cyan-300">
              {patient.vitals.spo2}%
            </div>
          </div>
        </GlassCard>

        {/* Temperature */}
        <GlassCard className="p-3.5 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Body Temp</span>
            <div className="font-mono font-bold text-lg text-emerald-300">
              {patient.vitals.temperature}°C
            </div>
          </div>
        </GlassCard>

        {/* Respiration Rate */}
        <GlassCard className="p-3.5 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Respiration</span>
            <div className="font-mono font-bold text-lg text-purple-300">
              {patient.vitals.respirationRate || 16} <span className="text-xs text-slate-400">/min</span>
            </div>
          </div>
        </GlassCard>

        {/* Blood Pressure */}
        <GlassCard className="p-3.5 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Blood Pressure</span>
            <div className="font-mono font-bold text-base text-blue-300">
              {patient.vitals.bloodPressureSystolic || 120}/{patient.vitals.bloodPressureDiastolic || 80}
            </div>
          </div>
        </GlassCard>

        {/* Perfusion Index */}
        <GlassCard className="p-3.5 border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Perfusion Idx</span>
            <div className="font-mono font-bold text-lg text-amber-300">
              {patient.vitals.perfusionIndex}%
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 5 Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto">
        {[
          {
            id: 'history',
            label: isMockPatient ? 'Historical Sessions & Graphs' : 'History Analytics',
            icon: History,
          },
          { id: 'live', label: 'Live Telemetry & PPG', icon: Activity },
          { id: 'trends', label: 'Vital Trends', icon: Sliders },
          { id: 'notes', label: 'Clinical Notes', icon: FileText },
          { id: 'device', label: 'Device Diagnostics', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'history' && isMockPatient && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  6 Sessions
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE VIEW */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {isMockPatient && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SYNTHETIC DEMO PATIENT
                </span>
                <span className="text-slate-300">
                  Historical telemetry sessions recorded across October 2026. Standby mode active.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-xs shrink-0 self-start sm:self-auto"
              >
                Open Historical Sessions & Graphs →
              </button>
            </div>
          )}

          <PPGWaveformCanvas
            heartRate={patient.vitals.heartRate}
            spo2={patient.vitals.spo2}
            signalQuality={patient.vitals.signalQuality}
            patientId={patient.id}
            showControls={true}
            isCompact={false}
          />

          {/* Quick Trends Grid (1H) */}
          {historyData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VitalTrendChart
                title="Heart Rate"
                data={historyData.points}
                dataKey="heartRate"
                color="rose"
                stats={historyData.hrStats}
                unit="BPM"
                minLimit={60}
                maxLimit={100}
                timeRangeLabel="1H"
              />
              <VitalTrendChart
                title="SpO₂ Saturation"
                data={historyData.points}
                dataKey="spo2"
                color="cyan"
                stats={historyData.spo2Stats}
                unit="%"
                minLimit={95}
                timeRangeLabel="1H"
              />
              <VitalTrendChart
                title="Body Temperature"
                data={historyData.points}
                dataKey="temperature"
                color="green"
                stats={historyData.tempStats}
                unit="°C"
                maxLimit={37.5}
                timeRangeLabel="1H"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VITAL TRENDS */}
      {activeTab === 'trends' && (
        isMockPatient ? (
          <HistoricalSessionViewer
            patientId={patient.id}
            patientName={patient.name}
            isDoctorView={true}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Synchronized Multi-Parameter Trends
              </h3>
              <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {(['1H', '6H', '12H', '24H', '7D'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      timeRange === r
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {historyData && (
              <div className="space-y-4">
                <VitalTrendChart
                  title="Heart Rate Continuous Profile"
                  data={historyData.points}
                  dataKey="heartRate"
                  color="rose"
                  stats={historyData.hrStats}
                  unit="BPM"
                  minLimit={60}
                  maxLimit={100}
                  timeRangeLabel={timeRange}
                />
                <VitalTrendChart
                  title="Oxygen Saturation (SpO₂)"
                  data={historyData.points}
                  dataKey="spo2"
                  color="cyan"
                  stats={historyData.spo2Stats}
                  unit="%"
                  minLimit={95}
                  timeRangeLabel={timeRange}
                />
                <VitalTrendChart
                  title="Skin & Body Core Temperature"
                  data={historyData.points}
                  dataKey="temperature"
                  color="green"
                  stats={historyData.tempStats}
                  unit="°C"
                  maxLimit={37.5}
                  timeRangeLabel={timeRange}
                />
              </div>
            )}
          </div>
        )
      )}

      {/* TAB 3: HISTORY RAW DATA */}
      {activeTab === 'history' && (
        isMockPatient ? (
          <HistoricalSessionViewer
            patientId={patient.id}
            patientName={patient.name}
            isDoctorView={true}
          />
        ) : (
          historyData && (
            <GlassCard className="p-5 border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Historical Telemetry Logs ({historyData.points.length} Records)
                </h3>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">HR (BPM)</th>
                      <th className="py-2.5 px-3">SpO₂ (%)</th>
                      <th className="py-2.5 px-3">Temp (°C)</th>
                      <th className="py-2.5 px-3">Resp Rate</th>
                      <th className="py-2.5 px-3">BP (Sys/Dia)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {historyData.points.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400">{pt.timeLabel}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-200">{pt.heartRate}</td>
                        <td className="py-2.5 px-3 text-cyan-300">{pt.spo2}%</td>
                        <td className="py-2.5 px-3 text-emerald-300">{pt.temperature}°C</td>
                        <td className="py-2.5 px-3">{pt.respirationRate} /min</td>
                        <td className="py-2.5 px-3">
                          {pt.bloodPressureSystolic}/{pt.bloodPressureDiastolic}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )
        )
      )}

      {/* TAB 4: CLINICAL NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Physician Consultation & Observation Notes
            </h3>
            <button
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Clinical Note</span>
            </button>
          </div>

          {isAddingNote && (
            <GlassCard className="p-5 border-cyan-500/40">
              <form onSubmit={handleAddNote} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">Note Title</label>
                    <input
                      type="text"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="e.g. Post-stabilization review"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Category</label>
                    <select
                      value={newNoteCategory}
                      onChange={(e) =>
                        setNewNoteCategory(
                          e.target.value as 'Observation' | 'Prescription' | 'Follow-up' | 'Emergency'
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Observation">Observation</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Clinical Assessment</label>
                  <textarea
                    rows={3}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write detailed patient diagnostic assessment..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Notes List */}
          <div className="space-y-3">
            {clinicalNotes.map((note) => (
              <GlassCard key={note.id} className="p-5 border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {note.category}
                    </span>
                    <h4 className="font-bold text-white text-sm">{note.title}</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {note.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                  {note.content}
                </p>
                <div className="text-[11px] text-slate-400 font-semibold">
                  Recorded by: <strong className="text-slate-200">{note.doctorName}</strong>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: DEVICE DIAGNOSTICS */}
      {activeTab === 'device' && (
        <DeviceHealthCard device={patient.deviceStatus} />
      )}

      {/* ========================================================================= */}
      {/* EMERGENCY INFORMATION MODAL (OPENS ON CLICKING "VIEW EMERGENCY INFO") */}
      {/* ========================================================================= */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-2xl p-6 glass-panel shadow-2xl space-y-5 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Emergency Information</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Patient: <strong className="text-white">{patient.name}</strong> ({patient.id})
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

            {/* Emergency Information Fields */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Age</span>
                <p className="font-mono font-bold text-white text-base">{emergencyInfo.age} Yrs</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Gender</span>
                <p className="font-bold text-white text-base">{emergencyInfo.gender}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-rose-400" /> Emergency Contact
                </span>
                <p className="font-bold text-white text-sm">{emergencyInfo.emergencyContactName}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block mb-1">Relationship</span>
                <p className="font-bold text-slate-200 text-sm">{emergencyInfo.relationship}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 col-span-2">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-rose-400" /> Emergency Contact Number
                </span>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="font-mono font-bold text-rose-400 text-base">
                    {emergencyInfo.emergencyContactNumber}
                  </span>
                  <a
                    href={`tel:${emergencyInfo.emergencyContactNumber}`}
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
