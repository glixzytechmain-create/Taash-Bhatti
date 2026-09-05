import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaashOpeningSplashProps {
  onComplete?: () => void;
}

export default function TaashOpeningSplash({ onComplete }: TaashOpeningSplashProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Total duration 2000ms
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1850); // start exit fade at ~1.85s

    const finishTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2200);

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="taash-opening-splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[99999] bg-[#050404] flex items-center justify-center overflow-hidden select-none"
        >
          {/* Pitch Black Screen Foundation */}
          <div className="absolute inset-0 bg-[#050404]" />

          {/* AMBIENT CLAY-OVEN HEAT RADIANCE (Ignites around 0.4s) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 0, 0.85, 0.5, 0.2, 0],
              scale: [0.4, 0.4, 1.2, 1.6, 1.9, 2.1],
            }}
            transition={{
              duration: 2.1,
              times: [0, 0.18, 0.38, 0.65, 0.88, 1],
              ease: 'easeOut',
            }}
            className="absolute w-[500px] h-[500px] rounded-full bg-radial from-orange-600/50 via-amber-700/20 to-transparent blur-3xl pointer-events-none"
          />

          {/* ORGANIC SMOKE CLOUD DRIFT */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.7 }}
            animate={{
              opacity: [0, 0, 0.25, 0.45, 0.15, 0],
              y: [40, 40, -10, -50, -90, -120],
              scale: [0.7, 0.7, 1.2, 1.5, 1.8, 2.1],
            }}
            transition={{
              duration: 2.1,
              times: [0, 0.22, 0.45, 0.68, 0.88, 1],
              ease: 'linear',
            }}
            className="absolute w-[400px] h-[400px] rounded-full bg-radial from-stone-500/25 via-zinc-800/15 to-transparent blur-3xl pointer-events-none"
          />

          {/* RISING SMOKE WISPS */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`wisp-${i}`}
                initial={{ opacity: 0, y: 20, x: (i - 3.5) * 28, scale: 0.4 }}
                animate={{
                  opacity: [0, 0, 0.35, 0.18, 0],
                  y: [20, 20, -60 - i * 18, -140 - i * 22],
                  x: [(i - 3.5) * 28, (i - 3.5) * 28, (i - 3.5) * 40 + (i % 2 === 0 ? 20 : -20)],
                  scale: [0.4, 0.4, 1.2 + i * 0.15, 2.0 + i * 0.15],
                }}
                transition={{
                  duration: 2.1,
                  times: [0, 0.25, 0.5, 0.8, 1],
                  ease: 'easeOut',
                }}
                className="absolute w-28 h-28 rounded-full bg-radial from-orange-950/30 via-zinc-700/15 to-transparent blur-2xl"
              />
            ))}
          </div>

          {/* FLOATING ORGANIC EMBER PARTICLES */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            {[...Array(12)].map((_, i) => {
              const startX = (i - 5.5) * 22;
              const driftX = startX + (i % 2 === 0 ? 30 : -30);
              return (
                <motion.div
                  key={`ember-${i}`}
                  initial={{ opacity: 0, y: 15, x: startX, scale: 0 }}
                  animate={{
                    opacity: [0, 0, 0.9, 0.7, 0],
                    y: [15, 15, -40 - i * 15, -110 - i * 20],
                    x: [startX, startX, driftX * 0.7, driftX],
                    scale: [0, 0.8, 1, 0.4, 0],
                  }}
                  transition={{
                    duration: 2.1,
                    times: [0, 0.3, 0.52, 0.78, 1],
                    ease: 'easeOut',
                  }}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#ff9900]"
                />
              );
            })}
          </div>

          {/* MAIN STAGE: IGNITION BURSTS AROUND PERIMETER -> LOGO REVEAL */}
          <div className="relative flex flex-col items-center justify-center z-10 text-center">
            
            {/* AMBIENT HEAT/IGNITION WAVE BEHIND LOGO (z-10, behind logo) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{
                opacity: [0, 0, 0.9, 0.3, 0],
                scale: [0.1, 0.1, 1.8, 2.8, 3.5],
              }}
              transition={{
                duration: 2.1,
                times: [0, 0.3, 0.38, 0.52, 0.68],
                ease: 'easeOut',
              }}
              className="absolute w-24 h-24 rounded-full border border-amber-500/60 bg-gradient-radial from-amber-500/20 via-orange-600/10 to-transparent blur-sm shadow-[0_0_60px_#ff5500] z-0 pointer-events-none"
            />

            {/* MULTIPLE MICRO-EMBERS BURSTING OUTWARD AROUND LOGO PERIMETER (NOT ON LOGO) */}
            {[...Array(16)].map((_, i) => {
              const angle = (i * 22.5 * Math.PI) / 180;
              const innerRadius = 55; // just outside the logo box
              const burstDist = 65 + (i % 3) * 20; // burst outward to 120px
              
              const startX = Math.cos(angle) * innerRadius;
              const startY = Math.sin(angle) * innerRadius;
              const endX = Math.cos(angle) * (innerRadius + burstDist);
              const endY = Math.sin(angle) * (innerRadius + burstDist);

              return (
                <motion.div
                  key={`outer-spark-${i}`}
                  initial={{ opacity: 0, x: startX, y: startY, scale: 0.2 }}
                  animate={{
                    opacity: [0, 0, 1, 0.7, 0],
                    x: [startX, startX, startX + (endX - startX) * 0.5, endX, endX * 1.15],
                    y: [startY, startY, startY + (endY - startY) * 0.5, endY, endY * 1.15 - 15], // slight upward lift from heat
                    scale: [0.2, 0.2, 1, 0.6, 0],
                  }}
                  transition={{
                    duration: 2.1,
                    times: [0, 0.32, 0.42, 0.62, 0.82],
                    ease: 'easeOut',
                  }}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#ffaa00] z-10 pointer-events-none"
                />
              );
            })}

            {/* RADIATING IGNITION RAYS OUTWARD FROM LOGO EDGES */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45 * Math.PI) / 180;
              const startDist = 50;
              const endDist = 110;
              const targetX = Math.cos(angle) * endDist;
              const targetY = Math.sin(angle) * endDist;
              const startX = Math.cos(angle) * startDist;
              const startY = Math.sin(angle) * startDist;

              return (
                <motion.div
                  key={`ray-${i}`}
                  initial={{ opacity: 0, x: startX, y: startY, scale: 0.2 }}
                  animate={{
                    opacity: [0, 0, 0.8, 0.3, 0],
                    x: [startX, startX, startX + (targetX - startX) * 0.6, targetX],
                    y: [startY, startY, startY + (targetY - startY) * 0.6, targetY],
                    scale: [0.2, 0.2, 1, 0.4, 0],
                  }}
                  transition={{
                    duration: 2.1,
                    times: [0, 0.34, 0.42, 0.58, 0.72],
                    ease: 'easeOut',
                  }}
                  className="absolute w-1 h-3 rounded-full bg-amber-200 shadow-[0_0_10px_#ff8800] z-10 pointer-events-none"
                  style={{ transform: `rotate(${i * 45}deg)` }}
                />
              );
            })}

            {/* 3. LOGO REVEALS FROM SMOKE (0.5s -> 1.8s) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, filter: 'blur(14px)' }}
              animate={{
                opacity: [0, 0, 0, 0.85, 1, 1],
                scale: [0.88, 0.88, 0.9, 0.98, 1, 1],
                filter: ['blur(14px)', 'blur(14px)', 'blur(10px)', 'blur(2px)', 'blur(0px)', 'blur(0px)'],
              }}
              transition={{
                duration: 2.1,
                times: [0, 0.32, 0.44, 0.68, 0.88, 1],
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col items-center gap-3.5 relative z-20"
            >
              {/* BADGE CONTAINER WITH SHIMMER LIGHT */}
              <div className="relative p-0.5 rounded-3xl bg-gradient-to-b from-amber-500/40 via-orange-600/25 to-transparent shadow-[0_12px_45px_rgba(255,102,0,0.35)]">
                <div className="w-22 h-22 bg-black/85 border border-amber-500/50 rounded-[24px] flex items-center justify-center p-2.5 backdrop-blur-xl overflow-hidden relative group">
                  
                  {/* LIGHT SHIMMER PASS */}
                  <motion.div
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: ['-100%', '-100%', '200%'] }}
                    transition={{ duration: 2.1, times: [0, 0.55, 0.95], ease: 'easeInOut' }}
                    className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent skew-x-12 pointer-events-none"
                  />

                  <img
                    src="https://cdn.postimage.me/2026/08/01/28172.png"
                    alt="TAASH BHATTI"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(255,85,0,0.6)]"
                  />
                </div>
              </div>

              {/* BRAND TEXT & SUBTITLE */}
              <div className="space-y-1 text-center">
                <motion.h1
                  initial={{ letterSpacing: '0.12em' }}
                  animate={{ letterSpacing: '0.28em' }}
                  transition={{ duration: 1.4, delay: 0.5, ease: 'easeOut' }}
                  className="text-2xl sm:text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-orange-200 drop-shadow-[0_2px_16px_rgba(255,102,0,0.5)]"
                >
                  TAASH BHATTI
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: [0, 0, 0, 0.95, 0.95], y: [4, 4, 4, 0, 0] }}
                  transition={{ duration: 2.1, times: [0, 0.5, 0.65, 0.88, 1] }}
                  className="text-[10px] font-mono tracking-[0.32em] uppercase text-amber-400/90 font-extrabold"
                >
                  Authentic Clay-Oven Tandoori Kitchen
                </motion.p>
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

