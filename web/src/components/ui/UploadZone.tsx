import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload } from '@/components/icons';

export type UploadZoneProps = {
  onFileSelect?: (file: File) => void;
  className?: string;
  accept?: string;
};

export function UploadZone({
  onFileSelect,
  className = '',
  accept = 'image/jpeg,image/png,image/webp',
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
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
      className={`liquid-glass rounded-[1.25rem] border-2 border-dashed ${
        isDragging ? 'border-[var(--accent)] bg-emerald-500/10' : 'border-[var(--glass-edge-mid)]'
      } hover:border-[var(--accent)] p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-label="Upload plant photo"
      />
      <div className="liquid-glass h-12 w-12 rounded-full flex items-center justify-center text-[var(--fg-muted)]">
        <Upload className="w-6 h-6" aria-hidden="true" />
      </div>
      <div>
        <p className="font-body text-sm font-medium text-[var(--fg)]">
          Drop a photo or click to browse
        </p>
        <p className="font-body text-xs text-[var(--fg-subtle)] mt-1">
          JPG, PNG or WEBP up to 10 MB
        </p>
      </div>
    </div>
  );
}
