import type { ClassificationResult, PipelineStage, PipelineStageEvent } from '@/types/prediction';
import { getMockResult, hashString } from '@/ml/mock';

export type { PipelineStage, PipelineStageEvent };

export const STAGE_LABELS: Record<PipelineStage, string> = {
  preprocess: 'Reading image',
  inference: 'Matching species',
  postprocess: 'Calibrating confidence',
  similar: 'Finding look-alikes',
  cam: 'Building heatmap',
};

/**
 * Generates 6 deterministic mock detection points distributed organically over the specimen leaf/flower.
 *
 * TODO(Phase 4): In Phase 4, replace these deterministic mock points with the real
 * Class Activation Map (CAM) peak coordinate locations extracted from the PyTorch/ONNX
 * model's final convolutional layer.
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

export interface PipelineRunnerOptions {
  signal?: AbortSignal;
  forcedFixture?: number;
  minDisplayTimeMs?: number;
  simulateError?: boolean;
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
 * Runs the on-device classification pipeline through real stages:
 * preprocess -> inference -> postprocess -> similar -> cam
 *
 * Dispatches stage events via onStage callback.
 * Enforces a minimum total display time (default 1600 ms) for visual readability,
 * without adding delay if raw inference execution takes longer.
 *
 * NOTE (Phase 4): In Phase 4, the inference stage delegates tensor calculations
 * to the ONNX WebAssembly/WebGL Web Worker (ml/worker.ts).
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

  // Stages breakdown per photo
  const stages: { stage: PipelineStage; label: string; progressWeight: number }[] = [
    { stage: 'preprocess', label: 'Reading image', progressWeight: 0.20 },
    { stage: 'inference', label: 'Detecting structure', progressWeight: 0.35 },
    { stage: 'inference', label: 'Matching species', progressWeight: 0.55 },
    { stage: 'postprocess', label: 'Calibrating confidence', progressWeight: 0.70 },
    { stage: 'similar', label: 'Finding look-alikes', progressWeight: 0.85 },
    { stage: 'cam', label: 'Building heatmap', progressWeight: 1.0 },
  ];

  // Stage duration per photo based on minimum display budget
  const perPhotoBudget = Math.max(minDisplayTimeMs / totalPhotos, 300);
  const perStepDuration = perPhotoBudget / stages.length;

  for (let pIndex = 0; pIndex < totalPhotos; pIndex++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    for (const step of stages) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // Calculate cumulative progress across all photos
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

      // Advance step with minimum visual pacing
      await sleep(perStepDuration, signal);

      if (simulateError && pIndex === 0 && step.stage === 'inference') {
        throw new Error('Simulated hardware acceleration failure. WebGL context lost.');
      }
    }
  }

  // Obtain final classification result (mock now, real worker in Phase 4)
  const primaryInput = photos[0]!;
  const result = getMockResult(primaryInput, forcedFixture);

  // Guarantee minimum total display time without adding delay if execution exceeded budget
  const elapsed = performance.now() - startTime;
  if (elapsed < minDisplayTimeMs) {
    await sleep(minDisplayTimeMs - elapsed, signal);
  }

  // Final 100% completion event
  onStage({
    stage: 'cam',
    progress: 1.0,
    label: 'Analysis complete',
    photoIndex: totalPhotos - 1,
    totalPhotos,
  });

  return result;
}
