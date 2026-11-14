import type { ClassificationResult, PipelineStage, PipelineStageEvent } from '@/types/prediction';
import { getMockResult, hashString, isMockMode } from '@/ml/mock';
import type { RawImageData } from '@/ml/preprocess';
import { applyOrientationTransform, getExifOrientation, getTransformedDimensions } from '@/ml/exif';
import type { WorkerInMessage, WorkerOutMessage } from '@/ml/worker';

export type { PipelineStage, PipelineStageEvent };

export const STAGE_LABELS: Record<PipelineStage, string> = {
  preprocess: 'Reading image',
  inference: 'Matching species',
  postprocess: 'Calibrating confidence',
  similar: 'Finding look-alikes',
  cam: 'Building heatmap',
};

export interface PipelineRunnerOptions {
  signal?: AbortSignal;
  forcedFixture?: number;
  minDisplayTimeMs?: number;
  simulateError?: boolean;
}

export type ModelWorkerState = 'unloaded' | 'loading' | 'ready' | 'error';

let globalWorker: Worker | null = null;
let workerState: ModelWorkerState = 'unloaded';
let workerLoadingProgress = 0;
let workerLoadingMessage = '';
let workerError: string | null = null;
let activeJobId = 0;

/**
 * Extracts raw pixel data from File, Blob, or URL in browser main thread.
 * Handles EXIF orientation, huge images (>2048px downscaling with high-quality smoothing), and transparent PNGs.
 */
export async function extractRawImageData(photo: File | Blob | string): Promise<RawImageData> {
  let blob: Blob;
  if (typeof photo === 'string') {
    const res = await fetch(photo);
    blob = await res.blob();
  } else {
    blob = photo;
  }

  let imgSource: ImageBitmap | HTMLImageElement;
  let orientation = 1;

  if (typeof createImageBitmap !== 'undefined') {
    try {
      imgSource = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      try {
        const arrayBuf = await blob.arrayBuffer();
        orientation = getExifOrientation(arrayBuf);
      } catch {
        orientation = 1;
      }
      imgSource = await loadHtmlImage(blob);
    }
  } else {
    try {
      const arrayBuf = await blob.arrayBuffer();
      orientation = getExifOrientation(arrayBuf);
    } catch {
      orientation = 1;
    }
    imgSource = await loadHtmlImage(blob);
  }

  const rawW = imgSource.width;
  const rawH = imgSource.height;
  const { width, height } = getTransformedDimensions(rawW, rawH, orientation);

  // Downscale giant images with aspect ratio preserved
  let targetW = width;
  let targetH = height;
  const maxDim = 2048;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      targetW = maxDim;
      targetH = Math.round((maxDim * height) / width);
    } else {
      targetH = maxDim;
      targetW = Math.round((maxDim * width) / height);
    }
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetW, targetH);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
  } else {
    throw new Error('Canvas rendering is not supported in this runtime environment.');
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context.');
  }

  // Ensure high-quality antialiasing when downscaling large photos
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Composite over white for transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  if (orientation > 1) {
    ctx.save();
    const scaleFactorW = targetW / width;
    const scaleFactorH = targetH / height;
    ctx.scale(scaleFactorW, scaleFactorH);
    applyOrientationTransform(ctx, orientation, rawW, rawH);
    ctx.drawImage(imgSource as CanvasImageSource, 0, 0, rawW, rawH);
    ctx.restore();
  } else {
    ctx.drawImage(imgSource as CanvasImageSource, 0, 0, targetW, targetH);
  }

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  return {
    data: new Uint8Array(imgData.data.buffer),
    width: targetW,
    height: targetH,
    channels: 4,
  };
}

function loadHtmlImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image from blob.'));
    };
    img.src = url;
  });
}

/**
 * Lazily creates and initializes the ML Web Worker singleton.
 */
