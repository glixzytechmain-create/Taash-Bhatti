import React, { useState, useRef } from 'react';
import { Upload, Camera, Image as ImageIcon, Link as LinkIcon, X, Check, Loader2 } from 'lucide-react';
import { compressImageFile } from '../lib/imageUpload';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  maxDimension?: number;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = '',
  onChange,
  label = 'Photo / Image Attachment',
  placeholder = 'Select from gallery, take photo, or paste image URL',
  compact = false,
  maxDimension = 1000,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await processFile(file);
    // Reset file input value so user can select the same file again if desired
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const compressedDataUrl = await compressImageFile(file, maxDimension);
      onChange(compressedDataUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setErrorMsg(err.message || 'Failed to process image file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyUrl = () => {
    if (urlInputValue.trim()) {
      onChange(urlInputValue.trim());
      setShowUrlInput(false);
      setUrlInputValue('');
    }
  };

  const handleRemove = () => {
    onChange('');
    setErrorMsg(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            {label}
          </label>
          {value && (
            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Image Uploaded
            </span>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Active Image Preview */}
      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-brand-green/30 bg-[#12181E] p-2 flex items-center gap-3">
          <img
            src={value}
            alt="Uploaded Preview"
            className={`${compact ? 'w-14 h-14' : 'w-24 h-24'} rounded-xl object-cover border border-white/10 shrink-0 bg-black/40`}
          />
          <div className="flex-1 min-w-0 pr-8">
            <span className="text-[10px] font-bold text-white block truncate uppercase">Image Preview</span>
            <span className="text-[9px] font-mono text-gray-400 block truncate">
              {value.startsWith('data:') ? 'Optimized JPEG Data' : value}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[9px] font-bold text-brand-green hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Change Photo
              </button>
              <span className="text-gray-600">•</span>
              <button
                type="button"
                onClick={handleRemove}
                className="text-[9px] font-bold text-rose-400 hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Remove
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer border-none"
            title="Remove Image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : showUrlInput ? (
        /* URL Input Mode */
        <div className="flex items-center gap-2 bg-[#12181E] p-2 rounded-2xl border border-brand-green/30">
          <input
            type="url"
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            placeholder="Paste image URL (https://...)"
            className="flex-1 bg-transparent px-2 text-xs text-white placeholder-gray-500 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-1.5 bg-brand-green text-brand-charcoal text-[10px] font-black uppercase rounded-xl hover:bg-brand-green/90 transition-all cursor-pointer border-none"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="p-1.5 text-gray-400 hover:text-white cursor-pointer border-none bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Choose Photo Options */
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
              await processFile(files[0]);
            }
          }}
          className={`bg-[#141A22] border-2 border-dashed border-brand-green/20 hover:border-brand-green/40 rounded-2xl ${compact ? 'p-3' : 'p-4'} text-center transition-all cursor-pointer`}
          onClick={(e) => {
            // If clicking the background area, trigger file upload
            if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
              fileInputRef.current?.click();
            }
          }}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <Loader2 className="w-6 h-6 text-brand-green animate-spin" />
              <span className="text-xs font-bold text-brand-green">Compressing & Preparing Photo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-brand-green">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xs text-white font-bold">Click to choose image or drag & drop photo here</p>
              <p className="text-[10px] text-gray-400 font-medium">JPEG, PNG, WEBP supported • Auto-compressed</p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {/* Upload from Gallery Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 bg-brand-green text-brand-charcoal font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:brightness-110"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[3]" /> Browse Files
                </button>

                {/* Snap with Camera Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="px-3 py-2 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange border border-brand-orange/40 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Take Photo
                </button>

                {/* Paste URL Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUrlInput(true);
                  }}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Or Paste URL
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-[10px] text-rose-400 font-mono mt-1">{errorMsg}</p>
      )}
    </div>
  );
};
