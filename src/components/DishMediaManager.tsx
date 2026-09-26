/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Unified Dish Media Manager for Taash Bhatti
 * - Manage multiple photos and looping videos in ONE simple place
 * - 1-tap "Set as Card Cover" for either photo or video
 * - Direct device file uploads (multi-photo select + video file support)
 * - Drag and drop support
 * - Aspect ratio framing presets (4:3, 16:9, 1:1)
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Film, 
  Image as ImageIcon, 
  Star, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Loader2, 
  Link as LinkIcon, 
  Check, 
  X, 
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Eye,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { MealMediaItem } from '../types';
import { uploadDishImageToFirestore, uploadDishVideo } from '../lib/mediaStorage';

interface DishMediaManagerProps {
  gallery: MealMediaItem[];
  onChangeGallery: (items: MealMediaItem[]) => void;
  showcaseMediaType: 'image' | 'video';
  onChangeShowcaseMediaType: (type: 'image' | 'video') => void;
  primaryImage: string;
  onChangePrimaryImage: (url: string) => void;
  primaryVideo?: string;
  onChangePrimaryVideo: (url: string) => void;
  aspectRatio: '4:3' | '16:9' | '1:1';
  onChangeAspectRatio: (ar: '4:3' | '16:9' | '1:1') => void;
  focalPoint?: 'center' | 'top' | 'bottom';
  onChangeFocalPoint?: (fp: 'center' | 'top' | 'bottom') => void;
}

