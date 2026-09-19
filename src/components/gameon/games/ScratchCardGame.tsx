/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GameConfig, GameOutcome } from '../../../types/gameon';
import { pickWeightedOutcome } from '../../../lib/gameonService';
import { playScratchSound } from '../../../lib/gameonAudio';
import { Sparkles, Gift, Flame, CheckCircle2 } from 'lucide-react';

interface ScratchCardGameProps {
  game: GameConfig;
  onFinishTurn: (outcome: GameOutcome) => void;
  disabled: boolean;
}

export default function ScratchCardGame({ game, onFinishTurn, disabled }: ScratchCardGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedOutcome] = useState<GameOutcome>(() => pickWeightedOutcome(game.outcomes));
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchedPct, setScratchedPct] = useState(0);
  const isDrawingRef = useRef(false);

  // Initialize Canvas with shimmering metallic gold foil
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Foil Gradient (Gold, Charcoal Titanium, or Royal Ember)
    const theme = game.scratchFoilTheme || 'gold';
    if (theme === 'charcoal') {
      grad.addColorStop(0, '#374151');
      grad.addColorStop(0.2, '#9ca3af');
      grad.addColorStop(0.4, '#1f2937');
      grad.addColorStop(0.7, '#d1d5db');
      grad.addColorStop(1, '#111827');
    } else if (theme === 'ember') {
      grad.addColorStop(0, '#c2410c');
      grad.addColorStop(0.2, '#fdba74');
      grad.addColorStop(0.4, '#9a3412');
      grad.addColorStop(0.7, '#fef08a');
      grad.addColorStop(1, '#7c2d12');
    } else {
      grad.addColorStop(0, '#d97706'); // amber-600
      grad.addColorStop(0.2, '#fef08a'); // amber-100 highlight
      grad.addColorStop(0.4, '#b45309'); // amber-700
      grad.addColorStop(0.7, '#fef08a'); // highlight
      grad.addColorStop(1, '#78350f'); // dark amber
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative vintage cross-hatch pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = -height; i < width; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }

    // Centered Badge
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ RUB TO SCRATCH & REVEAL ✨', width / 2, height / 2);
  }, []);

  const calculateScratchedPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let transparentCount = 0;
    const totalPixels = data.length / 4;

    // Sample every 4th pixel for speed
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] === 0) {
        transparentCount++;
      }
    }

    const pct = Math.round((transparentCount / (totalPixels / 4)) * 100);
    return pct;
  };

  const scratchAt = (clientX: number, clientY: number) => {
    if (isRevealed || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    playScratchSound();

    const pct = calculateScratchedPercentage();
    setScratchedPct(pct);

    if (pct >= 45 && !isRevealed) {
      setIsRevealed(true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTimeout(() => {
        onFinishTurn(selectedOutcome);
      }, 700);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDrawingRef.current = true;
    scratchAt(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    scratchAt(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6 select-none">
      {/* VINTAGE CARD CONTAINER */}
      <div className="relative w-80 sm:w-96 rounded-3xl p-5 bg-gradient-to-b from-[#292524] to-[#1c1917] border-4 border-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
        {/* Card Header */}
        <div className="text-center pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Golden Handi Scratch & Win</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Use your finger or mouse to peel away the royal wax seal
          </p>
        </div>

        {/* SCRATCH AREA BOX */}
        <div className="relative w-full h-52 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-inner bg-[#0c0a09] flex items-center justify-center">
          {/* UNDERLYING PRIZE CONTENT */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-2 bg-gradient-to-tr from-amber-950 via-stone-900 to-amber-900">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-md">
              <Gift className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="text-xs uppercase font-black tracking-widest text-amber-400">
                {selectedOutcome.isWin ? '🏆 YOU DISCOVERED' : '💫 RESULT'}
              </div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                {selectedOutcome.label}
              </div>
              {selectedOutcome.couponCode && (
                <div className="inline-block mt-2 px-3 py-1 bg-amber-400/20 border border-amber-400/40 rounded-lg text-xs font-mono font-black text-amber-300">
                  CODE: {selectedOutcome.couponCode}
                </div>
              )}
            </div>
          </div>

          {/* OVERLYING CANVAS FOIL */}
          <canvas
            ref={canvasRef}
            width={380}
            height={220}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`absolute inset-0 w-full h-full cursor-crosshair touch-none transition-opacity duration-500 ${
              isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />
        </div>

        {/* PROGRESS METER */}
        <div className="mt-4 flex items-center justify-between text-xs text-amber-400 font-bold">
          <span>Revealed: {scratchedPct}%</span>
          {scratchedPct >= 45 ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete!
            </span>
          ) : (
            <span className="text-stone-400 text-[10px]">Scratch 45% to unseal</span>
          )}
        </div>
      </div>
    </div>
  );
}
