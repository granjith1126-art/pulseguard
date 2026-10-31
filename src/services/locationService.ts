export interface PatientLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters (from position.coords.accuracy)
  timestamp: number;
  address?: string;
  source: 'BROWSER_GEOLOCATION';
}

export interface NearbyHospital {
  id: string;
  name: string;
  distanceKm: number;
  address: string;
  phoneNumber?: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
}

export type LocationPermissionState =
  | 'PROMPT'
  | 'REQUESTING'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'ERROR';

// Haversine formula to compute exact great-circle distance between coordinates in km
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place (e.g. 1.4 km)
}

class LocationService {
  private currentLocation: PatientLocation | null = null;
  private permissionState: LocationPermissionState = 'PROMPT';
  private errorMessage: string | null = null;
  private nearbyHospitals: NearbyHospital[] = [];
  private isLoadingHospitals: boolean = false;
  private subscribers: Array<
    (
      loc: PatientLocation | null,
      state: LocationPermissionState,
      hospitals: NearbyHospital[],
      err: string | null,
      loadingHospitals: boolean
    ) => void
  > = [];

  constructor() {
    // Start clean in PROMPT state without background permission side-effects
  }

  public subscribe(
    callback: (
      loc: PatientLocation | null,
      state: LocationPermissionState,
      hospitals: NearbyHospital[],
      err: string | null,
      loadingHospitals: boolean
    ) => void
  ): () => void {
    this.subscribers.push(callback);
    callback(
      this.currentLocation,
      this.permissionState,
      this.nearbyHospitals,
      this.errorMessage,
      this.isLoadingHospitals
    );
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) =>
      cb(
        this.currentLocation,
        this.permissionState,
        this.nearbyHospitals,
        this.errorMessage,
        this.isLoadingHospitals
      )
    );
  }

  /**
   * Request fresh browser/device location using the HTML5 Geolocation API.
   * NO fallback / hardcoded coordinates allowed.
   */
  public async requestBrowserLocation(): Promise<{
    success: boolean;
    location?: PatientLocation;
    error?: string;
  }> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.permissionState = 'POSITION_UNAVAILABLE';
      this.errorMessage = 'Geolocation is not supported by this browser';
      this.currentLocation = null;
      this.notify();
      return { success: false, error: this.errorMessage };
    }

    this.permissionState = 'REQUESTING';
    this.errorMessage = null;
    this.notify();

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy);

          const loc: PatientLocation = {
            latitude: lat,
            longitude: lon,
            accuracy: accuracy,
            timestamp: position.timestamp,
            address: `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`,
            source: 'BROWSER_GEOLOCATION',
          };

          this.currentLocation = loc;
          this.permissionState = 'PERMISSION_GRANTED';
          this.errorMessage = null;
          this.notify();

          // Asynchronously perform real-time reverse geocoding
          this.reverseGeocode(lat, lon).then((addr) => {
            if (addr && this.currentLocation) {
              this.currentLocation.address = addr;
              this.notify();
            }
          });

          // Fetch real nearby hospitals around actual browser coordinates
          this.searchRealNearbyHospitals(lat, lon);

          resolve({ success: true, location: loc });
        },
        (err) => {
          this.currentLocation = null;
          this.nearbyHospitals = [];

          if (err.code === err.PERMISSION_DENIED) {
            this.permissionState = 'PERMISSION_DENIED';
            this.errorMessage =
              'Location permission is disabled. Please enable location access in your browser or device settings.';
          } else if (err.code === err.TIMEOUT) {
            this.permissionState = 'TIMEOUT';
            this.errorMessage =
              'Location request timed out. Please check device location settings and try again.';
          } else {
            this.permissionState = 'POSITION_UNAVAILABLE';
            this.errorMessage =
              'Your device could not determine its current location. Move to an area with clear reception.';
          }

          this.notify();
          resolve({ success: false, error: this.errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // MUST NOT USE STALE CACHED COORDINATES
        }
      );
    });
  }

  public dismissPrompt() {
    if (this.permissionState === 'PROMPT') {
      this.permissionState = 'PERMISSION_DENIED';
      this.notify();
    }
  }

  public getLocation(): PatientLocation | null {
    return this.currentLocation;
  }

  public getPermissionState(): LocationPermissionState {
    return this.permissionState;
  }

  public getNearbyHospitalsList(): NearbyHospital[] {
    return this.nearbyHospitals;
  }

  // Reverse Geocoding via OpenStreetMap Nominatim
  private async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16`,
        { headers: { 'User-Agent': 'PulseGuard-RPM/2.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        return data.display_name || `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
      }
    } catch {}
    return null;
  }

  /**
   * Real-time search of actual hospitals around patient coordinates.
   * Uses Overpass API with Nominatim fallback.
   */
  public async searchRealNearbyHospitals(lat: number, lon: number): Promise<NearbyHospital[]> {
    this.isLoadingHospitals = true;
    this.notify();

    try {
      // 1. Try Overpass API for live nearby hospitals in a 15km radius
      const overpassQuery = `[out:json][timeout:10];(node["amenity"="hospital"](around:15000,${lat},${lon});way["amenity"="hospital"](around:15000,${lat},${lon});node["healthcare"="hospital"](around:15000,${lat},${lon}););out center 12;`;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

      const response = await fetch(overpassUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.elements && data.elements.length > 0) {
          const hospitals: NearbyHospital[] = data.elements
            .map((elem: { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }, index: number) => {
              const hLat = elem.lat || elem.center?.lat || lat;
              const hLon = elem.lon || elem.center?.lon || lon;
              const name = elem.tags?.name || elem.tags?.['name:en'] || `Medical Emergency Center ${index + 1}`;
              const phone = elem.tags?.phone || elem.tags?.['contact:phone'] || elem.tags?.['emergency:phone'] || undefined;
              const street = elem.tags?.['addr:street'] || elem.tags?.['addr:suburb'] || '';
              const city = elem.tags?.['addr:city'] || '';
              const address = [street, city].filter(Boolean).join(', ') || 'Emergency Trauma Unit';

              const distanceKm = calculateHaversineDistance(lat, lon, hLat, hLon);
              const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${hLat},${hLon}`;

              return {
                id: `HOSP-${elem.id}`,
                name,
                distanceKm,
                address,
                phoneNumber: phone,
                latitude: hLat,
                longitude: hLon,
                googleMapsUrl,
              };
            })
            .sort((a: NearbyHospital, b: NearbyHospital) => a.distanceKm - b.distanceKm);

          if (hospitals.length > 0) {
            this.nearbyHospitals = hospitals;
            this.isLoadingHospitals = false;
            this.notify();
            return hospitals;
          }
        }
      }
    } catch {
      // Overpass query fallback to Nominatim search
    }

    try {
      // Fallback: Query Nominatim Search API for hospitals bounded around coordinates
      const delta = 0.15; // ~15km bounding box
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=10&viewbox=${lon - delta},${lat + delta},${lon + delta},${lat - delta}&bounded=1`;
      const nomRes = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'PulseGuard-RPM/2.0' },
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          const hospitals: NearbyHospital[] = nomData.map((item: { place_id: number; display_name: string; lat: string; lon: string }) => {
            const hLat = parseFloat(item.lat);
            const hLon = parseFloat(item.lon);
            const parts = item.display_name.split(',');
            const name = parts[0]?.trim() || 'Emergency Hospital';
            const address = parts.slice(1, 3).join(',').trim() || 'Medical Center';
            const distanceKm = calculateHaversineDistance(lat, lon, hLat, hLon);
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${hLat},${hLon}`;

            return {
              id: `NOM-${item.place_id}`,
              name,
              distanceKm,
              address,
              phoneNumber: undefined,
              latitude: hLat,
              longitude: hLon,
              googleMapsUrl,
            };
          }).sort((a: NearbyHospital, b: NearbyHospital) => a.distanceKm - b.distanceKm);

          this.nearbyHospitals = hospitals;
          this.isLoadingHospitals = false;
          this.notify();
          return hospitals;
        }
      }
    } catch {}

    this.isLoadingHospitals = false;
    this.notify();
    return this.nearbyHospitals;
  }
}

export const locationService = new LocationService();
