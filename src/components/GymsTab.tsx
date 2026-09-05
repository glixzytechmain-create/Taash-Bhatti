/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MapPin,
  Dumbbell,
  CheckCircle2,
  TrendingUp,
  Percent,
  Clock,
  Unlock,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Gym } from '../types';
import { GYMS_DATA } from '../data';

const GOOGLE_MAPS_API_KEY =
  (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

interface GymsTabProps {
  selectedGym: Gym | null;
  onSelectGym: (gym: Gym | null) => void;
  isAuthenticated?: boolean;
  allGyms?: Gym[];
}

export default function GymsTab({ selectedGym, onSelectGym, isAuthenticated = false, allGyms }: GymsTabProps) {
  const [filterCity, setFilterCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [memberCode, setMemberCode] = useState<string>('');
  const [submittingCode, setSubmittingCode] = useState<boolean>(false);
  const [successUnlock, setSuccessUnlock] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const gymsToUse = allGyms && allGyms.length > 0 ? allGyms : GYMS_DATA;

  // Extract cities from dynamic gyms list for filters
  const cities = ['all', ...Array.from(new Set(gymsToUse.map((g) => g.city)))];

  const filteredGyms = gymsToUse.filter((gym) => {
    const cityMatch = filterCity === 'all' || gym.city.toLowerCase() === filterCity.toLowerCase();
    // Only show active gyms for customers
    const activeMatch = gym.isActive !== false;
    
    // Search query match (name, city, address)
    const matchesSearch = !searchQuery.trim() || 
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (gym.address || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return cityMatch && activeMatch && matchesSearch;
  });

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGym) return;
    if (!memberCode.trim()) return;

    setSubmittingCode(true);
    // Simulate real database locker verification
    setTimeout(() => {
      setSubmittingCode(false);
      setSuccessUnlock(true);
      setMemberCode('');
    }, 1200);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Center map on selected gym or first gym in filtered list, or default Muzaffarpur, Bihar (26.1209, 85.3647)
  const defaultCenter = selectedGym && selectedGym.lat && selectedGym.lng
    ? { lat: selectedGym.lat, lng: selectedGym.lng }
    : (filteredGyms.length > 0 && filteredGyms[0].lat && filteredGyms[0].lng
        ? { lat: filteredGyms[0].lat, lng: filteredGyms[0].lng }
        : { lat: 26.1209, lng: 85.3647 });

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 pt-4">
      {/* EXPLAINER TOP */}
      <div className="bg-white border border-brand-green/10 rounded-3xl p-5 mb-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-brand-green uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Dumbbell className="w-4 h-4 text-brand-orange" /> Partner Outlets & Pickup Hubs
        </h3>
        <p className="text-xs text-brand-charcoal/70 leading-relaxed">
          TAASH BHATTI partners directly with elite local pickup hubs & dining points to deliver scalding-hot, freshly prepared clay-oven delicacies straight to convenient reception desks.
        </p>

        {/* Timeline benefits */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-brand-green/5 text-center">
          <div className="p-2 bg-brand-cream/40 rounded-xl">
            <Percent className="w-4 h-4 text-brand-orange mx-auto mb-1" />
            <span className="text-[9px] font-bold text-brand-charcoal block">Flat Discounts</span>
            <span className="text-[8px] text-brand-charcoal/50 block">Up to 20% Off</span>
          </div>
          <div className="p-2 bg-brand-cream/40 rounded-xl">
            <Clock className="w-4 h-4 text-brand-green mx-auto mb-1" />
            <span className="text-[9px] font-bold text-brand-charcoal block">Post-Workout</span>
            <span className="text-[8px] text-brand-charcoal/50 block">Warm Express drops</span>
          </div>
          <div className="p-2 bg-brand-cream/40 rounded-xl">
            <Unlock className="w-4 h-4 text-brand-lime mx-auto mb-1" />
            <span className="text-[9px] font-bold text-brand-charcoal block">Elite Dishes</span>
            <span className="text-[8px] text-brand-charcoal/50 block">Unlock salmon/lamb</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center">
        {/* Text Search Field */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-brand-charcoal/40">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search partner gym by name, address, or city..."
            className="w-full bg-white border border-brand-green/10 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-brand-green/40 shadow-3xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-brand-charcoal/50 hover:text-brand-charcoal font-black"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* City Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto py-1 shrink-0 scrollbar-none">
          {cities.map((city, idx) => (
            <button
              key={`${city}-${idx}`}
              onClick={() => {
                setFilterCity(city);
                onSelectGym(null); // Clear selected gym to allow refit
              }}
              className={`px-4 py-2.5 rounded-2xl text-[10px] font-extrabold uppercase transition-all tracking-wide cursor-pointer whitespace-nowrap shrink-0 ${
                filterCity === city
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'bg-white text-brand-charcoal border border-brand-green/10 hover:bg-brand-cream/10'
              }`}
            >
              {city === 'all' ? '🗺️ ALL CITIES' : `📍 ${city}`}
            </button>
          ))}
        </div>
      </div>

      {/* 2-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ACTIVE SITES LIST & FORM (col-span-7) */}
        <div className="md:col-span-7 space-y-5">
          {filteredGyms.length === 0 ? (
            <div className="text-center py-12 bg-white border border-brand-green/10 rounded-[32px] p-8 shadow-3xs">
              <ShieldAlert className="w-10 h-10 text-brand-orange mx-auto mb-3" />
              <h4 className="font-extrabold text-sm text-brand-charcoal uppercase tracking-wider">No Active Gym Partners</h4>
              <p className="text-xs text-brand-charcoal/60 leading-relaxed max-w-sm mx-auto mt-1.5 font-medium">
                Try searching for a different keyword, selecting a different city, or clearing filters above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredGyms.map((gym) => {
                const isLinked = selectedGym?.id === gym.id;
                const statusColors = {
                  elite: 'bg-indigo-600 text-white border-indigo-700',
                  gold: 'bg-amber-500 text-brand-charcoal border-amber-600',
                  silver: 'bg-slate-400 text-brand-charcoal border-slate-500',
                  bronze: 'bg-amber-700 text-white border-amber-800',
                };
                const activeStatusColor = gym.partnerStatus ? statusColors[gym.partnerStatus] : 'bg-brand-green/10 text-brand-green';

                return (
                  <div
                    key={gym.id}
                    className={`bg-white rounded-3xl p-4.5 border transition-all relative flex flex-col justify-between ${
                      isLinked
                        ? 'border-2 border-brand-green shadow-md glow-green bg-brand-green/[0.01]'
                        : 'border-brand-green/10 hover:border-brand-green/20 shadow-3xs'
                    }`}
                  >
                    <div>
                      {isLinked && (
                        <div className="absolute top-4 right-4 bg-brand-green text-white px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm z-10 animate-pulse">
                          <CheckCircle2 className="w-3 h-3 text-white" /> Linked Partner
                        </div>
                      )}

                      {/* Badges Bar */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {gym.partnerStatus && (
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${activeStatusColor}`}>
                            ⭐ {gym.partnerStatus} Partner
                          </span>
                        )}
                        {gym.isVerified !== false && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                            ✓ Verified Hub
                          </span>
                        )}
                        <span className="bg-brand-cream text-brand-charcoal/70 border border-brand-green/5 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider">
                          📍 {gym.city}
                        </span>
                      </div>

                      <div className="flex gap-3">
                        {/* Photo */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-brand-green/5 relative">
                          <img
                            src={gym.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&auto=format&fit=crop&q=80'}
                            alt={gym.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
                          <div>
                            <h4 className="font-extrabold text-xs text-brand-charcoal truncate leading-snug">{gym.name}</h4>
                            <p className="text-[9px] text-brand-charcoal/50 flex items-start gap-1 mt-1 leading-tight line-clamp-2">
                              <MapPin className="w-2.5 h-2.5 text-brand-orange shrink-0 mt-0.5" />
                              <span>{gym.address}</span>
                            </p>
                          </div>

                          {/* Discount pill */}
                          <div className="bg-brand-orange/10 text-brand-orange text-[9px] font-black px-2 py-0.5 rounded-lg max-w-max flex items-center gap-1 mt-1.5">
                            <Percent className="w-3 h-3" /> Flat {gym.discountPct}% Off
                          </div>
                        </div>
                      </div>

                      {/* Gym-specific special offers & benefits */}
                      <div className="mt-3.5 p-2.5 rounded-xl bg-brand-cream/35 border border-brand-green/5 space-y-2">
                        <div>
                          <span className="text-[8px] font-black uppercase text-brand-green tracking-wider block mb-0.5">
                            Partner Gym Benefit
                          </span>
                          <p className="text-[10px] text-brand-charcoal/70 leading-relaxed font-semibold">
                            {gym.bannerText || 'Direct hot insulated drops to gym reception.'}
                          </p>
                        </div>

                        {/* Enriched benefits detail */}
                        {(gym.freeMealRule || (gym.groupOrderDeals && gym.groupOrderDeals.length > 0)) && (
                          <div className="grid grid-cols-1 gap-1.5 pt-1.5 border-t border-brand-green/5">
                            {gym.freeMealRule && (
                              <div className="bg-white/80 rounded-lg p-1.5 border border-brand-green/5">
                                <span className="text-[7px] font-black uppercase text-brand-orange tracking-wider block mb-0.5">🎁 Free-Meal Policy</span>
                                <p className="text-[9px] text-brand-charcoal/80 font-bold">{gym.freeMealRule}</p>
                              </div>
                            )}
                            {gym.groupOrderDeals && gym.groupOrderDeals.length > 0 && (
                              <div className="bg-white/80 rounded-lg p-1.5 border border-brand-green/5">
                                <span className="text-[7px] font-black uppercase text-indigo-600 tracking-wider block mb-0.5">👥 Group-Order Deal</span>
                                <p className="text-[9px] text-brand-charcoal/80 font-bold">{gym.groupOrderDeals[0]}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {gym.membersOnlyOffers && gym.membersOnlyOffers.length > 0 && (
                          <div className="pt-1.5 border-t border-brand-green/5 space-y-0.5">
                            <span className="text-[7px] font-black uppercase text-brand-charcoal/40 tracking-wider block mb-0.5">Exclusive Gym Perks</span>
                            {gym.membersOnlyOffers.map((offer, idx) => (
                              <div key={`offer-${gym.id}-${idx}`} className="text-[9px] text-brand-charcoal/60 flex items-center gap-1 font-medium">
                                <span className="w-1 h-1 bg-brand-orange rounded-full shrink-0" />
                                <span className="truncate">{offer}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {gym.referralCode && (
                          <div className="mt-2 pt-2 border-t border-brand-green/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                <div className="bg-indigo-900 rounded-xs" />
                                <div className="bg-indigo-900 rounded-xs" />
                                <div className="bg-indigo-900 rounded-xs" />
                                <div className="bg-white" />
                                <div className="bg-indigo-900 rounded-xs" />
                              </div>
                            </div>
                            <div>
                              <span className="text-[7px] font-black uppercase text-indigo-700 tracking-wider block leading-none mb-0.5">Partner Referral</span>
                              <span className="font-mono text-[10px] font-black text-indigo-900 tracking-wider select-all">{gym.referralCode}</span>
                            </div>
                            <button
                              onClick={() => handleCopyCode(gym.referralCode || '', gym.id)}
                              className={`text-[8px] font-black px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                copiedCodeId === gym.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-3xs cursor-pointer'
                              }`}
                            >
                              {copiedCodeId === gym.id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>

                      {gym.ownerContactName && (
                        <div className="mt-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-100/50 flex items-center justify-between">
                          <span className="text-[8px] font-extrabold uppercase text-slate-500 truncate">Contact: {gym.ownerContactName}</span>
                          <a href={`mailto:${gym.ownerContactEmail}`} className="text-[8px] font-black text-brand-green hover:underline uppercase tracking-wider shrink-0 ml-1">Email</a>
                        </div>
                      )}
                    </div>

                    {/* Linking button */}
                    <div className="mt-3.5 pt-2.5 border-t border-brand-green/5 flex items-center gap-2">
                      {!isAuthenticated ? (
                        <div className="w-full text-center py-2 text-[9px] font-black text-brand-orange bg-brand-orange/5 rounded-xl border border-brand-orange/10 uppercase tracking-widest">
                          🔒 Register Account to Link
                        </div>
                      ) : isLinked ? (
                        <button
                          onClick={() => {
                            onSelectGym(null);
                            setSuccessUnlock(false);
                          }}
                          className="w-full bg-brand-cream border border-brand-green/15 text-brand-green hover:bg-brand-green/5 text-[10px] font-black py-2 rounded-xl transition-all cursor-pointer"
                        >
                          Disconnect Link
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectGym(gym);
                            setSuccessUnlock(false);
                          }}
                          className="w-full bg-brand-green hover:bg-brand-green/90 text-white text-[10px] font-black py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          Link This Gym
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VERIFY MEMBERSHIP FLOW */}
          {selectedGym && isAuthenticated && (
            <div className="bg-white border border-brand-green/10 rounded-3xl p-5 mt-4 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2 mb-3.5 border-b border-brand-green/5 pb-2.5">
                <CheckCircle2 className="w-5 h-5 text-brand-green" />
                <div>
                  <h4 className="font-extrabold text-sm text-brand-charcoal">
                    Confirm {selectedGym.name.split(' - ')[0]} Link
                  </h4>
                  <p className="text-[10px] text-brand-charcoal/50">Enter subscription details to verify gym partner membership.</p>
                </div>
              </div>

              {successUnlock ? (
                <div className="p-4 rounded-2xl bg-brand-green/10 border border-brand-green/20 text-center text-brand-green text-xs font-bold space-y-1.5">
                  <span className="text-xl">🏆</span>
                  <h4>Partner Gym Linked!</h4>
                  <p className="text-[10px] text-brand-charcoal/60 font-medium leading-normal">
                    Your membership code was validated. FitZaika partner benefits are active. Instant discounts are bound to your account.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-brand-charcoal/50 block mb-1">
                      Gym Member ID / Subscription Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GG-48190-ELITE"
                      value={memberCode}
                      onChange={(e) => setMemberCode(e.target.value)}
                      className="w-full bg-brand-cream/20 border border-brand-green/10 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingCode}
                    className="w-full bg-brand-orange hover:bg-brand-orange/95 text-brand-charcoal font-black text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {submittingCode ? (
                      <>Verifying Partner Registry...</>
                    ) : (
                      <>Activate Partner Link</>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - GOOGLE MAP INTERACTIVE TRACKER (col-span-5) */}
        <div className="md:col-span-5">
          <div className="sticky top-20 bg-white border border-brand-green/10 rounded-3xl p-4.5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-brand-charcoal flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-green" /> Partner Gym Terminals Map
              </h4>
              <span className="text-[9px] font-extrabold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                {filteredGyms.length} Site{filteredGyms.length === 1 ? '' : 's'} Active
              </span>
            </div>

            {GOOGLE_MAPS_API_KEY ? (
              <div className="h-96 w-full rounded-2xl border border-brand-green/10 overflow-hidden relative shadow-3xs bg-slate-50">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                  <GoogleMap
                    center={selectedGym && selectedGym.lat && selectedGym.lng ? { lat: selectedGym.lat, lng: selectedGym.lng } : defaultCenter}
                    defaultZoom={11}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {filteredGyms.map((gym) => {
                      if (!gym.lat || !gym.lng) return null;
                      const isSelected = selectedGym?.id === gym.id;
                      return (
                        <AdvancedMarker
                          key={gym.id}
                          position={{ lat: gym.lat, lng: gym.lng }}
                          onClick={() => onSelectGym(gym)}
                        >
                          <Pin
                            background={isSelected ? '#FF6B00' : '#10B981'}
                            borderColor={isSelected ? '#C2410C' : '#047857'}
                            glyphColor="#fff"
                            scale={isSelected ? 1.25 : 1.0}
                          />
                        </AdvancedMarker>
                      );
                    })}
                  </GoogleMap>
                </APIProvider>
              </div>
            ) : (
              <div className="h-96 w-full bg-brand-cream/30 rounded-2xl border border-brand-green/5 flex flex-col items-center justify-center text-center p-6">
                <MapPin className="w-10 h-10 text-brand-charcoal/20 mb-3" />
                <h5 className="text-xs font-bold text-brand-charcoal/60 uppercase">Google Maps API Offline</h5>
                <p className="text-[10px] text-brand-charcoal/50 leading-relaxed max-w-xs mt-1">
                  Connect your Google Maps key to see exact smart delivery lockers and terminal coordinates.
                </p>
              </div>
            )}

            {selectedGym && (
              <div className="bg-brand-cream/40 rounded-2xl p-3.5 border border-brand-green/5 space-y-2 animate-fade-in">
                <span className="text-[8px] font-black uppercase text-brand-orange tracking-widest block">Selected Location Details</span>
                <h5 className="text-xs font-bold text-brand-charcoal leading-snug">{selectedGym.name}</h5>
                <p className="text-[10px] text-brand-charcoal/70 leading-normal">{selectedGym.address || 'No specific address provided.'}</p>
                <div className="flex justify-between items-center pt-2 border-t border-brand-green/5">
                  <span className="text-[8px] font-bold text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded uppercase">
                    {selectedGym.city}
                  </span>
                  {selectedGym.lat && selectedGym.lng && (
                    <span className="text-[8px] font-mono text-gray-500">
                      GPS: {selectedGym.lat.toFixed(4)}, {selectedGym.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
