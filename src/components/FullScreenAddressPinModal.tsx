/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { LeafletMap } from './LeafletMap';
import { 
  GOOGLE_MAPS_API_KEY, 
  reverseGeocodeCoords, 
  isGoogleMapsAuthFailed 
} from '../lib/googleMaps';

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
  const [mapStyleMode, setMapStyleMode] = useState<'streets' | 'satellite'>('streets');
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Sync initial props on open
  useEffect(() => {
    if (isOpen) {
      const validCoords = initialCoords && initialCoords.lat && initialCoords.lng ? initialCoords : kitchenCoords;
      setSelectedCoords(validCoords);
      if (initialAddress) {
        setSelectedAddress(initialAddress);
      } else {
        updateAddressFromCoords(validCoords.lat, validCoords.lng);
      }
      setSearchQuery('');
      setSearchResults([]);
      setGpsError(null);
    }
  }, [isOpen, initialCoords?.lat, initialCoords?.lng, initialAddress]);

  // Reverse geocode helper
  const updateAddressFromCoords = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const addr = await reverseGeocodeCoords(lat, lng);
      setSelectedAddress(addr || `Doorstep Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } catch (e) {
      setSelectedAddress(`Doorstep Pin (${lat.toFixed(4)}, ${lng.toFixed(4)}), Muzaffarpur`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Handle position select from map click or drag
  const handlePositionSelect = (coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    updateAddressFromCoords(coords.lat, coords.lng);
  };

  // Search places / addresses
  const handleSearch = async (queryText?: string) => {
    const query = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!query) return;
    setIsSearching(true);
    setGpsError(null);

    // 1. Check local prominent landmarks
    const q = query.toLowerCase();
    const localMatches = POPULAR_MUZAFFARPUR_LANDMARKS.filter(lm => 
      lm.name.toLowerCase().includes(q)
    );

    // 2. Query Nominatim OpenStreetMap search API
    let remoteMatches: { name: string; lat: number; lng: number }[] = [];
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Muzaffarpur, Bihar')}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          remoteMatches = data.map((item: any) => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
        }
      }
    } catch (e) {
      console.warn("Nominatim search fallback error:", e);
    }

    const combined = [...localMatches, ...remoteMatches];
    if (combined.length > 0) {
      setSearchResults(combined);
      // Automatically jump to the top match
      const top = combined[0];
      setSelectedCoords({ lat: top.lat, lng: top.lng });
      setSelectedAddress(top.name);
    } else {
      setSearchResults([]);
      setGpsError(`No places found for "${query}". Try selecting a nearby landmark below or tap directly on the map.`);
    }
    setIsSearching(false);
  };

  // Locate current device GPS
  const handleDetectCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedCoords({ lat, lng });
        setZoomLevel(17);
        updateAddressFromCoords(lat, lng);
      },
      (err) => {
        setIsDetectingGps(false);
        console.warn('GPS location error:', err);
        setGpsError('Could not retrieve device location. Please allow location permissions or tap on the map to place the pin.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Center to Kitchen Hub
  const handleCenterToKitchen = () => {
    setSelectedCoords(kitchenCoords);
    setZoomLevel(16);
    updateAddressFromCoords(kitchenCoords.lat, kitchenCoords.lng);
  };

  // Distance to kitchen for delivery geofence display
  const distanceKm = calculateDistanceKm(
    kitchenCoords.lat,
    kitchenCoords.lng,
    selectedCoords.lat,
    selectedCoords.lng
  );
  const isWithinZone = distanceKm <= 15.0;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden animate-fade-in"
      id="fullscreen-address-pin-modal"
    >
      {/* TOP HEADER & SEARCH TOOLBAR */}
      <div className="bg-slate-900/95 border-b border-slate-800 p-3 sm:p-4 backdrop-blur-md z-30 shrink-0 shadow-lg">
        <div className="max-w-5xl mx-auto space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    FitZaika Doorstep Pin Locator
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300 text-[9px] font-bold border border-emerald-500/20">
                    <Sparkles className="w-2.5 h-2.5" /> Full-Screen Mode
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  Pinpoint Exact Doorstep Delivery Location
                </h2>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              aria-label="Close Fullscreen Map"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          {/* Search Bar & Quick Action Tools */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search street, society, landmark, or area in Muzaffarpur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-xs font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search</span>
              </button>

              {/* Current Device GPS */}
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={isDetectingGps}
                title="Detect My Current GPS Location"
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                {isDetectingGps ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline">Use My GPS</span>
              </button>

              {/* Center to Kitchen */}
              <button
                type="button"
                onClick={handleCenterToKitchen}
                title="Center map to Kitchen Hub"
                className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <Building2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Landmark Jump Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold text-slate-300">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5 text-emerald-400" /> Quick Areas:
            </span>
            {POPULAR_MUZAFFARPUR_LANDMARKS.slice(0, 7).map((lm) => (
              <button
                key={lm.name}
                type="button"
                onClick={() => {
                  setSelectedCoords({ lat: lm.lat, lng: lm.lng });
                  setSelectedAddress(`${lm.name}, Muzaffarpur, Bihar`);
                  setZoomLevel(16);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-950/60 hover:border-emerald-500/50 border border-slate-700/80 text-slate-300 hover:text-emerald-300 whitespace-nowrap shrink-0 transition-all cursor-pointer"
              >
                {lm.name}
              </button>
            ))}
          </div>

          {/* Search Dropdown / GPS Feedback banner */}
          {gpsError && (
            <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2">
              <span>{gpsError}</span>
              <button onClick={() => setGpsError(null)} className="text-amber-400 p-0.5 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN MAP CANVAS CONTAINER */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
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
              label: 'Selected Doorstep Delivery Pin',
              type: 'customer'
            },
            {
              lat: kitchenCoords.lat,
              lng: kitchenCoords.lng,
              label: `${kitchenName} (Kitchen Hub)`,
              type: 'kitchen'
            }
          ]}
          onPositionSelect={handlePositionSelect}
          className="w-full h-full min-h-[400px]"
        />

        {/* FLOATING MAP CONTROLS OVERLAY */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(prev + 1, 19))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer transition-all"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(prev - 1, 11))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer transition-all"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Recenter to Selected Pin */}
          <button
            type="button"
            onClick={() => {
              setSelectedCoords({ ...selectedCoords });
              setZoomLevel(17);
            }}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer transition-all"
            title="Center Pin in View"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* TOP LEFT HELPER BADGE */}
        <div className="absolute left-4 top-4 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Click or drag pin to your exact building / gate</span>
          </div>
        </div>

        {/* SERVICEABILITY STATUS BADGE (FLOATING BOTTOM-LEFT) */}
        <div className="absolute left-4 bottom-24 sm:bottom-28 z-20">
          <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-bold ${
            isWithinZone 
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isWithinZone
                ? `Within Free Delivery Radius (${distanceKm} km from ${kitchenName})`
                : `Outside standard 15 km zone (${distanceKm} km from kitchen)`}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM CONFIRMATION & DOORSTEP ADDRESS FOOTER */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 z-30 shrink-0 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Resolved Address & Coordinates Info */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Pinpointed Delivery Address
              </span>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                LAT: {selectedCoords.lat.toFixed(5)}, LNG: {selectedCoords.lng.toFixed(5)}
              </span>
              {isReverseGeocoding && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-400 animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Geocoding...
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
              onClick={onClose}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmPin(selectedCoords, selectedAddress);
                onClose();
              }}
              className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Set Doorstep Pin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
