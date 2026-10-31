import React, { useState } from 'react';
import { User, Cpu, HeartHandshake, Shield, Phone, Mail, Stethoscope, Edit3, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVitals } from '../../context/VitalsContext';
import { GlassCard } from '../../components/common/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';

export const PatientProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { patients } = useVitals();

  // Find active patient record or fallback to user profile / initial mock
  const patient = patients.find((p) => p.id === user?.patientId) || patients[0];

  const emergencyInfo = patient?.emergencyInfo || {
    age: user?.emergencyInfo?.age || 58,
    gender: user?.emergencyInfo?.gender || 'Male',
    emergencyContactName: user?.emergencyInfo?.emergencyContactName || 'Sunita Kumar',
    emergencyContactNumber: user?.emergencyInfo?.emergencyContactNumber || '+91 98450 67890',
    relationship: user?.emergencyInfo?.relationship || 'Spouse (Wife)',
  };

  const patientEmail = user?.email || patient?.email || 'patient@pulseguard.com';
  const patientName = user?.name || patient?.name || 'Ramesh Kumar';
  const patientId = user?.patientId || patient?.id || 'P-001';
  const deviceId = user?.deviceId || patient?.deviceId || 'PG-001';
  const assignedDoctor = user?.assignedDoctor || patient?.assignedDoctor || 'Dr. Anil Kumar';

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: patientName,
    email: patientEmail,
    age: emergencyInfo.age,
    gender: emergencyInfo.gender,
    emergencyContactName: emergencyInfo.emergencyContactName,
    emergencyContactNumber: emergencyInfo.emergencyContactNumber,
    relationship: emergencyInfo.relationship,
  });

  const handleStartEdit = () => {
    setFormData({
      name: patientName,
      email: patientEmail,
      age: emergencyInfo.age,
      gender: emergencyInfo.gender,
      emergencyContactName: emergencyInfo.emergencyContactName,
      emergencyContactNumber: emergencyInfo.emergencyContactNumber,
      relationship: emergencyInfo.relationship,
    });
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: formData.name,
      email: formData.email,
      emergencyInfo: {
        age: Number(formData.age),
        gender: formData.gender as 'Male' | 'Female' | 'Other',
        emergencyContactName: formData.emergencyContactName,
        emergencyContactNumber: formData.emergencyContactNumber,
        relationship: formData.relationship,
      },
    });

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-10">
      {/* Header Profile Hero Card */}
      <GlassCard className="p-6 sm:p-8 relative overflow-hidden border-cyan-500/25">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'}
              alt={patientName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/10"
            />

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{patientName}</h1>
                <StatusBadge status={patient?.status || 'STABLE'} size="md" />
              </div>

              <p className="text-xs sm:text-sm text-cyan-400 font-mono">
                Patient ID: {patientId} • Assigned Device: {deviceId}
              </p>

              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Active telemetry node enrolled in PulseGuard continuous optical PPG & physiological temperature monitoring.
              </p>
            </div>
          </div>

          {/* Edit Profile Action Button */}
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/10 shrink-0 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>

        {/* Save confirmation toast */}
        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Profile and emergency information updated successfully!</span>
          </div>
        )}

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </GlassCard>

      {/* 3 VISUALLY SEPARATE PROFILE SECTIONS AS REQUIRED */}
      <form onSubmit={handleSaveProfile} className="space-y-5">
        {/* 1. PERSONAL INFORMATION */}
        <GlassCard className="p-6 border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Personal Information</h3>
                <p className="text-[11px] text-slate-400">Your core account demographics</p>
              </div>
            </div>
            {isEditing && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                EDITING MODE
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Full Name
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-cyan-500"
                  required
                />
              ) : (
                <p className="font-bold text-white text-sm">{patientName}</p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Patient ID
              </span>
              <p className="font-mono font-bold text-cyan-300 text-sm">{patientId}</p>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Permanent identifier</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address
              </span>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              ) : (
                <p className="font-mono text-slate-200 text-xs truncate" title={patientEmail}>
                  {patientEmail}
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* 2. DEVICE INFORMATION */}
        <GlassCard className="p-6 border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-slate-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Device Information</h3>
              <p className="text-[11px] text-slate-400">Assigned telemetry transmitter & physician</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Device ID
              </span>
              <p className="font-mono font-bold text-emerald-300 text-sm">{deviceId}</p>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                MAX30102 Optical • Medical NTC Sensor
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                <Stethoscope className="w-3.5 h-3.5 text-cyan-400" /> Assigned Doctor
              </span>
              <p className="font-bold text-white text-sm">{assignedDoctor}</p>
              <span className="text-[10px] text-cyan-400/80 mt-1 block">
                Chief Cardiologist & Telemetry Director
              </span>
            </div>
          </div>
        </GlassCard>

        {/* 3. EMERGENCY INFORMATION (Editable) */}
        <GlassCard className="p-6 border-rose-500/20 bg-slate-950/60 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-300">
                  Emergency Information
                </h3>
                <p className="text-[11px] text-slate-400">
                  Stored securely for medical safety • Kept off primary monitoring dashboard
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              CONFIDENTIAL EMERGENCY RECORD
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-1">
            {/* Age */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Age</span>
              {isEditing ? (
                <input
                  type="number"
                  min="1"
                  max="125"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1 text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-500"
                  required
                />
              ) : (
                <p className="font-bold font-mono text-white text-sm">{emergencyInfo.age} Yrs</p>
              )}
            </div>

            {/* Gender */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Gender</span>
              {isEditing ? (
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p className="font-bold text-white text-sm">{emergencyInfo.gender}</p>
              )}
            </div>

            {/* Emergency Contact Name */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-1">Emergency Contact</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1 text-white font-bold text-sm focus:outline-none focus:border-rose-500"
                  required
                />
              ) : (
                <p className="font-bold text-white text-sm truncate" title={emergencyInfo.emergencyContactName}>
                  {emergencyInfo.emergencyContactName}
                </p>
              )}
            </div>

            {/* Relationship */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Relationship</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-rose-500"
                  required
                />
              ) : (
                <p className="font-bold text-slate-200 text-sm">{emergencyInfo.relationship}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-400 flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3 text-rose-400" /> Phone Number
              </span>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.emergencyContactNumber}
                  onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })}
                  className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1 text-rose-300 font-mono font-bold text-xs focus:outline-none focus:border-rose-500"
                  required
                />
              ) : (
                <a
                  href={`tel:${emergencyInfo.emergencyContactNumber}`}
                  className="font-mono font-bold text-rose-400 text-xs hover:underline block truncate"
                >
                  {emergencyInfo.emergencyContactNumber}
                </a>
              )}
            </div>
          </div>

          {/* Action buttons inside emergency card if editing */}
          {isEditing && (
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Profile Details</span>
              </button>
            </div>
          )}
        </GlassCard>
      </form>
    </div>
  );
};
