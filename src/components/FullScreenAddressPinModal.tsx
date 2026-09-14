/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MapPin, 
  Search, 
  X, 
  Crosshair, 
  Layers, 
  Plus, 
  Minus, 
  Building2, 
  Navigation, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles,
  ChevronRight,
  LocateFixed,
  ChefHat,
  AlertCircle
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { 
  GOOGLE_MAPS_API_KEY, 
  FITZAIKA_BRAND_MAP_STYLE,
  isGoogleMapsAuthFailed 
} from '../lib/googleMaps';
import { LeafletMap } from './LeafletMap';

interface FullScreenAddressPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { lat: number; lng: number };
  initialAddress: string;
  onConfirmPin: (coords: { lat: number; lng: number }, address: string) => void;
  kitchenCoords?: { lat: number; lng: number };
  kitchenName?: string;
}

const POPULAR_MUZAFFARPUR_LANDMARKS = [
  { name: "Mithanpura Chowk", lat: 26.1158, lng: 85.3912 },
  { name: "Kalambagh Road", lat: 26.1209, lng: 85.3647 },
  { name: "Club Road", lat: 26.1265, lng: 85.3854 },
  { name: "Zero Mile", lat: 26.1412, lng: 85.4018 },
  { name: "Motijheel Market", lat: 26.1224, lng: 85.3789 },
  { name: "Aghoria Bazar", lat: 26.1119, lng: 85.3725 },
  { name: "Bhagwanpur Chowk", lat: 26.1345, lng: 85.3490 },
  { name: "Gobarsahi Chowk", lat: 26.1042, lng: 85.3587 },
  { name: "Ramna / MIT Campus", lat: 26.1398, lng: 85.3782 },
  { name: "Jawahar Lal Road", lat: 26.1245, lng: 85.3815 },
];

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Sub-component to smoothly sync map center and zoom
function MapCameraController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center, zoom]);
  return null;
}

