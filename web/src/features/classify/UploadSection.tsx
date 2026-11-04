import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload, Camera, Leaf } from '@/components/icons';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface SampleImage {
  name: string;
  common: string;
  url: string;
  fixtureIndex?: number;
}

export type UploadSectionProps = {
  onFileSelect: (file: File) => void;
  onCameraClick: () => void;
  onSampleSelect: (sample: SampleImage) => void;
  sampleImages: SampleImage[];
};

export function UploadSection({
  onFileSelect,
  onCameraClick,
  onSampleSelect,
  sampleImages,
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndProceed = (file: File) => {
    setValidationError(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError(
        'Unsupported image format. Please upload a JPG, PNG, or WEBP photograph.',
      );
      return;
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setValidationError(
        `Image is too large (${sizeMb} MB). Maximum client-side file size is 10 MB.`,
      );
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndProceed(file);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProceed(file);
    }
    // Reset so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-8 w-full">
      {/* Validation error notification */}
      {validationError && (
        <div
          className="liquid-glass rounded-2xl p-4 border border-rose-500/30 bg-rose-950/20 text-rose-200 text-xs flex items-center justify-between gap-3 animate-shake"
          role="alert"
        >
          <span>⚠️ {validationError}</span>
          <button
            onClick={() => setValidationError(null)}
            className="text-xs font-mono underline hover:text-white"
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`liquid-glass rounded-3xl border-2 border-dashed p-10 md:p-14 text-center flex flex-col items-center justify-center gap-4 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group ${
          isDragging
            ? 'border-[var(--accent)] bg-emerald-500/10 scale-[1.01]'
            : 'border-white/15 hover:border-[var(--accent)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload plant image"
        />

        <div className="liquid-glass h-16 w-16 rounded-full flex items-center justify-center text-[var(--accent)] border border-white/10 group-hover:scale-110 transition-transform">
          <Upload className="w-7 h-7" />
        </div>

        <div>
          <p className="font-heading italic text-2xl text-white">
            Drop a plant photo here or browse
          </p>
          <p className="font-body text-xs text-white/60 mt-1.5">
            JPG, PNG or WEBP &middot; Up to 10 MB per image
          </p>
        </div>

        {/* Quick action divider / or use camera */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] font-mono uppercase text-white/40">or</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCameraClick();
            }}
            className="liquid-glass px-4 py-2 rounded-full text-xs font-medium text-white hover:text-[var(--accent)] flex items-center gap-2 border border-white/15 transition-all hover:scale-105"
          >
            <Camera className="w-4 h-4 text-[var(--accent)]" />
            <span>Open Live Camera</span>
          </button>
        </div>
      </div>

      {/* Sample Images row for quick demonstration */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Leaf className="w-4 h-4 text-[var(--accent)]" />
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
            Or test with a sample specimen:
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {sampleImages.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => onSampleSelect(sample)}
              className="group liquid-glass rounded-2xl p-3 text-left transition-all hover:scale-[1.02] hover:border-[var(--accent)] border border-white/10"
            >
              <div className="w-full h-24 rounded-xl overflow-hidden mb-2.5 bg-black/40">
                <img
                  src={sample.url}
                  alt={sample.common}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="text-xs font-medium text-[var(--fg)] truncate">{sample.common}</p>
              <p className="text-[11px] font-heading italic text-[var(--fg-muted)] truncate">
                {sample.name}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
