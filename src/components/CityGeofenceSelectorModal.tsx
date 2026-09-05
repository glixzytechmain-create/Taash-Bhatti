import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChefHat, CheckCircle2, AlertTriangle, X, Search, Navigation, Compass, Building2, LocateFixed, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { Kitchen } from '../types';

const GOOGLE_MAPS_API_KEY =
  (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

// MapController component to smoothly handle dynamic center updates and smart zoom transitions
function MapController({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center, zoom]);
  return null;
}

// Default City Presets with standard center coordinates
const DEFAULT_CITIES = [
  { name: 'Muzaffarpur', lat: 26.1220, lng: 85.3780 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
];

// Haversine distance calculator in kilometers
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface CityGeofenceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity?: string;
  currentLat?: number;
  currentLng?: number;
  allKitchens: Kitchen[];
  onSaveLocation: (city: string, address: string, lat: number, lng: number, inRange: boolean, kitchenName?: string) => void;
}

export default function CityGeofenceSelectorModal({
  isOpen,
  onClose,
  currentCity = 'Muzaffarpur',
  currentLat,
  currentLng,
  allKitchens = [],
  onSaveLocation,
}: CityGeofenceSelectorModalProps) {
  // Extract unique cities where kitchens exist
  const kitchenCities = useMemo(() => {
    const list = allKitchens.map(k => k.city).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [allKitchens]);

  // Combined cities options
  const cityPresets = useMemo(() => {
    const presetNames = new Set(DEFAULT_CITIES.map(c => c.name.toLowerCase()));
    const customKitchenCities = kitchenCities.filter(c => !presetNames.has(c.toLowerCase()));
    
    const combined = [...DEFAULT_CITIES];
    customKitchenCities.forEach(cityName => {
      const kMatch = allKitchens.find(k => k.city?.toLowerCase() === cityName.toLowerCase());
      combined.push({
        name: cityName,
        lat: kMatch ? kMatch.lat : 26.1220,
        lng: kMatch ? kMatch.lng : 85.3780
      });
    });
    return combined;
  }, [kitchenCities, allKitchens]);

  // Selected city & query states
  const [selectedCity, setSelectedCity] = useState<string>(currentCity || 'Muzaffarpur');
  const [customCityInput, setCustomCityInput] = useState<string>('');
  const [addressQuery, setAddressQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Default Pin position & Zoom level state
  const initialCityObj = cityPresets.find(c => c.name.toLowerCase() === selectedCity.toLowerCase()) || cityPresets[0];
  const [customerPos, setCustomerPos] = useState<{ lat: number; lng: number }>({
    lat: currentLat || initialCityObj.lat,
    lng: currentLng || initialCityObj.lng,
  });
  const [mapZoom, setMapZoom] = useState<number>(12); // Default city level zoom

  const [addressLabel, setAddressLabel] = useState<string>(`Selected Pin, ${selectedCity}`);

  // When city changes, update center & pin, zoom to city level
  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    const match = cityPresets.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    const kMatch = allKitchens.find(k => k.city?.toLowerCase() === cityName.toLowerCase());
    
    const newLat = kMatch ? kMatch.lat : (match ? match.lat : 26.1220);
    const newLng = kMatch ? kMatch.lng : (match ? match.lng : 85.3780);
    setCustomerPos({ lat: newLat, lng: newLng });
    setMapZoom(12); // Overview level for city selection
    setAddressLabel(`Central ${cityName}, Selected Pin`);
  };

  // Filter kitchens relevant to selected city or nearby
  const relevantKitchens = useMemo(() => {
    if (allKitchens.length === 0) return [];
    const cityMatch = allKitchens.filter(k => k.city?.toLowerCase() === selectedCity.toLowerCase());
    if (cityMatch.length > 0) return cityMatch;
    
    // Fallback: Return kitchens active in database
    return allKitchens;
  }, [allKitchens, selectedCity]);

  // Real Google Maps Address / Landmark Geocoding Search Handler
  const handleSearchAddress = async () => {
    if (!addressQuery.trim()) return;
    setSearching(true);
    const fullQuery = `${addressQuery.trim()}, ${selectedCity}`;

    // 1. Try real Google Maps Geocoder if SDK is loaded
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: fullQuery }, (results: any, status: any) => {
          setSearching(false);
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const newPos = { lat: loc.lat(), lng: loc.lng() };
            setCustomerPos(newPos);
            setMapZoom(16); // Smart local detailed zoom in!
            setAddressLabel(results[0].formatted_address || fullQuery);
          } else {
            performFallbackAddressSearch();
          }
        });
        return;
      } catch (e) {
        console.warn("Geocoder search error:", e);
      }
    }

    // 2. Fallback search algorithm with deterministic hash offset (NO random offsets)
    performFallbackAddressSearch();
    setSearching(false);
  };

  const performFallbackAddressSearch = () => {
    const q = addressQuery.toLowerCase();
    
    // Check if matching a known kitchen or area in this city
    const matchedKitchen = relevantKitchens.find(k => k.name.toLowerCase().includes(q) || k.address?.toLowerCase().includes(q));
    if (matchedKitchen) {
      setCustomerPos({ lat: matchedKitchen.lat, lng: matchedKitchen.lng });
      setMapZoom(16); // Smart local zoom level
      setAddressLabel(`${matchedKitchen.name}, ${selectedCity}`);
      return;
    }

    // Deterministic offset based on string hash so same search string always targets exact same location
    let hash = 0;
    for (let i = 0; i < q.length; i++) {
      hash = (hash << 5) - hash + q.charCodeAt(i);
      hash |= 0;
    }
    const cityMatch = cityPresets.find(c => c.name.toLowerCase() === selectedCity.toLowerCase()) || initialCityObj;
    const offsetLat = ((hash % 80) / 1000) * 0.3;
    const offsetLng = (((hash >> 2) % 80) / 1000) * 0.3;

    setCustomerPos({ lat: cityMatch.lat + offsetLat, lng: cityMatch.lng + offsetLng });
    setMapZoom(16); // Smart local detailed zoom in!
    setAddressLabel(`${addressQuery.trim()}, ${selectedCity}`);
  };

  // GPS Geolocation Handler
  const handleGetGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomerPos({ lat, lng });
        setMapZoom(16); // Detailed local view!

        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
          try {
            const geocoder = new (window as any).google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]) {
                setAddressLabel(results[0].formatted_address);
              } else {
                setAddressLabel(`GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
              }
            });
          } catch (e) {
            setAddressLabel(`GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
        } else {
          setAddressLabel(`GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      },
      (err) => {
        setGpsLoading(false);
        alert("Unable to fetch GPS position: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Map Click Handler with Reverse Geocoding
  const handleMapPointSelect = (lat: number, lng: number) => {
    setCustomerPos({ lat, lng });
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            setAddressLabel(results[0].formatted_address);
          } else {
            setAddressLabel(`Address Pin (${lat.toFixed(4)}, ${lng.toFixed(4)}) in ${selectedCity}`);
          }
        });
      } catch (e) {
        setAddressLabel(`Address Pin (${lat.toFixed(4)}, ${lng.toFixed(4)}) in ${selectedCity}`);
      }
    } else {
      setAddressLabel(`Address Pin (${lat.toFixed(4)}, ${lng.toFixed(4)}) in ${selectedCity}`);
    }
  };

  // Check geofence range calculation
  const coverageAnalysis = useMemo(() => {
    if (relevantKitchens.length === 0) {
      return { inRange: false, closestKitchen: null, closestDist: 999 };
    }

    let closestKitchen: Kitchen | null = null;
    let closestDist = Infinity;

    relevantKitchens.forEach((k) => {
      const dist = calculateHaversineKm(customerPos.lat, customerPos.lng, k.lat, k.lng);
      if (dist < closestDist) {
        closestDist = dist;
        closestKitchen = k;
      }
    });

    const inRange = closestKitchen ? closestDist <= (closestKitchen.geofenceRadius || 5) : false;
    return { inRange, closestKitchen, closestDist };
  }, [relevantKitchens, customerPos]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#080B0E]/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative bg-[#0F141A] border border-brand-green/30 rounded-3xl w-full max-w-3xl p-5 sm:p-7 shadow-2xl z-10 space-y-5 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin text-white"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-brand-green/15 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black bg-brand-green/20 text-brand-green border border-brand-green/30 px-2 py-0.5 rounded uppercase tracking-widest">
                  SERVICE COVERAGE VERIFICATION
                </span>
                <span className="text-[8px] font-mono text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2 py-0.5 rounded uppercase">
                  {allKitchens.length} Kitchen Branches Active
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white mt-1 flex items-center gap-2">
                Select Your City & Pin Delivery Location
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-brand-green/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* City Selector Chips */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider block">
              1. Select Operating City
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {cityPresets.map((cityObj) => {
                const isSelected = selectedCity.toLowerCase() === cityObj.name.toLowerCase();
                const hasKitchen = allKitchens.some(k => k.city?.toLowerCase() === cityObj.name.toLowerCase());
                return (
                  <button
                    key={cityObj.name}
                    type="button"
                    onClick={() => handleSelectCity(cityObj.name)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-brand-green text-brand-charcoal border-brand-green font-black shadow-md scale-105'
                        : 'bg-brand-charcoal/60 text-gray-300 border-brand-green/15 hover:border-brand-green/40 hover:text-white'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-charcoal' : 'text-brand-orange'}`} />
                    <span>{cityObj.name}</span>
                    {hasKitchen && (
                      <span className={`text-[8px] font-black px-1 rounded ${isSelected ? 'bg-brand-charcoal/20 text-brand-charcoal' : 'bg-brand-green/20 text-brand-green'}`}>
                        LIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom City Search Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Type custom city name..."
                value={customCityInput}
                onChange={(e) => setCustomCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customCityInput.trim()) {
                    handleSelectCity(customCityInput.trim());
                    setCustomCityInput('');
                  }
                }}
                className="bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green max-w-xs"
              />
              {customCityInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectCity(customCityInput.trim());
                    setCustomCityInput('');
                  }}
                  className="px-3 py-1.5 bg-brand-orange text-brand-charcoal font-black text-xs uppercase rounded-xl hover:bg-brand-orange/90 cursor-pointer"
                >
                  Set City
                </button>
              )}
            </div>
          </div>

          {/* Address & Landmark Search Bar with Quick Snap Chips */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider block">
              2. Search Address or Tap Landmark to Pin Location
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-brand-orange absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchAddress();
                    }
                  }}
                  placeholder="Search street, area, or landmark (e.g. Mithanpura Chowk)..."
                  className="w-full bg-[#141B24] border border-brand-green/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchAddress}
                disabled={searching}
                className="px-3.5 py-2 bg-brand-green text-brand-charcoal font-black text-xs uppercase rounded-xl hover:bg-brand-green/90 cursor-pointer flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
              >
                {searching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Landmark Snap Chips with Smart Zoom */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[9px] text-gray-400 font-bold uppercase">Popular Landmarks:</span>
              {[
                { name: 'Mithanpura Hub (Serving)', latOffset: 0.003, lngOffset: 0.003 },
                { name: 'Central Market Zone', latOffset: 0.008, lngOffset: -0.005 },
                { name: 'Railway Station Gate 1', latOffset: -0.008, lngOffset: 0.006 },
                { name: 'University Campus Road', latOffset: 0.010, lngOffset: 0.008 },
              ].map((lm) => (
                <button
                  key={lm.name}
                  type="button"
                  onClick={() => {
                    const k = relevantKitchens[0] || initialCityObj;
                    const newLat = k.lat + lm.latOffset;
                    const newLng = k.lng + lm.lngOffset;
                    setCustomerPos({ lat: newLat, lng: newLng });
                    setMapZoom(16); // Smart local detailed zoom!
                    setAddressLabel(`${lm.name}, ${selectedCity}`);
                  }}
                  className="px-2.5 py-1 bg-white/5 hover:bg-brand-orange/20 text-gray-300 hover:text-brand-orange border border-white/10 rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Navigation className="w-2.5 h-2.5 text-brand-orange" />
                  <span>{lm.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Map & Geofence Visualizer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider block">
                3. Drag Pin or Click Map to Adjust Address in {selectedCity}
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-gray-400">
                  LAT: {customerPos.lat.toFixed(4)}, LNG: {customerPos.lng.toFixed(4)}
                </span>
                <span className="text-[9px] font-mono text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded border border-brand-orange/20">
                  Zoom: {mapZoom}x
                </span>
              </div>
            </div>

            <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-brand-green/25 bg-[#12181E] shadow-inner">
              {GOOGLE_MAPS_API_KEY ? (
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                  <GoogleMap
                    defaultCenter={customerPos}
                    defaultZoom={12}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    onClick={(e) => {
                      if (e.detail.latLng) {
                        handleMapPointSelect(e.detail.latLng.lat, e.detail.latLng.lng);
                      }
                    }}
                    mapId="city_geofence_map"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {/* Inner controller to keep zoom level & position smoothly synced without fighting user drag */}
                    <MapController center={customerPos} zoom={mapZoom} />

                    {/* Kitchen Markers with Geofence visualization */}
                    {relevantKitchens.map((kitchen, kIdx) => (
                      <AdvancedMarker
                        key={`geo-marker-${kitchen.id || kIdx}-${kIdx}`}
                        position={{ lat: kitchen.lat, lng: kitchen.lng }}
                        title={`${kitchen.name} (Geofence: ${kitchen.geofenceRadius}km)`}
                      >
                        <div className="flex flex-col items-center group">
                          <div className="bg-brand-orange text-brand-charcoal font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white flex items-center gap-1 uppercase">
                            <ChefHat className="w-3 h-3" />
                            <span>{kitchen.name}</span>
                          </div>
                          <Pin background="#E0533C" glyphColor="#FFFFFF" borderColor="#73190E" />
                        </div>
                      </AdvancedMarker>
                    ))}

                    {/* Customer Location Pin */}
                    <AdvancedMarker
                      position={customerPos}
                      draggable={true}
                      onDragEnd={(e) => {
                        if (e.latLng) {
                          handleMapPointSelect(e.latLng.lat, e.latLng.lng);
                        }
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="bg-brand-green text-brand-charcoal font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white uppercase flex items-center gap-1 animate-bounce">
                          <MapPin className="w-3 h-3" /> Your Address
                        </div>
                        <Pin background="#007A78" glyphColor="#FFFFFF" borderColor="#004D4B" />
                      </div>
                    </AdvancedMarker>
                  </GoogleMap>
                </APIProvider>
              ) : (
                /* High quality interactive map simulation fallback */
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    const baseLat = initialCityObj.lat;
                    const baseLng = initialCityObj.lng;
                    const newLat = baseLat + (0.5 - y) * 0.05;
                    const newLng = baseLng + (x - 0.5) * 0.05;
                    handleMapPointSelect(newLat, newLng);
                  }}
                  className="w-full h-full relative cursor-crosshair bg-[radial-gradient(#1A232E_2px,transparent_2px)] [background-size:16px_16px] flex flex-col items-center justify-center p-4 text-center select-none"
                >
                  <div className="absolute inset-0 bg-brand-green/5 pointer-events-none" />
                  
                  {/* Simulated Kitchen Geofence Circles */}
                  {relevantKitchens.map((k, idx) => (
                    <div
                      key={`geo-sim-${k.id || idx}-${idx}`}
                      className="absolute rounded-full border-2 border-brand-orange/40 bg-brand-orange/10 pointer-events-none flex items-center justify-center"
                      style={{
                        top: `${30 + (idx * 20)}%`,
                        left: `${35 + (idx * 15)}%`,
                        width: '120px',
                        height: '120px',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <span className="text-[8px] font-black text-brand-orange uppercase bg-black/60 px-1.5 py-0.5 rounded">
                        {k.name} ({k.geofenceRadius}km)
                      </span>
                    </div>
                  ))}

                  {/* Customer Marker Simulation */}
                  <div className="relative z-10 flex flex-col items-center animate-bounce">
                    <div className="bg-brand-green text-brand-charcoal font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white">
                      📍 Your Selected Address Pin
                    </div>
                    <MapPin className="w-8 h-8 text-brand-green fill-brand-green/30 drop-shadow-md" />
                  </div>

                  <p className="absolute bottom-2 left-2 right-2 text-[9px] text-gray-400 bg-black/80 px-2 py-1 rounded-lg">
                    💡 Click anywhere on the map grid to position your home/office address pin.
                  </p>
                </div>
              )}

              {/* Floating Manual Controls Overlay (Zoom In, Zoom Out, GPS Locate) */}
              <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => setMapZoom((z) => Math.min(z + 1, 20))}
                  className="p-1.5 hover:bg-brand-green/30 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                >
                  <ZoomIn className="w-4 h-4 text-brand-green" />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => setMapZoom((z) => Math.max(z - 1, 3))}
                  className="p-1.5 hover:bg-brand-green/30 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                >
                  <ZoomOut className="w-4 h-4 text-brand-green" />
                </button>
                <div className="h-px bg-white/15 my-0.5" />
                <button
                  type="button"
                  title="Use My GPS Location"
                  onClick={handleGetGPSLocation}
                  className="p-1.5 hover:bg-brand-orange/30 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                >
                  <LocateFixed className={`w-4 h-4 text-brand-orange ${gpsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* GEOFENCE SERVICE COVERAGE STATUS BANNER */}
          <div className="space-y-3">
            {coverageAnalysis.inRange ? (
              <div className="bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[9px] font-black bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded uppercase tracking-wider">
                    🟢 SERVICE COVERAGE CONFIRMED
                  </span>
                  <h4 className="text-xs font-black text-white uppercase">
                    Great news! We deliver piping hot gourmet meals to this location.
                  </h4>
                  <p className="text-[11px] text-emerald-200">
                    Served by <strong className="text-white">{coverageAnalysis.closestKitchen?.name}</strong> located {coverageAnalysis.closestDist.toFixed(2)} km away (within our {coverageAnalysis.closestKitchen?.geofenceRadius} km geofence radius).
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/90 border-2 border-rose-500/60 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <span className="text-[9px] font-black bg-rose-900 text-rose-300 px-2 py-0.5 rounded uppercase tracking-wider">
                      ⚠️ OUTSIDE ACTIVE DELIVERY GEOFENCE
                    </span>
                    <h4 className="text-xs font-black text-white uppercase">
                      We sincerely apologize! We do not deliver to this exact location yet.
                    </h4>
                    <p className="text-[11px] text-rose-200 leading-relaxed">
                      Your pinned address in <strong>{selectedCity}</strong> is <strong>{coverageAnalysis.closestDist.toFixed(2)} km</strong> away from our nearest registered kitchen (<strong>{coverageAnalysis.closestKitchen?.name || 'Kitchen Hub'}</strong>), which exceeds our max hot-delivery radius of {coverageAnalysis.closestKitchen?.geofenceRadius || 5} km.
                    </p>
                    <p className="text-[10px] font-mono text-amber-300 bg-amber-950/60 p-2 rounded-xl border border-amber-500/30">
                      📍 Boundary Gap: You are <strong>{(coverageAnalysis.closestDist - (coverageAnalysis.closestKitchen?.geofenceRadius || 5)).toFixed(2)} km</strong> outside our current serving zone boundary.
                    </p>
                  </div>
                </div>

                {/* Optional Friendly Landmark Suggestion Box */}
                <div className="bg-brand-charcoal/80 border border-brand-orange/30 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-lg">💡</span>
                  <div className="text-[11px] text-gray-300 leading-snug">
                    <strong className="text-brand-orange block mb-0.5 uppercase">Friendly Delivery Suggestion (Optional)</strong>
                    You can drag your pin or click one of the popular landmark chips above to select a nearby landmark, office, or partner location within our {coverageAnalysis.closestKitchen?.geofenceRadius || 5} km serving circle to receive your delivery!
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Address Label Input & Actions */}
          <div className="space-y-3 pt-2 border-t border-brand-green/15">
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Full Address Line / Landmark *</label>
              <input
                type="text"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                placeholder="e.g. Flat 402, Mithanpura Chowk, near Petrol Pump"
                className="w-full bg-brand-charcoal border border-brand-green/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-black text-gray-400 hover:text-white uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveLocation(
                    selectedCity,
                    addressLabel.trim() || `${selectedCity} Address Pin`,
                    customerPos.lat,
                    customerPos.lng,
                    coverageAnalysis.inRange,
                    coverageAnalysis.closestKitchen?.name
                  );
                  onClose();
                }}
                className={`px-5 py-2.5 font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                  coverageAnalysis.inRange
                    ? 'bg-brand-green hover:bg-brand-green/90 text-brand-charcoal'
                    : 'bg-amber-500 hover:bg-amber-600 text-brand-charcoal'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Location & Continue</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

