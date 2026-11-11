import type { ClassificationResult, Prediction } from '@/types/prediction';
import { determineTier } from './postprocess';
import { computeSimilar, computeCosineSimilarity } from './similar';

export interface SingleImageInference {
  probs: Float32Array;
  embedding: Float32Array;
  camData?: Float32Array | null;
}

export interface FusionOptions {
  threshold?: number;
  tau?: number;
  mlWeight?: number;
  visualWeight?: number;
  genusBonus?: number;
  genusList?: Record<number, string>;
  centroids?: Record<string, number[]>;
  modelVersion?: string;
}

/**
 * Fuses predictions from multiple images (up to 3) per TRD Section 8:
 * - Averages the calibrated probabilities and embeddings with equal weights.
 * - L2-normalizes the fused embedding.
 * - Computes similar species matches and applies rejection & tier evaluation.
 */
export function fuseMultiPhotoInference(
  inferences: SingleImageInference[],
  options?: FusionOptions,
): ClassificationResult {
  if (inferences.length === 0) {
    return {
      top3: [],
      tier: 'unknown',
      unknown: true,
      similar: [],
      camData: null,
      modelVersion: options?.modelVersion ?? '1.0.0',
      genusFallback: null,
    };
  }

  if (inferences.length === 1) {
    const single = inferences[0]!;
    return buildResultFromProbsAndEmbedding(single.probs, single.embedding, single.camData, options);
  }

  const numPhotos = Math.min(inferences.length, 3);
  const numClasses = inferences[0]!.probs.length;
  const embeddingDim = inferences[0]!.embedding.length;

  const avgProbs = new Float32Array(numClasses);
  const avgEmbedding = new Float32Array(embeddingDim);

  for (let p = 0; p < numPhotos; p++) {
    const inf = inferences[p]!;
    for (let c = 0; c < numClasses; c++) {
      avgProbs[c] = (avgProbs[c] ?? 0) + (inf.probs[c] ?? 0) / numPhotos;
    }
    for (let d = 0; d < embeddingDim; d++) {
      avgEmbedding[d] = (avgEmbedding[d] ?? 0) + (inf.embedding[d] ?? 0) / numPhotos;
    }
  }

  // L2-normalize fused embedding
  let normSq = 0;
  for (let d = 0; d < embeddingDim; d++) {
    normSq += (avgEmbedding[d] ?? 0) * (avgEmbedding[d] ?? 0);
  }
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let d = 0; d < embeddingDim; d++) {
      avgEmbedding[d] = (avgEmbedding[d] ?? 0) / norm;
    }
  }

  // Use primary photo's CAM for attention view
  const primaryCam = inferences[0]!.camData ?? null;

  return buildResultFromProbsAndEmbedding(avgProbs, avgEmbedding, primaryCam, options);
}

function buildResultFromProbsAndEmbedding(
  probs: Float32Array,
  embedding: Float32Array,
  camData: Float32Array | null | undefined,
  options?: FusionOptions,
): ClassificationResult {
  const indexed = Array.from(probs).map((prob, speciesId) => ({ speciesId, prob }));
  indexed.sort((a, b) => b.prob - a.prob);
  const top3: Prediction[] = indexed.slice(0, 3);

  const top1Prob = top3[0]?.prob ?? 0;
  const top1Id = top3[0]?.speciesId ?? 0;

  const threshold = options?.threshold ?? 0.57;
  const tau = options?.tau ?? 0.31;
  const centroids = options?.centroids ?? {};

  // Compute cosine similarity to predicted class centroid
  let maxCosine = 0;
  const predictedCentroid = centroids[String(top1Id)];
  if (predictedCentroid) {
    maxCosine = computeCosineSimilarity(embedding, predictedCentroid);
  } else {
    maxCosine = 1.0;
  }

  // Rejection rule
  const isUnknown = top1Prob < threshold || maxCosine < tau;
  const tier = determineTier(top1Prob, isUnknown);

  // Similar species calculation
  const similarMatches = computeSimilar(
    probs,
    embedding,
    centroids,
    top1Id,
    {
      mlWeight: options?.mlWeight ?? 0.6,
      visualWeight: options?.visualWeight ?? 0.4,
      genusBonus: options?.genusBonus ?? 0.05,
      genusList: options?.genusList ?? {},
      topK: 4,
      excludeTop1: true,
    },
  );

  // Genus fallback: if top-1 < 0.60, not unknown, and top 3 share genus
  let genusFallback: string | null = null;
  const genusList = options?.genusList;
  if (!isUnknown && top1Prob < 0.60 && genusList) {
    const g0 = genusList[top3[0]?.speciesId ?? -1];
    const g1 = genusList[top3[1]?.speciesId ?? -1];
    const g2 = genusList[top3[2]?.speciesId ?? -1];
    if (g0 && g0 === g1 && g0 === g2) {
      genusFallback = g0;
    }
  }

  return {
    top3,
    tier,
    unknown: isUnknown,
    similar: similarMatches,
    camData: camData ?? null,
    modelVersion: options?.modelVersion ?? '1.0.0',
    genusFallback,
  };
}