export function getOrCreateWorker(
  onProgress?: (progress: number, message: string) => void,
): Worker {
  if (globalWorker) {
    return globalWorker;
  }

  // Vite module worker instantiation
  globalWorker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });

  workerState = 'loading';
  workerLoadingProgress = 0.05;
  workerLoadingMessage = 'Spawning inference worker...';
  workerError = null;

  globalWorker.addEventListener('message', (e: MessageEvent<WorkerOutMessage>) => {
    const msg = e.data;
    if (msg.type === 'init-progress') {
      workerState = 'loading';
      workerLoadingProgress = msg.progress;
      workerLoadingMessage = msg.message;
      onProgress?.(msg.progress, msg.message);
    } else if (msg.type === 'init-done') {
      workerState = 'ready';
      workerLoadingProgress = 1.0;
      workerLoadingMessage = 'Neural model ready';
    } else if (msg.type === 'init-error') {
      workerState = 'error';
      workerError = msg.error;
    }
  });

  const initMsg: WorkerInMessage = { type: 'init', baseUrl: '/models' };
  globalWorker.postMessage(initMsg);

  return globalWorker;
}

export function getWorkerState(): {
  state: ModelWorkerState;
  progress: number;
  message: string;
  error: string | null;
} {
  return {
    state: workerState,
    progress: workerLoadingProgress,
    message: workerLoadingMessage,
    error: workerError,
  };
}

/**
 * Abortable sleep helper that cancels immediately when signal fires.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    if (ms <= 0) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort);
  });
}

/**
 * Runs the on-device classification pipeline.
 * - In mock mode (`VITE_MOCK_ML=true`): uses mock pipeline.
 * - In real mode: delegates off-main-thread inference to the Web Worker.
 * - Strictly respects AbortSignal to cancel stale runs when the user changes photo.
 */
