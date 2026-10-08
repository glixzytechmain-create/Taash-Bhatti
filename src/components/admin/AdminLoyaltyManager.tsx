/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Flame, 
  Users, 
  Gift, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Coins, 
  DollarSign, 
  Crown, 
  Layers, 
  Percent, 
  CheckCircle2, 
  Clock, 
  UtensilsCrossed 
} from 'lucide-react';
import { Meal } from '../../types';
import { 
  LoyaltyConfig, 
  DEFAULT_LOYALTY_CONFIG, 
  DEFAULT_ROYAL_RANKS, 
  RoyalRankTier, 
  RoyalRankId 
} from '../../types/loyalty';
import { subscribeToLoyaltyConfig, saveLoyaltyConfig } from '../../lib/loyaltyService';
import { auth } from '../../lib/firebase';

interface AdminLoyaltyManagerProps {
  meals: Meal[];
}

export default function AdminLoyaltyManager({ meals = [] }: AdminLoyaltyManagerProps) {
  const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const [activeSubTab, setActiveSubTab] = useState<'referrals' | 'ranks' | 'poker'>('referrals');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLoyaltyConfig((latest) => {
      setConfig(latest);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const success = await saveLoyaltyConfig(config, auth.currentUser?.email || 'admin@taashbhatti.com');
      if (success) {
        setFeedback({ type: 'success', message: 'Loyalty & Referral settings updated live in Firestore!' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to save settings. Please verify Firestore permissions.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.message || 'Error saving settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all Loyalty & Referral parameters to initial default values?')) {
      setConfig(DEFAULT_LOYALTY_CONFIG);
    }
  };

  const updateRank = (index: number, updates: Partial<RoyalRankTier>) => {
    const updated = [...config.royalRanks];
    updated[index] = { ...updated[index], ...updates };
    setConfig({ ...config, royalRanks: updated });
  };

  // Helper to get meal details by ID
  const getMeal = (mealId?: string) => meals.find((m) => m.id === mealId);

  return (
    <div className="space-y-6 text-left">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-amber-500/30 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3 h-3" />
              ROYAL CLUB ADMIN
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Loyalty Tracker & Referral Engine
          </h2>
          <p className="text-xs text-stone-300 max-w-xl">
            Control customer cashback multipliers, referral bonuses, squad bounties, and 5-card feast poker perks. All food rewards are strictly grounded in your active menu.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl border border-stone-700 bg-stone-800/80 hover:bg-stone-750 text-stone-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SUB-TABS */}
      <div className="flex border-b border-stone-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('referrals')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'referrals'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Referral Program & "Table of 4"</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ranks')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'ranks'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Bhatti Heat Streak & Royal Ranks</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('poker')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'poker'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>5-Card Feast Poker Bounties</span>
        </button>
      </div>

      {/* TAB 1: REFERRALS */}
      {activeSubTab === 'referrals' && (
        <div className="space-y-6">
          {/* MASTER SWITCH */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Referral System Master Switch
              </h4>
              <p className="text-xs text-stone-400">
                Turn the customer-to-customer referral program on or off across the entire app.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.referralsEnabled}
                onChange={(e) => setConfig({ ...config, referralsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* REFERRER REWARD */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Gift className="w-4 h-4" />
                <h4 className="text-sm font-extrabold text-white">Referrer Reward (The Inviter)</h4>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Awarded automatically to the referring patron as soon as their friend's inaugural order is delivered.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Reward Category
                  </label>
                  <select
                    value={config.referrerReward.type}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setConfig({
                        ...config,
                        referrerReward: {
                          ...config.referrerReward,
                          type: newType,
                          amount: newType === 'wallet_golden' ? 300 : config.referrerReward.amount
                        }
                      });
                    }}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="wallet_golden">Golden Wallet Cash (₹ - 100% Bill Usable)</option>
                    <option value="wallet_standard">Standard Ember Coins (30% Bill Usable)</option>
                    <option value="free_dish">Free Signature Dish from Menu</option>
                  </select>
                </div>

                {config.referrerReward.type !== 'free_dish' ? (
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Wallet Credit Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-stone-400 text-xs">₹</span>
                      <input
                        type="number"
                        min="1"
                        value={config.referrerReward.amount}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            referrerReward: {
                              ...config.referrerReward,
                              amount: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Select Complimentary Menu Dish
                    </label>
                    <select
                      value={config.referrerReward.mealId || ''}
                      onChange={(e) => {
                        const sel = meals.find((m) => m.id === e.target.value);
                        setConfig({
                          ...config,
                          referrerReward: {
                            ...config.referrerReward,
                            mealId: sel?.id,
                            mealName: sel?.name
                          }
                        });
                      }}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose dish from live menu --</option>
                      {meals.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (₹{m.price}) {m.isVeg ? '🌱 Veg' : '🍗 Non-Veg'}
                        </option>
                      ))}
                    </select>
                    {config.referrerReward.mealId && getMeal(config.referrerReward.mealId) && (
                      <div className="mt-2 p-2 bg-stone-800/60 rounded-xl flex items-center gap-2.5 border border-stone-700">
                        <img
                          src={getMeal(config.referrerReward.mealId)?.image}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <div className="text-[11px]">
                          <span className="text-white font-bold block">{getMeal(config.referrerReward.mealId)?.name}</span>
                          <span className="text-amber-400 font-mono">₹{getMeal(config.referrerReward.mealId)?.price}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Display Description
                  </label>
                  <input
                    type="text"
                    value={config.referrerReward.description}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        referrerReward: {
                          ...config.referrerReward,
                          description: e.target.value
                        }
                      })
                    }
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* REFEREE REWARD */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-sm font-extrabold text-white">Referee Gift (The Invited Friend)</h4>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Applied in the cart as an instant discount or perk when they enter their friend's referral code.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Instant First-Order Discount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-xs">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={config.refereeReward.amount}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          refereeReward: {
                            ...config.refereeReward,
                            amount: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Minimum Order Value (MOV) (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={config.refereeReward.minOrderValue}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          refereeReward: {
                            ...config.refereeReward,
                            minOrderValue: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    e.g. ₹399 minimum cart subtotal required to redeem the discount.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Display Description
                  </label>
                  <input
                    type="text"
                    value={config.refereeReward.description}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        refereeReward: {
                          ...config.refereeReward,
                          description: e.target.value
                        }
                      })
                    }
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SQUAD BOUNTY: TABLE OF 4 */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Crown className="w-5 h-5" />
                <div>
                  <h4 className="text-sm font-extrabold text-white">"Table of 4" Squad Milestone Bounty</h4>
                  <p className="text-xs text-stone-400">
                    Grand milestone perk unlocked when a patron seats a full table by referring 4 active ordering friends.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.squadGoal.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      squadGoal: {
                        ...config.squadGoal,
                        enabled: e.target.checked
                      }
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-stone-800">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Target Delivered Friends
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={config.squadGoal.targetReferrals}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      squadGoal: {
                        ...config.squadGoal,
                        targetReferrals: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Bounty Reward Type
                </label>
                <select
                  value={config.squadGoal.rewardType}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      squadGoal: {
                        ...config.squadGoal,
                        rewardType: e.target.value as any
                      }
                    })
                  }
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="wallet_golden">Golden Wallet Cash (₹)</option>
                  <option value="free_dish">Free Signature Feast Platter</option>
                </select>
              </div>

              {config.squadGoal.rewardType === 'wallet_golden' ? (
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Cash Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={config.squadGoal.rewardAmount}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        squadGoal: {
                          ...config.squadGoal,
                          rewardAmount: Number(e.target.value)
                        }
                      })
                    }
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Complimentary Feast Platter
                  </label>
                  <select
                    value={config.squadGoal.mealId || ''}
                    onChange={(e) => {
                      const sel = meals.find((m) => m.id === e.target.value);
                      setConfig({
                        ...config,
                        squadGoal: {
                          ...config.squadGoal,
                          mealId: sel?.id,
                          mealName: sel?.name
                        }
                      });
                    }}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose from menu --</option>
                    {meals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (₹{m.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BHATTI HEAT STREAK & ROYAL RANKS */}
      {activeSubTab === 'ranks' && (
        <div className="space-y-6">
          {/* STREAK WINDOW */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Bhatti Heat Streak Validity Window
              </h4>
              <p className="text-xs text-stone-400">
                Number of days allowed between orders to keep the customer's flame scalding hot. If exceeded, the multiplier cools down.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="3"
                max="60"
                value={config.streakWindowDays}
                onChange={(e) => setConfig({ ...config, streakWindowDays: Number(e.target.value) })}
                className="w-20 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white text-center focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-stone-400 font-bold">Days</span>
            </div>
          </div>

          {/* ROYAL RANKS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {config.royalRanks.map((rank, idx) => (
              <div
                key={rank.id}
                className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{rank.badgeIcon}</span>
                    <div>
                      <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                        {rank.title}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {rank.cashbackMultiplier}x Cashback
                        </span>
                      </h4>
                      <p className="text-xs text-stone-400">{rank.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-orange-400">
                    {Array.from({ length: rank.flameLevel }).map((_, i) => (
                      <Flame key={i} className="w-3.5 h-3.5 fill-orange-400" />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Min Completed Orders
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rank.minOrders}
                      onChange={(e) => updateRank(idx, { minOrders: Number(e.target.value) })}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Cashback Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="1.0"
                      max="3.0"
                      value={rank.cashbackMultiplier}
                      onChange={(e) =>
                        updateRank(idx, { cashbackMultiplier: Number(e.target.value) })
                      }
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* FREE DELIVERY PERK TOGGLE */}
                <div className="flex items-center justify-between p-2.5 bg-stone-800/40 rounded-xl border border-stone-800">
                  <span className="text-xs text-stone-300 font-medium">Permanent Free Delivery</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rank.freeDelivery}
                      onChange={(e) => updateRank(idx, { freeDelivery: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* DISH PERK SELECTOR */}
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Free Complimentary Dish Perk (From Active Menu)
                  </label>
                  <select
                    value={rank.freeDishMealId || ''}
                    onChange={(e) => {
                      const sel = meals.find((m) => m.id === e.target.value);
                      updateRank(idx, {
                        freeDishMealId: sel?.id,
                        freeDishMealName: sel?.name
                      });
                    }}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- None (No Dish Perk) --</option>
                    {meals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (₹{m.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Perk Summary Description
                  </label>
                  <input
                    type="text"
                    value={rank.perkSummary}
                    onChange={(e) => updateRank(idx, { perkSummary: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 5-CARD FEAST POKER BOUNTIES */}
      {activeSubTab === 'poker' && (
        <div className="space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Taash Card Deals & Poker Combinations
            </h4>
            <p className="text-xs text-stone-400 mt-1">
              Every completed order deals the user 1 authentic Playing Card (10, J, Q, K, A in 4 royal suits). Patrons collect cards to form winning combinations and claim your configured bounties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PAIR */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-white">One Pair (2 matching cards)</h4>
                  <p className="text-[11px] text-stone-400">e.g. 2 Kings or 2 Aces</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.pokerHands.pair.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        pokerHands: {
                          ...config.pokerHands,
                          pair: { ...config.pokerHands.pair, enabled: e.target.checked }
                        }
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Reward: Standard Ember Coins
                </label>
                <input
                  type="number"
                  value={config.pokerHands.pair.amount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pokerHands: {
                        ...config.pokerHands,
                        pair: { ...config.pokerHands.pair, amount: Number(e.target.value) }
                      }
                    })
                  }
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* THREE OF A KIND */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-white">Three of a Kind (3 matching cards)</h4>
                  <p className="text-[11px] text-stone-400">e.g. 3 Queens</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.pokerHands.threeOfAKind.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        pokerHands: {
                          ...config.pokerHands,
                          threeOfAKind: { ...config.pokerHands.threeOfAKind, enabled: e.target.checked }
                        }
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Reward: Golden Wallet Cash (₹)
                </label>
                <input
                  type="number"
                  value={config.pokerHands.threeOfAKind.amount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pokerHands: {
                        ...config.pokerHands,
                        threeOfAKind: { ...config.pokerHands.threeOfAKind, amount: Number(e.target.value) }
                      }
                    })
                  }
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* FLUSH */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-white">5-Card Flush (5 same suit cards)</h4>
                  <p className="text-[11px] text-stone-400">e.g. 5 Spades or 5 Hearts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.pokerHands.flush.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        pokerHands: {
                          ...config.pokerHands,
                          flush: { ...config.pokerHands.flush, enabled: e.target.checked }
                        }
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Reward: Golden Wallet Cash (₹)
                </label>
                <input
                  type="number"
                  value={config.pokerHands.flush.amount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pokerHands: {
                        ...config.pokerHands,
                        flush: { ...config.pokerHands.flush, amount: Number(e.target.value) }
                      }
                    })
                  }
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* ROYAL FLUSH */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-white">Grand Royal Flush (10, J, Q, K, A same suit)</h4>
                  <p className="text-[11px] text-stone-400">The Ultimate Taash Hand</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.pokerHands.royalFlush.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        pokerHands: {
                          ...config.pokerHands,
                          royalFlush: { ...config.pokerHands.royalFlush, enabled: e.target.checked }
                        }
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Bounty: Golden Wallet Cash (₹)
                </label>
                <input
                  type="number"
                  value={config.pokerHands.royalFlush.amount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pokerHands: {
                        ...config.pokerHands,
                        royalFlush: { ...config.pokerHands.royalFlush, amount: Number(e.target.value) }
                      }
                    })
                  }
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
