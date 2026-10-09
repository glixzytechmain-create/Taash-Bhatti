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
  ExternalLink,
  Palette,
  ChevronDown,
  ChevronUp,
  Award,
  Lock,
  Star,
  UserCheck
} from 'lucide-react';
import { User, Order } from '../../types';
import { WonRewardRecord } from '../../types/gameon';
import { 
  LoyaltyConfig, 
  DEFAULT_LOYALTY_CONFIG, 
  PokerCardItem, 
  UserLoyaltyState,
  CustomCardConfig,
  ReferredFriendProgress,
  ReferralMilestoneStep,
  DEFAULT_MILESTONE_STEPS
} from '../../types/loyalty';
import { 
  subscribeToLoyaltyConfig, 
  ensureUserReferralCode, 
  getOrGenerateReferralCodeSync,
  calculateUserLoyaltyState, 
  evaluatePokerHands, 
  claimPokerBounty,
  getUserCustomCard,
  subscribeToUserReferrals
} from '../../lib/loyaltyService';
import CustomReferralCardStudio, { CustomReferralCardView } from './CustomReferralCardStudio';

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
  const [referralCode, setReferralCode] = useState<string>(() => getOrGenerateReferralCodeSync(user, user?.id));
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimingCombo, setClaimingCombo] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  // Custom 5:7 Referral Card & Studio State
  const [customCardConfig, setCustomCardConfig] = useState<CustomCardConfig>(() => getUserCustomCard(user));
  const [showStudio, setShowStudio] = useState(false);
  const [referredFriends, setReferredFriends] = useState<ReferredFriendProgress[]>([]);
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);

  // Subscribe to real-time loyalty config
  useEffect(() => {
    const unsub = subscribeToLoyaltyConfig((latest) => {
      setConfig(latest);
    });
    return () => unsub();
  }, []);

  // Ensure user has a permanent referral code (guaranteed synchronous fallback)
  useEffect(() => {
    const code = getOrGenerateReferralCodeSync(user, user?.id);
    setReferralCode(code);
    ensureUserReferralCode(user, user?.id).then((savedCode) => {
      if (savedCode) setReferralCode(savedCode);
    });
  }, [user?.id, user?.referralCode]);

  // Sync custom card config if user object changes
  useEffect(() => {
    if (user?.customCard) {
      setCustomCardConfig(user.customCard);
    }
  }, [user?.customCard]);

  // Listen for local card customization updates
  useEffect(() => {
    const handleCardSaved = (e: any) => {
      if (e.detail) {
        setCustomCardConfig(e.detail);
      }
    };
    window.addEventListener('taashbhatti_card_customized', handleCardSaved);
    return () => window.removeEventListener('taashbhatti_card_customized', handleCardSaved);
  }, []);

  // Real-time subscription to referred friends and their 10-step milestones
  useEffect(() => {
    if (user.id) {
      const unsub = subscribeToUserReferrals(user.id, (friends) => {
        setReferredFriends(friends);
        if (friends.length > 0 && !expandedFriendId) {
          setExpandedFriendId(friends[0].id);
        }
      });
      return () => unsub();
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

  const activeReferralCode = useMemo(() => {
    if (referralCode && referralCode.trim().length >= 4) {
      return referralCode.trim().toUpperCase();
    }
    return getOrGenerateReferralCodeSync(user, user?.id);
  }, [referralCode, user]);

  const referralShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${activeReferralCode}&mode=signup`
    : `https://taashbhatti.com/?ref=${activeReferralCode}&mode=signup`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeReferralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleWhatsAppShare = () => {
    const discountText = config.refereeReward.type === 'discount_flat' 
      ? `₹${config.refereeReward.amount} OFF` 
      : '₹150 OFF';
    const text = `🔥 Hey! I'm treating you to ${discountText} on your first authentic clay-oven feast at Taash Bhatti!\n\nUse my invite code: *${activeReferralCode}* at signup & checkout.\n\nSign up and claim your feast here: ${referralShareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Taash Bhatti Royal Invitation',
          text: `Use my invite code ${activeReferralCode} for ₹${config.refereeReward.amount} OFF on your first feast!`,
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
            {/* 5:7 ASPECT RATIO CUSTOM ROYAL INVITATION CARD */}
            <div className="lg:col-span-5 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-amber-500/30 rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-between">
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  5:7 ROYAL PASS
                </span>
                <button
                  type="button"
                  onClick={() => setShowStudio(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-black text-amber-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Palette className="w-3 h-3 text-amber-400" />
                  <span>Customize Card</span>
                </button>
              </div>

              {/* Card Component (5:7 ratio with 3D Flip) */}
              <CustomReferralCardView
                user={user}
                referralCode={activeReferralCode}
                config={customCardConfig}
                onOpenStudio={() => setShowStudio(true)}
                className="my-auto"
              />

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-4 border-t border-stone-800">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="py-2.5 px-3 rounded-xl bg-stone-800/90 hover:bg-stone-750 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-stone-700 cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Code Copied!</span>
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

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralShareUrl}
                    className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-2 text-[11px] font-mono text-stone-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors shrink-0 cursor-pointer"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SQUAD BOUNTY & 10-STEP OVERVIEW */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              {/* "TABLE OF 4" SQUAD BOUNTY TRACKER */}
              <div className="bg-white border border-brand-green/15 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2">
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
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3">
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

                {/* 4 Interactive Seats */}
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: targetSquadCount }).map((_, seatIdx) => {
                    const isOccupied = seatIdx < successfulReferrals;
                    return (
                      <div
                        key={seatIdx}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isOccupied
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-stone-50 border-stone-200 text-stone-400'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isOccupied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {isOccupied ? '✓' : seatIdx + 1}
                        </div>
                        <span className="text-[9px] font-extrabold block">
                          {isOccupied ? 'Seated' : `Seat #${seatIdx + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 10-STEP JOURNEY EXPLAINER BANNER */}
              <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-amber-500/25 rounded-3xl p-5 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Progressive 10-Feast Milestone Journey
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">10 Unlockable Rewards</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Your referral rewards aren't just one-time! For <strong className="text-amber-400">every friend</strong> you refer, you unlock rewards across <strong className="text-amber-400">each of their first 10 feast deliveries</strong>: 50 Embers on Feast #1 & #2, complimentary gourmet menu platters on Feast #3 & #7, and up to ₹500 Golden Cash!
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-black/40 border border-stone-800">
                    <span className="text-[10px] text-stone-400 block font-semibold">Feast #1 & #2</span>
                    <span className="text-xs font-black text-amber-400">+50 Embers each</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-stone-800">
                    <span className="text-[10px] text-stone-400 block font-semibold">Feast #3 & #7</span>
                    <span className="text-xs font-black text-emerald-400">Free Signature Platters</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-stone-800">
                    <span className="text-[10px] text-stone-400 block font-semibold">Feast #10</span>
                    <span className="text-xs font-black text-amber-300">₹500 Grand Cash</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DEDICATED PER-FRIEND 10-STEP MILESTONE TRACKER */}
          <div className="bg-white border border-brand-green/15 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20 text-[10px] font-black uppercase tracking-wider">
                    INDIVIDUAL PROGRESS TRACKING
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-brand-charcoal mt-1 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-green" />
                  Your Royal Court ({referredFriends.length} Friends Referred)
                </h3>
                <p className="text-xs text-brand-charcoal/70 mt-0.5">
                  Every friend's 10-step milestone journey is calculated and awarded separately in your account.
                </p>
              </div>

              {/* Court Aggregate Stats */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[9px] font-mono font-bold text-amber-800 uppercase block">Court Orders</span>
                  <span className="text-sm font-black font-mono text-amber-700">
                    {referredFriends.reduce((acc, f) => acc + (f.completedOrdersCount || 0), 0)}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[9px] font-mono font-bold text-emerald-800 uppercase block">Golden Cash</span>
                  <span className="text-sm font-black font-mono text-emerald-700">
                    ₹{referredFriends.reduce((acc, f) => acc + (f.totalGoldenCashEarned || 0), 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Per-Friend List or Empty State */}
            {referredFriends.length === 0 ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-3xl shadow-xs">
                  👑
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-sm font-black text-brand-charcoal">
                    No Companions in Your Court Yet
                  </h4>
                  <p className="text-xs text-brand-charcoal/70 leading-relaxed">
                    Share your custom 5:7 royal invitation card or QR code. As soon as a friend signs up and places feasts, their individual 10-step progress trail will appear here automatically!
                  </p>
                </div>

                {/* 10 Milestone Roadmap Preview */}
                <div className="pt-4 border-t border-stone-200">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-charcoal/60 block mb-3">
                    Preview: What You'll Unlock for Each Referred Friend
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-left">
                    {(config.milestoneSteps || DEFAULT_MILESTONE_STEPS).map((m) => (
                      <div
                        key={m.step}
                        className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-black text-amber-600">Step #{m.step}</span>
                          <span className="text-[9px] text-stone-400 font-bold">Feast #{m.ordersRequired}</span>
                        </div>
                        <span className="text-[11px] font-black text-brand-charcoal leading-tight block">
                          {m.label}
                        </span>
                        <span className="text-[9px] text-stone-500 mt-1 line-clamp-1">
                          {m.rewardType === 'free_dish' ? 'Complimentary Dish' : m.rewardType === 'wallet_golden' ? '100% Bill Usable' : 'Cashback Embers'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowStudio(true)}
                    className="px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-black text-xs transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Customize & Deal My 5:7 Card</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {referredFriends.map((friend) => {
                  const milestones = config.milestoneSteps || DEFAULT_MILESTONE_STEPS;
                  const ordersCount = friend.completedOrdersCount || 0;
                  const claimedList = Array.isArray(friend.claimedMilestones) ? friend.claimedMilestones : [];
                  const isExpanded = expandedFriendId === friend.id;

                  return (
                    <div
                      key={friend.id}
                      className="border border-stone-200 rounded-2xl p-4 sm:p-5 bg-white shadow-xs hover:border-amber-400/40 transition-all space-y-4"
                    >
                      {/* Friend Summary Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center text-base font-black text-amber-700">
                            {friend.refereeName ? friend.refereeName.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-brand-charcoal">
                                {friend.refereeName || 'Royal Patron'}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20 text-[9px] font-mono font-bold">
                                {ordersCount} of 10 Feasts Completed
                              </span>
                            </div>
                            <span className="text-[11px] text-brand-charcoal/60 font-mono">
                              Joined {new Date(friend.joinedAt).toLocaleDateString()} {friend.refereePhone ? `• ${friend.refereePhone}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Rewards Earned From Friend */}
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-[10px] font-mono font-bold">
                            🪙 {friend.totalEmbersEarned || 0} Embers
                          </div>
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                            ₹{friend.totalGoldenCashEarned || 0} Golden Cash
                          </div>
                          {friend.freeDishesEarned && friend.freeDishesEarned.length > 0 && (
                            <div className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                              🍽️ {friend.freeDishesEarned.length} Free Dishes
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedFriendId(isExpanded ? null : friend.id)}
                            className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* 10-Step Progress Trail */}
                      <div className="pt-2 border-t border-stone-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-black text-brand-charcoal/70 uppercase tracking-wider">
                            10-Step Milestone Trail for {friend.refereeName || 'Friend'}
                          </span>
                          <span className="text-[10px] font-mono text-amber-600 font-bold">
                            {claimedList.length} / 10 Milestones Claimed
                          </span>
                        </div>

                        {/* Responsive 10 Step Trail Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                          {milestones.map((m) => {
                            const isClaimed = claimedList.includes(m.step) || ordersCount >= m.ordersRequired;
                            const isNext = !isClaimed && ordersCount + 1 === m.ordersRequired;

                            return (
                              <div
                                key={m.step}
                                className={`p-2 rounded-xl border text-center transition-all flex flex-col justify-between min-h-[90px] ${
                                  isClaimed
                                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-xs'
                                    : isNext
                                    ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400 animate-pulse'
                                    : 'bg-stone-50/80 border-stone-200 text-stone-400'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9px] font-mono font-black mb-1">
                                  <span>#{m.step}</span>
                                  <span>F{m.ordersRequired}</span>
                                </div>

                                <div className="my-auto py-0.5">
                                  <div className="text-base sm:text-lg mb-0.5">
                                    {isClaimed ? '✓' : isNext ? '⚡' : '🔒'}
                                  </div>
                                  <span className={`text-[10px] font-black leading-tight block line-clamp-2 ${isClaimed ? 'text-emerald-900' : isNext ? 'text-amber-900' : 'text-stone-500'}`}>
                                    {m.label}
                                  </span>
                                </div>

                                <span className={`text-[8px] font-mono uppercase tracking-wider block mt-1 font-bold ${isClaimed ? 'text-emerald-700' : isNext ? 'text-amber-700' : 'text-stone-400'}`}>
                                  {isClaimed ? 'Claimed' : isNext ? 'Next Goal' : 'Locked'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* CUSTOM 5:7 REFERRAL CARD ATELIER STUDIO MODAL */}
      <CustomReferralCardStudio
        user={user}
        referralCode={activeReferralCode}
        initialConfig={customCardConfig}
        isOpen={showStudio}
        onClose={() => setShowStudio(false)}
        onSaved={(newCfg) => {
          setCustomCardConfig(newCfg);
          setShowStudio(false);
        }}
      />
    </div>
  );
}
