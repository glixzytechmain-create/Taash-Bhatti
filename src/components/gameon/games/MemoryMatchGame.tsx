/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameConfig, GameOutcome } from '../../../types/gameon';
import { pickWeightedOutcome } from '../../../lib/gameonService';
import { playCardFlip, playCardMatch } from '../../../lib/gameonAudio';
import { Sparkles, Flame, RotateCcw } from 'lucide-react';

interface MemoryMatchGameProps {
  game: GameConfig;
  onFinishTurn: (outcome: GameOutcome) => void;
  disabled: boolean;
}

interface CardItem {
  uid: string;
  pairId: string;
  name: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const DEFAULT_PAIRS = [
  { id: 'p1', name: 'Clay Handi', emoji: '🏺' },
  { id: 'p2', name: 'Dum Biryani', emoji: '🍗' },
  { id: 'p3', name: 'Royal Saffron', emoji: '✨' },
];

export default function MemoryMatchGame({ game, onFinishTurn, disabled }: MemoryMatchGameProps) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [remainingTurns, setRemainingTurns] = useState(6);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize and shuffle cards
  useEffect(() => {
    const pairs = game.memoryPairs && game.memoryPairs.length >= 3 ? game.memoryPairs.slice(0, 3) : DEFAULT_PAIRS;
    const deck: CardItem[] = [];
    pairs.forEach((p) => {
      deck.push({ uid: `${p.id}_a`, pairId: p.id, name: p.name, emoji: p.emoji, isFlipped: false, isMatched: false });
      deck.push({ uid: `${p.id}_b`, pairId: p.id, name: p.name, emoji: p.emoji, isFlipped: false, isMatched: false });
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setRemainingTurns(6);
    setSelectedCards([]);
  }, [game.memoryPairs]);

  const handleCardClick = (index: number) => {
    if (disabled || isProcessing || remainingTurns <= 0) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    playCardFlip();

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const nextSelected = [...selectedCards, index];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      setIsProcessing(true);
      const [firstIdx, secondIdx] = nextSelected;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      const newTurns = remainingTurns - 1;
      setRemainingTurns(newTurns);

      if (firstCard.pairId === secondCard.pairId) {
        // MATCH!
        playCardMatch();
        newCards[firstIdx].isMatched = true;
        newCards[secondIdx].isMatched = true;
        setCards(newCards);
        setSelectedCards([]);
        setIsProcessing(false);

        // Check if all matched
        const allMatched = newCards.every((c) => c.isMatched);
        if (allMatched) {
          const winOutcome = game.outcomes.find((o) => o.isWin) || pickWeightedOutcome(game.outcomes);
          setTimeout(() => {
            onFinishTurn(winOutcome);
          }, 800);
        }
      } else {
        // NO MATCH
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setSelectedCards([]);
          setIsProcessing(false);

          if (newTurns <= 0) {
            const lossOutcome = game.outcomes.find((o) => !o.isWin) || {
              id: 'loss',
              label: 'Out of Turns! Better Luck Next Time',
              probabilityWeight: 100,
              isWin: false,
            };
            setTimeout(() => {
              onFinishTurn(lossOutcome);
            }, 600);
          }
        }, 900);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-5 select-none">
      {/* HEADER WITH TURNS REMAINING */}
      <div className="flex items-center justify-between w-full max-w-sm px-3 py-2 bg-stone-900/80 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-300">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Match All 3 Pairs</span>
        </div>
        <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs font-black text-amber-300">
          {remainingTurns} TURNS LEFT
        </div>
      </div>

      {/* 2x3 CARD GRID */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {cards.map((card, idx) => {
          const showFront = card.isFlipped || card.isMatched;

          return (
            <button
              key={card.uid}
              type="button"
              disabled={disabled || isProcessing || card.isMatched}
              onClick={() => handleCardClick(idx)}
              className={`h-24 sm:h-28 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-2 relative ${
                card.isMatched
                  ? 'bg-emerald-950/60 border-emerald-500/50 shadow-md scale-95'
                  : showFront
                  ? 'bg-gradient-to-b from-amber-500/20 to-stone-900 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-gradient-to-b from-stone-800 to-stone-950 border-amber-500/30 hover:border-amber-400 hover:scale-105 active:scale-95'
              }`}
            >
              {showFront ? (
                <div className="flex flex-col items-center animate-scale-up">
                  <span className="text-3xl sm:text-4xl">{card.emoji}</span>
                  <span className="text-[9px] font-black uppercase text-amber-200 mt-1 truncate max-w-full">
                    {card.name}
                  </span>
                </div>
              ) : (
                <div className="w-full h-full rounded-xl border border-dashed border-amber-500/30 flex items-center justify-center bg-stone-900/60">
                  <Flame className="w-5 h-5 text-amber-500/50" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
