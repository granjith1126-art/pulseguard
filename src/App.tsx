import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VitalsProvider, useVitals } from './context/VitalsContext';
import { LocationProvider } from './context/LocationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TopNavbar } from './components/common/TopNavbar';
import { Sidebar } from './components/common/Sidebar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Patient Pages
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { PatientLiveMonitoring } from './pages/patient/PatientLiveMonitoring';
import { PatientHistory } from './pages/patient/PatientHistory';
import { PatientAlerts } from './pages/patient/PatientAlerts';
import { PatientProfile } from './pages/patient/PatientProfile';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatientDetail } from './pages/doctor/DoctorPatientDetail';
import { DoctorPatientsList } from './pages/doctor/DoctorPatientsList';
import { DoctorAlertsPage } from './pages/doctor/DoctorAlertsPage';
import { DoctorReportsPage } from './pages/doctor/DoctorReportsPage';
import { DoctorAnalyticsPage } from './pages/doctor/DoctorAnalyticsPage';

// Common Pages
import { SettingsPage } from './pages/common/SettingsPage';

const MainAppContent: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isSearchOpen, setIsSearchOpen, isNotificationOpen, setIsNotificationOpen, setSelectedPatientId, patients } = useVitals();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [detailPatientId, setDetailPatientId] = useState<string>('P-001');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const isDoctor = user?.role === 'DOCTOR';
  const primaryPatient = patients[0];
  const isHardwareOnline = primaryPatient ? primaryPatient.status !== 'OFFLINE' : false;

  // Strict Role Route Guards
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const doctorOnlyTabs = ['patients', 'patient-detail', 'analytics'];
    if (!isDoctor && doctorOnlyTabs.includes(currentTab)) {
      setCurrentTab('dashboard');
    }
  }, [isDoctor, currentTab, isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return <LoginPage onLoginSuccess={() => setCurrentTab('dashboard')} />;
  }

  const handleNavigateToPatient = (patientId: string) => {
    if (!isDoctor) return;
    setDetailPatientId(patientId);
    setSelectedPatientId(patientId);
    setCurrentTab('patient-detail');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex bg-medical-grid relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sleek Healthcare Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'live' && isDoctor) {
            handleNavigateToPatient('P-001');
          } else {
            setCurrentTab(tab);
          }
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Right Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Sleek Healthcare Navigation Bar */}
        <TopNavbar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          isHardwareOnline={isHardwareOnline}
          lastSyncTime={primaryPatient?.deviceStatus?.lastSync}
        />

        {/* Main Route Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <ErrorBoundary fallbackTitle="Dashboard View Error">
            {/* PATIENT PORTAL ROUTES */}
            {!isDoctor && (
              <>
                {currentTab === 'dashboard' && <PatientDashboard />}
                {currentTab === 'live' && <PatientLiveMonitoring />}
                {currentTab === 'history' && <PatientHistory />}
                {currentTab === 'alerts' && <PatientAlerts />}
                {currentTab === 'reports' && <DoctorReportsPage />}
                {currentTab === 'profile' && <PatientProfile />}
                {currentTab === 'settings' && <SettingsPage />}
              </>
            )}

            {/* DOCTOR COMMAND CENTER ROUTES */}
            {isDoctor && (
              <>
                {currentTab === 'dashboard' && (
                  <DoctorDashboard
                    onNavigateToPatient={handleNavigateToPatient}
                    onNavigateTab={(tab) => setCurrentTab(tab)}
                  />
                )}
                {currentTab === 'patient-detail' && (
                  <DoctorPatientDetail
                    patientId={detailPatientId}
                    onBack={() => setCurrentTab('patients')}
                  />
                )}
                {currentTab === 'patients' && (
                  <DoctorPatientsList onSelectPatient={handleNavigateToPatient} />
                )}
                {currentTab === 'alerts' && (
                  <DoctorAlertsPage onSelectPatient={handleNavigateToPatient} />
                )}
                {currentTab === 'reports' && <DoctorReportsPage />}
                {currentTab === 'analytics' && <DoctorAnalyticsPage />}
                {currentTab === 'settings' && <SettingsPage />}
              </>
            )}
          </ErrorBoundary>
        </main>

        {/* Futuristic Command Center Status Bar Footer */}
        <footer className="w-full border-t border-slate-900/80 bg-slate-950/80 py-3 px-4 sm:px-8 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 ${isHardwareOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isHardwareOnline ? 'bg-emerald-400 animate-live-pulse' : 'bg-slate-600'}`} />
              ThingSpeak Channel 3110138 {isHardwareOnline ? 'Live Link Active' : 'Standby'}
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:inline">MAX30102 Optical Sampling: 100 Hz</span>
          </div>
          <div className="flex items-center gap-4">
            <span>PulseGuard RPM v2.4.1</span>
            <span>Role: <strong className="text-cyan-400">{user.role}</strong></span>
          </div>
        </footer>
      </div>

      {/* Global Modals and Drawers */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPatient={handleNavigateToPatient}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onSelectPatient={handleNavigateToPatient}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <AuthProvider>
        <VitalsProvider>
          <LocationProvider>
            <MainAppContent />
          </LocationProvider>
        </VitalsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
