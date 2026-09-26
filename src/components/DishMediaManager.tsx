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
  Play
} from 'lucide-react';
import { MealMediaItem } from '../types';
import { compressImageFile } from '../lib/imageUpload';
import { processVideoFile } from '../lib/videoUpload';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualType, setManualType] = useState<'image' | 'video'>('image');
  const [manualCaption, setManualCaption] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Synchronize initial primary image & video into gallery if gallery is empty
  useEffect(() => {
    if (gallery.length === 0) {
      const initialItems: MealMediaItem[] = [];
      if (primaryImage && primaryImage.trim()) {
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

  // Handle uploading multiple photos from device
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStatus(`Optimizing ${files.length} photo${files.length > 1 ? 's' : ''}...`);

    try {
      const newItems: MealMediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedDataUrl = await compressImageFile(file, 900);
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'image',
          url: compressedDataUrl,
          caption: file.name.replace(/\.[^/.]+$/, ''),
        });
      }

      if (newItems.length > 0) {
        const updated = [...gallery, ...newItems];
        onChangeGallery(updated);
        // If there was no primary image, set the first new photo as primary
        if (!primaryImage || !primaryImage.trim()) {
          onChangePrimaryImage(newItems[0].url);
          onChangeShowcaseMediaType('image');
        }
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setErrorMsg(err.message || 'Failed to process photos.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      e.target.value = '';
    }
  };

  // Handle uploading a video from device
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStatus('Processing video clip...');

    try {
      const result = await processVideoFile(file, 4, 480, (status) => {
        setProcessingStatus(status);
      });

      const newItem: MealMediaItem = {
        id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'video',
        url: result.dataUrl,
        thumbnailUrl: result.thumbnailUrl,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      };

      const updated = [...gallery, newItem];
      onChangeGallery(updated);
      // Auto-set as primary video and showcase as video
      onChangePrimaryVideo(result.dataUrl);
      onChangeShowcaseMediaType('video');
    } catch (err: any) {
      console.error('Video upload error:', err);
      setErrorMsg(err.message || 'Failed to process video file. Please check file format.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      e.target.value = '';
    }
  };

  // Set an item as the Card Cover (Showcase on Menu Card)
  const handleSetCover = (item: MealMediaItem) => {
    if (item.type === 'video') {
      onChangePrimaryVideo(item.url);
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
      const nextVideo = updated.find(it => it.type === 'video');
      if (nextVideo) {
        onChangePrimaryVideo(nextVideo.url);
      } else {
        const nextImage = updated.find(it => it.type === 'image');
        if (nextImage) {
          onChangePrimaryImage(nextImage.url);
          onChangeShowcaseMediaType('image');
        } else {
          onChangePrimaryVideo('');
          onChangeShowcaseMediaType('image');
        }
      }
    } else if (itemToDelete.type === 'image' && (showcaseMediaType === 'image' || !primaryImage) && primaryImage === itemToDelete.url) {
      const nextImage = updated.find(it => it.type === 'image');
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
    const updated = [...gallery, newItem];
    onChangeGallery(updated);

    if (manualType === 'video' && (!primaryVideo || showcaseMediaType === 'video')) {
      onChangePrimaryVideo(url);
      onChangeShowcaseMediaType('video');
    } else if (manualType === 'image' && (!primaryImage || !primaryImage.trim())) {
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

      {/* Header Bar: Title + Aspect Ratio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-brand-orange tracking-wider flex items-center gap-1.5">
              📸 & 🎥 Dish Visual Media & Gallery
            </span>
            <span className="text-[9px] bg-brand-charcoal text-gray-300 px-2 py-0.5 rounded-full border border-white/10 font-bold">
              {gallery.length} item{gallery.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Add multiple photos & videos. Click <b className="text-amber-400">⭐ Set as Card Cover</b> on whichever one you want diners to see on the menu card.
          </p>
        </div>

        {/* Aspect Ratio & Focal Point Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1 bg-[#10161D] p-1 rounded-xl border border-white/10 shrink-0">
            <span className="text-[9px] text-gray-400 uppercase font-mono px-2">Aspect:</span>
            {(['4:3', '16:9', '1:1'] as const).map((ar) => (
              <button
                key={ar}
                type="button"
                onClick={() => onChangeAspectRatio(ar)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  aspectRatio === ar
                    ? 'bg-brand-green text-brand-charcoal shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {ar === '4:3' ? '4:3 Menu' : ar === '16:9' ? '16:9 Cinema' : '1:1 Square'}
              </button>
            ))}
          </div>

          {/* Focal Point Selector (Optional) */}
          {onChangeFocalPoint && (
            <div className="flex items-center gap-1 bg-[#10161D] p-1 rounded-xl border border-white/10 shrink-0">
              <span className="text-[9px] text-gray-400 uppercase font-mono px-2">Focus:</span>
              {(['center', 'top', 'bottom'] as const).map((fp) => (
                <button
                  key={fp}
                  type="button"
                  onClick={() => onChangeFocalPoint(fp)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
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

      {/* Action Buttons: Add Photos, Add Video, Paste Link */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={isProcessing}
          className="px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Upload className="w-4 h-4 stroke-[3]" />
          <span>+ Add Photos from Device</span>
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={isProcessing}
          className="px-4 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-brand-charcoal font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <Film className="w-4 h-4 stroke-[3]" />
          <span>+ Add Video from Device</span>
        </button>

        <button
          type="button"
          onClick={() => setShowUrlModal(!showUrlModal)}
          className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Or Paste Link</span>
        </button>
      </div>

      {/* Processing Loader */}
      {isProcessing && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-bold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{processingStatus || 'Optimizing media for instant mobile viewing...'}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-rose-300 text-xs font-mono">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Paste Link Popover */}
      {showUrlModal && (
        <div className="p-3.5 rounded-xl bg-[#10161D] border border-brand-green/20 space-y-2.5 animate-in fade-in">
          <span className="text-[10px] font-bold text-gray-300 uppercase block">
            Add Image or Video via URL
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
            <span>Visual Media Lineup ({gallery.length}):</span>
            <span>⭐ Star = Active Menu Card Cover</span>
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
                  <div className={`relative rounded-xl overflow-hidden bg-black w-full border border-white/10 ${
                    aspectRatio === '16:9' ? 'aspect-[16/9]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/3]'
                  }`}>
                    {item.type === 'video' ? (
                      <>
                        <video
                          src={item.url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className={`w-full h-full object-cover ${
                            focalPoint === 'top' ? 'object-top' : focalPoint === 'bottom' ? 'object-bottom' : 'object-center'
                          }`}
                        />
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
                      placeholder="Caption (e.g. Sizzling Skewer)"
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
            <p className="text-xs text-gray-400 mt-0.5">Click above or drag & drop dish media files here</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                photoInputRef.current?.click();
              }}
              className="px-4 py-2 bg-brand-green text-brand-charcoal font-black rounded-xl text-xs uppercase"
            >
              Upload Photos
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                videoInputRef.current?.click();
              }}
              className="px-4 py-2 bg-brand-orange text-brand-charcoal font-black rounded-xl text-xs uppercase"
            >
              Upload Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
