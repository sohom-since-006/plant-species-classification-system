import type { Tier, ClassificationResult, Prediction, SimilarMatch } from '@/types/prediction';
import { defaultModelMeta } from './modelMetaDefaults';

export interface PostprocessOptions {
  temperature?: number;
  probThreshold?: number;
  tau?: number;
  tierBoundaries?: {
    high?: number;
    medium?: number;
  };
  maxCentroidSim?: number;
  genusList?: string[];
  modelVersion?: string;
  similarMatches?: SimilarMatch[];
  camData?: Float32Array | null;
}

/**
 * Determine classification tier based on calibrated top-1 probability.
 * Boundaries per model_meta.json & TRD Section 5:
 *   High:    > high boundary (default 0.85)
 *   Medium:  medium boundary (default 0.60) to high
 *   Low:     rejection threshold (default 0.57) to medium
 *   Unknown: < threshold or when unknown rejection flag is explicitly active
 */
export function determineTier(
  top1Prob: number,
  isUnknown = false,
  tierBoundaries?: { high?: number; medium?: number; threshold?: number },
): Tier {
  const threshold = tierBoundaries?.threshold ?? defaultModelMeta.threshold;
  if (isUnknown || top1Prob < threshold) {
    return 'unknown';
  }
  const high = tierBoundaries?.high ?? defaultModelMeta.tierBoundaries.high;
  const medium = tierBoundaries?.medium ?? defaultModelMeta.tierBoundaries.medium;
  if (top1Prob > high) {
    return 'high';
  }
  if (top1Prob >= medium) {
    return 'medium';
  }
  return 'low';
}

/**
 * Numerically stable softmax with temperature scaling:
 * p_i = exp((z_i / T) - max_j(z_j / T)) / sum_k(exp((z_k / T) - max_j(z_j / T)))
 */
export function computeCalibratedProbabilities(
  logits: Float32Array,
  temperature = defaultModelMeta.temperature,
): Float32Array {
  if (logits.length === 0) {
    return new Float32Array(0);
  }

  const T = Math.max(0.01, temperature);
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    const scaled = (logits[i] ?? 0) / T;
    if (scaled > maxLogit) maxLogit = scaled;
  }

  let sumExp = 0;
  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    const exp = Math.exp(((logits[i] ?? 0) / T) - maxLogit);
    probs[i] = exp;
    sumExp += exp;
  }

  if (sumExp > 0) {
    for (let i = 0; i < probs.length; i++) {
      probs[i] = (probs[i] ?? 0) / sumExp;
    }
  }

  return probs;
}

/**
 * Post-processes model outputs per TRD Section 5 & 10:
 * 1. probs = softmax(logits / temperature)
 * 2. Top-3 species by calibrated probability
 * 3. Unknown rejection: reject when max prob < prob_threshold (0.57) OR max cosine < tau (0.31)
 * 4. Tier evaluation (High > 0.85, Medium 0.60-0.85, Low < 0.60; rejected results clearly marked 'low')
 * 5. Genus fallback if top-1 < 0.60 and top-3 share genus
 */
export function postprocess(
  logits: Float32Array,
  temperature = defaultModelMeta.temperature,
  options?: PostprocessOptions,
): ClassificationResult {
  if (logits.length === 0) {
    return {
      top3: [],
      tier: 'unknown',
      unknown: true,
      similar: [],
      camData: null,
      modelVersion: options?.modelVersion ?? defaultModelMeta.version,
      genusFallback: null,
    };
  }

  // 1. Temperature-scaled softmax
  const probs = computeCalibratedProbabilities(logits, temperature);

  // 2. Top-3 by calibrated probability
  const indexed = Array.from(probs).map((prob, speciesId) => ({ speciesId, prob }));
  indexed.sort((a, b) => b.prob - a.prob);
  const top3: Prediction[] = indexed.slice(0, 3);

  const top1Prob = top3[0]?.prob ?? 0;

  // 3. Unknown rejection rule:
  // Reject when max probability < probThreshold OR max centroid cosine similarity < tau
  const probThreshold = options?.probThreshold ?? defaultModelMeta.threshold;
  const tau = options?.tau ?? defaultModelMeta.tau;
  const tierBoundaries = options?.tierBoundaries ?? defaultModelMeta.tierBoundaries;
  const maxCentroidSim = options?.maxCentroidSim ?? 1.0;

  const isUnknown = top1Prob < probThreshold || maxCentroidSim < tau;

  // 4. Tier assignment
  const tier = determineTier(top1Prob, isUnknown, tierBoundaries);

  // 5. Genus fallback: if top-1 < medium boundary, and top-3 share same genus
  let genusFallback: string | null = null;
  const mediumBoundary = options?.tierBoundaries?.medium ?? defaultModelMeta.tierBoundaries.medium;
  if (top1Prob < mediumBoundary && options?.genusList && options.genusList.length >= 3) {
    const g0 = options.genusList[top3[0]?.speciesId ?? -1];
    const g1 = options.genusList[top3[1]?.speciesId ?? -1];
    const g2 = options.genusList[top3[2]?.speciesId ?? -1];
    if (g0 && g0 === g1 && g0 === g2) {
      genusFallback = g0;
    }
  }

  return {
    top3,
    tier,
    unknown: isUnknown,
    similar: options?.similarMatches ?? [],
    camData: options?.camData ?? null,
    modelVersion: options?.modelVersion ?? defaultModelMeta.version,
    genusFallback,
  };
}