export async function runClassificationPipeline(
  photos: (File | Blob | string)[],
  onStage: (event: PipelineStageEvent) => void,
  options: PipelineRunnerOptions = {},
): Promise<ClassificationResult> {
  const {
    signal,
    forcedFixture,
    minDisplayTimeMs = 1600,
    simulateError = false,
  } = options;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  if (photos.length === 0) {
    throw new Error('No photos provided for classification.');
  }

  const startTime = performance.now();
  const totalPhotos = photos.length;

  // Fallback to mock mode if explicitly requested, forced fixture provided, or Web Worker unavailable
  if (isMockMode || forcedFixture !== undefined || typeof Worker === 'undefined') {
    const stages: { stage: PipelineStage; label: string; progressWeight: number }[] = [
      { stage: 'preprocess', label: 'Reading image', progressWeight: 0.20 },
      { stage: 'inference', label: 'Detecting structure', progressWeight: 0.35 },
      { stage: 'inference', label: 'Matching species', progressWeight: 0.55 },
      { stage: 'postprocess', label: 'Calibrating confidence', progressWeight: 0.70 },
      { stage: 'similar', label: 'Finding look-alikes', progressWeight: 0.85 },
      { stage: 'cam', label: 'Building heatmap', progressWeight: 1.0 },
    ];

    const perPhotoBudget = Math.max(minDisplayTimeMs / totalPhotos, 300);
    const perStepDuration = perPhotoBudget / stages.length;

    for (let pIndex = 0; pIndex < totalPhotos; pIndex++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      for (const step of stages) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

        const photoBaseProgress = pIndex / totalPhotos;
        const stepContribution = step.progressWeight / totalPhotos;
        const totalProgress = Math.min(1.0, photoBaseProgress + stepContribution);

        onStage({
          stage: step.stage,
          progress: totalProgress,
          label: step.label,
          photoIndex: pIndex,
          totalPhotos,
        });

        await sleep(perStepDuration, signal);

        if (simulateError && pIndex === 0 && step.stage === 'inference') {
          throw new Error('Simulated hardware acceleration failure. WebGL context lost.');
        }
      }
    }

    const primaryInput = photos[0]!;
    const result = getMockResult(primaryInput, forcedFixture);

    const elapsed = performance.now() - startTime;
    if (elapsed < minDisplayTimeMs) {
      await sleep(minDisplayTimeMs - elapsed, signal);
    }

    onStage({
      stage: 'cam',
      progress: 1.0,
      label: 'Analysis complete',
      photoIndex: totalPhotos - 1,
      totalPhotos,
    });

    return result;
  }

  // Real ONNX Web Worker Pipeline
  const jobId = `job_${++activeJobId}_${Date.now()}`;
  const worker = getOrCreateWorker();

  // Cancel any stale job if user uploaded another image
  const abortHandler = () => {
    worker.postMessage({ type: 'cancel', id: jobId });
  };
  signal?.addEventListener('abort', abortHandler);

  try {
    // 1. Stage: preprocess images on main thread
    onStage({
      stage: 'preprocess',
      progress: 0.1,
      label: 'Reading image',
      photoIndex: 0,
      totalPhotos,
    });

    const rawPhotos: RawImageData[] = [];
    const transferBuffers: ArrayBuffer[] = [];
    for (let pIdx = 0; pIdx < totalPhotos; pIdx++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const raw = await extractRawImageData(photos[pIdx]!);
      rawPhotos.push(raw);
      transferBuffers.push(raw.data.buffer as ArrayBuffer);
    }

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // 2. Dispatch classify request to worker and wait for result
    const workerResult = await new Promise<ClassificationResult>((resolve, reject) => {
      const messageHandler = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data;
        if ('id' in msg && msg.id !== jobId) {
          return;
        }

        if (msg.type === 'stage') {
          onStage({
            stage: msg.stage,
            progress: msg.progress,
            label: msg.label,
            photoIndex: msg.photoIndex,
            totalPhotos: msg.totalPhotos,
          });
        } else if (msg.type === 'result') {
          cleanup();
          resolve(msg.result as ClassificationResult);
        } else if (msg.type === 'error') {
          cleanup();
          reject(new Error(msg.error));
        }
      };

      const cleanup = () => {
        worker.removeEventListener('message', messageHandler);
        signal?.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal?.addEventListener('abort', onAbort);
      worker.addEventListener('message', messageHandler);

      const classifyMsg: WorkerInMessage = {
        type: 'classify',
        id: jobId,
        photos: rawPhotos,
      };

      worker.postMessage(classifyMsg, transferBuffers);
    });

    // Ensure minimum display time budget so animations never flash
    const elapsed = performance.now() - startTime;
    if (elapsed < minDisplayTimeMs) {
      await sleep(minDisplayTimeMs - elapsed, signal);
    }

    onStage({
      stage: 'cam',
      progress: 1.0,
      label: 'Analysis complete',
      photoIndex: totalPhotos - 1,
      totalPhotos,
    });

    return workerResult;
  } finally {
    signal?.removeEventListener('abort', abortHandler);
  }
}

/**
 * Deterministic detection keypoints for ScanOverlay.
 */
export function getDeterministicDetectionPoints(seed: number | string): Array<{ x: number; y: number }> {
  const hash = typeof seed === 'number' ? seed : hashString(String(seed));
  const baseOffsets = [
    { dx: -18, dy: -20 },
    { dx: 16, dy: -22 },
    { dx: -10, dy: 4 },
    { dx: 22, dy: 10 },
    { dx: -6, dy: 24 },
    { dx: 18, dy: 28 },
  ];

  return baseOffsets.map((base, idx) => {
    const jitterX = ((hash >> (idx * 4)) & 0xf) - 7.5;
    const jitterY = (((hash >> (idx * 4 + 2)) ^ 0x7) & 0xf) - 7.5;
    return {
      x: Math.min(82, Math.max(18, 50 + base.dx + jitterX)),
      y: Math.min(82, Math.max(18, 50 + base.dy + jitterY)),
    };
  });
}
