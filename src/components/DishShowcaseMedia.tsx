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
  const [hasError, setHasError] = useState(false);
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
      p.catch(() => {
        // Autoplay deferred by browser policy until interaction
      });
    }
  };

  // Attempt silent autoplay on mount / meal change
  useEffect(() => {
    setHasError(false);
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
            playVideo();
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
      {/* 1. Permanent High-Res Poster Image: ALWAYS visible behind the video */}
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

      {/* 2. Seamless Looping Video: plays on top with zero controls */}
      {isVideo && !hasError && (
        <video
          ref={(el) => {
            (videoRef as any).current = el;
            if (el) {
              el.defaultMuted = true;
              el.muted = true;
              el.playsInline = true;
              el.setAttribute('muted', '');
              el.setAttribute('playsinline', '');
              el.setAttribute('webkit-playsinline', 'true');
            }
          }}
          key={meal.video}
          src={meal.video}
          poster={posterUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            const p = e.currentTarget.play();
            if (p !== undefined) p.catch(() => {});
          }}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${focalPointClass} ${videoClassName}`}
        >
          <source src={meal.video} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
