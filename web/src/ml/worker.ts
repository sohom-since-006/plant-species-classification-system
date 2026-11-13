import * as ort from 'onnxruntime-web';
import { loadModelBundle, configureOrtEnvironment, type ModelBundle } from './session';
import { preprocessRawData, type RawImageData } from './preprocess';
import { computeCalibratedProbabilities } from './postprocess';
import { computeCAM } from './cam';
import { fuseMultiPhotoInference, type SingleImageInference } from './fuse';
import type { PipelineStage } from '@/types/prediction';

export type WorkerInMessage =
  | { type: 'init'; baseUrl?: string }
  | {
      type: 'classify';
      id: string;
      photos: RawImageData[];
    }
  | { type: 'cancel'; id?: string };

export type WorkerOutMessage =
  | { type: 'init-progress'; progress: number; message: string; stage: string }
  | { type: 'init-done'; version: string; backend: string }
  | { type: 'init-error'; error: string }
  | {
      type: 'stage';
      id: string;
      stage: PipelineStage;
      progress: number;
      label: string;
      photoIndex: number;
      totalPhotos: number;
    }
  | { type: 'result'; id: string; result: unknown }
  | { type: 'error'; id: string; error: string };

let bundle: ModelBundle | null = null;
let activeRequestId: string | null = null;

// Ensure ort environment is initialized with single-threaded WASM and local wasm paths
configureOrtEnvironment();

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      bundle = await loadModelBundle(msg.baseUrl || '/models', (event) => {
        self.postMessage({
          type: 'init-progress',
          progress: event.progress,
          message: event.message,
          stage: event.stage,
        });
      });

      self.postMessage({
        type: 'init-done',
        version: bundle.meta.version,
        backend: bundle.backend,
      });
    } catch (err) {
      self.postMessage({
        type: 'init-error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (msg.type === 'cancel') {
    if (!msg.id || msg.id === activeRequestId) {
      activeRequestId = null;
    }
    return;
  }

  if (msg.type === 'classify') {
    const { id, photos } = msg;
    activeRequestId = id;

    try {
      if (!bundle) {
        bundle = await loadModelBundle('/models');
      }

      if (photos.length === 0) {
        throw new Error('No photos provided for classification.');
      }

      const totalPhotos = photos.length;
      const singleInferences: SingleImageInference[] = [];

      for (let pIdx = 0; pIdx < totalPhotos; pIdx++) {
        // Check if request was cancelled or superseded
        if (activeRequestId !== id) {
          return;
        }

        const raw = photos[pIdx]!;

        // Stage 1: Preprocess
        self.postMessage({
          type: 'stage',
          id,
          stage: 'preprocess',
          progress: (pIdx + 0.2) / totalPhotos,
          label: 'Reading image',
          photoIndex: pIdx,
          totalPhotos,
        });

        const tensorData = preprocessRawData(raw);

        if (activeRequestId !== id) return;

        // Stage 2: Inference
        self.postMessage({
          type: 'stage',
          id,
          stage: 'inference',
          progress: (pIdx + 0.5) / totalPhotos,
          label: 'Matching species',
          photoIndex: pIdx,
          totalPhotos,
        });

        const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, 224, 224]);
        const outputs = await bundle.session.run({ input: inputTensor });

        if (activeRequestId !== id) return;

        const logits = outputs.logits?.data as Float32Array;
        const embedding = outputs.embedding?.data as Float32Array;
        const features = outputs.features?.data as Float32Array;

        if (!logits || !embedding) {
          throw new Error('Model inference returned incomplete output tensors.');
        }

        // Calibrated probabilities
        const probs = computeCalibratedProbabilities(logits, bundle.meta.temperature);

        // Find top-1 predicted class index for CAM
        let top1Idx = 0;
        let top1Prob = -Infinity;
        for (let i = 0; i < probs.length; i++) {
          if ((probs[i] ?? 0) > top1Prob) {
            top1Prob = probs[i] ?? 0;
            top1Idx = i;
          }
        }

        // Stage 3: Class Activation Map
        self.postMessage({
          type: 'stage',
          id,
          stage: 'cam',
          progress: (pIdx + 0.85) / totalPhotos,
          label: 'Building heatmap',
          photoIndex: pIdx,
          totalPhotos,
        });

        let camData: Float32Array | null = null;
        if (features && bundle.camWeights) {
          camData = computeCAM(features, bundle.camWeights, top1Idx);
        }

        singleInferences.push({
          probs,
          embedding,
          camData,
        });
      }

      if (activeRequestId !== id) return;

      // Stage 4: Fusion & Postprocessing
      self.postMessage({
        type: 'stage',
        id,
        stage: 'postprocess',
        progress: 0.95,
        label: 'Calibrating confidence',
        photoIndex: totalPhotos - 1,
        totalPhotos,
      });

      const classificationResult = fuseMultiPhotoInference(singleInferences, {
        threshold: bundle.meta.threshold,
        tau: bundle.meta.tau,
        tierBoundaries: bundle.meta.tierBoundaries,
        mlWeight: bundle.meta.mlWeight,
        visualWeight: bundle.meta.visualWeight,
        genusBonus: bundle.meta.genusBonus,
        genusList: bundle.genusList,
        centroids: bundle.centroids,
        modelVersion: bundle.meta.version,
      });

      if (activeRequestId !== id) return;

      self.postMessage({
        type: 'result',
        id,
        result: classificationResult,
      });
    } catch (err) {
      if (activeRequestId === id) {
        self.postMessage({
          type: 'error',
          id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
};
