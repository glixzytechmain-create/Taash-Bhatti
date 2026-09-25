/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Video Uploader Component for Taash Bhatti
 * - Dual Mode: Direct Device File Upload OR Paste Video URL with Presets
 * - Built-in zero-audio looping video preview
 * - Automatic client-side optimization for device videos
 */

import React, { useState, useRef } from 'react';
import { Upload, Film, Link as LinkIcon, X, Check, Loader2, Play, Sparkles } from 'lucide-react';
import { processVideoFile } from '../lib/videoUpload';

export interface VideoPreset {
  name: string;
  url: string;
}

export const DEFAULT_FOOD_VIDEO_PRESETS: VideoPreset[] = [
  { name: '🔥 Sizzling Vegetables & Paneer', url: 'https://assets.mixkit.co/videos/preview/mixkit-vegetables-sizzling-in-a-pan-43097-large.mp4' },
  { name: '🍗 Tandoori Chicken Grill', url: 'https://assets.mixkit.co/videos/preview/mixkit-chicken-meat-cooked-in-pan-43099-large.mp4' },
  { name: '🍲 Slow-Cooked Handi Gravy', url: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-spicy-food-dish-slow-cooked-in-pan-43098-large.mp4' }
];

interface VideoUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  presets?: VideoPreset[];
  className?: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  value = '',
  onChange,
  label = 'Looping Dish Video (.mp4 / .webm)',
  placeholder = 'Paste video URL or choose file from device',
  compact = false,
  presets = DEFAULT_FOOD_VIDEO_PRESETS,
  className = '',
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'url'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [urlInputValue, setUrlInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await handleProcessFile(file);
    e.target.value = '';
  };

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg('Preparing video...');
    try {
      const result = await processVideoFile(file, 4, 480, (status) => {
        setProgressMsg(status);
      });
      onChange(result.dataUrl);
    } catch (err: any) {
      console.error('Video processing error:', err);
      setErrorMsg(err.message || 'Failed to process video file. Please check file format.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleApplyUrl = () => {
    if (urlInputValue.trim()) {
      onChange(urlInputValue.trim());
      setUrlInputValue('');
    }
  };

  const handleRemove = () => {
    onChange('');
    setErrorMsg(null);
    setUrlInputValue('');
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider block">
            {label}
          </label>
          {value && (
            <span className="text-[9px] font-mono text-brand-orange flex items-center gap-1 font-bold">
              <Check className="w-3 h-3 text-brand-green" /> Video Loaded
            </span>
          )}
        </div>
      )}

      {/* Hidden file input for native device picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Mode Switcher Tabs (Upload from Device vs Video URL) */}
      {!value && (
        <div className="flex items-center gap-1 p-1 bg-[#10161D] rounded-xl border border-white/10 w-fit">
          <button
            type="button"
            onClick={() => { setActiveMode('upload'); setErrorMsg(null); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-brand-green text-brand-charcoal font-black shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Upload from Device</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('url'); setErrorMsg(null); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'url'
                ? 'bg-brand-orange text-brand-charcoal font-black shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Paste URL / Presets</span>
          </button>
        </div>
      )}

      {/* Active Video Preview */}
      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-brand-orange/40 bg-[#10161D] p-2.5 flex items-center gap-3 shadow-lg">
          <div className={`${compact ? 'w-20 h-16' : 'w-32 h-24'} rounded-xl overflow-hidden bg-black shrink-0 relative border border-white/10`}>
            <video
              src={value}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[8px] font-mono text-white/90">
              LOOP
            </div>
          </div>
          <div className="flex-1 min-w-0 pr-8 space-y-1">
            <span className="text-[10px] font-bold text-brand-orange uppercase block tracking-wider">
              🎥 Video Showcase Active
            </span>
            <span className="text-[9px] font-mono text-gray-400 block truncate">
              {value.startsWith('data:') ? 'Optimized Device Video (Data URL)' : value}
            </span>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[9px] font-bold text-brand-green hover:underline cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
              >
                <Upload className="w-2.5 h-2.5" /> Replace from Device
              </button>
              <span className="text-gray-600">•</span>
              <button
                type="button"
                onClick={handleRemove}
                className="text-[9px] font-bold text-rose-400 hover:underline cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
              >
                <X className="w-2.5 h-2.5" /> Remove
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer border-none"
            title="Remove Video"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : activeMode === 'upload' ? (
        /* Device File Upload Drag & Drop Area */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              await handleProcessFile(files[0]);
            }
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
              fileInputRef.current?.click();
            }
          }}
          className={`bg-[#121820] border-2 border-dashed border-brand-green/25 hover:border-brand-green/50 rounded-2xl ${
            compact ? 'p-3' : 'p-5'
          } text-center transition-all cursor-pointer relative overflow-hidden`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <Loader2 className="w-6 h-6 text-brand-green animate-spin" />
              <span className="text-xs font-bold text-brand-green">{progressMsg || 'Processing video file...'}</span>
              <span className="text-[9px] text-gray-500 font-mono">Extracting silent looping preview</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/30 flex items-center justify-center text-brand-green">
                <Film className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-xs text-white font-bold">
                Choose video from device or drag & drop file here
              </p>
              <p className="text-[10px] text-gray-400 font-medium">
                MP4, WebM, MOV supported • Auto-optimized for web
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-brand-green text-brand-charcoal font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[3]" /> Browse Device Files
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Video URL & Presets Mode */
        <div className="space-y-2 bg-[#121820] p-3 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              placeholder="https://.../video.mp4"
              className="flex-1 bg-brand-charcoal border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-orange font-mono"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              disabled={!urlInputValue.trim()}
              className="px-3.5 py-2 bg-brand-orange text-brand-charcoal text-[10px] font-black uppercase rounded-xl hover:bg-brand-orange/90 transition-all cursor-pointer border-none disabled:opacity-40"
            >
              Apply
            </button>
          </div>

          {/* Quick Presets */}
          {presets && presets.length > 0 && (
            <div className="pt-1 space-y-1">
              <span className="text-[9px] text-gray-500 uppercase font-mono block">One-Click Food Video Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => onChange(preset.url)}
                    className="text-[9px] bg-brand-charcoal hover:bg-[#202935] text-gray-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-brand-orange" />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-[10px] text-rose-400 font-mono mt-1 flex items-center gap-1 bg-red-950/30 p-2 rounded-lg border border-red-500/20">
          <X className="w-3 h-3 shrink-0" /> {errorMsg}
        </p>
      )}
    </div>
  );
};
