/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameConfig, GameOutcome } from '../../../types/gameon';
import { pickWeightedOutcome } from '../../../lib/gameonService';
import { playCoinToss, playCoinLand } from '../../../lib/gameonAudio';
import { Crown, Flame, Sparkles } from 'lucide-react';

interface CoinFlipGameProps {
  game: GameConfig;
  onFinishTurn: (outcome: GameOutcome) => void;
  disabled: boolean;
}

export default function CoinFlipGame({ game, onFinishTurn, disabled }: CoinFlipGameProps) {
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [landedSide, setLandedSide] = useState<'heads' | 'tails'>('heads');

  const handleFlip = () => {
    if (isFlipping || disabled) return;

    setIsFlipping(true);
    playCoinToss();

    // Authentic fair 50/50 physical coin flip
    const willLandOn: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    const isPlayerWin = willLandOn === selectedSide;

    // Determine win vs loss outcome
    let outcome: GameOutcome;
    if (isPlayerWin) {
      outcome = game.coinWinReward || game.outcomes.find((o) => o.isWin) || {
        id: 'coin_win',
        label: `Toss Won: Landed on ${willLandOn === 'heads' ? 'Royal Crest' : 'Bhatti Flame'}!`,
        isWin: true,
        couponCode: 'ROYALFEAST',
        probabilityWeight: 50,
        rewardDescription: 'You called the coin toss correctly!',
      };
    } else {
      outcome = game.coinLossOutcome || game.outcomes.find((o) => !o.isWin) || {
        id: 'coin_loss',
        label: `Landed on ${willLandOn === 'heads' ? 'Royal Crest' : 'Bhatti Flame'}`,
        isWin: false,
        probabilityWeight: 50,
        rewardDescription: 'The coin landed on the opposite side. Better luck next time!',
      };
    }

    // 5-7 complete flips + side target
    const flips = 6;
    const finalRot = flips * 360 + (willLandOn === 'heads' ? 0 : 180);

    setRotationDegrees((prev) => prev + finalRot);

    setTimeout(() => {
      playCoinLand();
      setLandedSide(willLandOn);
      setIsFlipping(false);
      setTimeout(() => {
        onFinishTurn(outcome);
      }, 700);
    }, 2400);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-7 select-none">
      {/* 3D COIN ARENA */}
      <div className="relative w-64 h-64 flex items-center justify-center" style={{ perspective: '1000px' }}>
        {/* Soft shadow on table */}
        <div
          className={`absolute bottom-2 w-32 h-6 bg-black/60 rounded-full blur-md transition-all duration-700 ${
            isFlipping ? 'scale-50 opacity-20' : 'scale-100 opacity-70'
          }`}
        />

        {/* The 3D Rotating Coin */}
        <div
          className="relative w-44 h-44 rounded-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotationDegrees}deg) ${isFlipping ? 'translateY(-60px)' : 'translateY(0)'}`,
            transition: isFlipping
              ? 'transform 2.4s cubic-bezier(0.25, 1, 0.5, 1)'
              : 'transform 0.3s ease-out',
          }}
        >
          {/* HEADS (Royal Crown) */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-100 border-4 border-amber-800 shadow-2xl flex flex-col items-center justify-center p-3"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="w-full h-full rounded-full border-2 border-dashed border-amber-900/60 flex flex-col items-center justify-center space-y-1">
              <Crown className="w-12 h-12 text-amber-950 fill-amber-700/40" />
              <span className="text-[11px] font-black tracking-widest text-amber-950 uppercase">
                ROYAL CREST
              </span>
            </div>
          </div>

          {/* TAILS (Flaming Handi) */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-700 via-orange-400 to-amber-200 border-4 border-amber-900 shadow-2xl flex flex-col items-center justify-center p-3"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="w-full h-full rounded-full border-2 border-dashed border-orange-950/60 flex flex-col items-center justify-center space-y-1">
              <Flame className="w-12 h-12 text-orange-950 fill-orange-600" />
              <span className="text-[11px] font-black tracking-widest text-orange-950 uppercase">
                BHATTI FLAME
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHOOSE SIDE SELECTOR */}
      <div className="space-y-3 w-full max-w-xs text-center">
        <div className="text-xs font-black uppercase tracking-wider text-amber-400">
          Pick Your Lucky Side
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isFlipping || disabled}
            onClick={() => setSelectedSide('heads')}
            className={`py-3 px-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
              selectedSide === 'heads'
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:border-amber-500/40'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Royal Crest</span>
          </button>
          <button
            type="button"
            disabled={isFlipping || disabled}
            onClick={() => setSelectedSide('tails')}
            className={`py-3 px-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
              selectedSide === 'tails'
                ? 'bg-orange-500 text-stone-950 border-orange-300 shadow-lg shadow-orange-500/30'
                : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:border-orange-500/40'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Bhatti Flame</span>
          </button>
        </div>
      </div>

      {/* FLIP BUTTON */}
      <button
        type="button"
        onClick={handleFlip}
        disabled={isFlipping || disabled}
        className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl transition-all cursor-pointer ${
          isFlipping || disabled
            ? 'bg-stone-700 text-stone-400 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 hover:scale-105 active:scale-95'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>{isFlipping ? 'Flipping Royal Coin...' : 'TOSS COIN TO WIN ➜'}</span>
      </button>
    </div>
  );
}
