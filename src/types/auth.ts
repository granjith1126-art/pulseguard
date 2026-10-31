export type UserRole = 'PATIENT' | 'DOCTOR';

export interface EmergencyInformation {
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
}

export interface UserProfile {
  id: string; // e.g. 'P-001' or 'DOC-001'
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  title?: string;
  department?: string;
  patientId?: string; // For patient role (e.g. 'P-001')
  assignedDoctor?: string;
  deviceId?: string;
  doctorRegistrationId?: string; // For doctor role
  emergencyInfo?: EmergencyInformation;
}

export interface PatientRegistrationData {
  name: string;
  email: string;
  password: string;
  deviceId: string;
  assignedDoctor: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
}

export interface DoctorRegistrationData {
  name: string;
  email: string;
  password: string;
  doctorRegistrationId: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password?: string, role?: UserRole) => Promise<boolean>;
  registerPatient: (data: PatientRegistrationData) => Promise<boolean>;
  registerDoctor: (data: DoctorRegistrationData) => Promise<boolean>;
  updateUser: (updatedProfile: Partial<UserProfile>) => void;
  logout: () => void;
}
