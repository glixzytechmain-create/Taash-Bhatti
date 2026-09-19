/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GameConfig, GameOutcome } from '../../../types/gameon';
import { playWheelTick } from '../../../lib/gameonAudio';
import { Flame, Sparkles } from 'lucide-react';

interface RouletteGameProps {
  game: GameConfig;
  onFinishTurn: (outcome: GameOutcome) => void;
  disabled: boolean;
}

const PALETTE = [
  '#DC2626', // Red
  '#1E293B', // Charcoal Slate
  '#059669', // Emerald
  '#D97706', // Amber Gold
  '#7C3AED', // Royal Purple
  '#0284C7', // Sky Blue
  '#B91C1C', // Dark Crimson
  '#334155', // Slate
];

export default function RouletteGame({ game, onFinishTurn, disabled }: RouletteGameProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const outcomes = game.outcomes && game.outcomes.length > 0 ? game.outcomes : [
    { id: '1', label: '10% OFF', probabilityWeight: 50, isWin: true },
    { id: '2', label: 'Better Luck', probabilityWeight: 50, isWin: false },
  ];

  const sliceAngle = 360 / outcomes.length;
  const lastTickAngleRef = useRef(0);

  const handleSpin = () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);

    // 1. Pick winner based on weights
    const totalWeight = outcomes.reduce((acc, o) => acc + (Number(o.probabilityWeight) || 0), 0);
    let rand = Math.random() * totalWeight;
    let winnerIndex = 0;
    for (let i = 0; i < outcomes.length; i++) {
      rand -= Number(outcomes[i].probabilityWeight) || 0;
      if (rand <= 0) {
        winnerIndex = i;
        break;
      }
    }

    const winningOutcome = outcomes[winnerIndex];

    // Calculate rotation so arrow (at 270 deg / top) points at slice center
    const targetSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full rotations
    // Top arrow is at 270 deg (or 0 deg depending on canvas orientation). Let's use 270 deg.
    const finalAngle = (fullSpins * 360) + (360 - targetSliceCenter) + 270;

    const startTime = performance.now();
    const duration = 4500; // 4.5 seconds
    const startRotation = rotation % 360;
    const totalDelta = finalAngle - startRotation;

    const animateWheel = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRotation + totalDelta * easeOut;
      setRotation(currentRot);

      // Sound tick for each slice passed
      if (Math.abs(currentRot - lastTickAngleRef.current) >= (sliceAngle * 0.75)) {
        playWheelTick();
        lastTickAngleRef.current = currentRot;
      }

      if (progress < 1) {
        requestAnimationFrame(animateWheel);
      } else {
        setIsSpinning(false);
        setTimeout(() => {
          onFinishTurn(winningOutcome);
        }, 500);
      }
    };

    requestAnimationFrame(animateWheel);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6 select-none">
      {/* VINTAGE ARROW POINTER */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        {/* Top Indicator Arrow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 flex flex-col items-center">
          <div className="w-6 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-md shadow-2xl border border-amber-300 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-amber-600 drop-shadow-md" />
        </div>

        {/* BRASS RIM & BULBS CONTAINER */}
        <div className="w-full h-full rounded-full p-3 bg-gradient-to-b from-[#b45309] via-[#78350f] to-[#451a03] shadow-[0_0_50px_rgba(245,158,11,0.3)] border-4 border-amber-500/80 relative flex items-center justify-center">
          {/* Perimeter decorative rivets */}
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-full bg-amber-200 border border-amber-700 shadow-inner"
              style={{
                top: `${50 - 47 * Math.cos((i * 2 * Math.PI) / 16)}%`,
                left: `${50 + 47 * Math.sin((i * 2 * Math.PI) / 16)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* SVG WHEEL */}
          <div
            className="w-full h-full rounded-full overflow-hidden shadow-2xl relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              {outcomes.map((outcome, idx) => {
                const startAngle = (idx * sliceAngle * Math.PI) / 180;
                const endAngle = (((idx + 1) * sliceAngle) * Math.PI) / 180;
                const x1 = 200 + 200 * Math.cos(startAngle);
                const y1 = 200 + 200 * Math.sin(startAngle);
                const x2 = 200 + 200 * Math.cos(endAngle);
                const y2 = 200 + 200 * Math.sin(endAngle);
                const pathData = `M 200 200 L ${x1} ${y1} A 200 200 0 0 1 ${x2} ${y2} Z`;

                const midAngle = ((idx + 0.5) * sliceAngle * Math.PI) / 180;
                const textX = 200 + 130 * Math.cos(midAngle);
                const textY = 200 + 130 * Math.sin(midAngle);
                const textRot = (idx + 0.5) * sliceAngle;

                const fillColor = outcome.badgeColor || PALETTE[idx % PALETTE.length];

                return (
                  <g key={outcome.id}>
                    <path
                      d={pathData}
                      fill={fillColor}
                      stroke="#fef08a"
                      strokeWidth="2"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${textRot + 90}, ${textX}, ${textY})`}
                      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                    >
                      {outcome.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* VINTAGE BRASS CENTER MEDALLION */}
          <div className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-amber-700 via-amber-400 to-amber-200 border-4 border-amber-900 shadow-2xl flex items-center justify-center z-10">
            <div className="w-12 h-12 rounded-full bg-[#1c1917] border-2 border-amber-400/80 flex items-center justify-center">
              <Flame className="w-6 h-6 text-amber-500 animate-pulse fill-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* SPIN LEVER / BUTTON */}
      <button
        type="button"
        onClick={handleSpin}
        disabled={isSpinning || disabled}
        className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2.5 shadow-2xl transition-all cursor-pointer ${
          isSpinning || disabled
            ? 'bg-stone-700 text-stone-400 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white hover:scale-105 active:scale-95 shadow-amber-500/30'
        }`}
      >
        <Sparkles className="w-5 h-5" />
        <span>{isSpinning ? 'Wheel is Turning...' : 'PULL & SPIN WHEEL ➜'}</span>
      </button>
    </div>
  );
}
