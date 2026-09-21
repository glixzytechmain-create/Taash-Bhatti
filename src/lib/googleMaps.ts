export function getGoogleMapsApiKey(): string {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('fitzaika_custom_google_maps_key');
      if (custom && custom.trim()) return custom.trim();
    } catch (e) {}
  }
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) ||
    (typeof process !== 'undefined' && (process.env?.GOOGLE_MAPS_PLATFORM_KEY || process.env?.VITE_GOOGLE_MAPS_API_KEY || process.env?.VITE_GOOGLE_MAPS_PLATFORM_KEY)) ||
    (typeof window !== 'undefined' && ((window as any).GOOGLE_MAPS_PLATFORM_KEY || (window as any).VITE_GOOGLE_MAPS_API_KEY)) ||
    ''
  );
}

export const GOOGLE_MAPS_API_KEY: string = getGoogleMapsApiKey();

export function setCustomGoogleMapsApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (key && key.trim()) {
        localStorage.setItem('fitzaika_custom_google_maps_key', key.trim());
      } else {
        localStorage.removeItem('fitzaika_custom_google_maps_key');
      }
      sessionStorage.removeItem('fitzaika_gmaps_auth_failed');
      window.dispatchEvent(new CustomEvent('fitzaika_maps_key_updated'));
    } catch (e) {}
  }
}

// Global detection of Google Maps authentication errors (RefererNotAllowedMapError, etc.)
let gmapsAuthFailed = false;

if (typeof window !== 'undefined') {
  try {
    if (sessionStorage.getItem('fitzaika_gmaps_auth_failed') === 'true') {
      gmapsAuthFailed = true;
    }
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps authentication failure on this domain! Auto-activating resilient Leaflet map engine.');
      gmapsAuthFailed = true;
      try {
        sessionStorage.setItem('fitzaika_gmaps_auth_failed', 'true');
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('fitzaika_maps_auth_failed'));
      if (typeof prevAuthFailure === 'function') {
        prevAuthFailure();
      }
    };
  } catch (e) {}
}

export function isGoogleMapsAuthFailed(): boolean {
  if (typeof window !== 'undefined' && sessionStorage.getItem('fitzaika_gmaps_auth_failed') === 'true') {
    return true;
  }
  return gmapsAuthFailed;
}

export function markGoogleMapsFailed(): void {
  gmapsAuthFailed = true;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('fitzaika_gmaps_auth_failed', 'true');
      window.dispatchEvent(new CustomEvent('fitzaika_maps_auth_failed'));
    } catch (e) {}
  }
}

let googleMapsPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (isGoogleMapsAuthFailed()) {
    return Promise.reject(new Error('Google Maps authentication failed on this domain'));
  }

  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = getGoogleMapsApiKey();

    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.google && window.google.maps) resolve(window.google.maps);
        else reject(new Error('google.maps not loaded'));
      });
      existingScript.addEventListener('error', (e) => {
        markGoogleMapsFailed();
        reject(e);
      });
      return;
    }

    // Safety timeout: if Google Maps hangs or blocks referrer, reject after 3.5 seconds
    const safetyTimer = setTimeout(() => {
      console.warn('Google Maps load timeout. Falling back to Leaflet map engine.');
      markGoogleMapsFailed();
      reject(new Error('Google Maps loading timed out'));
    }, 3500);

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      clearTimeout(safetyTimer);
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        markGoogleMapsFailed();
        reject(new Error('Google Maps script loaded but google.maps is not defined'));
      }
    };
    script.onerror = (err) => {
      clearTimeout(safetyTimer);
      console.warn('Google Maps script load error, switching to Leaflet:', err);
      markGoogleMapsFailed();
      reject(err);
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

// Fallback reverse geocoding via OpenStreetMap Nominatim with local fallback
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return `Pinpoint (${lat.toFixed(4)}, ${lng.toFixed(4)}), Muzaffarpur`;
}

// Map style definition tailored to FitZaika / Taash Bhatti brand theme
// Palette: Charcoal Emerald (#0B1713), Forest Jade (#0F291E, #10B981), Warm Gold/Amber (#F59E0B), Deep Obsidian Water (#07141F)
export const FITZAIKA_BRAND_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0B1713" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#070E0C" }, { weight: 3 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#CBD5E1" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#FCD34D" }, { weight: 1.5 }], // FitZaika Warm Gold
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94A3B8" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748B" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0D261C" }], // Rich Forest Green
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#10B981" }], // Brand Emerald
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#162820" }], // Dark Jade Slate
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0D1B15" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94A3B8" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2B3A28" }], // Warm olive-jade arterial
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1A2518" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#FBBF24" }], // Amber Highway labels
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#14251E" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#10B981" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#07141F" }], // Deep Obsidian Marine
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38BDF8" }],
  },
];

// Dark map style is configured to our brand theme
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = FITZAIKA_BRAND_MAP_STYLE;

// Map style definition for light theme
export const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#E0F2FE" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#F8FAFC" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E2E8F0" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#DCFCE7" }],
  },
];

// Helper to calculate bearing (rotation angle in degrees) between 2 lat/lng points
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Helper to calculate distance in KM between 2 lat/lng points
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
