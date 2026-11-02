import { Upload } from '@/components/icons';

export type UploadZoneProps = {
  onFileSelect?: (file: File) => void;
  className?: string;
};

export function UploadZone({ onFileSelect: _onFileSelect, className = '' }: UploadZoneProps) {
  return (
    <div
      className={`liquid-glass rounded-[1.25rem] border-2 border-dashed border-[var(--glass-edge-mid)] hover:border-[var(--accent)] p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${className}`}
    >
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

