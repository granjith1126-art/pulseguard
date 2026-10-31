import React, { useState } from 'react';
import {
  Activity,
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Stethoscope,
  User,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Cpu,
  HeartHandshake,
  AlertCircle,
  Phone,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import type { UserRole, PatientRegistrationData, DoctorRegistrationData } from '../../types/auth';
import { GlassCard } from '../../components/common/GlassCard';

type AuthStep =
  | 'CHOOSE_ROLE'
  | 'CHOOSE_REGISTER_ROLE'
  | 'LOGIN'
  | 'REGISTER_PATIENT'
  | 'REGISTER_DOCTOR';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, registerPatient, registerDoctor } = useAuth();

  const [step, setStep] = useState<AuthStep>('CHOOSE_ROLE');
  const [selectedRole, setSelectedRole] = useState<UserRole>('DOCTOR');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSuccess, setForgotSuccess] = useState<boolean>(false);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Patient Registration Form States
  const [patientForm, setPatientForm] = useState<PatientRegistrationData>({
    name: '',
    email: '',
    password: '',
    deviceId: 'PG-001',
    assignedDoctor: 'Dr. Anil Kumar',
    age: 28,
    gender: 'Male',
    emergencyContactName: '',
    emergencyContactNumber: '',
    relationship: 'Father',
  });
  const [patientConfirmPassword, setPatientConfirmPassword] = useState('');

  // Doctor Registration Form States
  const [doctorForm, setDoctorForm] = useState<DoctorRegistrationData>({
    name: '',
    email: '',
    password: '',
    doctorRegistrationId: 'REG-2024-DOC',
  });
  const [doctorConfirmPassword, setDoctorConfirmPassword] = useState('');

  // Handle Role Selection for Login
  const handleSelectRoleForLogin = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'DOCTOR') {
      setLoginEmail('doctor@pulseguard.com');
      setLoginPassword('password123');
    } else {
      setLoginEmail('patient@pulseguard.com');
      setLoginPassword('password123');
    }
    setStep('LOGIN');
  };

  // Handle Role Selection for Registration
  const handleSelectRoleForRegister = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'PATIENT') {
      setStep('REGISTER_PATIENT');
    } else {
      setStep('REGISTER_DOCTOR');
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((res) => setTimeout(res, 350));
      const success = await login(loginEmail, loginPassword, selectedRole);
      if (success) {
        onLoginSuccess();
      }
    } catch {
      setErrorMessage('Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Demo One-Click Login
  const handleQuickDemo = async (role: UserRole) => {
    setIsSubmitting(true);
    setSelectedRole(role);
    const email = role === 'DOCTOR' ? 'doctor@pulseguard.com' : 'patient@pulseguard.com';
    await new Promise((res) => setTimeout(res, 250));
    await login(email, 'demo123', role);
    setIsSubmitting(false);
    onLoginSuccess();
  };

  // Handle Patient Registration Submit
  const handlePatientRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientForm.name.trim() || !patientForm.email.trim() || !patientForm.password.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }
    if (patientForm.password !== patientConfirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }
    if (!patientForm.emergencyContactName.trim() || !patientForm.emergencyContactNumber.trim()) {
      setErrorMessage('Please provide Emergency Contact Name and Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerPatient(patientForm);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
      onLoginSuccess();
    } catch {
      setErrorMessage('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Doctor Registration Submit
  const handleDoctorRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!doctorForm.name.trim() || !doctorForm.email.trim() || !doctorForm.password.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }
    if (doctorForm.password !== doctorConfirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }
    if (!doctorForm.doctorRegistrationId.trim()) {
      setErrorMessage('Please provide your Doctor ID / Registration ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerDoctor(doctorForm);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
      onLoginSuccess();
    } catch {
      setErrorMessage('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070b14] bg-medical-grid relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl space-y-6 relative z-10 animate-fade-in py-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-fuchsia-600 p-[2px] shadow-2xl shadow-cyan-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Activity className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wider text-white">
            PULSE<span className="text-cyan-400">GUARD</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Remote Patient Monitoring Platform
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: INITIAL ROLE SELECTION (CONTINUE AS DOCTOR OR PATIENT) */}
        {/* ========================================================================= */}
        {step === 'CHOOSE_ROLE' && (
          <GlassCard className="p-6 sm:p-8 border-cyan-500/25 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs uppercase font-bold tracking-widest text-cyan-400 font-mono">
                Authentication Portal
              </span>
              <h2 className="text-xl font-bold text-white">Continue as</h2>
              <p className="text-xs text-slate-400">
                Select your authorized portal to sign in or create an account
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Doctor Card */}
              <div className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/50 text-left transition-all duration-300 group shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Physician
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      👨‍⚕️ Doctor Portal
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Access cardiology command center, patient telemetry, and live alerts
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('DOCTOR')}
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20"
                  >
                    <span>⚡ Quick Enter as Doctor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRoleForLogin('DOCTOR')}
                    className="w-full py-1.5 text-center text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    Enter custom credentials →
                  </button>
                </div>
              </div>

              {/* Patient Card */}
              <div className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-all duration-300 group shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <User className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Patient
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      🧑 Patient Portal
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      View your real-time vitals, live PPG trace, history & emergency assistance
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('PATIENT')}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <span>⚡ Quick Enter as Patient</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRoleForLogin('PATIENT')}
                    className="w-full py-1.5 text-center text-xs text-slate-400 hover:text-emerald-300 transition-colors"
                  >
                    Enter custom credentials →
                  </button>
                </div>
              </div>
            </div>

            {/* Create Account Link */}
            <div className="pt-4 border-t border-slate-800 text-center space-y-2">
              <span className="text-xs text-slate-400 block">Don&apos;t have an account?</span>
              <button
                type="button"
                onClick={() => setStep('CHOOSE_REGISTER_ROLE')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all inline-flex items-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Create an Account</span>
              </button>
            </div>
          </GlassCard>
        )}

        {/* ========================================================================= */}
        {/* STEP 1.5: CHOOSE ROLE TO REGISTER AS */}
        {/* ========================================================================= */}
        {step === 'CHOOSE_REGISTER_ROLE' && (
          <GlassCard className="p-6 sm:p-8 border-cyan-500/25 shadow-2xl space-y-6">
            <button
              onClick={() => setStep('CHOOSE_ROLE')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div className="text-center space-y-1">
              <span className="text-xs uppercase font-bold tracking-widest text-cyan-400 font-mono">
                New User Registration
              </span>
              <h2 className="text-xl font-bold text-white">Create account as</h2>
              <p className="text-xs text-slate-400">
                Choose the role you want to create an account for
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleSelectRoleForRegister('DOCTOR')}
                className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-left transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 mb-3">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300">
                  Doctor Account
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register with Doctor / Medical Registration ID
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleForRegister('PATIENT')}
                className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-left transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300">
                  Patient Account
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register with Device ID & Emergency Contact Info
                </p>
              </button>
            </div>
          </GlassCard>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: LOGIN SCREEN */}
        {/* ========================================================================= */}
        {step === 'LOGIN' && (
          <GlassCard className="p-6 sm:p-8 border-cyan-500/25 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('CHOOSE_ROLE')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Role Selection
              </button>

              <span
                className={`text-[11px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                  selectedRole === 'DOCTOR'
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {selectedRole === 'DOCTOR' ? '👨‍⚕️ Doctor' : '🧑 Patient'} Portal
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Sign In as {selectedRole === 'DOCTOR' ? 'Doctor' : 'Patient'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter your authorized credentials to access your telemetry dashboard
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@pulseguard.com"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotEmail(loginEmail);
                    }}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono transition-colors"
                    required
                  />
                </div>
              </div>



              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : `Login to ${selectedRole === 'DOCTOR' ? 'Command Center' : 'Patient Dashboard'}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Patient Selection Buttons */}
            {selectedRole === 'PATIENT' && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  One-Click Patient Access (Historical October 2026 Cohort):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'Hithesh', email: 'hithesh@pulseguard.com', dates: 'Oct 5, 8, 12' },
                    { name: 'Rithesh', email: 'rithesh@pulseguard.com', dates: 'Oct 14, 17, 20' },
                    { name: 'Ankush', email: 'ankush@pulseguard.com', dates: 'Oct 22, 24, 26' },
                    { name: 'Harthik', email: 'harthik@pulseguard.com', dates: 'Oct 27, 28, 29' },
                  ].map((p) => (
                    <button
                      key={p.email}
                      type="button"
                      onClick={async () => {
                        setLoginEmail(p.email);
                        setLoginPassword('Password@123');
                        setIsSubmitting(true);
                        await login(p.email, 'Password@123', 'PATIENT');
                        setIsSubmitting(false);
                        onLoginSuccess();
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group"
                    >
                      <div className="font-bold text-white text-xs group-hover:text-cyan-300">{p.name}</div>
                      <div className="text-[10px] text-emerald-400 font-mono">Age 21</div>
                      <div className="text-[9px] text-slate-400 font-mono truncate">{p.dates}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick One-Click Switch or Register */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleSelectRoleForRegister(selectedRole === 'DOCTOR' ? 'DOCTOR' : 'PATIENT')
                }
                className="text-cyan-400 hover:underline font-semibold"
              >
                Need an account? Register as {selectedRole === 'DOCTOR' ? 'Doctor' : 'Patient'}
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo(selectedRole)}
                className="text-slate-400 hover:text-slate-200 font-mono text-[11px] bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                ⚡ 1-Click Fast Demo Sign In
              </button>
            </div>
          </GlassCard>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: PATIENT REGISTRATION FORM */}
        {/* ========================================================================= */}
        {step === 'REGISTER_PATIENT' && (
          <GlassCard className="p-6 sm:p-8 border-emerald-500/25 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('CHOOSE_ROLE')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[11px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                🧑 Patient Registration
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Create Patient Account</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Register your device & emergency information to start continuous telemetry
              </p>
            </div>

            <form onSubmit={handlePatientRegisterSubmit} className="space-y-5">
              {/* SECTION: Account & Device Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Account & Device Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={patientForm.name}
                      onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={patientForm.email}
                      onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      placeholder="e.g. ramesh@example.com"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Password *</label>
                    <input
                      type="password"
                      value={patientForm.password}
                      onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      value={patientConfirmPassword}
                      onChange={(e) => setPatientConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Device ID *</label>
                    <div className="relative">
                      <Cpu className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                      <input
                        type="text"
                        value={patientForm.deviceId}
                        onChange={(e) => setPatientForm({ ...patientForm, deviceId: e.target.value })}
                        placeholder="e.g. PG-001"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Assigned Doctor *</label>
                    <select
                      value={patientForm.assignedDoctor}
                      onChange={(e) => setPatientForm({ ...patientForm, assignedDoctor: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="Dr. Anil Kumar">Dr. Anil Kumar (Chief Cardiologist)</option>
                      <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins (Cardiology)</option>
                      <option value="Dr. Rajesh Patel">Dr. Rajesh Patel (Critical Care)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: Emergency Information (Separate box as required) */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    Emergency Information
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Stored for safety • Kept off primary telemetry cards)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Age *</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={patientForm.age}
                      onChange={(e) => setPatientForm({ ...patientForm, age: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Gender *</label>
                    <select
                      value={patientForm.gender}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          gender: e.target.value as 'Male' | 'Female' | 'Other',
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Contact Name *</label>
                    <input
                      type="text"
                      value={patientForm.emergencyContactName}
                      onChange={(e) =>
                        setPatientForm({ ...patientForm, emergencyContactName: e.target.value })
                      }
                      placeholder="e.g. Suresh Kumar"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Contact Number *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="tel"
                        value={patientForm.emergencyContactNumber}
                        onChange={(e) =>
                          setPatientForm({ ...patientForm, emergencyContactNumber: e.target.value })
                        }
                        placeholder="9876543210"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Relationship *</label>
                    <input
                      type="text"
                      value={patientForm.relationship}
                      onChange={(e) =>
                        setPatientForm({ ...patientForm, relationship: e.target.value })
                      }
                      placeholder="e.g. Father, Spouse"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Complete Patient Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => handleSelectRoleForLogin('PATIENT')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Already have a patient account? <strong className="text-emerald-400">Sign In</strong>
              </button>
            </div>
          </GlassCard>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: DOCTOR REGISTRATION FORM */}
        {/* ========================================================================= */}
        {step === 'REGISTER_DOCTOR' && (
          <GlassCard className="p-6 sm:p-8 border-cyan-500/25 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('CHOOSE_ROLE')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[11px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                👨‍⚕️ Doctor Registration
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Create Physician Account</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Register with your medical registration credentials to manage patients
              </p>
            </div>

            <form onSubmit={handleDoctorRegisterSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  placeholder="e.g. Dr. Anil Kumar"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Official Medical Email *</label>
                <input
                  type="email"
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  placeholder="e.g. anil.kumar@hospital.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Password *</label>
                  <input
                    type="password"
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={doctorConfirmPassword}
                    onChange={(e) => setDoctorConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  Doctor ID / Medical Registration ID *
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                  <input
                    type="text"
                    value={doctorForm.doctorRegistrationId}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, doctorRegistrationId: e.target.value })
                    }
                    placeholder="e.g. REG-2024-DOC981"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>



              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Complete Doctor Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => handleSelectRoleForLogin('DOCTOR')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Already registered? <strong className="text-cyan-400">Doctor Login</strong>
              </button>
            </div>
          </GlassCard>
        )}

        {/* Security watermark footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
          <Shield className="w-3.5 h-3.5 text-cyan-500" />
          <span>FastAPI JWT Ready • Role-Based Access Control</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 glass-panel space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              Reset Access Password
            </h3>
            <p className="text-xs text-slate-400">
              Enter your registered email address to receive a secure password reset token.
            </p>

            {forgotSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Reset Instructions Dispatched!
                </div>
                <p>A temporary recovery token has been sent to {forgotEmail}.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSuccess(false);
                  }}
                  className="mt-2 w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setForgotSuccess(true);
                }}
                className="space-y-3"
              >
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@pulseguard.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                  >
                    Send Recovery Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
