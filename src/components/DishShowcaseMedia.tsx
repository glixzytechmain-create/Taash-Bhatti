/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Meal } from '../types';

interface DishShowcaseMediaProps {
  meal: Meal;
  className?: string;
  imgClassName?: string;
  videoClassName?: string;
  onQuickView?: (meal: Meal) => void;
}

export default function DishShowcaseMedia({
  meal,
  className = '',
  imgClassName = '',
  videoClassName = '',
  onQuickView,
}: DishShowcaseMediaProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const focalPointClass =
    meal.focalPoint === 'top'
      ? 'object-top'
      : meal.focalPoint === 'bottom'
      ? 'object-bottom'
      : 'object-center';

  // Always find a reliable high-res image for the dish poster
  const posterUrl =
    meal.image ||
    (meal.gallery && meal.gallery.find((g) => g.thumbnailUrl)?.thumbnailUrl) ||
    (meal.gallery && meal.gallery.find((g) => g.url && g.type !== 'video')?.url) ||
    (meal.gallery && meal.gallery[0]?.url);

  const isVideo = meal.showcaseMediaType === 'video' && Boolean(meal.video);

  const playVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    v.defaultMuted = true;
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', 'true');

    const p = v.play();
    if (p !== undefined) {
      p.then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Deferred by browser power-saving or autoplay policy;
        // Poster remains 100% visible, smoothly playing on scroll/gesture.
      });
    }
  };

  // Autoplay attempt on mount / meal change
  useEffect(() => {
    setIsPlaying(false);
    if (!isVideo) return;
    playVideo();
  }, [meal.id, meal.video, isVideo]);

  // IntersectionObserver: Play when in viewport, pause when out of viewport
  useEffect(() => {
    if (!isVideo || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = videoRef.current;
          if (!v) return;
          if (entry.isIntersecting) {
            v.muted = true;
            v.defaultMuted = true;
            v.playsInline = true;
            v.setAttribute('muted', '');
            v.setAttribute('playsinline', '');
            v.setAttribute('webkit-playsinline', 'true');
            v.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            if (!v.paused) {
              v.pause();
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVideo, meal.video]);

  const handleInteraction = () => {
    if (isVideo && videoRef.current && videoRef.current.paused) {
      playVideo();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-stone-950 ${className}`}
      onMouseEnter={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={() => {
        handleInteraction();
        if (onQuickView) onQuickView(meal);
      }}
    >
      {/* 1. Permanent High-Res Poster Image: ALWAYS visible, never black */}
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={meal.name}
          className={`absolute inset-0 w-full h-full object-cover ${focalPointClass} ${imgClassName}`}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-stone-900 flex items-center justify-center text-white/30 text-xs font-mono">
          {meal.name}
        </div>
      )}

      {/* 2. Seamless Looping Video: plays on top and smoothly fades in when active */}
      {isVideo && (
        <video
          ref={videoRef}
          key={meal.video}
          src={meal.video}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onPlaying={() => setIsPlaying(true)}
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime > 0 && !isPlaying) {
              setIsPlaying(true);
            }
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none ${focalPointClass} ${
            isPlaying ? 'opacity-100' : 'opacity-0'
          } ${videoClassName}`}
        >
          <source src={meal.video} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
