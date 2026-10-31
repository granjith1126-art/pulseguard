import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  UserProfile,
  UserRole,
  AuthState,
  PatientRegistrationData,
  DoctorRegistrationData,
} from '../types/auth';

const AuthContext = createContext<AuthState | undefined>(undefined);

const DEFAULT_DOCTOR: UserProfile = {
  id: 'DOC-001',
  name: 'Dr. Anil Kumar',
  email: 'doctor@pulseguard.com',
  role: 'DOCTOR',
  title: 'Chief Cardiologist',
  doctorRegistrationId: 'REG-2024-DOC981',
  avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
};

const DEFAULT_PATIENT: UserProfile = {
  id: 'P-001',
  name: 'Ramesh Kumar',
  email: 'patient@pulseguard.com',
  role: 'PATIENT',
  patientId: 'P-001',
  deviceId: 'PG-001',
  assignedDoctor: 'Dr. Anil Kumar',
  emergencyInfo: {
    age: 58,
    gender: 'Male',
    emergencyContactName: 'Sunita Kumar',
    emergencyContactNumber: '+91 98450 67890',
    relationship: 'Spouse (Wife)',
  },
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

export const MOCK_PATIENT_PROFILES: Record<string, UserProfile> = {
  'hithesh@pulseguard.com': {
    id: 'P-101',
    name: 'Hithesh',
    email: 'hithesh@pulseguard.com',
    role: 'PATIENT',
    patientId: 'P-101',
    deviceId: 'PG-101',
    assignedDoctor: 'Dr. Anil Kumar',
    emergencyInfo: {
      age: 21,
      gender: 'Male',
      emergencyContactName: 'Suresh Kumar',
      emergencyContactNumber: '+91 98450 11011',
      relationship: 'Father',
    },
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
  'rithesh@pulseguard.com': {
    id: 'P-102',
    name: 'Rithesh',
    email: 'rithesh@pulseguard.com',
    role: 'PATIENT',
    patientId: 'P-102',
    deviceId: 'PG-102',
    assignedDoctor: 'Dr. Anil Kumar',
    emergencyInfo: {
      age: 21,
      gender: 'Male',
      emergencyContactName: 'Mahesh Kumar',
      emergencyContactNumber: '+91 98450 22022',
      relationship: 'Father',
    },
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  },
  'ankush@pulseguard.com': {
    id: 'P-103',
    name: 'Ankush',
    email: 'ankush@pulseguard.com',
    role: 'PATIENT',
    patientId: 'P-103',
    deviceId: 'PG-103',
    assignedDoctor: 'Dr. Anil Kumar',
    emergencyInfo: {
      age: 21,
      gender: 'Male',
      emergencyContactName: 'Rajesh Kumar',
      emergencyContactNumber: '+91 98450 33033',
      relationship: 'Father',
    },
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  'harthik@pulseguard.com': {
    id: 'P-104',
    name: 'Harthik',
    email: 'harthik@pulseguard.com',
    role: 'PATIENT',
    patientId: 'P-104',
    deviceId: 'PG-104',
    assignedDoctor: 'Dr. Anil Kumar',
    emergencyInfo: {
      age: 21,
      gender: 'Male',
      emergencyContactName: 'Sunil Kumar',
      emergencyContactNumber: '+91 98450 44044',
      relationship: 'Father',
    },
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pulseguard_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null; // Start on the Role Selection Landing Screen
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('pulseguard_token') || null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('pulseguard_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pulseguard_user');
    }
  }, [user]);

  const login = async (email: string, _password?: string, role?: UserRole): Promise<boolean> => {
    const targetRole: UserRole = role || (email.toLowerCase().includes('doctor') ? 'DOCTOR' : 'PATIENT');
    const normalizedInput = (email || '').trim().toLowerCase();

    // 1. Try real FastAPI backend authentication
    try {
      const resp = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: email,
          password: _password || 'Password@123',
          role: targetRole,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const apiUser = data.user;
        const mockProfile = MOCK_PATIENT_PROFILES[apiUser.email?.toLowerCase()];
        const resolvedUser: UserProfile = {
          ...(mockProfile || (apiUser.role === 'DOCTOR' ? DEFAULT_DOCTOR : DEFAULT_PATIENT)),
          id: apiUser.id,
          name: apiUser.name,
          email: apiUser.email,
          role: apiUser.role as UserRole,
          patientId: apiUser.patient_id || apiUser.id,
        };
        setUser(resolvedUser);
        setToken(data.access_token);
        localStorage.setItem('pulseguard_token', data.access_token);
        return true;
      }
    } catch {
      // Backend offline or unreachable — fallback to local validation
    }

    // 2. Check 4 Mock Patients (Hithesh, Rithesh, Ankush, Harthik)
    const matchedMockPatient = Object.values(MOCK_PATIENT_PROFILES).find(
      (p) =>
        p.email.toLowerCase() === normalizedInput ||
        p.name.toLowerCase() === normalizedInput ||
        p.id.toLowerCase() === normalizedInput
    );

    if (matchedMockPatient && targetRole === 'PATIENT') {
      setUser(matchedMockPatient);
      const jwtToken = `jwt_patient_${matchedMockPatient.id.toLowerCase()}_${Date.now()}`;
      setToken(jwtToken);
      localStorage.setItem('pulseguard_token', jwtToken);
      return true;
    }

    // 3. Check custom registered users in local storage
    const savedAccounts = localStorage.getItem('pulseguard_accounts');
    if (savedAccounts) {
      try {
        const accounts: UserProfile[] = JSON.parse(savedAccounts);
        const matched = accounts.find(
          (a) =>
            (a.email.toLowerCase() === normalizedInput || a.name.toLowerCase() === normalizedInput) &&
            a.role === targetRole
        );
        if (matched) {
          setUser(matched);
          const jwtToken = `jwt_${targetRole.toLowerCase()}_${Date.now()}`;
          setToken(jwtToken);
          localStorage.setItem('pulseguard_token', jwtToken);
          return true;
        }
      } catch {}
    }

    // 4. Default fallbacks
    if (targetRole === 'PATIENT') {
      const patientProfile: UserProfile = {
        ...DEFAULT_PATIENT,
        email: email || DEFAULT_PATIENT.email,
      };
      setUser(patientProfile);
    } else {
      const doctorProfile: UserProfile = {
        ...DEFAULT_DOCTOR,
        email: email || DEFAULT_DOCTOR.email,
      };
      setUser(doctorProfile);
    }

    const mockJwt = `jwt_${targetRole.toLowerCase()}_${Date.now()}`;
    setToken(mockJwt);
    localStorage.setItem('pulseguard_token', mockJwt);
    return true;
  };

  const registerPatient = async (data: PatientRegistrationData): Promise<boolean> => {
    const generatedPatientId = `P-${String(Math.floor(Math.random() * 900) + 100)}`;
    const newProfile: UserProfile = {
      id: generatedPatientId,
      name: data.name,
      email: data.email,
      role: 'PATIENT',
      patientId: generatedPatientId,
      deviceId: data.deviceId || `PG-${generatedPatientId}`,
      assignedDoctor: data.assignedDoctor || 'Dr. Anil Kumar',
      emergencyInfo: {
        age: data.age,
        gender: data.gender,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        relationship: data.relationship,
      },
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    try {
      const existing = localStorage.getItem('pulseguard_accounts');
      const list: UserProfile[] = existing ? JSON.parse(existing) : [];
      list.push(newProfile);
      localStorage.setItem('pulseguard_accounts', JSON.stringify(list));
    } catch {}

    setUser(newProfile);
    const mockJwt = `jwt_patient_${Date.now()}`;
    setToken(mockJwt);
    localStorage.setItem('pulseguard_token', mockJwt);
    return true;
  };

  const registerDoctor = async (data: DoctorRegistrationData): Promise<boolean> => {
    const generatedDocId = `DOC-${String(Math.floor(Math.random() * 900) + 100)}`;
    const newProfile: UserProfile = {
      id: generatedDocId,
      name: data.name.startsWith('Dr.') ? data.name : `Dr. ${data.name}`,
      email: data.email,
      role: 'DOCTOR',
      title: 'Consulting Cardiologist',
      doctorRegistrationId: data.doctorRegistrationId || `REG-${Date.now().toString().slice(-6)}`,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    };

    try {
      const existing = localStorage.getItem('pulseguard_accounts');
      const list: UserProfile[] = existing ? JSON.parse(existing) : [];
      list.push(newProfile);
      localStorage.setItem('pulseguard_accounts', JSON.stringify(list));
    } catch {}

    setUser(newProfile);
    const mockJwt = `jwt_doctor_${Date.now()}`;
    setToken(mockJwt);
    localStorage.setItem('pulseguard_token', mockJwt);
    return true;
  };

  const updateUser = (updatedProfile: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged: UserProfile = {
        ...prev,
        ...updatedProfile,
        emergencyInfo: {
          ...prev.emergencyInfo,
          ...(updatedProfile.emergencyInfo || {}),
        } as any,
      };

      try {
        localStorage.setItem('pulseguard_user', JSON.stringify(merged));
        const savedAccounts = localStorage.getItem('pulseguard_accounts');
        if (savedAccounts) {
          const list: UserProfile[] = JSON.parse(savedAccounts);
          const idx = list.findIndex(
            (a) => a.id === merged.id || a.email.toLowerCase() === merged.email.toLowerCase()
          );
          if (idx !== -1) {
            list[idx] = merged;
            localStorage.setItem('pulseguard_accounts', JSON.stringify(list));
          }
        }
      } catch (e) {
        console.error('Failed to persist user profile update:', e);
      }

      return merged;
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pulseguard_token');
    localStorage.removeItem('pulseguard_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        token,
        login,
        registerPatient,
        registerDoctor,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
