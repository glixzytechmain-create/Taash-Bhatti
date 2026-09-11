/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MapPin,
  Flame,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  Zap,
  Star,
  Maximize2
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Kitchen } from '../types';
import { GOOGLE_MAPS_API_KEY, isGoogleMapsAuthFailed } from '../lib/googleMaps';
import { LeafletMap } from './LeafletMap';
import FullScreenAddressPinModal from './FullScreenAddressPinModal';

// Default high-fidelity baseline Bhattis in Muzaffarpur, Bihar
const DEFAULT_BHATTIS: Kitchen[] = [
  {
    id: 'k1',
    name: 'Taash Bhatti Central Kitchen',
    address: 'Mithanpura Chowk, near Club Road, Muzaffarpur, Bihar 842002',
    city: 'Muzaffarpur',
    lat: 26.1220,
    lng: 85.3780,
    geofenceRadius: 15,
    isActive: true,
    isTakingOrders: true,
    phone: '+91 98765 43210',
    managerName: 'Chef Rajesh Kumar',
    rating: 4.9,
    specialties: ['Handi Dum Biryani', 'Saffron Tandoori Paneer', 'Smoked Kebabs'],
    description: 'Our primary flagship clay-oven kitchen operating 4 massive handi tandoors continuously for instant fulfillment.',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k2',
    name: 'Taash Bhatti Express Hub - Brahmpura',
    address: 'Brahmpura Main Road, Muzaffarpur, Bihar 842003',
    city: 'Muzaffarpur',
    lat: 26.1310,
    lng: 85.3620,
    geofenceRadius: 12,
    isActive: true,
    isTakingOrders: true,
    phone: '+91 98765 43211',
    managerName: 'Chef Amit Verma',
    rating: 4.8,
    specialties: ['Clay Oven Kulchas', 'Butter Garlic Naan', 'Reshmi Tikka Platter'],
    description: 'Dedicated high-speed express Bhatti unit for rapid sub-20 minute urban deliveries.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k3',
    name: 'Taash Bhatti Tandoor - Gobarsahi Link',
    address: 'Gobarsahi Chowk, Highway Road, Muzaffarpur, Bihar 842001',
    city: 'Muzaffarpur',
    lat: 26.0984,
    lng: 85.3486,
    geofenceRadius: 14,
    isActive: true,
    isTakingOrders: true,
    phone: '+91 98765 43212',
    managerName: 'Chef Vikram Singh',
    rating: 4.9,
    specialties: ['Smoked Charcoal Dal Makhani', 'Charcoal Roasted Corn', 'Mutton Galouti'],
    description: 'Traditional slow-fire charcoal Bhatti specializing in authentic slow-simmered royal gravies.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
  }
];

interface BhattisTabProps {
  selectedBhatti?: Kitchen | null;
  onSelectBhatti?: (bhatti: Kitchen | null) => void;
  allKitchens?: Kitchen[];
  onNavigateToMenu?: () => void;
}