export const DishMediaManager: React.FC<DishMediaManagerProps> = ({
  gallery,
  onChangeGallery,
  showcaseMediaType,
  onChangeShowcaseMediaType,
  primaryImage,
  onChangePrimaryImage,
  primaryVideo,
  onChangePrimaryVideo,
  aspectRatio,
  onChangeAspectRatio,
  focalPoint = 'center',
  onChangeFocalPoint,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualType, setManualType] = useState<'image' | 'video'>('image');
  const [manualCaption, setManualCaption] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [previewIsPlaying, setPreviewIsPlaying] = useState(true);
  const [previewIsMuted, setPreviewIsMuted] = useState(true);

  // Helper to determine if an existing image is an Unsplash stock placeholder
  const isStockPlaceholder = (url?: string) => {
    if (!url) return false;
    return url.includes('images.unsplash.com');
  };

  // Toggle video playback in admin preview box
  const togglePreviewPlayback = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const v = previewVideoRef.current;
    if (!v) return;

    v.defaultMuted = previewIsMuted;
    v.muted = previewIsMuted;
    v.playsInline = true;

    if (v.paused) {
      v.play()
        .then(() => setPreviewIsPlaying(true))
        .catch((err) => {
          console.warn('Playback deferred, retrying muted:', err);
          v.muted = true;
          v.defaultMuted = true;
          setPreviewIsMuted(true);
          v.play().then(() => setPreviewIsPlaying(true)).catch(console.error);
        });
    } else {
      v.pause();
      setPreviewIsPlaying(false);
    }
  };

  // Synchronize initial primary image & video into gallery if gallery is empty
  useEffect(() => {
    const hasRealVideo = Boolean(primaryVideo && primaryVideo.trim());
    const isUnsplash = Boolean(primaryImage && isStockPlaceholder(primaryImage));

    // If primaryImage was previously polluted with an Unsplash placeholder and dish has video, clear it
    if (isUnsplash && hasRealVideo) {
      onChangePrimaryImage('');
    }

    if (!gallery || gallery.length === 0) {
      const initialItems: MealMediaItem[] = [];

      // Only push primary photo if it is NOT an Unsplash placeholder when video exists
      if (primaryImage && primaryImage.trim() && (!hasRealVideo || !isUnsplash)) {
        initialItems.push({
          id: `img_${Date.now()}`,
          type: 'image',
          url: primaryImage.trim(),
          caption: 'Primary Photo',
        });
      }
      if (primaryVideo && primaryVideo.trim()) {
        initialItems.push({
          id: `vid_${Date.now() + 1}`,
          type: 'video',
          url: primaryVideo.trim(),
          caption: 'Looping Video Clip',
        });
      }
      if (initialItems.length > 0) {
        onChangeGallery(initialItems);
      }
    }
  }, []);

  // Reliable HTML5 autoplay trigger on video selection
  useEffect(() => {
    if (showcaseMediaType === 'video' && primaryVideo && previewVideoRef.current) {
      const v = previewVideoRef.current;
      v.defaultMuted = true;
      v.muted = true;
      v.playsInline = true;
      v.currentTime = 0.01;
      v.play()
        .then(() => setPreviewIsPlaying(true))
        .catch((err) => {
          console.warn('Admin preview auto-play deferred by browser policy:', err);
          setPreviewIsPlaying(false);
        });
    }
  }, [showcaseMediaType, primaryVideo]);

  // Handle uploading multiple photos from device
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadPercent(null);
    setErrorMsg(null);
    setProcessingStatus(`Optimizing ${files.length} photo${files.length > 1 ? 's' : ''} for instant mobile loading...`);

    try {
      const newItems: MealMediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedDataUrl = await uploadDishImageToFirestore(file);
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'image',
          url: compressedDataUrl,
          caption: file.name.replace(/\.[^/.]+$/, ''),
        });
      }

      if (newItems.length > 0) {
        // Automatically purge stock Unsplash placeholders when real photos are added
        const cleanedExisting = gallery.filter((it) => !isStockPlaceholder(it.url));
        const updated = [...cleanedExisting, ...newItems];
        onChangeGallery(updated);

        // Always set the newly uploaded photo as active card cover
        onChangePrimaryImage(newItems[0].url);
        onChangeShowcaseMediaType('image');
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setErrorMsg(err.message || 'Failed to process photos.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setUploadPercent(null);
      e.target.value = '';
    }
  };

  // Handle uploading a video from device (Firebase Storage CDN or fast loop)
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsProcessing(true);
    setUploadPercent(0);
    setErrorMsg(null);
    setProcessingStatus('Connecting to Firebase Storage...');

    try {
      const result = await uploadDishVideo(file, (percent, status) => {
        setUploadPercent(percent);
        setProcessingStatus(status);
      });

      const newItem: MealMediaItem = {
        id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'video',
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      };

      // Clean out stock placeholders when genuine dish video is uploaded
      const cleanedExisting = gallery.filter((it) => !isStockPlaceholder(it.url));
      const updated = [...cleanedExisting, newItem];
      onChangeGallery(updated);

      // Auto-set as primary video and card showcase
      onChangePrimaryVideo(result.url);
      if (result.thumbnailUrl) {
        onChangePrimaryImage(result.thumbnailUrl);
      } else if (isStockPlaceholder(primaryImage)) {
        onChangePrimaryImage('');
      }
      onChangeShowcaseMediaType('video');
    } catch (err: any) {
      console.error('Video upload error:', err);
      setErrorMsg(err.message || 'Failed to process video file. Please check file format.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setUploadPercent(null);
      e.target.value = '';
    }
  };

  // Set an item as the Card Cover (Showcase on Menu Card)
  const handleSetCover = (item: MealMediaItem) => {
    if (item.type === 'video') {
      onChangePrimaryVideo(item.url);
      if (item.thumbnailUrl) {
        onChangePrimaryImage(item.thumbnailUrl);
      }
      onChangeShowcaseMediaType('video');
    } else {
      onChangePrimaryImage(item.url);
      onChangeShowcaseMediaType('image');
    }
  };

  // Delete an item from gallery
  const handleDeleteItem = (index: number) => {
    const itemToDelete = gallery[index];
    const updated = gallery.filter((_, i) => i !== index);
    onChangeGallery(updated);

    // If we deleted the active showcase item, reassign cover to the next available item
    if (itemToDelete.type === 'video' && showcaseMediaType === 'video' && primaryVideo === itemToDelete.url) {
      const nextVideo = updated.find((it) => it.type === 'video');
      if (nextVideo) {
        onChangePrimaryVideo(nextVideo.url);
      } else {
        const nextImage = updated.find((it) => it.type === 'image');
        if (nextImage) {
          onChangePrimaryImage(nextImage.url);
          onChangeShowcaseMediaType('image');
        } else {
          onChangePrimaryVideo('');
          onChangeShowcaseMediaType('image');
        }
      }
    } else if (
      itemToDelete.type === 'image' &&
      (showcaseMediaType === 'image' || !primaryImage) &&
      primaryImage === itemToDelete.url
    ) {
      const nextImage = updated.find((it) => it.type === 'image');
      if (nextImage) {
        onChangePrimaryImage(nextImage.url);
      } else {
        onChangePrimaryImage('');
      }
    }
  };

  // Reorder items
  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= gallery.length) return;
    const updated = [...gallery];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onChangeGallery(updated);
  };

  // Add manual URL
  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    const url = manualUrl.trim();
    const newItem: MealMediaItem = {
      id: `media_${Date.now()}`,
      type: manualType,
      url,
      caption: manualCaption.trim() || undefined,
    };
    const cleanedExisting = gallery.filter((it) => !isStockPlaceholder(it.url));
    const updated = [...cleanedExisting, newItem];
    onChangeGallery(updated);

    if (manualType === 'video') {
      onChangePrimaryVideo(url);
      onChangeShowcaseMediaType('video');
    } else {
      onChangePrimaryImage(url);
      onChangeShowcaseMediaType('image');
    }

    setManualUrl('');
    setManualCaption('');
    setShowUrlModal(false);
  };

  // Check if an item is currently the Card Cover
  const isItemCover = (item: MealMediaItem): boolean => {
    if (showcaseMediaType === 'video' && item.type === 'video' && item.url === primaryVideo) {
      return true;
    }
    if (showcaseMediaType === 'image' && item.type === 'image' && item.url === primaryImage) {
      return true;
    }
    return false;
  };

  // Determine active cover media source for the Live Preview Box
  const activeCoverSrc = showcaseMediaType === 'video' && primaryVideo 
    ? primaryVideo 
    : (primaryImage && !isStockPlaceholder(primaryImage) ? primaryImage : (primaryVideo || ''));
  const hasCoverMedia = Boolean(activeCoverSrc && activeCoverSrc.trim());
  const safePreviewPoster = (primaryImage && !isStockPlaceholder(primaryImage)) 
    ? primaryImage 
    : (gallery.find(g => g.thumbnailUrl && !isStockPlaceholder(g.thumbnailUrl))?.thumbnailUrl || undefined);

  return (
    <div className="bg-[#141A22] border border-brand-green/25 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoUpload}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />

      {/* TOP: LIVE CUSTOMER CARD PREVIEW STUDIO */}
      <div className="bg-[#0D1218] border border-brand-green/20 rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-brand-orange tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-brand-orange" /> Live Menu Card Preview
            </span>
            <span className="text-[9px] bg-brand-green/20 text-brand-green px-2 py-0.5 rounded-full border border-brand-green/30 font-bold uppercase">
              Diner View
            </span>
          </div>

          {/* Quick Toggle between Photo or Video cover if both exist */}
          {primaryVideo && primaryImage && !isStockPlaceholder(primaryImage) && (
            <div className="flex items-center gap-1 bg-[#18202A] p-0.5 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => onChangeShowcaseMediaType('image')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  showcaseMediaType === 'image'
                    ? 'bg-brand-green text-brand-charcoal shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📷 Show Photo
              </button>
              <button
                type="button"
                onClick={() => onChangeShowcaseMediaType('video')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  showcaseMediaType === 'video'
                    ? 'bg-brand-orange text-brand-charcoal shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🎥 Show Looping Video
              </button>
            </div>
          )}
        </div>

        {/* Live Preview Display Box */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 md:col-span-5">
            <div
              className={`relative rounded-xl overflow-hidden bg-black w-full border-2 ${
                showcaseMediaType === 'video' ? 'border-brand-orange/60' : 'border-brand-green/60'
              } shadow-lg ${
                aspectRatio === '16:9' ? 'aspect-[16/9]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/3]'
              }`}
            >
              {hasCoverMedia ? (
                showcaseMediaType === 'video' && primaryVideo ? (
                  <div className="relative w-full h-full select-none group/preview">
                    <video
                      ref={(el) => {
                        (previewVideoRef as any).current = el;
                        if (el) {
                          el.defaultMuted = previewIsMuted;
                          el.muted = previewIsMuted;
                          el.playsInline = true;
                        }
                      }}
                      key={primaryVideo}
                      poster={safePreviewPoster}
                      autoPlay
                      loop
                      muted={previewIsMuted}
                      playsInline
                      preload="auto"
                      onLoadedData={(e) => {
                        const v = e.currentTarget;
                        if (v.paused && v.currentTime === 0) {
                          v.currentTime = 0.05;
                        }
                      }}
                      onPlay={() => setPreviewIsPlaying(true)}
                      onPause={() => setPreviewIsPlaying(false)}
                      onClick={togglePreviewPlayback}
                      className={`w-full h-full object-cover cursor-pointer ${
                        focalPoint === 'top' ? 'object-top' : focalPoint === 'bottom' ? 'object-bottom' : 'object-center'
                      }`}
                    >
                      <source src={primaryVideo} type="video/mp4" />
                    </video>

                    {/* Centered Play Button Overlay if Paused */}
                    {!previewIsPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none animate-in fade-in">
                        <button
                          type="button"
                          onClick={togglePreviewPlayback}
                          className="pointer-events-auto w-14 h-14 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white/40"
                          title="Click to Play"
                        >
                          <Play className="w-7 h-7 fill-white text-white ml-1" />
                        </button>
                      </div>
                    )}

                    {/* Bottom Controls: Audio Mute/Unmute + Play/Pause State */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextMute = !previewIsMuted;
                          setPreviewIsMuted(nextMute);
                          if (previewVideoRef.current) {
                            previewVideoRef.current.muted = nextMute;
                            previewVideoRef.current.defaultMuted = nextMute;
                          }
                        }}
                        className="bg-black/80 hover:bg-black text-white p-1.5 rounded-full text-xs transition-colors border border-white/20 shadow-md cursor-pointer"
                        title={previewIsMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {previewIsMuted ? <VolumeX className="w-3.5 h-3.5 text-gray-300" /> : <Volume2 className="w-3.5 h-3.5 text-brand-orange" />}
                      </button>
                      <button
                        type="button"
                        onClick={togglePreviewPlayback}
                        className="bg-black/80 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[9px] font-mono text-white flex items-center gap-1 shadow-md hover:bg-black/95 transition-all cursor-pointer border border-white/10"
                      >
                        {previewIsPlaying ? (
                          <>
                            <Pause className="w-2.5 h-2.5 fill-white text-white" /> LOOPING
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-white text-white" /> PAUSED
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <img
                    key={primaryImage}
                    src={primaryImage}
                    alt="Active dish cover"
                    className={`w-full h-full object-cover ${
                      focalPoint === 'top' ? 'object-top' : focalPoint === 'bottom' ? 'object-bottom' : 'object-center'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-brand-charcoal/50 text-gray-400">
                  <Eye className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[11px] font-bold">No cover media selected</span>
                  <span className="text-[9px] text-gray-500">Upload photos or video below</span>
                </div>
              )}

              {/* Status Badge in corner */}
              {hasCoverMedia && (
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[9px] font-black px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-md">
                  {showcaseMediaType === 'video' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                      <span className="text-brand-orange">🎥 VIDEO CARD COVER</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-brand-green" />
                      <span className="text-brand-green">📷 PHOTO CARD COVER</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Controls beside the preview */}
          <div className="sm:col-span-6 md:col-span-7 space-y-3 text-xs">
            <div>
              <p className="text-gray-300 font-bold leading-snug">
                This is the exact card format diners see on their mobile menu feed.
              </p>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Upload your dish photos or looping video below. Tap <b className="text-amber-400">⭐ Set as Card Cover</b> on any item to instantly switch.
              </p>
            </div>

            {/* Aspect Ratio & Focal Point Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-1 bg-[#18202A] p-1 rounded-xl border border-white/10 shrink-0">
                <span className="text-[9px] text-gray-400 uppercase font-mono px-1.5">Aspect:</span>
                {(['4:3', '16:9', '1:1'] as const).map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => onChangeAspectRatio(ar)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                      aspectRatio === ar
                        ? 'bg-brand-green text-brand-charcoal shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {ar === '4:3' ? '4:3 Menu' : ar === '16:9' ? '16:9 Cinema' : '1:1 Square'}
                  </button>
                ))}
              </div>

              {onChangeFocalPoint && (
                <div className="flex items-center gap-1 bg-[#18202A] p-1 rounded-xl border border-white/10 shrink-0">
                  <span className="text-[9px] text-gray-400 uppercase font-mono px-1.5">Focus:</span>
                  {(['center', 'top', 'bottom'] as const).map((fp) => (
                    <button
                      key={fp}
                      type="button"
                      onClick={() => onChangeFocalPoint(fp)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                        focalPoint === fp
                          ? 'bg-amber-400 text-stone-950 shadow-xs'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {fp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Add Photos, Add Video, Paste Link */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={isProcessing}
          className="px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Upload className="w-4 h-4 stroke-[3]" />
          <span>+ Add Photos</span>
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={isProcessing}
          className="px-4 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Film className="w-4 h-4 stroke-[3]" />
          <span>+ Add Video (.mp4, .webm, .mov)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowUrlModal(!showUrlModal)}
          className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Paste Video/Photo URL</span>
        </button>
      </div>

      {/* Processing Loader with upload percentage */}
      {isProcessing && (
        <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/30 space-y-1.5 animate-pulse">
          <div className="flex items-center justify-between text-brand-green text-xs font-bold">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{processingStatus || 'Uploading media...'}</span>
            </div>
            {uploadPercent !== null && <span>{uploadPercent}%</span>}
          </div>
          {uploadPercent !== null && (
            <div className="w-full bg-brand-charcoal h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-brand-orange h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-rose-300 text-xs font-mono">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-gray-400 hover:text-white cursor-pointer px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Paste Link Popover */}
      {showUrlModal && (
        <div className="p-3.5 rounded-xl bg-[#10161D] border border-brand-green/20 space-y-2.5 animate-in fade-in">
          <span className="text-[10px] font-bold text-gray-300 uppercase block">
            Add Image or Video via URL (Cloudinary, YouTube, Firebase Storage, direct link)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-3">
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value as any)}
                className="w-full bg-[#18202A] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white"
              >
                <option value="image">📷 Photo URL</option>
                <option value="video">🎥 Looping Video URL</option>
              </select>
            </div>
            <div className="sm:col-span-6">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://.../photo.jpg or video.mp4"
                className="w-full bg-[#18202A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 font-mono"
              />
            </div>
            <div className="sm:col-span-3 flex gap-1.5">
              <button
                type="button"
                onClick={handleAddManualUrl}
                disabled={!manualUrl.trim()}
                className="flex-1 px-3 py-2 bg-brand-green text-brand-charcoal text-xs font-black uppercase rounded-xl hover:bg-brand-green/90 cursor-pointer disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery Grid */}
      {gallery.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono uppercase">
            <span>Visual Media Lineup ({gallery.length} item{gallery.length === 1 ? '' : 's'}):</span>
            <span className="text-amber-400 font-bold">⭐ Star = Active Menu Card Cover</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((item, idx) => {
              const isCover = isItemCover(item);
              return (
                <div
                  key={item.id || `media-${idx}`}
                  className={`relative rounded-2xl overflow-hidden border transition-all ${
                    isCover
                      ? 'border-amber-400 ring-2 ring-amber-400/30 bg-[#17202C]'
                      : 'border-white/10 bg-[#10161D] hover:border-white/20'
                  } flex flex-col justify-between p-2.5 space-y-2.5 shadow-md`}
                >
                  {/* Media Preview Box with live aspect ratio and focal point calibration */}
                  <div
                    className={`relative rounded-xl overflow-hidden bg-black w-full border border-white/10 ${
                      aspectRatio === '16:9' ? 'aspect-[16/9]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/3]'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <>
                        <video
                          ref={(el) => {
                            if (el) {
                              el.defaultMuted = true;
                              el.muted = true;
                              el.playsInline = true;
                            }
                          }}
                          poster={item.thumbnailUrl || safePreviewPoster}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          onLoadedData={(e) => {
                            const v = e.currentTarget;
                            if (v.paused && v.currentTime === 0) {
                              v.currentTime = 0.05;
                            }
                          }}
                          className={`w-full h-full object-cover ${
                            focalPoint === 'top' ? 'object-top' : focalPoint === 'bottom' ? 'object-bottom' : 'object-center'
                          }`}
                        >
                          <source src={item.url} type="video/mp4" />
                        </video>
                        <div className="absolute bottom-1.5 right-1.5 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-mono text-white/90 flex items-center gap-1">
                          <Play className="w-2.5 h-2.5 fill-white" /> LOOP
                        </div>
                      </>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.caption || 'Dish visual'}
                        className={`w-full h-full object-cover ${
                          focalPoint === 'top' ? 'object-top' : focalPoint === 'bottom' ? 'object-bottom' : 'object-center'
                        }`}
                        referrerPolicy="no-referrer"
                      />
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-bold text-white border border-white/15 flex items-center gap-1">
                      {item.type === 'video' ? (
                        <>
                          <Film className="w-2.5 h-2.5 text-brand-orange" />
                          <span>Video</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-2.5 h-2.5 text-brand-green" />
                          <span>Photo</span>
                        </>
                      )}
                    </div>

                    {/* Active Cover Badge */}
                    {isCover && (
                      <div className="absolute top-1.5 right-1.5 bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-stone-950" />
                        <span>Card Cover</span>
                      </div>
                    )}
                  </div>

                  {/* Caption Input */}
                  <div>
                    <input
                      type="text"
                      value={item.caption || ''}
                      onChange={(e) => {
                        const newGallery = [...gallery];
                        newGallery[idx] = { ...newGallery[idx], caption: e.target.value };
                        onChangeGallery(newGallery);
                      }}
                      placeholder="Caption (e.g. Sizzling Charcoal Tikka)"
                      className="w-full bg-[#18202A] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-brand-green"
                    />
                  </div>

                  {/* Bottom Controls Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    {/* Make Cover Button */}
                    {isCover ? (
                      <span className="text-[10px] font-black text-amber-400 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Active Card Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(item)}
                        className="text-[10px] font-bold text-gray-300 hover:text-amber-400 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
                      >
                        <Star className="w-3 h-3" /> Set as Card Cover
                      </button>
                    )}

                    {/* Move & Delete Controls */}
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'left')}
                          className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded cursor-pointer"
                          title="Move earlier in lineup"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                      )}
                      {idx < gallery.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'right')}
                          className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded cursor-pointer"
                          title="Move later in lineup"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded cursor-pointer transition-colors ml-1"
                        title="Delete from dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          onClick={() => photoInputRef.current?.click()}
          className="border-2 border-dashed border-brand-green/20 hover:border-brand-green/40 rounded-2xl p-6 text-center transition-all cursor-pointer bg-[#10161D]/50 space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 border border-brand-green/30 text-brand-green flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">No photos or videos added to this dish yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Click buttons above to upload photos or videos</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                photoInputRef.current?.click();
              }}
              className="px-4 py-2 bg-brand-green text-brand-charcoal font-black rounded-xl text-xs uppercase cursor-pointer"
            >
              Upload Photos
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                videoInputRef.current?.click();
              }}
              className="px-4 py-2 bg-brand-orange text-brand-charcoal font-black rounded-xl text-xs uppercase cursor-pointer"
            >
              Upload Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

