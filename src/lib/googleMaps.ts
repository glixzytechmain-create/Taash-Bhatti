export function getGoogleMapsApiKey(): string {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('taashbhatti_custom_google_maps_key');
      if (custom && custom.trim()) return custom.trim();
    } catch (e) {}
  }
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) ||
    (typeof process !== 'undefined' && (process.env?.GOOGLE_MAPS_PLATFORM_KEY || process.env?.VITE_GOOGLE_MAPS_API_KEY || process.env?.VITE_GOOGLE_MAPS_PLATFORM_KEY)) ||
    (typeof window !== 'undefined' && ((window as any).GOOGLE_MAPS_PLATFORM_KEY || (window as any).VITE_GOOGLE_MAPS_API_KEY)) ||
    'AIzaSyCZju-0iZDXc3_Q-W4mDQsNjDS96nHRufE'
  );
}

export const GOOGLE_MAPS_API_KEY: string = getGoogleMapsApiKey();

export function setCustomGoogleMapsApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (key && key.trim()) {
        localStorage.setItem('taashbhatti_custom_google_maps_key', key.trim());
      } else {
        localStorage.removeItem('taashbhatti_custom_google_maps_key');
      }
      sessionStorage.removeItem('taashbhatti_gmaps_auth_failed');
      window.dispatchEvent(new CustomEvent('taashbhatti_maps_key_updated'));
    } catch (e) {}
  }
}

// Clean up any stale fallback lock from sessionStorage
if (typeof window !== 'undefined') {
  try {
    sessionStorage.removeItem('taashbhatti_gmaps_auth_failed');
  } catch (e) {}
}

export function isGoogleMapsAuthFailed(): boolean {
  return false;
}

export function markGoogleMapsFailed(): void {
  console.warn('Google Maps notice encountered. Keeping standard Google Maps active.');
}

let googleMapsPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window !== 'undefined' && window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // 1. Immediate availability check
    if (typeof window !== 'undefined' && window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    const checkReady = () => {
      if (typeof window !== 'undefined' && window.google?.maps) {
        resolve(window.google.maps);
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    // 2. Check if script already exists in document (e.g. from index.html or earlier mount)
    const existingScript =
      document.getElementById('google-maps-js-sdk') ||
      document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');

    if (existingScript) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (checkReady()) {
          clearInterval(interval);
        } else if (attempts > 80) { // 8 seconds
          clearInterval(interval);
          googleMapsPromise = null;
          reject(new Error('Google Maps script tag present but google.maps did not initialize'));
        }
      }, 100);

      existingScript.addEventListener('error', (e) => {
        clearInterval(interval);
        googleMapsPromise = null;
        reject(e);
      });
      return;
    }

    // 3. Dynamically inject script if not present
    const apiKey = getGoogleMapsApiKey();
    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (checkReady()) {
          clearInterval(interval);
        } else if (attempts > 50) {
          clearInterval(interval);
          googleMapsPromise = null;
          reject(new Error('Google Maps script loaded but google.maps is not defined'));
        }
      }, 50);
    };
    script.onerror = (err) => {
      console.warn('Google Maps script load error:', err);
      googleMapsPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

// Fallback reverse geocoding via OpenStreetMap Nominatim with local fallback
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const res = await new Promise<string | null>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]?.formatted_address) {
            resolve(results[0].formatted_address);
          } else {
            resolve(null);
          }
        });
      });
      if (res) return res;
    } catch (e) {}
  }
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
  } catch (e) {}
  return `Pinpoint (${lat.toFixed(4)}, ${lng.toFixed(4)}), Muzaffarpur`;
}

// Taash Bhatti Signature Dark Forest Green & Copper Accents Map Style
export const TAASH_BHATTI_BRAND_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0C130F" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0C130F" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#E2E8F0" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#FAF8F5" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94A3B8" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#12291E" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#34D399" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#16231A" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#09100C" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#CBD5E1" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#C06C38" }], // Signature warm copper highway
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#6A3618" }], // Deep bronze edge
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#FFFBEB" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#3B261A" }], // Subtle copper/bronze undertone
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#16231A" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#A7F3D0" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#081A14" }], // Deep emerald water
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#2DD4BF" }],
  },
];

export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = TAASH_BHATTI_BRAND_MAP_STYLE;

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
