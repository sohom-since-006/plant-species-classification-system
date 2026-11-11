import type { SimilarMatch } from '@/types/prediction';

export interface SimilarOptions {
  mlWeight?: number;
  visualWeight?: number;
  genusBonus?: number;
  topK?: number;
  genusList?: Record<number, string>;
  excludeTop1?: boolean;
}

/**
 * Calculates cosine similarity between an embedding vector and an L2-normalized centroid.
 */
export function computeCosineSimilarity(
  embedding: Float32Array | number[],
  centroid: Float32Array | number[],
  embeddingNorm?: number,
): number {
  let dot = 0;
  let normSq = 0;

  const len = Math.min(embedding.length, centroid.length);
  for (let i = 0; i < len; i++) {
    const e = embedding[i] ?? 0;
    const c = centroid[i] ?? 0;
    dot += e * c;
    if (embeddingNorm === undefined) {
      normSq += e * e;
    }
  }

  const norm = embeddingNorm ?? Math.sqrt(normSq);
  if (norm === 0) return 0;
  return dot / norm;
}

/**
 * Computes similar species rankings using calibrated ML probabilities and centroid cosine similarities.
 * Per TRD Section 6 & model_meta.json:
 *   ml_k = probs[k]
 *   visual_k = clamp((cos(embedding, centroid_k) - 0.30) / 0.70, 0, 1)
 *   final_k = min(1.0, mlWeight * ml_k + visualWeight * visual_k + (sameGenus ? genusBonus : 0))
 * Returns the top 3 to 5 candidate species with all three percentages.
 */
export function computeSimilar(
  probs: Float32Array | number[],
  embedding: Float32Array | number[],
  centroids: Record<string, number[]>,
  top1SpeciesId?: number,
  options?: SimilarOptions,
): SimilarMatch[] {
  const mlWeight = options?.mlWeight ?? 0.6;
  const visualWeight = options?.visualWeight ?? 0.4;
  const genusBonus = options?.genusBonus ?? 0.05;
  const topK = Math.max(3, Math.min(5, options?.topK ?? 4));
  const genusList = options?.genusList ?? {};
  const excludeTop1 = options?.excludeTop1 ?? true;

  // Precompute embedding L2 norm once
  let embeddingNormSq = 0;
  for (let i = 0; i < embedding.length; i++) {
    const val = embedding[i] ?? 0;
    embeddingNormSq += val * val;
  }
  const embeddingNorm = Math.sqrt(embeddingNormSq);

  const top1Genus = top1SpeciesId !== undefined ? genusList[top1SpeciesId] : undefined;
  const matches: SimilarMatch[] = [];

  const numSpecies = Math.min(probs.length, Object.keys(centroids).length);
  for (let k = 0; k < numSpecies; k++) {
    if (excludeTop1 && k === top1SpeciesId) {
      continue;
    }

    const centroid = centroids[String(k)];
    if (!centroid) continue;

    const cos = computeCosineSimilarity(embedding, centroid, embeddingNorm);
    const visual = Math.max(0, Math.min(1, (cos - 0.30) / 0.70));
    const ml = probs[k] ?? 0;

    const isSameGenus = top1Genus && genusList[k] && genusList[k] === top1Genus;
    const bonus = isSameGenus ? genusBonus : 0;
    const final = Math.min(1.0, mlWeight * ml + visualWeight * visual + bonus);

    matches.push({
      speciesId: k,
      ml,
      visual,
      final,
    });
  }

  // Sort descending by final match score
  matches.sort((a, b) => b.final - a.final);
  return matches.slice(0, topK);
}
