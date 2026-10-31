import React, { useState } from 'react';
import {
  Bell,
  Search,
  Volume2,
  VolumeX,
  LogOut,
  User,
  Shield,
  Menu,
  ChevronDown,
  Clock,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVitals } from '../../context/VitalsContext';

interface TopNavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onToggleMobileSidebar?: () => void;
  lastSyncTime?: string;
  isHardwareOnline?: boolean;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Patient Dashboard',
    subtitle: 'Real-time physiological vital signs and health tracking',
  },
  live: {
    title: 'Live Waveform & Monitoring',
    subtitle: 'Continuous optical PPG pulse and high-frequency metrics',
  },
  patients: {
    title: 'Patient Directory & Wards',
    subtitle: 'Surveillance of registered patients across hospital wards',
  },
  'patient-detail': {
    title: 'Patient Telemetry Workspace',
    subtitle: 'Continuous multi-parameter surveillance and historical trends',
  },
  history: {
    title: 'Health History & Analytics',
    subtitle: 'Chronological telemetry records and verifiable trend data',
  },
  alerts: {
    title: 'Clinical Alerts Center',
    subtitle: 'Real-time biometric anomaly triage and safety management',
  },
  reports: {
    title: 'Medical Telemetry Reports',
    subtitle: 'Generate and export official biometric monitoring summaries',
  },
  analytics: {
    title: 'Vital Analytics',
    subtitle: 'Multi-parameter clinical distributions and risk stratification',
  },
  profile: {
    title: 'Medical Profile & Demographics',
    subtitle: 'Patient records, assigned physicians, and emergency contacts',
  },
  settings: {
    title: 'Telemetry & Device Settings',
    subtitle: 'Adjust polling frequencies, offline timeouts, and alert boundaries',
  },
};

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTab,
  onSelectTab,
  onToggleMobileSidebar,
  lastSyncTime,
  isHardwareOnline = false,
}) => {
  const { user, logout } = useAuth();
  const {
    activeAlertsCount,
    criticalAlertsCount,
    isSoundEnabled,
    toggleSound,
    setIsSearchOpen,
    setIsNotificationOpen,
    patients,
  } = useVitals();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const isDoctor = user?.role === 'DOCTOR';

  const tabInfo = TAB_TITLES[currentTab] || {
    title: isDoctor ? 'Clinical Command Center' : 'Patient Monitoring Portal',
    subtitle: 'PulseGuard Remote Patient Monitoring System',
  };

  const primaryPatient = patients[0];
  const deviceStatusOnline = isHardwareOnline || (primaryPatient ? primaryPatient.status !== 'OFFLINE' : false);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#080d1a]/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Mobile Sidebar Toggle + Page Title */}
          <div className="flex items-center gap-3">
            {onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {isDoctor && currentTab === 'dashboard' ? 'Clinical Command Center' : tabInfo.title}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-400 font-medium tracking-tight">
                {isDoctor && currentTab === 'dashboard'
                  ? 'Surveillance of active telemetry channels and physiological risk'
                  : tabInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Last Sync Time + Controls + Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Last Synchronization Pill */}
            <div
              className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono backdrop-blur-md transition-all ${
                deviceStatusOnline
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
              }`}
              title="ThingSpeak Cloud Telemetry Synchronization"
            >
              <span className="relative flex h-2 w-2">
                {deviceStatusOnline ? (
                  <>
                    <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500" />
                )}
              </span>
              <span className="text-[11px] font-semibold">
                {deviceStatusOnline ? 'Live Telemetry' : 'Device Offline'}
              </span>
              {lastSyncTime && (
                <span className="text-[10px] text-slate-500 border-l border-slate-700/80 pl-2">
                  <Clock className="w-3 h-3 inline mr-1 text-slate-500" />
                  {lastSyncTime}
                </span>
              )}
            </div>

            {/* Global Search Button (Doctor Only) */}
            {isDoctor && (
              <button
                onClick={() => setIsSearchOpen(true)}
                title="Search Patients (Ctrl+K)"
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Audio Pulse Beeper Toggle */}
            <button
              onClick={toggleSound}
              title={isSoundEnabled ? 'Audio Monitor ON (Click to mute)' : 'Audio Monitor OFF (Click to enable)'}
              className={`p-2 rounded-xl border transition-all ${
                isSoundEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => setIsNotificationOpen(true)}
              title="Clinical Alerts"
              className="relative p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${
                    criticalAlertsCount > 0 ? 'bg-rose-500 animate-ping-red' : 'bg-amber-500'
                  }`}
                >
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown & User Avatar */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all text-left"
              >
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                  alt={user?.name}
                  className="w-7 h-7 rounded-lg object-cover border border-cyan-500/30"
                />
                <div className="hidden xl:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {user?.name}
                  </div>
                  <div className="text-[10px] text-cyan-400/80 font-mono leading-tight">
                    {isDoctor ? 'Cardiologist' : user?.patientId || 'Patient'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu (Strictly role-locked) */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl glass-panel py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2.5 border-b border-slate-800/80">
                    <p className="text-xs font-bold text-white">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Shield className="w-3 h-3" />
                      Role: {user?.role}
                    </div>
                  </div>

                  {!isDoctor && (
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onSelectTab('profile');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>My Medical Profile</span>
                      </button>
                    </div>
                  )}

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onSelectTab('settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Telemetry Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-800/80 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
