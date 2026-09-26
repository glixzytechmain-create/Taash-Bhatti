/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Play, 
  Pause,
  Film, 
  Image as ImageIcon,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Meal, MealMediaItem } from '../types';

interface DishMediaGalleryViewerProps {
  meal: Meal;
  onClose?: () => void;
  showCloseButton?: boolean;
  topRightBadge?: React.ReactNode;
  bottomRightAction?: React.ReactNode;
  bottomLeftBadge?: React.ReactNode;
}

export default function DishMediaGalleryViewer({
  meal,
  onClose,
  showCloseButton = true,
  topRightBadge,
  bottomRightAction,
  bottomLeftBadge,
}: DishMediaGalleryViewerProps) {
  // Extract all media items for the dish lineup
  const mediaList: MealMediaItem[] = useMemo(() => {
    if (meal.gallery && meal.gallery.length > 0) {
      return meal.gallery;
    }
    const items: MealMediaItem[] = [];
    if (meal.showcaseMediaType === 'video' && meal.video) {
      items.push({
        id: `${meal.id}-video`,
        type: 'video',
        url: meal.video,
        thumbnailUrl: (meal.image && !meal.image.includes('images.unsplash.com')) ? meal.image : undefined,
        caption: 'Chef Looping Video Preview',
      });
    }
    if (meal.image && !meal.image.includes('images.unsplash.com')) {
      items.push({
        id: `${meal.id}-img-main`,
        type: 'image',
        url: meal.image,
        caption: meal.name,
      });
    }
    if (meal.video && meal.showcaseMediaType !== 'video') {
      items.push({
        id: `${meal.id}-video`,
        type: 'video',
        url: meal.video,
        thumbnailUrl: (meal.image && !meal.image.includes('images.unsplash.com')) ? meal.image : undefined,
        caption: 'Chef Looping Video Preview',
      });
    }
    return items;
  }, [meal]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartXRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset to first item when meal changes
  useEffect(() => {
    setActiveIndex(0);
  }, [meal.id]);

  // Auto-scroll selected thumbnail into center of horizontal reel
  useEffect(() => {
    if (itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeIndex]);

  const activeItem = mediaList[activeIndex] || mediaList[0] || {
    id: 'fallback',
    type: 'image' as const,
    url: meal.image,
  };

  // Safe poster: strictly ignore hardcoded Unsplash salad bowl images
  const safePoster = (activeItem.thumbnailUrl && !activeItem.thumbnailUrl.includes('images.unsplash.com'))
    ? activeItem.thumbnailUrl
    : (meal.image && !meal.image.includes('images.unsplash.com') ? meal.image : undefined);

  // Trigger reliable HTML5 video play whenever active video changes
  useEffect(() => {
    if (activeItem.type === 'video' && videoRef.current) {
      const v = videoRef.current;
      v.defaultMuted = isMuted;
      v.muted = isMuted;
      v.playsInline = true;
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Browser paused video autoplay, awaiting user touch:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [activeIndex, activeItem.url, isMuted]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.defaultMuted = isMuted;
    v.muted = isMuted;
    v.playsInline = true;

    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback deferred, retrying muted:', err);
          v.muted = true;
          v.defaultMuted = true;
          setIsMuted(true);
          v.play().then(() => setIsPlaying(true)).catch(console.error);
        });
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
  };

  // Touch Swipe Handlers for mobile navigation on the main picture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  // Determine fixed aspect ratio container style
  const getAspectRatioClasses = () => {
    switch (meal.aspectRatio) {
      case '16:9':
        return 'aspect-[16/9] max-h-72';
      case '1:1':
        return 'aspect-square max-h-72';
      case '4:3':
      default:
        return 'aspect-[4/3] max-h-72';
    }
  };

  const getFocalPointClass = () => {
    switch (meal.focalPoint) {
      case 'top':
        return 'object-top';
      case 'bottom':
        return 'object-bottom';
      case 'center':
      default:
        return 'object-center';
    }
  };

  const focalClass = getFocalPointClass();

  // Filter out raw numerical filenames like "32762" from the user-facing caption pill
  const isMeaningfulCaption = Boolean(
    activeItem.caption &&
    activeItem.caption.trim().length > 1 &&
    !/^\d+$/.test(activeItem.caption.trim()) &&
    !activeItem.caption.includes('vid_') &&
    !activeItem.caption.includes('img_')
  );

  return (
    <div className="w-full flex flex-col shrink-0 select-none bg-black">
      {/* 1. Main Visual Player (Cinematic Video or Photo) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full overflow-hidden bg-black ${getAspectRatioClasses()}`}
      >
        {/* Active Visual Media */}
        {activeItem.type === 'video' ? (
          <div className="relative w-full h-full cursor-pointer group/video" onClick={togglePlay}>
            <video
              ref={(el) => {
                (videoRef as any).current = el;
                if (el) {
                  el.defaultMuted = isMuted;
                  el.muted = isMuted;
                  el.playsInline = true;
                }
              }}
              key={activeItem.url}
              poster={safePoster}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              onLoadedData={(e) => {
                const v = e.currentTarget;
                if (v.paused && v.currentTime === 0) {
                  v.currentTime = 0.05;
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${focalClass}`}
            >
              <source src={activeItem.url} type="video/mp4" />
            </video>

            {/* Play Button Overlay when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center pointer-events-none animate-in fade-in">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-orange text-stone-950 flex items-center justify-center shadow-2xl transition-transform group-hover/video:scale-110">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-stone-950 ml-1" />
                </div>
              </div>
            )}

            {/* Sound Toggle Button (Bottom-Right) */}
            <button
              type="button"
              onClick={toggleMute}
              className="absolute bottom-3 right-3 z-30 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-md active:scale-90"
              title={isMuted ? 'Unmute video audio' : 'Mute video audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-brand-green" />}
            </button>
          </div>
        ) : (
          <img
            key={activeItem.url}
            src={activeItem.url}
            alt={activeItem.caption || meal.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${focalClass}`}
            referrerPolicy="no-referrer"
          />
        )}

        {/* Subtle vignette gradient for readable controls and indicators */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

        {/* Top Left: Media Type & Counter Indicator */}
        <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 pointer-events-none">
          <div className="bg-black/75 backdrop-blur-md text-white font-mono text-[9px] font-black px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5 shadow-md">
            <span>{activeItem.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}</span>
            {mediaList.length > 1 && (
              <span className="text-white/70">
                ({activeIndex + 1}/{mediaList.length})
              </span>
            )}
          </div>
        </div>

        {/* Top Right: Badges and Close Button */}
        <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
          {topRightBadge}
          {showCloseButton && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Left / Right Carousel Navigation (visible when dish has multiple media items) */}
        {mediaList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => handlePrev(e)}
              aria-label="Previous visual"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => handleNext(e)}
              aria-label="Next visual"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-90"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Bottom Area: Optional bottom-left badge, bottom-right action */}
        <div className="absolute bottom-3 left-4 right-14 z-20 pointer-events-none flex items-center justify-between">
          {bottomLeftBadge && <div className="pointer-events-auto">{bottomLeftBadge}</div>}
          {bottomRightAction && <div className="pointer-events-auto ml-auto">{bottomRightAction}</div>}
        </div>

        {/* Active Media Caption (strictly only if meaningful) */}
        {isMeaningfulCaption && (
          <div className="absolute bottom-11 left-1/2 -translate-x-1/2 z-15 pointer-events-none max-w-[80%] text-center">
            <span className="text-[10px] font-medium text-white/90 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 truncate inline-block">
              {activeItem.caption}
            </span>
          </div>
        )}
      </div>

      {/* 2. DEDICATED HORIZONTAL SCROLL GALLERY REEL (Images & Videos) */}
      {mediaList.length > 1 && (
        <div className="w-full bg-[#10161D] border-b border-brand-green/15 px-3.5 py-2.5 space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400">
            <span className="text-brand-orange flex items-center gap-1">
              <Film className="w-3 h-3" /> Dish Media Gallery ({mediaList.length})
            </span>
            <span className="text-[9px] font-mono text-gray-400">← Swipe / Tap to switch →</span>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2.5 overflow-x-auto snap-x scrollbar-thin scrollbar-thumb-white/20 pb-1 pt-0.5 scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {mediaList.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id || idx}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden snap-start shrink-0 cursor-pointer transition-all border text-left ${
                    isSelected
                      ? 'border-brand-orange ring-2 ring-brand-orange/90 shadow-lg scale-102'
                      : 'border-white/15 opacity-65 hover:opacity-100 hover:border-white/40'
                  }`}
                >
                  {/* Thumbnail Visual */}
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-stone-900 relative">
                      <img
                        src={item.thumbnailUrl || meal.image}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-brand-orange/90 flex items-center justify-center shadow-md">
                          <Play className="w-3 h-3 text-stone-950 fill-stone-950 ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[7px] font-mono text-white">
                        VIDEO
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-stone-900 relative">
                      <img
                        src={item.url}
                        alt={item.caption || `Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[7px] font-mono text-white">
                        PHOTO
                      </div>
                    </div>
                  )}

                  {/* Active selection dot */}
                  {isSelected && (
                    <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-brand-orange shadow-xs" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