export default function FullScreenAddressPinModal({
  isOpen,
  onClose,
  initialCoords,
  initialAddress,
  onConfirmPin,
  kitchenCoords = { lat: 26.1209, lng: 85.3647 },
  kitchenName = 'FitZaika Central Hub'
}: FullScreenAddressPinModalProps) {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>(initialCoords);
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress || 'Locating doorstep address...');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(16);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [autocompletePredictions, setAutocompletePredictions] = useState<{ description: string; placeId?: string }[]>([]);
  const [showPredictionsDropdown, setShowPredictionsDropdown] = useState(false);
  const [googleMapsUnavailable, setGoogleMapsUnavailable] = useState(false);

  // Sync initial props on open
  useEffect(() => {
    if (isOpen) {
      const validCoords = initialCoords && initialCoords.lat && initialCoords.lng ? initialCoords : kitchenCoords;
      setSelectedCoords(validCoords);
      if (initialAddress) {
        setSelectedAddress(initialAddress);
      } else {
        reverseGeocodeUsingGoogleMaps(validCoords.lat, validCoords.lng);
      }
      setSearchQuery('');
      setAutocompletePredictions([]);
      setGpsError(null);
      setGoogleMapsUnavailable(isGoogleMapsAuthFailed());
    }
  }, [isOpen, initialCoords?.lat, initialCoords?.lng, initialAddress]);

  // Lock body scroll while fullscreen modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Reverse Geocoding with real Google Maps Geocoder
  const reverseGeocodeUsingGoogleMaps = useCallback((lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          setIsReverseGeocoding(false);
          if (status === 'OK' && results && results[0]) {
            setSelectedAddress(results[0].formatted_address);
          } else {
            fallbackLocalReverseGeocode(lat, lng);
          }
        });
        return;
      } catch (e) {
        console.warn("Google Maps Geocoder reverse lookup note:", e);
      }
    }
    fallbackLocalReverseGeocode(lat, lng);
  }, []);

  const fallbackLocalReverseGeocode = (lat: number, lng: number) => {
    setIsReverseGeocoding(false);
    // Find closest landmark
    let closestLandmark = POPULAR_MUZAFFARPUR_LANDMARKS[0];
    let minDist = Infinity;
    for (const lm of POPULAR_MUZAFFARPUR_LANDMARKS) {
      const d = calculateDistanceKm(lat, lng, lm.lat, lm.lng);
      if (d < minDist) {
        minDist = d;
        closestLandmark = lm;
      }
    }
    if (minDist < 1.0) {
      setSelectedAddress(`Near ${closestLandmark.name}, Muzaffarpur (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } else {
      setSelectedAddress(`Doorstep Pinpoint (${lat.toFixed(4)}, ${lng.toFixed(4)}), Muzaffarpur, Bihar`);
    }
  };

  // Google Maps Autocomplete Service for live search predictions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setAutocompletePredictions([]);
      setShowPredictionsDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      // 1. Try Google Maps AutocompleteService
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.AutocompleteService) {
        try {
          const service = new (window as any).google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: searchQuery,
              componentRestrictions: { country: 'in' },
            },
            (predictions: any, status: any) => {
              if (status === 'OK' && predictions && predictions.length > 0) {
                setAutocompletePredictions(
                  predictions.map((p: any) => ({
                    description: p.description,
                    placeId: p.place_id,
                  }))
                );
                setShowPredictionsDropdown(true);
                return;
              }
              matchLocalLandmarks(searchQuery);
            }
          );
          return;
        } catch (e) {
          console.warn("Google AutocompleteService note:", e);
        }
      }

      // 2. Match local Muzaffarpur landmarks
      matchLocalLandmarks(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const matchLocalLandmarks = (query: string) => {
    const q = query.toLowerCase();
    const matches = POPULAR_MUZAFFARPUR_LANDMARKS.filter((lm) => lm.name.toLowerCase().includes(q));
    if (matches.length > 0) {
      setAutocompletePredictions(
        matches.map((m) => ({
          description: `${m.name}, Muzaffarpur, Bihar`,
        }))
      );
      setShowPredictionsDropdown(true);
    } else {
      setAutocompletePredictions([]);
      setShowPredictionsDropdown(false);
    }
  };

  // Select a search prediction and geocode it
  const handleSelectPrediction = (prediction: { description: string; placeId?: string }) => {
    setSearchQuery(prediction.description);
    setShowPredictionsDropdown(false);
    setIsSearching(true);

    // 1. Try Google Maps Geocoder with placeId or description
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const req = prediction.placeId ? { placeId: prediction.placeId } : { address: prediction.description };
        geocoder.geocode(req, (results: any, status: any) => {
          setIsSearching(false);
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const newCoords = { lat: loc.lat(), lng: loc.lng() };
            setSelectedCoords(newCoords);
            setSelectedAddress(results[0].formatted_address || prediction.description);
            setZoomLevel(17);
            return;
          }
          fallbackMatchCoords(prediction.description);
        });
        return;
      } catch (e) {}
    }

    fallbackMatchCoords(prediction.description);
    setIsSearching(false);
  };

  const fallbackMatchCoords = (desc: string) => {
    const q = desc.toLowerCase();
    const lm = POPULAR_MUZAFFARPUR_LANDMARKS.find((l) => q.includes(l.name.toLowerCase()));
    if (lm) {
      setSelectedCoords({ lat: lm.lat, lng: lm.lng });
      setSelectedAddress(`${lm.name}, Muzaffarpur, Bihar`);
      setZoomLevel(17);
    } else {
      setSelectedAddress(desc);
    }
  };

  // Manual search submit handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (autocompletePredictions.length > 0) {
      handleSelectPrediction(autocompletePredictions[0]);
    } else {
      handleSelectPrediction({ description: searchQuery.trim() });
    }
  };

  // Device GPS Location Handler
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS Geolocation is not supported in this browser.");
      return;
    }
    setIsDetectingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newCoords = { lat, lng };
        setSelectedCoords(newCoords);
        setZoomLevel(17);
        reverseGeocodeUsingGoogleMaps(lat, lng);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsError("Unable to acquire GPS: " + (err.message || 'Permission denied'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle map click or drag
  const handleMapPinMove = (lat: number, lng: number) => {
    const newCoords = { lat, lng };
    setSelectedCoords(newCoords);
    reverseGeocodeUsingGoogleMaps(lat, lng);
  };

  const distanceKm = calculateDistanceKm(
    selectedCoords.lat,
    selectedCoords.lng,
    kitchenCoords.lat,
    kitchenCoords.lng
  );
  const isWithinZone = distanceKm <= 15.0;

  if (!isOpen) return null;

  return createPortal(
    <div 
      id="fullscreen-google-map-modal"
      className="fixed inset-0 z-[99999] flex flex-col bg-slate-950 text-white select-none animate-fade-in"
    >
      {/* TOP BAR: BRAND HEADER & LIVE SEARCH */}
      <div className="bg-slate-900/95 border-b border-emerald-500/20 backdrop-blur-md px-3 sm:px-4 py-2.5 z-30 shrink-0 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            {/* Title & Brand Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-tight truncate">
                    Pinpoint Delivery Address
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    <span>GOOGLE MAPS API</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Drag the pin or click anywhere to pinpoint your exact doorstep / gate
                </p>
              </div>
            </div>

            {/* GPS & Close buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="fullscreen-map-gps-btn"
                onClick={handleGetGpsLocation}
                disabled={isDetectingGps}
                className="px-3 py-1.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Locate using Device GPS"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden xs:inline">Use GPS</span>
              </button>

              <button
                type="button"
                id="fullscreen-map-close-btn"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SEARCH INPUT WITH GOOGLE PLACES AUTOCOMPLETE */}
          <div className="relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 pointer-events-none" />
              <input
                id="fullscreen-map-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, road, society, landmark in Muzaffarpur (e.g. Mithanpura, Kalambagh Road)..."
                className="w-full bg-slate-800/90 border border-emerald-500/30 focus:border-emerald-400 rounded-xl pl-9 pr-24 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 shadow-inner"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setAutocompletePredictions([]);
                      setShowPredictionsDropdown(false);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg shadow cursor-pointer transition-all"
                >
                  {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Search'}
                </button>
              </div>
            </form>

            {/* Google Places Dropdown Predictions */}
            {showPredictionsDropdown && autocompletePredictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-emerald-500/40 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                {autocompletePredictions.map((pred, idx) => (
                  <button
                    key={`${pred.description}-${idx}`}
                    type="button"
                    onClick={() => handleSelectPrediction(pred)}
                    className="w-full px-3.5 py-2.5 text-left text-xs text-slate-200 hover:text-white hover:bg-emerald-950/60 border-b border-slate-800/80 last:border-0 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{pred.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Landmark Jump Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-semibold text-slate-300">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5 text-emerald-400" /> Hotspots:
            </span>
            {POPULAR_MUZAFFARPUR_LANDMARKS.map((lm) => (
              <button
                key={lm.name}
                type="button"
                onClick={() => {
                  setSelectedCoords({ lat: lm.lat, lng: lm.lng });
                  setSelectedAddress(`${lm.name}, Muzaffarpur, Bihar`);
                  setZoomLevel(17);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950/70 hover:border-emerald-500/40 border border-slate-700 text-slate-300 hover:text-emerald-300 whitespace-nowrap shrink-0 transition-all cursor-pointer text-[11px]"
              >
                {lm.name}
              </button>
            ))}
          </div>

          {gpsError && (
            <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{gpsError}</span>
              </div>
              <button onClick={() => setGpsError(null)} className="text-amber-400 p-0.5 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN GOOGLE MAP CONTAINER */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
        {!googleMapsUnavailable ? (
          <APIProvider
            apiKey={GOOGLE_MAPS_API_KEY}
            version="weekly"
            solutionChannel="gmp_git_agentskills_v1"
            libraries={['places', 'geometry', 'drawing']}
            onLoad={() => setGoogleMapsUnavailable(false)}
            onError={() => setGoogleMapsUnavailable(true)}
          >
            <GoogleMap
              defaultCenter={selectedCoords}
              defaultZoom={zoomLevel}
              styles={FITZAIKA_BRAND_MAP_STYLE}
              disableDefaultUI={true}
              onClick={(e) => {
                if (e.detail.latLng) {
                  const lat = typeof (e.detail.latLng as any).lat === 'function' ? (e.detail.latLng as any).lat() : e.detail.latLng.lat;
                  const lng = typeof (e.detail.latLng as any).lng === 'function' ? (e.detail.latLng as any).lng() : e.detail.latLng.lng;
                  handleMapPinMove(lat, lng);
                }
              }}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_git_agentskills_v1', 'gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              <MapCameraController center={selectedCoords} zoom={zoomLevel} />

              {/* Central Kitchen Hub Marker */}
              <AdvancedMarker
                position={kitchenCoords}
                title={`${kitchenName} (Kitchen Hub)`}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white flex items-center gap-1 uppercase tracking-wider">
                    <ChefHat className="w-3 h-3" />
                    <span>{kitchenName}</span>
                  </div>
                  <Pin background="#F59E0B" glyphColor="#000000" borderColor="#78350F" />
                </div>
              </AdvancedMarker>

              {/* Draggable Customer Delivery Pin */}
              <AdvancedMarker
                position={selectedCoords}
                draggable={true}
                onDragEnd={(e) => {
                  if (e.latLng) {
                    const lat = typeof (e.latLng as any).lat === 'function' ? (e.latLng as any).lat() : (e.latLng as any).lat;
                    const lng = typeof (e.latLng as any).lng === 'function' ? (e.latLng as any).lng() : (e.latLng as any).lng;
                    handleMapPinMove(lat, lng);
                  }
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-emerald-500 text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-full shadow-xl border-2 border-white uppercase tracking-wider flex items-center gap-1 animate-bounce">
                    <MapPin className="w-3 h-3" />
                    <span>Doorstep Pin</span>
                  </div>
                  <Pin background="#10B981" glyphColor="#FFFFFF" borderColor="#064E3B" />
                </div>
              </AdvancedMarker>
            </GoogleMap>
          </APIProvider>
        ) : (
          /* Graceful Fallback if Google Maps auth or offline */
          <LeafletMap
            center={selectedCoords}
            zoom={zoomLevel}
            isDarkMode={true}
            interactive={true}
            draggableCustomerPin={true}
            points={[
              {
                lat: selectedCoords.lat,
                lng: selectedCoords.lng,
                label: 'Doorstep Pin',
                type: 'customer'
              },
              {
                lat: kitchenCoords.lat,
                lng: kitchenCoords.lng,
                label: `${kitchenName} (Hub)`,
                type: 'kitchen'
              }
            ]}
            onPositionSelect={(pos) => handleMapPinMove(pos.lat, pos.lng)}
            className="w-full h-full min-h-[400px]"
          />
        )}

        {/* FLOATING CONTROLS: ZOOM & RECENTER */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            id="fullscreen-map-zoom-in"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 20))}
            className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all"
            title="Zoom In"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            id="fullscreen-map-zoom-out"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 10))}
            className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button
            type="button"
            id="fullscreen-map-recenter-btn"
            onClick={() => {
              setSelectedCoords({ ...selectedCoords });
              setZoomLevel(17);
            }}
            className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all"
            title="Center Pin"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        </div>

        {/* FLOATING HELPER BADGE */}
        <div className="absolute left-4 top-4 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 backdrop-blur-md shadow-xl flex items-center gap-2 text-xs font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Click or drag pin to your exact building / gate</span>
          </div>
        </div>

        {/* SERVICEABILITY BADGE */}
        <div className="absolute left-4 bottom-4 z-20">
          <div className={`px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2 text-xs font-bold ${
            isWithinZone 
              ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300' 
              : 'bg-amber-950/85 border-amber-500/50 text-amber-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {isWithinZone
                ? `Within Delivery Radius (${distanceKm} km from ${kitchenName})`
                : `Outside 15 km standard radius (${distanceKm} km from kitchen)`}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM CONFIRMATION & DOORSTEP ADDRESS FOOTER */}
      <div className="bg-slate-900 border-t border-emerald-500/30 p-3 sm:p-4 z-30 shrink-0 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Address details */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Pinpointed Doorstep Address
              </span>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                LAT: {selectedCoords.lat.toFixed(5)}, LNG: {selectedCoords.lng.toFixed(5)}
              </span>
              {isReverseGeocoding && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-400 animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Geocoding with Google Maps...
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
              {selectedAddress}
            </p>
          </div>

          {/* Confirm & Set Pin Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="fullscreen-map-cancel-btn"
              onClick={onClose}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="fullscreen-map-confirm-btn"
              onClick={() => {
                onConfirmPin(selectedCoords, selectedAddress);
                onClose();
              }}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Set Doorstep Pin</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
