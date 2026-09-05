/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  type: 'symbol' | 'circle' | 'spark';
  symbol?: string;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

export default function TapFeedbackEffect() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Color palette tailored to TAASH BHATTI theme
    const colors = [
      '#FF5722', // Fire Orange
      '#F59E0B', // Amber Gold
      '#D4AF37', // Royal Gold
      '#10B981', // Emerald Mint
      '#143D27', // Deep Bhatti Green
      '#EF4444', // Heart/Diamond Crimson
    ];

    const cardSymbols = ['♠', '♥', '♦', '♣', '✦', '★', '🔥', '✨'];

    const createTapBurst = (x: number, y: number) => {
      // 1. Trigger subtle mobile haptic if available
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(8);
        }
      } catch (_) {}

      // 2. Add Dual Expanding Ripple Waves
      ripplesRef.current.push({
        x,
        y,
        radius: 4,
        maxRadius: Math.random() * 20 + 35,
        alpha: 0.85,
        color: '#F59E0B',
        lineWidth: 2.5,
      });

      ripplesRef.current.push({
        x,
        y,
        radius: 2,
        maxRadius: Math.random() * 15 + 24,
        alpha: 0.7,
        color: '#FF5722',
        lineWidth: 1.5,
      });

      // 3. Spawn 6-9 Delightful Micro-Ember Particles & Playing Card Symbols
      const particleCount = Math.floor(Math.random() * 3) + 6;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3.8 + 1.8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const isSymbol = Math.random() > 0.45;
        const symbol = isSymbol
          ? cardSymbols[Math.floor(Math.random() * cardSymbols.length)]
          : undefined;

        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2, // slight upward float bias
          size: isSymbol ? Math.random() * 6 + 10 : Math.random() * 4 + 3,
          color,
          alpha: 1,
          decay: Math.random() * 0.028 + 0.022,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.18,
          type: isSymbol ? 'symbol' : Math.random() > 0.5 ? 'spark' : 'circle',
          symbol,
        });
      }

      // Start animation loop if not active
      if (!animFrameIdRef.current) {
        startAnimationLoop();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Don't trigger on right clicks
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      createTapBurst(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        createTapBurst(touch.clientX, touch.clientY);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    // Main 60/120fps Animation Loop
    const startAnimationLoop = () => {
      const render = () => {
        if (!ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        let hasActiveElements = false;

        // --- Render Ripples ---
        for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
          const r = ripplesRef.current[i];
          r.radius += (r.maxRadius - r.radius) * 0.18 + 0.5;
          r.alpha *= 0.91;

          if (r.alpha > 0.02 && r.radius < r.maxRadius) {
            hasActiveElements = true;
            ctx.save();
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = r.color;
            ctx.globalAlpha = r.alpha;
            ctx.lineWidth = r.lineWidth;
            ctx.shadowColor = r.color;
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();
          } else {
            ripplesRef.current.splice(i, 1);
          }
        }

        // --- Render Particles ---
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.09; // subtle gravity
          p.vx *= 0.96; // air friction
          p.rotation += p.vRot;
          p.alpha -= p.decay;

          if (p.alpha > 0.01) {
            hasActiveElements = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = Math.max(0, p.alpha);

            if (p.type === 'symbol' && p.symbol) {
              ctx.font = `bold ${Math.round(p.size)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = p.color;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 6;
              ctx.fillText(p.symbol, 0, 0);
            } else if (p.type === 'spark') {
              // 4-point diamond spark
              ctx.fillStyle = p.color;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.moveTo(0, -p.size);
              ctx.lineTo(p.size * 0.35, 0);
              ctx.lineTo(0, p.size);
              ctx.lineTo(-p.size * 0.35, 0);
              ctx.closePath();
              ctx.fill();
            } else {
              // Glowing circular spark
              ctx.beginPath();
              ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 10;
              ctx.fill();
            }

            ctx.restore();
          } else {
            particlesRef.current.splice(i, 1);
          }
        }

        if (hasActiveElements) {
          animFrameIdRef.current = requestAnimationFrame(render);
        } else {
          animFrameIdRef.current = null;
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
      };

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('touchstart', handleTouchStart);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="taash-tap-fx-canvas"
      className="fixed inset-0 pointer-events-none z-[99999]"
      aria-hidden="true"
    />
  );
}
