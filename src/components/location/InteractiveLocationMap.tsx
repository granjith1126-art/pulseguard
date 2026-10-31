import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { PatientLocation, NearbyHospital } from '../../services/locationService';

interface InteractiveLocationMapProps {
  location: PatientLocation;
  hospitals: NearbyHospital[];
  className?: string;
}

export const InteractiveLocationMap: React.FC<InteractiveLocationMapProps> = ({
  location,
  hospitals,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      // If a map instance already exists, remove it cleanly before reinitializing
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Clear any remaining Leaflet ID on the DOM node to prevent "Map container is already initialized"
      const container = mapContainerRef.current;
      // @ts-expect-error leaflet internal id cleanup
      if (container._leaflet_id) {
        // @ts-expect-error leaflet internal id cleanup
        delete container._leaflet_id;
      }

      const map = L.map(container, {
        center: [location.latitude, location.longitude],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter tile layer for dark medical tech aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;

      // 1. Patient Location Marker (Pulsing Cyan Ring)
      const patientIcon = L.divIcon({
        className: 'custom-patient-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 16px; height: 16px; border-radius: 50%; background: #06b6d4; border: 2.5px solid #ffffff; box-shadow: 0 0 10px #06b6d4;"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const patientMarker = L.marker([location.latitude, location.longitude], { icon: patientIcon })
        .addTo(map)
        .bindPopup(
          `
          <div style="font-family: inherit; color: #0f172a; padding: 4px;">
            <strong style="color: #0284c7; font-size: 12px; display: block;">📍 YOUR DEVICE LOCATION</strong>
            <span style="font-size: 11px; color: #475569;">${location.latitude.toFixed(5)}°, ${location.longitude.toFixed(5)}°</span><br>
            <span style="font-size: 10px; color: #10b981; font-weight: bold;">Accuracy: ±${location.accuracy}m</span>
          </div>
          `
        );

      // Accuracy Circle
      if (location.accuracy > 0) {
        L.circle([location.latitude, location.longitude], {
          radius: Math.min(location.accuracy, 1000),
          color: '#06b6d4',
          fillColor: '#06b6d4',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      }

      // 2. Add Hospital Markers
      const hospitalMarkers: L.Marker[] = [];
      hospitals.forEach((h) => {
        const hospitalIcon = L.divIcon({
          className: 'custom-hospital-marker',
          html: `
            <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: #f43f5e; color: #ffffff; font-weight: bold; font-size: 12px; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(244,63,94,0.5);">
              🏥
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const phoneBtn = h.phoneNumber
          ? `<a href="tel:${h.phoneNumber.replace(/\s+/g, '')}" style="display: inline-block; background: #10b981; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold; margin-right: 4px;">📞 Call</a>`
          : '';

        const directionsBtn = `<a href="${h.googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0284c7; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold;">🗺️ Directions</a>`;

        const m = L.marker([h.latitude, h.longitude], { icon: hospitalIcon })
          .addTo(map)
          .bindPopup(
            `
            <div style="font-family: inherit; color: #0f172a; padding: 4px; min-width: 180px;">
              <strong style="color: #e11d48; font-size: 12px; display: block; line-height: 1.2;">🏥 ${h.name}</strong>
              <span style="font-size: 11px; color: #64748b; display: block; margin: 2px 0;">${h.address}</span>
              <span style="font-size: 11px; font-weight: bold; color: #0284c7; display: block; margin-bottom: 6px;">Distance: ${h.distanceKm} km</span>
              <div style="margin-top: 4px;">
                ${phoneBtn}
                ${directionsBtn}
              </div>
            </div>
            `
          );
        hospitalMarkers.push(m);
      });

      // Auto fit bounds to show both patient and nearest hospitals
      if (hospitalMarkers.length > 0) {
        const group = L.featureGroup([patientMarker, ...hospitalMarkers.slice(0, 4)]);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    } catch (e) {
      console.warn('Map rendering error:', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [location, hospitals]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-cyan-500/20 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-64 sm:h-80 z-0 bg-[#070b14]" />
      <div className="absolute bottom-2 left-2 z-10 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 pointer-events-none">
        📍 Centered on Actual Browser Coordinates
      </div>
    </div>
  );
};
