/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface RainEffectProps {
  density?: 'light' | 'medium' | 'heavy';
  speed?: number;
  showSplashes?: boolean;
  className?: string;
  showMist?: boolean;
}

interface Drop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  width: number;
}

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  speed: number;
}

export default function RainEffect({
  density = 'medium',
  speed = 1.0,
  showSplashes = true,
  className = '',
  showMist = true,
}: RainEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 200);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Number of drops based on density and area
    const countMultiplier = density === 'light' ? 0.08 : density === 'heavy' ? 0.28 : 0.16;
    const dropCount = Math.max(30, Math.min(220, Math.floor(width * countMultiplier)));

    const drops: Drop[] = [];
    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * (width + 100) - 50,
        y: Math.random() * height,
        length: 12 + Math.random() * 18,
        speed: (14 + Math.random() * 8) * speed,
        opacity: 0.25 + Math.random() * 0.45,
        width: 1 + Math.random() * 1.2,
      });
    }

    const splashes: Splash[] = [];

    // Wind angle (diagonal falling rain)
    const windSlant = 2.2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render raindrops
      ctx.strokeStyle = '#bae6fd';
      ctx.lineCap = 'round';

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];

        ctx.lineWidth = d.width;
        ctx.globalAlpha = d.opacity;

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + windSlant, d.y + d.length);
        ctx.stroke();

        // Move drop
        d.x += windSlant;
        d.y += d.speed;

        // Ground hit / splash
        if (d.y > height - 8) {
          if (showSplashes && Math.random() < 0.22 && splashes.length < 35) {
            splashes.push({
              x: d.x,
              y: height - 2 - Math.random() * 4,
              radius: 1,
              maxRadius: 3.5 + Math.random() * 4,
              opacity: 0.5,
              speed: 0.35 + Math.random() * 0.3,
            });
          }

          // Reset drop to top
          d.y = -d.length - Math.random() * 20;
          d.x = Math.random() * (width + 100) - 50;
        }

        if (d.x > width + 50) {
          d.x = -30;
        }
      }

      // Render ripples / splashes
      if (showSplashes && splashes.length > 0) {
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          ctx.globalAlpha = s.opacity;
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#e0f2fe';

          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.radius * 2, s.radius * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();

          s.radius += s.speed;
          s.opacity -= 0.04;

          if (s.opacity <= 0 || s.radius >= s.maxRadius) {
            splashes.splice(i, 1);
          }
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [density, speed, showSplashes]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden z-[5] ${className}`}>
      {showMist && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/15 via-transparent to-blue-950/25 pointer-events-none" />
      )}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
