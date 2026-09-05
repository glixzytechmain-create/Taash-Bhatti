/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Sparkles,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  ChevronRight,
  Zap,
  Info,
  Sliders,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { User, WalletTransaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { calculateEmberCheckoutUsage } from '../lib/walletService';

interface BhattiWalletSectionProps {
  user: User;
  onUpdateUser?: (updated: User) => void;
  onNavigateToMenu?: () => void;
}

export default function BhattiWalletSection({
  user,
  onUpdateUser,
  onNavigateToMenu
}: BhattiWalletSectionProps) {
  const [activeVaultView, setActiveVaultView] = useState<'both' | 'golden' | 'standard'>('both');
  const [filterType, setFilterType] = useState<'all' | 'golden' | 'standard' | 'debit'>('all');
  const [simulatorBill, setSimulatorBill] = useState<number>(650);
  const [simUseGolden, setSimUseGolden] = useState<boolean>(true);
  const [simUseStandard, setSimUseStandard] = useState<boolean>(true);

  const goldenBalance = Number(user.goldenEmberBalance || 0);
  const standardBalance = Number(user.standardEmberBalance || 0);
  const totalEmbers = goldenBalance + standardBalance;

  // Simulator calculation
  const simResult = useMemo(() => {
    return calculateEmberCheckoutUsage({
      billAmount: simulatorBill,
      goldenBalance,
      standardBalance,
      useGolden: simUseGolden,
      useStandard: simUseStandard
    });
  }, [simulatorBill, goldenBalance, standardBalance, simUseGolden, simUseStandard]);

  // Projected 10% standard ember earning
  const projectedEarnings = Math.max(1, Math.round(simResult.finalPayable * 0.10));

  // Transactions filter
  const allTransactions = (user.walletTransactions || []) as WalletTransaction[];
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filterType === 'all') return true;
      if (filterType === 'golden') return tx.emberType === 'golden';
      if (filterType === 'standard') return tx.emberType === 'standard';
      if (filterType === 'debit') return tx.type === 'debit';
      return true;
    });
  }, [allTransactions, filterType]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. HERO ATMOSPHERIC VAULT CARD */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-amber-500/20 bg-[#0A0D12] text-white">
        {/* Ember particle lighting & hearth glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-amber-500/15 via-orange-600/10 to-transparent blur-3xl pointer-events-none -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-radial from-yellow-500/10 via-red-500/5 to-transparent blur-2xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 p-6 sm:p-7 space-y-6">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-amber-300/30"
              >
                <Flame className="w-6 h-6 text-white drop-shadow-md" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                    Bhatti Wallet
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-wider">
                    Ember Core
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 font-medium">
                  Dual-Vault Culinary Hearth Tokens & Instant Refunds
                </p>
              </div>
            </div>

            {/* Valuation Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-amber-300 font-mono">1 Ember Coin = ₹1</span>
            </div>
          </div>

          {/* Overall Portfolio Balance Counter */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/80 block">
                Total Available Ember Power
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {totalEmbers.toLocaleString()}
                </span>
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                  Ember Coins
                </span>
                <span className="text-xs font-semibold text-gray-400">
                  (Worth ₹{totalEmbers})
                </span>
              </div>
            </div>

            {onNavigateToMenu && (
              <button
                type="button"
                onClick={onNavigateToMenu}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Feast With Embers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DUAL VAULT DISPLAY (Separately Stored!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. GOLDEN EMBER VAULT */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => setActiveVaultView(activeVaultView === 'golden' ? 'both' : 'golden')}
              className={`rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all cursor-pointer border ${
                activeVaultView === 'golden'
                  ? 'bg-gradient-to-br from-amber-900/40 via-yellow-950/40 to-black border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
                  : 'bg-gradient-to-br from-amber-950/25 via-stone-900/40 to-black border-amber-500/30 hover:border-amber-400/60'
              }`}
            >
              {/* Shimmer light */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 flex items-center justify-center text-black font-black text-sm shadow-md">
                    ✨
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-amber-200 uppercase tracking-wider">
                      Golden Ember Vault
                    </h4>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                      Refunds Only
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  100% Bill Power
                </span>
              </div>

              <div className="my-3">
                <span className="text-[10px] font-bold text-amber-300/70 uppercase tracking-wider block">
                  Golden Balance
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black text-amber-300 font-mono">
                    {goldenBalance}
                  </span>
                  <span className="text-xs font-bold text-amber-200">Embers</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-amber-500/15 text-[10px] text-amber-100/70 space-y-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Obtained exclusively from order cancellations</span>
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Can settle up to <b>100% of any checkout bill</b></span>
                </p>
                <p className="text-[9px] text-amber-300/60 italic pt-0.5">
                  Applied first at checkout before Standard Embers
                </p>
              </div>
            </motion.div>

            {/* 2. STANDARD EMBER VAULT */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => setActiveVaultView(activeVaultView === 'standard' ? 'both' : 'standard')}
              className={`rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all cursor-pointer border ${
                activeVaultView === 'standard'
                  ? 'bg-gradient-to-br from-orange-950/40 via-red-950/40 to-black border-orange-500 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/10'
                  : 'bg-gradient-to-br from-orange-950/20 via-stone-900/40 to-black border-orange-500/30 hover:border-orange-400/60'
              }`}
            >
              {/* Flame light */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                    🔥
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-orange-200 uppercase tracking-wider">
                      Standard Ember Vault
                    </h4>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase">
                      Order Loyalty
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase tracking-wider">
                  30% Bill Power
                </span>
              </div>

              <div className="my-3">
                <span className="text-[10px] font-bold text-orange-300/70 uppercase tracking-wider block">
                  Standard Balance
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black text-orange-400 font-mono">
                    {standardBalance}
                  </span>
                  <span className="text-xs font-bold text-orange-200">Embers</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-orange-500/15 text-[10px] text-orange-100/70 space-y-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Earn <b>10% back</b> in Standard Embers on every delivered order</span>
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Can settle up to <b>30% of any checkout bill</b></span>
                </p>
                <p className="text-[9px] text-orange-300/60 italic pt-0.5">
                  Can be applied after or alongside Golden Embers
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE EMBER SAVINGS SIMULATOR */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                Interactive Ember Checkout Simulator
              </h4>
              <p className="text-[10px] text-gray-500">
                See how Golden (100%) and Standard (30%) Embers apply to your feast
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-brand-green/10 text-brand-green border border-brand-green/20 text-[10px] font-black rounded-lg uppercase">
            Live Math
          </span>
        </div>

        {/* Slider Input */}
        <div className="space-y-2 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center text-xs font-bold text-brand-charcoal">
            <label htmlFor="simulator-bill-slider" className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500">
              Hypothetical Feast Bill
            </label>
            <span className="text-base font-black text-brand-charcoal font-mono">
              ₹{simulatorBill}
            </span>
          </div>
          <input
            id="simulator-bill-slider"
            type="range"
            min="150"
            max="2500"
            step="50"
            value={simulatorBill}
            onChange={(e) => setSimulatorBill(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>₹150 (Snack)</span>
            <span>₹800 (Fit Dinner)</span>
            <span>₹2,500 (Squad Feast)</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {/* Golden Toggle */}
          <div
            onClick={() => goldenBalance > 0 && setSimUseGolden(!simUseGolden)}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              goldenBalance === 0
                ? 'opacity-50 bg-gray-50 border-gray-200 cursor-not-allowed'
                : simUseGolden
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">✨</span>
              <div>
                <span className="font-bold block text-xs">Use Golden Embers</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {goldenBalance > 0 ? `${goldenBalance} Available (100% Bill Cap)` : '0 Available'}
                </span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center font-black text-xs ${
              simUseGolden && goldenBalance > 0 ? 'bg-amber-500 border-amber-500 text-black' : 'border-gray-300'
            }`}>
              {simUseGolden && goldenBalance > 0 && '✓'}
            </div>
          </div>

          {/* Standard Toggle */}
          <div
            onClick={() => {
              if (standardBalance === 0) return;
              if (goldenBalance > 0 && !simUseGolden) return;
              setSimUseStandard(!simUseStandard);
            }}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              standardBalance === 0 || (goldenBalance > 0 && !simUseGolden)
                ? 'opacity-50 bg-gray-50 border-gray-200 cursor-not-allowed'
                : simUseStandard
                ? 'bg-orange-50/80 border-orange-300 text-orange-950'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🔥</span>
              <div>
                <span className="font-bold block text-xs">Use Standard Embers</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {standardBalance > 0 ? `${standardBalance} Available (30% Bill Cap: ₹${Math.floor(simulatorBill * 0.30)})` : '0 Available'}
                </span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center font-black text-xs ${
              simUseStandard && standardBalance > 0 && (goldenBalance === 0 || simUseGolden)
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'border-gray-300'
            }`}>
              {simUseStandard && standardBalance > 0 && (goldenBalance === 0 || simUseGolden) && '✓'}
            </div>
          </div>
        </div>

        {/* Priority Rule Warning if Golden is available but untoggled */}
        {goldenBalance > 0 && !simUseGolden && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Priority Rule:</b> When redeeming tokens at checkout, Golden Embers must be activated first before Standard Embers can be utilized.
            </span>
          </div>
        )}

        {/* Calculation Result Breakdown */}
        <div className="p-4 rounded-2xl bg-[#0F141C] text-white space-y-2.5 font-mono text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Bill Target:</span>
            <span>₹{simulatorBill}</span>
          </div>

          {simResult.goldenDeduction > 0 && (
            <div className="flex justify-between text-amber-300">
              <span className="flex items-center gap-1 font-bold">✨ Golden Embers Deducted (100% power):</span>
              <span>-₹{simResult.goldenDeduction} ({simResult.goldenDeduction} coins)</span>
            </div>
          )}

          {simResult.standardDeduction > 0 && (
            <div className="flex justify-between text-orange-400">
              <span className="flex items-center gap-1 font-bold">🔥 Standard Embers Deducted (30% cap):</span>
              <span>-₹{simResult.standardDeduction} ({simResult.standardDeduction} coins)</span>
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex justify-between items-baseline font-sans font-black text-white">
            <span className="text-xs uppercase tracking-wider text-gray-300">Net Cash / Online Payable:</span>
            <span className="text-xl text-emerald-400 font-mono">₹{simResult.finalPayable}</span>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-sans font-bold text-amber-300/90">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Standard Embers Earned on Order Completion:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-black">
              +{projectedEarnings} Coins (10%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. INSTANT CANCELLATION GUARANTEE CALLOUT */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-black shrink-0 mt-0.5">
          ⚡
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
            Self-Service Cancellation & Instant Golden Ember Refund
          </h4>
          <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
            Plans changed? You can cancel any meal in your order history before our partner kitchen begins cooking. 100% of the payment is instantly credited as <b>Golden Ember Coins</b> directly to your Bhatti Wallet to clear up to 100% of future checkouts!
          </p>
        </div>
      </div>

      {/* 4. ACTIVITY & TRANSACTION LEDGER */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-charcoal" />
            <h4 className="text-xs font-black text-brand-charcoal uppercase tracking-wider">
              Bhatti Wallet Ledger
            </h4>
          </div>
          <span className="text-[10px] text-gray-400 font-bold font-mono">
            {filteredTransactions.length} of {allTransactions.length} Records
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All History' },
            { id: 'golden', label: '✨ Golden Refunds' },
            { id: 'standard', label: '🔥 10% Standard Rewards' },
            { id: 'debit', label: '🛒 Redeemed' }
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterType(pill.id as any)}
              className={`px-3 py-1 text-[10px] font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
                filterType === pill.id
                  ? 'bg-brand-charcoal text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-600">
              <Coins className="w-6 h-6 opacity-60" />
            </div>
            <p className="text-xs font-bold text-brand-charcoal">No wallet transactions in this view</p>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
              Pre-cook cancellations credit Golden Embers (100%), while completed feast deliveries earn 10% Standard Embers.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              const isGolden = tx.emberType === 'golden';
              const emberBadge = isGolden ? '✨ Golden Ember' : '🔥 Standard Ember';
              const formattedDate = new Date(tx.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={tx.id}
                  className="p-3 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isCredit
                          ? isGolden
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-orange-100 text-orange-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCredit ? (isGolden ? '✨' : '🔥') : '🛒'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                            isGolden
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-orange-100 text-orange-900 border-orange-300'
                          }`}
                        >
                          {emberBadge}
                        </span>
                        {tx.orderId && (
                          <span className="text-[9px] font-mono font-bold bg-gray-200 text-gray-700 px-1 rounded">
                            #{tx.orderId.slice(-6)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-brand-charcoal truncate mt-0.5">
                        {tx.description || tx.reason || (isCredit ? 'Ember Credit' : 'Ember Checkout Deduction')}
                      </p>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black font-mono block ${
                        isCredit
                          ? isGolden
                            ? 'text-amber-700'
                            : 'text-orange-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {isCredit ? '+' : '-'}{tx.amount}
                    </span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">
                      Coins (₹{tx.amount})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
