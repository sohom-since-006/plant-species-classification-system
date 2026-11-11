import { useState, useRef, useEffect } from 'react';

export type HeatmapViewProps = {
  originalImageUrl: string;
  camData: Float32Array | null;
  gridSize?: number;
};

/**
 * Maps a normalized float (0-1) to an RGB color using a Jet/Turbo style colormap:
 * 0.0 -> Blue, 0.35 -> Cyan, 0.65 -> Yellow/Orange, 1.0 -> Red
 */
function valueToRgb(val: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, val));
  let r = 0;
  let g = 0;
  let b = 0;

  if (v < 0.25) {
    r = 0;
    g = Math.round(v * 4 * 255);
    b = 255;
  } else if (v < 0.5) {
    r = 0;
    g = 255;
    b = Math.round((1 - (v - 0.25) * 4) * 255);
  } else if (v < 0.75) {
    r = Math.round((v - 0.5) * 4 * 255);
    g = 255;
    b = 0;
  } else {
    r = 255;
    g = Math.round((1 - (v - 0.75) * 4) * 255);
    b = 0;
  }
  return [r, g, b];
}

export function HeatmapView({
  originalImageUrl,
  camData,
  gridSize = 7,
}: HeatmapViewProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [opacity, setOpacity] = useState(0.65);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Preload original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalImageUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, [originalImageUrl]);

  // Render heatmap overlay on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 400;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Draw base image
    ctx.drawImage(img, 0, 0, width, height);

    if (!isEnabled || !camData || camData.length === 0 || opacity <= 0) return;

    // Create an offscreen low-res canvas for the 7x7 grid
    const offscreen = document.createElement('canvas');
    offscreen.width = gridSize;
    offscreen.height = gridSize;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(gridSize, gridSize);
    for (let i = 0; i < camData.length; i++) {
      const val = camData[i] ?? 0;
      const [r, g, b] = valueToRgb(val);
      const idx = i * 4;
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      // Alpha based on activation level
      imgData.data[idx + 3] = Math.round(val * 240);
    }
    offCtx.putImageData(imgData, 0, 0);

    // Render offscreen canvas smoothly scaled onto main canvas
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, width, height);
    ctx.restore();
  }, [camData, opacity, imageLoaded, gridSize, isEnabled]);

  return (
    <div className="space-y-6 w-full">
      {/* Intro Description */}
      <div className="text-xs text-white/70 leading-relaxed font-body">
        The <strong>Attention Heatmap (CAM)</strong> visualizes which leaf veins, petal structures,
        or morphological features the neural network weighted highest when generating the
        prediction.
      </div>

      {/* Side-by-side / Interactive display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {/* Original photo */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-white/60">
            <span>Original Specimen</span>
            <span>Raw Input</span>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden liquid-glass border border-white/10 bg-black/40 shadow-lg">
            <img
              src={originalImageUrl}
              alt="Original plant photograph"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Heatmap overlay */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-[var(--accent)]">
            <span>Class Activation Map (CAM)</span>
            <span>{Math.round(opacity * 100)}% Overlay</span>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden liquid-glass border border-white/15 bg-black/40 shadow-lg">
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            {!camData && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 text-center text-xs text-white/60 font-body">
                Heatmap activation unavailable for this specimen class.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opacity Slider & Toggle Controls */}
      <div className="liquid-glass rounded-2xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between text-xs font-body pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white/90">Attention Overlay</span>
            <span className="text-[10px] text-white/50 font-mono">
              ({isEnabled ? 'Enabled' : 'Disabled'})
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={() => setIsEnabled((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isEnabled ? 'bg-[var(--accent)]' : 'bg-white/20'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-body">
            <label htmlFor="heatmap-opacity" className="font-medium text-white/90">
              Heatmap Overlay Opacity
            </label>
            <span className="font-mono text-[var(--accent)]">
              {isEnabled ? `${Math.round(opacity * 100)}%` : '0%'}
            </span>
          </div>
          <input
            id="heatmap-opacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            disabled={!isEnabled}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full accent-[var(--accent)] bg-white/10 h-1.5 rounded-full cursor-pointer disabled:opacity-40"
            aria-label="Heatmap opacity slider"
          />
        </div>

        {/* Color Legend */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-white/60">
            <span>Low Relevance</span>
            <span>Neutral</span>
            <span>High Salience</span>
          </div>
          <div className="h-2 rounded-full w-full bg-gradient-to-r from-blue-500 via-emerald-400 to-red-500 shadow-inner" />
          <p className="text-[10px] text-white/50 text-center font-light pt-1">
            Red/Yellow zones highlight the primary leaf margin or petal edges that determined the class.
          </p>
        </div>
      </div>
    </div>
  );
}
