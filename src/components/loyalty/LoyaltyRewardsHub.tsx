/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Flame, 
  Trophy, 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  CheckCircle2, 
  Sparkles, 
  Crown, 
  ArrowRight, 
  Coins, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  Gamepad2, 
  AlertCircle,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { User, Order } from '../../types';
import { WonRewardRecord } from '../../types/gameon';
import { 
  LoyaltyConfig, 
  DEFAULT_LOYALTY_CONFIG, 
  PokerCardItem, 
  UserLoyaltyState 
} from '../../types/loyalty';
import { 
  subscribeToLoyaltyConfig, 
  ensureUserReferralCode, 
  calculateUserLoyaltyState, 
  evaluatePokerHands, 
  claimPokerBounty 
} from '../../lib/loyaltyService';

interface LoyaltyRewardsHubProps {
  user: User;
  orders: Order[];
  wonRewards: WonRewardRecord[];
  onSelectTab: (tab: any) => void;
  onApplyReward?: (code: string) => void;
}

export default function LoyaltyRewardsHub({
  user,
  orders = [],
  wonRewards = [],
  onSelectTab,
  onApplyReward
}: LoyaltyRewardsHubProps) {
  const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const [activeTab, setActiveTab] = useState<'referrals' | 'streak' | 'poker' | 'arcade'>('referrals');
  const [referralCode, setReferralCode] = useState<string>(user.referralCode || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimingCombo, setClaimingCombo] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  // Subscribe to real-time loyalty config
  useEffect(() => {
    const unsub = subscribeToLoyaltyConfig((latest) => {
      setConfig(latest);
    });
    return () => unsub();
  }, []);

  // Ensure user has a referral code
  useEffect(() => {
    if (user.id) {
      ensureUserReferralCode(user, user.id).then((code) => {
        setReferralCode(code);
      });
    }
  }, [user.id]);

  // Compute live loyalty state
  const loyaltyState: UserLoyaltyState = useMemo(() => {
    return calculateUserLoyaltyState(orders, config, user);
  }, [orders, config, user]);

  // Evaluate poker combos
  const pokerEvaluation = useMemo(() => {
    return evaluatePokerHands(loyaltyState.userCards, config);
  }, [loyaltyState.userCards, config]);

  const referralShareUrl = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  };

  const handleCopyLink = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleWhatsAppShare = () => {
    if (!referralCode) return;
    const discountText = config.refereeReward.type === 'discount_flat' 
      ? `₹${config.refereeReward.amount} OFF` 
      : 'an exclusive discount';
    const text = `🔥 Hey! I'm treating you to ${discountText} on your first royal feast at Taash Bhatti!\n\nUse my invite code: *${referralCode}* at checkout.\n\nOrder authentic clay-oven tandoor platters scalding hot here: ${referralShareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share && referralCode) {
      try {
        await navigator.share({
          title: 'Taash Bhatti Royal Invitation',
          text: `Use my invite code ${referralCode} for ₹${config.refereeReward.amount} OFF on your first feast!`,
          url: referralShareUrl
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleClaimCombo = async (comboId: 'pair' | 'threeOfAKind' | 'flush' | 'royalFlush') => {
    if (!user.id) return;
    setClaimingCombo(comboId);
    setClaimFeedback(null);
    try {
      const res = await claimPokerBounty({
        userId: user.id,
        comboId,
        config
      });
      setClaimFeedback(res);
    } catch (e: any) {
      setClaimFeedback({ success: false, message: e?.message || 'Claim failed' });
    } finally {
      setClaimingCombo(null);
      setTimeout(() => setClaimFeedback(null), 5000);
    }
  };

  const handleCopyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCouponCode(code);
      setTimeout(() => setCopiedCouponCode(null), 2500);
    } catch {}
  };

  const successfulReferrals = user.successfulReferralCount || 0;
  const targetSquadCount = config.squadGoal.targetReferrals || 4;

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* ROYAL CLUB HERO BANNER */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#0c0a09] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-3 h-3" />
                TAASH BHATTI ROYALE
              </span>
              <span className="text-xs font-mono text-amber-300 font-bold">
                {loyaltyState.currentRank.badgeIcon} {loyaltyState.currentRank.title}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Royale Club & Bounty Hub
            </h3>
            <p className="text-xs text-stone-300 max-w-lg leading-relaxed">
              Deal referral cards to friends for ₹{config.referrerReward.amount} wallet grants, maintain your Bhatti heat streak for up to {config.royalRanks[config.royalRanks.length - 1]?.cashbackMultiplier}x Ember cashback, and collect 5-Card Feast Poker hands!
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-amber-500/20 pt-3 sm:pt-0 sm:pl-5 shrink-0">
            <span className="text-[10px] text-stone-400 uppercase font-black tracking-wider">
              Active Multiplier
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-amber-400">
                {loyaltyState.multiplier.toFixed(2)}x
              </span>
              <span className="text-[10px] text-amber-300 font-semibold">Cashback</span>
            </div>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS */}
        <div className="flex border-t border-amber-500/20 mt-5 pt-3 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'referrals'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>"Deal The Hand" Referrals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('streak')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'streak'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heat Streak & Ranks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('poker')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'poker'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>5-Card Feast Poker</span>
            {pokerEvaluation.hasAnyClaimable && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('arcade')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'arcade'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Arcade Vault ({wonRewards.filter((r) => !r.isRedeemed).length})</span>
          </button>
        </div>
      </div>

      {/* CLAIM FEEDBACK TOAST */}
      {claimFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all animate-fade-in ${
            claimFeedback.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {claimFeedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{claimFeedback.message}</span>
        </div>
      )}

      {/* VIEW 1: DEAL THE HAND REFERRALS */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* 3D GOLD FOIL PLAYING CARD MOCKUP */}
            <div className="lg:col-span-5 bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-700 p-0.5 rounded-3xl shadow-2xl">
              <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-black rounded-[23px] p-6 text-white h-full flex flex-col justify-between relative overflow-hidden border border-amber-400/30">
                {/* Diagonal Foil Shimmer */}
                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-amber-400/10 to-transparent rotate-45 pointer-events-none" />

                {/* Top Card Header */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">♠</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      ROYAL INVITATION PASS
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                    {loyaltyState.currentRank.badgeIcon} {loyaltyState.currentRank.title}
                  </span>
                </div>

                {/* Center Ace Crest & Referral Code */}
                <div className="relative z-10 my-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/40 mx-auto flex items-center justify-center text-3xl shadow-inner shadow-amber-500/20">
                    👑
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold block mb-1">
                      YOUR UNIQUE REFERRAL CODE
                    </span>
                    <div className="inline-block px-4 py-2 rounded-2xl bg-black/60 border border-amber-400/40 backdrop-blur-sm">
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-amber-300">
                        {referralCode || 'GENERATING...'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-300 max-w-xs mx-auto">
                    Friends get <span className="text-amber-400 font-bold">₹{config.refereeReward.amount} OFF</span> their 1st feast. You bank <span className="text-emerald-400 font-bold">₹{config.referrerReward.amount} Golden Cash</span> in your Bhatti Wallet upon delivery!
                  </p>
                </div>

                {/* Quick Copy / Share Button Bar */}
                <div className="relative z-10 grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="py-2.5 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-750 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-stone-700 cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            {/* "TABLE OF 4" SQUAD BOUNTY TRACKER */}
            <div className="lg:col-span-7 bg-white border border-brand-green/15 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-green block">
                        MILESTONE SQUAD BOUNTY
                      </span>
                      <h4 className="text-base font-extrabold text-brand-charcoal">
                        "Table of 4" Royal Banquet Goal
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-brand-cream/80 text-brand-charcoal border border-brand-green/10">
                    {successfulReferrals} / {targetSquadCount} Friends Seated
                  </span>
                </div>
                <p className="text-xs text-brand-charcoal/70 leading-relaxed">
                  In royal tradition, a full feast table seats 4 companions. Seat 4 friends by getting them to complete their first delivered feast, and unlock the grand bounty:
                </p>
                
                {/* Bounty Perk Highlight */}
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3">
                  <span className="text-2xl">🏺</span>
                  <div className="text-xs">
                    <span className="font-extrabold text-brand-charcoal block">
                      {config.squadGoal.title || 'Table of 4 Royal Feast Bounty'}
                    </span>
                    <span className="text-brand-charcoal/70">
                      {config.squadGoal.rewardType === 'wallet_golden'
                        ? `₹${config.squadGoal.rewardAmount} Golden Wallet Cash (100% bill usable)`
                        : `Complimentary signature feast: ${config.squadGoal.mealName || 'Signature Platter'}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Interactive Seats */}
              <div className="grid grid-cols-4 gap-2.5">
                {Array.from({ length: targetSquadCount }).map((_, seatIdx) => {
                  const isOccupied = seatIdx < successfulReferrals;
                  return (
                    <div
                      key={seatIdx}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isOccupied
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-stone-50 border-stone-200 text-stone-400'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isOccupied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {isOccupied ? '✓' : seatIdx + 1}
                      </div>
                      <span className="text-[10px] font-extrabold block">
                        {isOccupied ? 'Friend Seated' : `Seat #${seatIdx + 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Share link input */}
              <div className="pt-2 border-t border-brand-green/10 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralShareUrl}
                  className="w-full bg-brand-cream/30 border border-brand-green/15 rounded-xl px-3 py-2 text-xs font-mono text-brand-charcoal select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="p-2 rounded-xl bg-brand-cream/60 hover:bg-brand-cream text-brand-charcoal transition-colors shrink-0 cursor-pointer"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: BHATTI HEAT STREAK & ROYAL RANKS */}
      {activeTab === 'streak' && (
        <div className="space-y-6">
          {/* THERMAL TANDOOR METER */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-orange-500/30 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-orange-400" />
                    BHATTI HEAT THERMOMETER
                  </span>
                  {loyaltyState.streakActive ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Flame Burning Scalding Hot
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40">
                      Flame Cooling Down
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  Current Rank: {loyaltyState.currentRank.badgeIcon} {loyaltyState.currentRank.title}
                </h3>
                <p className="text-xs text-stone-300 max-w-lg leading-relaxed">
                  {loyaltyState.currentRank.perkSummary}
                </p>

                {loyaltyState.streakActive && loyaltyState.daysRemainingInStreak > 0 && (
                  <p className="text-xs text-orange-300 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Order within the next {loyaltyState.daysRemainingInStreak} days to maintain your scalding {loyaltyState.multiplier}x cashback flame!
                    </span>
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-stone-800 flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
                    Total Delivered
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {loyaltyState.totalCompletedOrders}
                  </span>
                  <span className="text-[10px] text-stone-400 block">Orders</span>
                </div>
                <div className="w-px h-10 bg-stone-800" />
                <div className="text-center">
                  <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
                    Cashback Rate
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-400">
                    {Math.round(10 * loyaltyState.multiplier)}%
                  </span>
                  <span className="text-[10px] text-amber-300 block">Per Order</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROADMAP: 4 ROYAL RANKS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {config.royalRanks.map((rank) => {
              const isCurrent = rank.id === loyaltyState.currentRank.id;
              const isAchieved = loyaltyState.totalCompletedOrders >= rank.minOrders;

              return (
                <div
                  key={rank.id}
                  className={`rounded-3xl p-5 border transition-all flex flex-col justify-between gap-3 ${
                    isCurrent
                      ? 'bg-gradient-to-br from-amber-500/15 via-white to-amber-500/5 border-amber-500/50 shadow-md ring-2 ring-amber-500/30'
                      : isAchieved
                      ? 'bg-white border-brand-green/20 shadow-xs'
                      : 'bg-stone-50 border-stone-200 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{rank.badgeIcon}</span>
                      {isCurrent ? (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                          ACTIVE TIER
                        </span>
                      ) : isAchieved ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Unlocked
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                          {rank.minOrders - loyaltyState.totalCompletedOrders} more orders
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-extrabold text-brand-charcoal">{rank.title}</h4>
                    <p className="text-[11px] text-brand-charcoal/60 mt-0.5">{rank.subtitle}</p>

                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-brand-charcoal/70">Multiplier:</span>
                        <span className="font-mono text-amber-600">{rank.cashbackMultiplier}x ({Math.round(10 * rank.cashbackMultiplier)}%)</span>
                      </div>
                      {rank.freeDelivery && (
                        <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <span>✓ Permanent Zero Delivery Fee</span>
                        </div>
                      )}
                      {rank.freeDishMealName && (
                        <div className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                          <span>🎁 Free: {rank.freeDishMealName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-brand-charcoal/50 font-medium">
                    {rank.minOrders === 0 ? 'Starting rank' : `Requires ${rank.minOrders}+ delivered orders`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: 5-CARD FEAST POKER VAULT */}
      {activeTab === 'poker' && (
        <div className="space-y-6">
          {/* ROYAL CARD TABLE HEADER */}
          <div className="bg-gradient-to-br from-[#0c2417] via-[#091a11] to-[#040e09] border border-emerald-500/30 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
                  <Trophy className="w-3 h-3" />
                  TAASH CARD VAULT
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  5-Card Feast Poker
                </h3>
                <p className="text-xs text-stone-300 max-w-lg leading-relaxed">
                  Every delivered feast deals you 1 authentic playing card. Match suits and ranks to claim instant Golden Wallet grants and feast platters!
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Available Hand Cards
                </span>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {pokerEvaluation.totalAvailableCards}
                </span>
              </div>
            </div>

            {/* DEALT CARDS RACK */}
            <div className="mt-6 pt-5 border-t border-emerald-500/20">
              {loyaltyState.userCards.filter((c) => !c.isUsedInCombo).length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  No playing cards in your hand yet. Place an order to be dealt your inaugural Taash Card!
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                  {loyaltyState.userCards
                    .filter((c) => !c.isUsedInCombo)
                    .map((card) => {
                      const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
                      const suitGlyphs: Record<string, string> = {
                        spades: '♠',
                        hearts: '♥',
                        diamonds: '♦',
                        clubs: '♣'
                      };

                      return (
                        <div
                          key={card.id}
                          className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-b from-white to-stone-100 border border-stone-300 shadow-md p-2 flex flex-col justify-between shrink-0 transform hover:-translate-y-1 transition-all select-none"
                        >
                          <div className={`text-left text-xs sm:text-sm font-black font-mono ${isRed ? 'text-red-600' : 'text-stone-900'}`}>
                            {card.rank}
                            <span className="block text-[11px] leading-none">{suitGlyphs[card.suit]}</span>
                          </div>
                          <div className={`text-center text-xl sm:text-2xl ${isRed ? 'text-red-600' : 'text-stone-900'}`}>
                            {suitGlyphs[card.suit]}
                          </div>
                          <div className={`text-right text-xs sm:text-sm font-black font-mono rotate-180 ${isRed ? 'text-red-600' : 'text-stone-900'}`}>
                            {card.rank}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* CLAIMABLE BOUNTIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pokerEvaluation.combos.map((combo) => (
              <div
                key={combo.id}
                className={`p-5 rounded-3xl border transition-all flex items-center justify-between gap-4 ${
                  combo.isEligible
                    ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/20 border-emerald-400 shadow-md'
                    : 'bg-white border-stone-200 opacity-60'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🃏</span>
                    <h4 className="text-sm font-extrabold text-brand-charcoal truncate">
                      {combo.title}
                    </h4>
                  </div>
                  <p className="text-xs text-brand-charcoal/70 font-medium">
                    Reward: <span className="font-bold text-brand-green">{combo.label}</span>
                  </p>
                  <span className="text-[10px] text-brand-charcoal/50 block">
                    Requires {combo.cardsNeeded} matching cards
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!combo.isEligible || claimingCombo === combo.id}
                  onClick={() => handleClaimCombo(combo.id as any)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer ${
                    combo.isEligible
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20'
                      : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {claimingCombo === combo.id
                    ? 'Claiming...'
                    : combo.isEligible
                    ? 'Claim Bounty'
                    : 'Locked'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: ARCADE VAULT (PHYSICAL GAMEON REWARDS) */}
      {activeTab === 'arcade' && (
        <div className="space-y-4">
          {wonRewards.length === 0 ? (
            <div className="bg-white border border-brand-green/10 rounded-3xl p-8 text-center space-y-4 shadow-3xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-base font-extrabold text-brand-charcoal">
                  No Arcade Rewards Won Yet
                </h4>
                <p className="text-xs text-brand-charcoal/60 leading-relaxed">
                  Next time you dine at Taash Bhatti, scan the physical GameOn QR coaster on your table to play roulette, scratch cards, coin flips, or trivia!
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('menu')}
                className="px-6 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Browse Feast Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {wonRewards.map((reward) => {
                const isExpired = reward.expiryDate && new Date(reward.expiryDate) < new Date();
                const isUsable = !reward.isRedeemed && !isExpired;

                return (
                  <div
                    key={reward.id}
                    className={`rounded-3xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between gap-4 ${
                      isUsable
                        ? 'bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-500/30 shadow-3xs hover:border-amber-500/50'
                        : 'bg-stone-50 border-stone-200 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/20">
                          🎮 {reward.gameTitle || 'Bhatti GameOn'}
                        </span>
                        {reward.isRedeemed ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                            Redeemed
                          </span>
                        ) : isExpired ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ready to Use
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-extrabold text-brand-charcoal leading-snug">
                        {reward.perkName || `Special Discount (${reward.couponCode})`}
                      </h4>
                      <p className="text-[11px] text-brand-charcoal/60 mt-0.5">
                        Won on {new Date(reward.wonAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • Valid until {reward.expiryDate}
                      </p>
                    </div>

                    <div className="bg-stone-900 rounded-2xl p-3 text-white flex items-center justify-between gap-2 border border-stone-800">
                      <div className="min-w-0">
                        <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold block">
                          Locked Coupon Code
                        </span>
                        <span className="text-sm font-mono font-black text-amber-300 tracking-wider truncate block">
                          {reward.couponCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyCoupon(reward.couponCode)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedCouponCode === reward.couponCode ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        {isUsable && onApplyReward && (
                          <button
                            type="button"
                            onClick={() => onApplyReward(reward.couponCode)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                          >
                            <span>Apply</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
