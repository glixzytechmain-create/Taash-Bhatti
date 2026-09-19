/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameConfig, GameOutcome, WonRewardRecord } from '../../types/gameon';
import { User } from '../../types';
import { 
  getGameBy6DigitId, 
  recordGamePlayStats, 
  saveWonRewardToUserVault 
} from '../../lib/gameonService';
import { 
  isAudioMuted, 
  setAudioMuted, 
  playVictoryFanfare, 
  playLossBuzzer 
} from '../../lib/gameonAudio';
import RouletteGame from './games/RouletteGame';
import ScratchCardGame from './games/ScratchCardGame';
import CoinFlipGame from './games/CoinFlipGame';
import MysteryBoxGame from './games/MysteryBoxGame';
import MemoryMatchGame from './games/MemoryMatchGame';
import QuickQuizGame from './games/QuickQuizGame';
import { 
  Volume2, 
  VolumeX, 
  X, 
  Flame, 
  Sparkles, 
  Gift, 
  CheckCircle2, 
  Copy, 
  ArrowRight, 
  Lock, 
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BhattiGameOnPortalProps {
  gameId: string | null;
  currentUser: User;
  fbUser: any;
  onClose: () => void;
  onRequestSignIn: (pendingReward?: any) => void;
  onApplyRewardToCart: (couponCode: string) => void;
}

export default function BhattiGameOnPortal({
  gameId,
  currentUser,
  fbUser,
  onClose,
  onRequestSignIn,
  onApplyRewardToCart,
}: BhattiGameOnPortalProps) {
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameConfig | null>(null);
  const [muted, setMuted] = useState(() => isAudioMuted());
  const [turnsLeft, setTurnsLeft] = useState(1);
  const [activeOutcome, setActiveOutcome] = useState<GameOutcome | null>(null);
  const [savedReward, setSavedReward] = useState<WonRewardRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Load game from Firestore
  useEffect(() => {
    let isMounted = true;
    if (!gameId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getGameBy6DigitId(gameId).then((g) => {
      if (!isMounted) return;
      if (g && g.isActive) {
        setGame(g);
        const maxTurns = g.maxTurnsPerSession || 1;
        // Check session turns in localStorage
        const storageKey = `tb_turns_${g.gameId}_${new Date().toISOString().split('T')[0]}`;
        const playedTurns = parseInt(localStorage.getItem(storageKey) || '0', 10);
        const remaining = Math.max(0, maxTurns - playedTurns);
        setTurnsLeft(remaining);
      } else {
        setGame(null);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  };

  const handleFinishTurn = async (outcome: GameOutcome) => {
    if (!game) return;

    // Decrement turn count in session storage
    const storageKey = `tb_turns_${game.gameId}_${new Date().toISOString().split('T')[0]}`;
    const playedTurns = parseInt(localStorage.getItem(storageKey) || '0', 10) + 1;
    localStorage.setItem(storageKey, playedTurns.toString());
    setTurnsLeft(Math.max(0, (game.maxTurnsPerSession || 1) - playedTurns));

    // Record stats in Firestore
    recordGamePlayStats(game.id, outcome.isWin);

    setActiveOutcome(outcome);

    if (outcome.isWin) {
      playVictoryFanfare();
      // If user is logged in, automatically save into their vault!
      if (fbUser?.uid) {
        const fullRecord = await saveWonRewardToUserVault(fbUser.uid, fbUser.email, {
          userId: fbUser.uid,
          gameId: game.gameId,
          gameTitle: game.title,
          gameType: game.gameType,
          couponCode: outcome.couponCode || 'FEASTWIN',
          discountType: 'percentage',
          discountValue: 20,
          perkName: outcome.rewardDescription,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        setSavedReward(fullRecord);
      }
    } else {
      playLossBuzzer();
    }
  };

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  // 1. Loading screen
  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0c0a09] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-amber-400/70">
          Unlocking Bhatti GameOn Arena...
        </p>
      </div>
    );
  }

  // 2. 404 Terminal Screen (If invalid gameId or game retired)
  if (!game) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0c0a09] text-stone-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-md w-full bg-stone-900/90 border-2 border-red-500/40 rounded-3xl p-7 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 bg-red-950/60 px-2.5 py-1 rounded-full border border-red-800/40">
              404 • SCAN CODE NOT FOUND
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              Game Unavailable or Retired
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
              The game you are trying to reach does not exist, has expired, or requires scanning a valid physical table QR code at Taash Bhatti.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
          >
            Return to Taash Bhatti Feast Menu ➜
          </button>
        </div>
      </div>
    );
  }

  // 3. Render Active Arcade Arena
  return (
    <div className="fixed inset-0 z-[100] bg-[#0c0a09]/95 backdrop-blur-md text-stone-100 flex flex-col overflow-y-auto font-sans select-none">
      {/* TOP RETRO ARCADE MARQUEE BAR */}
      <header className="sticky top-0 z-20 w-full bg-[#1c1917]/95 border-b border-amber-500/30 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-md">
            <Flame className="w-5 h-5 text-stone-950 fill-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                BHATTI GAMEON
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                #{game.gameId}
              </span>
            </div>
            <h2 className="text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs">
              {game.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-amber-400 border border-amber-500/20 transition-colors cursor-pointer"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label="Sound Toggle"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
            title="Exit GameOn"
            aria-label="Exit GameOn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* GAME ARENA BODY */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full">
        {game.subtitle && (
          <p className="text-xs text-amber-300/80 text-center mb-3">
            {game.subtitle}
          </p>
        )}

        {/* ACTIVE GAME VIEW */}
        <div className="w-full flex justify-center">
          {game.gameType === 'roulette' && (
            <RouletteGame
              game={game}
              onFinishTurn={handleFinishTurn}
              disabled={turnsLeft <= 0 && !activeOutcome}
            />
          )}
          {game.gameType === 'scratch_card' && (
            <ScratchCardGame
              game={game}
              onFinishTurn={handleFinishTurn}
              disabled={turnsLeft <= 0 && !activeOutcome}
            />
          )}
          {game.gameType === 'coin_flip' && (
            <CoinFlipGame
              game={game}
              onFinishTurn={handleFinishTurn}
              disabled={turnsLeft <= 0 && !activeOutcome}
            />
          )}
          {game.gameType === 'mystery_box' && (
            <MysteryBoxGame
              game={game}
              onFinishTurn={handleFinishTurn}
              disabled={turnsLeft <= 0 && !activeOutcome}
            />
          )}
          {game.gameType === 'memory_match' && (
            <MemoryMatchGame
              game={game}
              onFinishTurn={handleFinishTurn}
              disabled={turnsLeft <= 0 && !activeOutcome}
            />
          )}
          {game.gameType === 'quick_quiz' && (
            <QuickQuizGame
              game={game}
              onFinishTurn={handleFinishTurn}
              disabled={turnsLeft <= 0 && !activeOutcome}
            />
          )}
        </div>
      </main>

      {/* OUTCOME OVERLAY / VICTORY PARCHMENT MODAL */}
      <AnimatePresence>
        {activeOutcome && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-gradient-to-b from-[#292524] to-[#1c1917] rounded-3xl border-2 border-amber-500/60 shadow-2xl p-6 sm:p-7 text-center space-y-5"
            >
              {activeOutcome.isWin ? (
                <>
                  {/* WIN HEADER */}
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                    <Gift className="w-8 h-8 text-amber-300 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                      🎉 ROYAL FEAST WINNER!
                    </span>
                    <h3 className="text-2xl font-black text-white mt-2">
                      {activeOutcome.label}
                    </h3>
                    <p className="text-xs text-stone-300 mt-1">
                      {activeOutcome.rewardDescription || 'Exclusive dining discount unlocked for your table feast.'}
                    </p>
                  </div>

                  {/* COUPON DISPLAY TICKET */}
                  {activeOutcome.couponCode && (
                    <div className="p-4 bg-stone-900/90 border-2 border-dashed border-amber-500/50 rounded-2xl flex items-center justify-between gap-3">
                      <div className="text-left">
                        <span className="text-[9px] font-black uppercase text-amber-400/70 block">
                          Coupon Code
                        </span>
                        <span className="text-lg font-mono font-black text-amber-300 tracking-wider">
                          {activeOutcome.couponCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(activeOutcome.couponCode!)}
                        className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* AUTH LOGGED-IN VS UNREGISTERED GUEST CLAIM LOGIC */}
                  {fbUser?.uid ? (
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Locked to your account vault ({currentUser.name || 'Patron'})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeOutcome.couponCode) {
                            onApplyRewardToCart(activeOutcome.couponCode);
                          }
                          onClose();
                        }}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
                      >
                        <Flame className="w-4 h-4 fill-stone-950" />
                        <span>Apply Directly to Cart & Feast ➜</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-xs text-stone-400 hover:text-white transition-colors cursor-pointer pt-1"
                      >
                        Save for Later in My Rewards
                      </button>
                    </div>
                  ) : (
                    /* UNREGISTERED GUEST CONVERSION PROMPT */
                    <div className="space-y-3 pt-2">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 text-left flex items-start gap-2">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Claim Required:</strong> Please log in or create your free account to lock this coupon to your vault and prevent forfeiture.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onRequestSignIn({
                            gameId: game.gameId,
                            gameTitle: game.title,
                            gameType: game.gameType,
                            couponCode: activeOutcome.couponCode || 'FEASTWIN',
                            discountType: 'percentage',
                            discountValue: 20,
                            perkName: activeOutcome.rewardDescription,
                          });
                        }}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Sign In / Register to Claim Reward ➜</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Skip & Continue as Guest
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* NON-WINNING OUTCOME */
                <>
                  <div className="w-14 h-14 rounded-full bg-stone-800 text-stone-400 flex items-center justify-center mx-auto border border-stone-700">
                    <Flame className="w-7 h-7 text-stone-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 bg-stone-800 px-3 py-1 rounded-full">
                      BETTER LUCK NEXT TIME
                    </span>
                    <h3 className="text-xl font-black text-white mt-2">
                      {activeOutcome.label}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1">
                      The spices weren&apos;t aligned this turn. Scan again tomorrow or order from our chef specials!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveOutcome(null);
                      if (turnsLeft <= 0) {
                        onClose();
                      }
                    }}
                    className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    {turnsLeft > 0 ? 'Try Another Turn ➜' : 'Return to Menu ➜'}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
