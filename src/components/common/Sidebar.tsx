import React from 'react';
import {
  Activity,
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  BarChart2,
  Calendar,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVitals } from '../../context/VitalsContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const { activeAlertsCount, criticalAlertsCount, patients } = useVitals();

  const isDoctor = user?.role === 'DOCTOR';
  const primaryPatient = patients[0];
  const isHardwareOnline = primaryPatient ? primaryPatient.status !== 'OFFLINE' : false;

  const doctorItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients Directory', icon: Users },
    { id: 'patient-detail', label: 'Live Telemetry', icon: Activity },
    {
      id: 'alerts',
      label: 'Clinical Alerts',
      icon: AlertTriangle,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
      badgeColor: criticalAlertsCount > 0 ? 'bg-rose-500' : 'bg-amber-500',
    },
    { id: 'reports', label: 'Medical Reports', icon: FileText },
    { id: 'analytics', label: 'Biometrics Analytics', icon: BarChart2 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const patientItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Activity },
    { id: 'history', label: 'Patient History', icon: Calendar },
    {
      id: 'alerts',
      label: 'Alerts & Safety',
      icon: AlertTriangle,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
      badgeColor: 'bg-rose-500',
    },
    { id: 'reports', label: 'Health Reports', icon: FileText },
    { id: 'profile', label: 'My Medical Profile', icon: User },
    { id: 'settings', label: 'Device Settings', icon: Settings },
  ];

  const navItems = isDoctor ? doctorItems : patientItems;

  const handleSelect = (tab: string) => {
    onSelectTab(tab);
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#080d1a] border-r border-slate-800/80 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 h-16">
        <div
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-fuchsia-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="truncate animate-fade-in">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-base tracking-wider text-white">
                  Pulse<span className="text-cyan-400">Guard</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {user?.role}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-tight truncate">
                Clinical Telemetry IoT
              </p>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className={`px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? '•••' : 'Main Menu'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <div className="relative shrink-0">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {item.id === 'live' && isHardwareOnline && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
                )}
              </div>

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between truncate text-left">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white font-mono ${item.badgeColor || 'bg-cyan-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Hardware Telemetry Channel Pill */}
      {!isCollapsed ? (
        <div className="px-3 pb-3">
          <div className={`p-3 rounded-xl border text-[11px] font-mono transition-all ${
            isHardwareOnline
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-cyan-400" />
                Channel 3110138
              </span>
              <span className={`w-2 h-2 rounded-full ${
                isHardwareOnline ? 'bg-emerald-400 animate-live-pulse' : 'bg-slate-600'
              }`} />
            </div>
            <div className="text-[10px] truncate text-slate-400">
              Status: <strong className={isHardwareOnline ? 'text-emerald-300' : 'text-slate-400'}>
                {isHardwareOnline ? 'Live Telemetry' : 'Offline / Standby'}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 flex justify-center">
          <div
            title={`ThingSpeak Channel 3110138: ${isHardwareOnline ? 'Online' : 'Offline'}`}
            className={`w-3 h-3 rounded-full ${
              isHardwareOnline ? 'bg-emerald-400 animate-live-pulse' : 'bg-slate-600'
            }`}
          />
        </div>
      )}

      {/* User Card & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
            alt={user?.name}
            className="w-8 h-8 rounded-lg object-cover border border-cyan-500/30 shrink-0"
          />

          {!isCollapsed && (
            <div className="flex-1 truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {user?.name}
              </div>
              <div className="text-[10px] text-cyan-400/80 font-mono truncate flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                {isDoctor ? 'Cardiologist' : user?.patientId || 'Patient'}
              </div>
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={logout}
              title="Log Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 max-w-[85vw] h-full shadow-2xl animate-slide-right"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
