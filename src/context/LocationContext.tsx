import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  locationService,
  type PatientLocation,
  type NearbyHospital,
  type LocationPermissionState,
} from '../services/locationService';

interface LocationContextType {
  location: PatientLocation | null;
  permissionState: LocationPermissionState;
  errorMessage: string | null;
  nearbyHospitals: NearbyHospital[];
  isLoadingHospitals: boolean;
  requestLocation: () => Promise<boolean>;
  dismissPrompt: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<PatientLocation | null>(locationService.getLocation());
  const [permissionState, setPermissionState] = useState<LocationPermissionState>(
    locationService.getPermissionState()
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>(
    locationService.getNearbyHospitalsList()
  );
  const [isLoadingHospitals, setIsLoadingHospitals] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = locationService.subscribe((loc, state, hospitals, err, loading) => {
      setLocation(loc);
      setPermissionState(state);
      setNearbyHospitals(hospitals);
      setErrorMessage(err);
      setIsLoadingHospitals(loading);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const requestLocation = async (): Promise<boolean> => {
    const res = await locationService.requestBrowserLocation();
    return res.success;
  };

  const dismissPrompt = () => {
    locationService.dismissPrompt();
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        permissionState,
        errorMessage,
        nearbyHospitals,
        isLoadingHospitals,
        requestLocation,
        dismissPrompt,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
