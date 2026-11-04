import { X, Camera, Upload } from '@/components/icons';

export interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
}

export type MultiPhotoTrayProps = {
  photos: PhotoItem[];
  onRemovePhoto: (id: string) => void;
  onAddClick: () => void;
  onCameraClick: () => void;
  maxPhotos?: number;
};

export function MultiPhotoTray({
  photos,
  onRemovePhoto,
  onAddClick,
  onCameraClick,
  maxPhotos = 3,
}: MultiPhotoTrayProps) {
  const count = photos.length;

  return (
    <div className="w-full space-y-4">
      {/* Grid of uploaded images */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-2xl overflow-hidden liquid-glass border border-white/15 group shadow-lg"
          >
            <img
              src={photo.previewUrl}
              alt={`Specimen angle ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Tag badge */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90 border border-white/10">
              Angle {index + 1}
            </div>
            {/* Remove button */}
            <button
              onClick={() => onRemovePhoto(photo.id)}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-600/90 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105"
              aria-label={`Remove photo ${index + 1}`}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Add more slot if < maxPhotos */}
        {count < maxPhotos && (
          <div className="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-[var(--accent)] liquid-glass flex flex-col items-center justify-center p-4 text-center transition-all">
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)] mb-3">
              Add Angle ({count}/{maxPhotos})
            </p>
            <div className="flex gap-2">
              <button
                onClick={onAddClick}
                className="liquid-glass px-3 py-1.5 rounded-xl text-xs font-medium text-white hover:text-[var(--accent)] flex items-center gap-1.5 transition-colors border border-white/10"
                type="button"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
              <button
                onClick={onCameraClick}
                className="liquid-glass px-3 py-1.5 rounded-xl text-xs font-medium text-white hover:text-[var(--accent)] flex items-center gap-1.5 transition-colors border border-white/10"
                type="button"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera</span>
              </button>
            </div>
            <p className="text-[10px] text-white/50 font-light mt-2 max-w-[18ch]">
              Leaf, flower or bark close-up
            </p>
          </div>
        )}
      </div>

      {/* Multi-photo notice */}
      {count > 1 && (
        <div className="liquid-glass rounded-xl px-4 py-2 text-xs font-body text-[var(--accent)] flex items-center gap-2 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>
            Combined from {count} photos — visual embeddings & probabilities will be fused for higher precision.
          </span>
        </div>
      )}
    </div>
  );
}