export default function BhattisTab({
  selectedBhatti,
  onSelectBhatti,
  allKitchens,
  onNavigateToMenu,
}: BhattisTabProps) {
  const [filterCity, setFilterCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEnlargedMapOpen, setIsEnlargedMapOpen] = useState(false);
  const [useLeaflet, setUseLeaflet] = useState(() => isGoogleMapsAuthFailed());

  React.useEffect(() => {
    const handleAuthFail = () => setUseLeaflet(true);
    window.addEventListener('fitzaika_maps_auth_failed', handleAuthFail);
    return () => window.removeEventListener('fitzaika_maps_auth_failed', handleAuthFail);
  }, []);

  const bhattisToUse: Kitchen[] = (allKitchens && allKitchens.length > 0 ? allKitchens : DEFAULT_BHATTIS).map((k, idx) => ({
    ...k,
    rating: k.rating || 4.8 + (idx * 0.05),
    specialties: k.specialties || ['Handi Dum Biryani', 'Saffron Tandoori Paneer', 'Smoked Kebabs'],
    image: k.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80'
  }));

  // Extract cities
  const cities = ['all', ...Array.from(new Set(bhattisToUse.map((b) => b.city || 'Muzaffarpur')))];

  const filteredBhattis = bhattisToUse.filter((bhatti) => {
    const cityMatch = filterCity === 'all' || (bhatti.city || 'Muzaffarpur').toLowerCase() === filterCity.toLowerCase();
    const activeMatch = bhatti.isActive !== false;
    
    const matchesSearch = !searchQuery.trim() || 
      bhatti.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bhatti.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bhatti.address || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return cityMatch && activeMatch && matchesSearch;
  });

  const handleChooseBhatti = (bhatti: Kitchen | null) => {
    if (onSelectBhatti) {
      onSelectBhatti(bhatti);
    }
    if (onNavigateToMenu && bhatti) {
      setTimeout(() => {
        onNavigateToMenu();
      }, 500);
    }
  };

  const activeSelected = selectedBhatti;

  // Center map on selected bhatti or first in list
  const defaultCenter = activeSelected && activeSelected.lat && activeSelected.lng
    ? { lat: activeSelected.lat, lng: activeSelected.lng }
    : (filteredBhattis.length > 0 && filteredBhattis[0].lat && filteredBhattis[0].lng
        ? { lat: filteredBhattis[0].lat, lng: filteredBhattis[0].lng }
        : { lat: 26.1209, lng: 85.3647 });

  return (
    <div className="pb-24 max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-5 space-y-5 animate-fade-in">
      
      {/* HERO BANNER - HAVE A FAV BHATTI? ORDER FROM THEM! */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-charcoal via-[#1A2026] to-[#0D1217] text-white p-5 sm:p-7 shadow-xl border border-brand-orange/30">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-black uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 animate-bounce text-brand-orange" />
            <span>Direct Bhatti Dispatch Feature</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            Have A Fav Bhatti? <span className="text-brand-orange">Order Directly From Them! 🔥</span>
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-medium">
            Prefer your meals baked by a specific clay-oven kitchen? Select your favorite TAASH BHATTI below and your order will be dispatched exclusively from that Bhatti.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-stone-300 font-bold">
            <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Dedicated Clay Tandoor
            </span>
            <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Direct Kitchen Route
            </span>
            <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10">
              <Clock className="w-3.5 h-3.5 text-orange-400" /> Hot Fresh Delivery
            </span>
          </div>
        </div>
      </div>

      {/* AUTO-DISPATCH VS SPECIFIC BHATTI CONTROL CARD */}
      <div className="bg-white rounded-3xl p-4.5 sm:p-5 border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            !activeSelected 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-amber-50 border-amber-300 text-amber-700'
          }`}>
            {!activeSelected ? <Zap className="w-6 h-6 animate-pulse" /> : <Flame className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-stone-900">
                {!activeSelected ? 'Auto-Dispatch Mode (Nearest Bhatti)' : `Ordering From: ${activeSelected.name}`}
              </h3>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                !activeSelected 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {!activeSelected ? 'Smart Auto ⚡' : 'Direct Dispatch 🎯'}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              {!activeSelected 
                ? 'System automatically assigns your order to the nearest available Bhatti based on GPS and live kitchen speed.'
                : `All menu items and orders will be prepared exclusively at ${activeSelected.name}.`}
            </p>
          </div>
        </div>

        {activeSelected && (
          <button
            type="button"
            onClick={() => handleChooseBhatti(null)}
            className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl transition-all border border-stone-200 shrink-0 cursor-pointer"
          >
            Reset to Auto-Dispatch
          </button>
        )}
      </div>

      {/* SEARCH AND CITY FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Bhatti outlet by name, locality or city..."
            className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-brand-orange shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-stone-400 hover:text-stone-700"
            >
              CLEAR
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar shrink-0">
          {cities.map((city, idx) => (
            <button
              key={`${city}-${idx}`}
              onClick={() => setFilterCity(city)}
              className={`px-3.5 py-2.5 rounded-2xl text-[10px] font-extrabold uppercase transition-all tracking-wide cursor-pointer whitespace-nowrap shrink-0 ${
                filterCity === city
                  ? 'bg-brand-orange text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {city === 'all' ? '🗺️ ALL BHATTIS' : `📍 ${city}`}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN GRID: LIST + MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* BHATTI OUTLETS LISTING */}
        <div className="lg:col-span-7 space-y-4">
          {filteredBhattis.length === 0 ? (
            <div className="text-center py-12 bg-white border border-stone-200 rounded-3xl p-8 shadow-xs">
              <Flame className="w-10 h-10 text-brand-orange mx-auto mb-3 opacity-40" />
              <h4 className="font-extrabold text-sm text-stone-800 uppercase tracking-wider">No Bhatti Outlets Found</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 font-medium">
                Try searching for a different area or reset filters above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBhattis.map((bhatti) => {
                const isSelected = activeSelected?.id === bhatti.id;

                return (
                  <div
                    key={bhatti.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all relative overflow-hidden flex flex-col sm:flex-row gap-4 justify-between ${
                      isSelected
                        ? 'border-2 border-brand-orange shadow-lg ring-2 ring-brand-orange/20 bg-amber-50/20'
                        : 'border-stone-200 hover:border-stone-300 shadow-xs'
                    }`}
                  >
                    {/* Left Details */}
                    <div className="flex gap-3.5 flex-1 items-start">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-stone-200 relative bg-stone-100">
                        <img
                          src={bhatti.image}
                          alt={bhatti.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-brand-charcoal/80 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          <span>{bhatti.rating?.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-stone-900 leading-snug">
                            {bhatti.name}
                          </h4>
                          {isSelected && (
                            <span className="bg-brand-orange text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Selected Preferred Bhatti
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-600 font-medium leading-relaxed flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{bhatti.address}</span>
                        </p>

                        {bhatti.phone && (
                          <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{bhatti.phone}</span>
                          </p>
                        )}

                        {/* Specialties Pills */}
                        {bhatti.specialties && bhatti.specialties.length > 0 && (
                          <div className="pt-1.5 flex flex-wrap gap-1">
                            {bhatti.specialties.map((spec, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[9px] font-extrabold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200/60"
                              >
                                🔥 {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right CTA */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-stone-100 pt-3 sm:pt-0 sm:pl-4 gap-3 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 block w-fit sm:ml-auto">
                          🟢 Clay Tandoor Firing
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold block mt-1">
                          {bhatti.geofenceRadius || 15} km Delivery Zone
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleChooseBhatti(isSelected ? null : bhatti)}
                        className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                          isSelected
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-brand-orange hover:bg-brand-orange/90 text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ordering From Here</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-3.5 h-3.5" />
                            <span>Order From This Bhatti</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GOOGLE MAPS LOCATOR */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 bg-white border border-stone-200 rounded-3xl p-4.5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-stone-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-orange" /> Bhatti Outlets Radar
              </h4>
              <span className="text-[9px] font-extrabold text-stone-500 bg-stone-100 px-2 py-0.5 rounded uppercase">
                {filteredBhattis.length} Outlet{filteredBhattis.length === 1 ? '' : 's'} Active
              </span>
            </div>

            {useLeaflet || isGoogleMapsAuthFailed() || !GOOGLE_MAPS_API_KEY ? (
              <div 
                onClick={() => setIsEnlargedMapOpen(true)}
                className="h-80 w-full rounded-2xl border border-stone-200 overflow-hidden relative shadow-3xs cursor-pointer group"
                title="Tap to enlarge map & search outlets"
              >
                <LeafletMap
                  center={defaultCenter}
                  zoom={12}
                  interactive={true}
                  points={filteredBhattis.filter((b) => b.lat && b.lng).map((b) => ({
                    lat: b.lat!,
                    lng: b.lng!,
                    label: b.name,
                    type: 'kitchen' as const,
                    geofenceRadiusKm: b.geofenceRadius,
                  }))}
                  onPositionSelect={(coords) => {
                    const nearest = filteredBhattis.find(
                      (b) => b.lat && Math.abs(b.lat - coords.lat) < 0.01 && b.lng && Math.abs(b.lng - coords.lng) < 0.01
                    );
                    if (nearest) handleChooseBhatti(nearest);
                  }}
                  className="w-full h-full"
                />

                {/* Short message on map to tap to make the map bigger */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEnlargedMapOpen(true);
                  }}
                  className="absolute bottom-3 inset-x-3 z-10 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-3 py-2 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs font-bold cursor-pointer transition-all shadow-xl group-hover:border-emerald-400"
                >
                  <div className="flex items-center gap-2 text-emerald-300 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="truncate">✨ Tap map to view full-screen & search outlets</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm">
                    <Maximize2 className="w-3 h-3" />
                    <span>Enlarge Map</span>
                  </span>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEnlargedMapOpen(true)}
                className="h-80 w-full rounded-2xl border border-stone-200 overflow-hidden relative shadow-3xs bg-slate-50 cursor-pointer group"
                title="Tap to enlarge map & search outlets"
              >
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly" solutionChannel="gmp_git_agentskills_v1">
                  <GoogleMap
                    center={defaultCenter}
                    defaultZoom={12}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_git_agentskills_v1', 'gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {filteredBhattis.map((bhatti) => {
                      if (!bhatti.lat || !bhatti.lng) return null;
                      const isSelected = activeSelected?.id === bhatti.id;
                      return (
                        <AdvancedMarker
                          key={bhatti.id}
                          position={{ lat: bhatti.lat, lng: bhatti.lng }}
                          onClick={() => handleChooseBhatti(bhatti)}
                        >
                          <Pin
                            background={isSelected ? '#FF5722' : '#143D27'}
                            borderColor={isSelected ? '#C62828' : '#0E2B1B'}
                            glyphColor="#fff"
                            scale={isSelected ? 1.25 : 1.0}
                          />
                        </AdvancedMarker>
                      );
                    })}
                  </GoogleMap>
                </APIProvider>

                {/* Short message on map to tap to make the map bigger */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEnlargedMapOpen(true);
                  }}
                  className="absolute bottom-3 inset-x-3 z-10 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-3 py-2 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs font-bold cursor-pointer transition-all shadow-xl group-hover:border-emerald-400"
                >
                  <div className="flex items-center gap-2 text-emerald-300 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="truncate">✨ Tap map to view full-screen & search outlets</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm">
                    <Maximize2 className="w-3 h-3" />
                    <span>Enlarge Map</span>
                  </span>
                </div>
              </div>
            )}

            {/* FULLSCREEN PIN & OUTLET EXPLORER MODAL */}
            {isEnlargedMapOpen && (
              <FullScreenAddressPinModal
                isOpen={isEnlargedMapOpen}
                onClose={() => setIsEnlargedMapOpen(false)}
                initialCoords={defaultCenter}
                initialAddress={activeSelected?.name ? `${activeSelected.name}, ${activeSelected.address || ''}` : 'Bhatti Kitchen Outlets Radar'}
                kitchenCoords={defaultCenter}
                kitchenName={activeSelected?.name || 'FitZaika Kitchen'}
                onConfirmPin={(coords) => {
                  const nearest = filteredBhattis.find(
                    (b) => b.lat && Math.abs(b.lat - coords.lat) < 0.02 && b.lng && Math.abs(b.lng - coords.lng) < 0.02
                  );
                  if (nearest) {
                    handleChooseBhatti(nearest);
                  }
                  setIsEnlargedMapOpen(false);
                }}
              />
            )}

            {activeSelected && (
              <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/80 space-y-1.5 animate-fade-in">
                <span className="text-[9px] font-extrabold uppercase text-amber-800 tracking-wider block">
                  Active Direct Bhatti Selection
                </span>
                <h5 className="text-xs font-black text-stone-900">{activeSelected.name}</h5>
                <p className="text-[10px] text-stone-600 font-medium">{activeSelected.address}</p>
                <div className="pt-2 flex justify-between items-center border-t border-amber-200/60">
                  <span className="text-[9px] font-black text-emerald-700">
                    🟢 Direct Route Active
                  </span>
                  <button
                    onClick={() => handleChooseBhatti(null)}
                    className="text-[10px] text-brand-orange font-black uppercase hover:underline"
                  >
                    Switch to Auto-Dispatch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
