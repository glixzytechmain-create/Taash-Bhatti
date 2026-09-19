/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameConfig, GameOutcome } from '../../../types/gameon';
import { pickWeightedOutcome } from '../../../lib/gameonService';
import { playMysteryChime } from '../../../lib/gameonAudio';
import { Package, Sparkles, Flame, Gift } from 'lucide-react';

interface MysteryBoxGameProps {
  game: GameConfig;
  onFinishTurn: (outcome: GameOutcome) => void;
  disabled: boolean;
}

export default function MysteryBoxGame({ game, onFinishTurn, disabled }: MysteryBoxGameProps) {
  const [chosenBoxIndex, setChosenBoxIndex] = useState<number | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openedOutcome, setOpenedOutcome] = useState<GameOutcome | null>(null);

  const boxCount = Number(game.mysteryBoxCount) === 4 ? 4 : 3;
  const boxes = [
    { id: 1, name: 'Clay Handi #1', color: 'from-amber-800 to-amber-950' },
    { id: 2, name: 'Royal Chest #2', color: 'from-orange-800 to-amber-950' },
    { id: 3, name: 'Bhatti Vault #3', color: 'from-yellow-700 to-amber-950' },
    { id: 4, name: 'Ember Handi #4', color: 'from-red-800 to-amber-950' },
  ].slice(0, boxCount);

  const handlePickBox = (index: number) => {
    if (chosenBoxIndex !== null || isOpening || disabled) return;

    setChosenBoxIndex(index);
    setIsOpening(true);
    playMysteryChime();

    const outcome = pickWeightedOutcome(game.outcomes);
    setOpenedOutcome(outcome);

    setTimeout(() => {
      setIsOpening(false);
      setTimeout(() => {
        onFinishTurn(outcome);
      }, 900);
    }, 1800);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6 select-none">
      <div className="text-center space-y-1">
        <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Select an Antique Clay Handi to Unseal</span>
        </h3>
        <p className="text-[11px] text-stone-400">
          Only one contains the secret feast discount. Choose with care!
        </p>
      </div>

      {/* MYSTERY BOXES / CLAY HANDIS */}
      <div className={boxCount === 4 ? "grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md" : "grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-md"}>
        {boxes.map((box, idx) => {
          const isSelected = chosenBoxIndex === idx;
          const isOther = chosenBoxIndex !== null && chosenBoxIndex !== idx;

          return (
            <button
              key={box.id}
              type="button"
              disabled={chosenBoxIndex !== null || disabled}
              onClick={() => handlePickBox(idx)}
              className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-500/30 to-amber-950 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] scale-105'
                  : isOther
                  ? 'opacity-40 grayscale bg-stone-900/60 border-stone-800 cursor-not-allowed'
                  : 'bg-gradient-to-b from-stone-800/90 to-stone-900 border-amber-500/30 hover:border-amber-400 hover:scale-105 active:scale-95 shadow-lg'
              }`}
            >
              {/* Box Icon with animation */}
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-700 ${
                  isSelected && isOpening
                    ? 'animate-bounce text-amber-300'
                    : isSelected
                    ? 'text-amber-400 scale-110'
                    : 'text-amber-500/80'
                }`}
              >
                {isSelected && openedOutcome ? (
                  <Gift className="w-12 h-12 text-amber-300 animate-pulse" />
                ) : (
                  <Package className="w-12 h-12" />
                )}
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                {box.name}
              </span>

              {/* Reveal text */}
              {isSelected && openedOutcome && (
                <div className="mt-2 text-[11px] font-black text-white bg-amber-500/40 px-2 py-0.5 rounded-md animate-fade-in truncate max-w-full">
                  {openedOutcome.label}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
