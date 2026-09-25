/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
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
        thumbnailUrl: meal.image,
        caption: 'Chef Looping Video Preview',
      });
    }
    if (meal.image) {
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
        thumbnailUrl: meal.image,
        caption: 'Chef Looping Video Preview',
      });
    }
    return items;
  }, [meal]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Reset to first item when meal changes
  useEffect(() => {
    setActiveIndex(0);
  }, [meal.id]);

  const activeItem = mediaList[activeIndex] || mediaList[0] || {
    id: 'fallback',
    type: 'image' as const,
    url: meal.image,
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
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

  return (
    <div
      className={`relative w-full overflow-hidden bg-black select-none shrink-0 ${getAspectRatioClasses()}`}
    >
      {/* Active Visual Media: Embedded Looping Video or High-Res Photo */}
      {activeItem.type === 'video' ? (
        <video
          key={activeItem.url}
          src={activeItem.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${focalClass}`}
        />
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
      <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5">
        <div className="bg-black/65 backdrop-blur-md text-white font-mono text-[9px] font-black px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5 shadow-md">
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
            onClick={handlePrev}
            aria-label="Previous visual"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next visual"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-90"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Bottom Area: Optional caption, bottom-left badge, bottom-right action */}
      <div className="absolute bottom-12 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
        {bottomLeftBadge && <div className="pointer-events-auto">{bottomLeftBadge}</div>}
        {bottomRightAction && <div className="pointer-events-auto ml-auto">{bottomRightAction}</div>}
      </div>

      {/* Active Media Caption (if present) */}
      {activeItem.caption && (
        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 z-15 pointer-events-none max-w-[85%] text-center">
          <span className="text-[10px] font-medium text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 truncate inline-block">
            {activeItem.caption}
          </span>
        </div>
      )}

      {/* Bottom Multi-Media Thumbnail Lineup Selector */}
      {mediaList.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 max-w-[92%] overflow-x-auto shadow-xl">
          {mediaList.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={item.id || idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                title={item.caption || (item.type === 'video' ? 'Video Preview' : `Photo ${idx + 1}`)}
                className={`relative w-8 h-8 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-brand-orange scale-110 shadow-md shadow-brand-orange/50 ring-2 ring-white/60'
                    : 'border-white/30 opacity-70 hover:opacity-100 hover:border-white/60'
                }`}
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-stone-900 relative">
                    <img
                      src={item.thumbnailUrl || meal.image}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
