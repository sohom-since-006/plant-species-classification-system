import { describe, it, expect } from 'vitest';
import {
  preprocessRawData,
  pillowBilinearResize,
  IMAGENET_MEAN,
  IMAGENET_STD,
} from '@/ml/preprocess';
import {
  computeCalibratedProbabilities,
  determineTier,
  postprocess,
} from '@/ml/postprocess';
import {
  computeCosineSimilarity,
  computeSimilar,
} from '@/ml/similar';
import {
  decodeFloat16,
  decodeFloat16Buffer,
  computeCAM,
  upsampleCAM,
} from '@/ml/cam';
import { fuseMultiPhotoInference } from '@/ml/fuse';

describe('ML Preprocessing Pipeline', () => {
  it('resizes shorter side to 256 and center-crops 224x224 into NCHW float32', () => {
    // 320x240 image (shorter side 240)
    const w = 320;
    const h = 240;
    const raw = new Uint8Array(w * h * 3);
    // Fill with solid color: R=128, G=64, B=32
    for (let i = 0; i < w * h; i++) {
      raw[i * 3] = 128;
      raw[i * 3 + 1] = 64;
      raw[i * 3 + 2] = 32;
    }

    const tensor = preprocessRawData({ data: raw, width: w, height: h, channels: 3 });
    expect(tensor.length).toBe(3 * 224 * 224);

    // Channel 0 (R): (128 / 255 - 0.485) / 0.229
    const expectedR = (128 / 255.0 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    expect(tensor[0]).toBeCloseTo(expectedR, 2);

    // Channel 1 (G): (64 / 255 - 0.456) / 0.224
    const expectedG = (64 / 255.0 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    expect(tensor[224 * 224]).toBeCloseTo(expectedG, 2);

    // Channel 2 (B): (32 / 255 - 0.406) / 0.225
    const expectedB = (32 / 255.0 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
    expect(tensor[2 * 224 * 224]).toBeCloseTo(expectedB, 2);
  });

  it('composites transparent 4-channel PNGs over white', () => {
    // 10x10 transparent image (alpha = 0)
    const raw = new Uint8Array(10 * 10 * 4);
    // Even if RGB is 0, alpha=0 should composite to 255 (white)
    const resized = pillowBilinearResize(raw, 10, 10, 256, 256, 4);
    expect(resized[0]).toBeCloseTo(255, 0);
    expect(resized[1]).toBeCloseTo(255, 0);
    expect(resized[2]).toBeCloseTo(255, 0);
  });
});

describe('Postprocessing, Calibration & Tiers', () => {
  it('computes numerically stable temperature-scaled softmax', () => {
    const logits = new Float32Array([1000, 1000, 1000]); // Large numbers that would overflow naive exp
    const probs = computeCalibratedProbabilities(logits, 0.7129);
    expect(probs.length).toBe(3);
    expect(probs[0]).toBeCloseTo(1 / 3, 4);
    expect(probs[1]).toBeCloseTo(1 / 3, 4);
    expect(probs[2]).toBeCloseTo(1 / 3, 4);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('classifies confidence tiers correctly per TRD Section 5', () => {
    expect(determineTier(0.8501)).toBe('high');
    expect(determineTier(0.85)).toBe('medium');
    expect(determineTier(0.60)).toBe('medium');
    expect(determineTier(0.599)).toBe('low');
    expect(determineTier(0.35)).toBe('low');
    expect(determineTier(0.349)).toBe('unknown');
    expect(determineTier(0.95, true)).toBe('unknown');
  });

  it('rejects when max probability is below threshold (0.57)', () => {
    // Logits yielding max probability ~ 0.50
    const logits = new Float32Array([1.0, 0.9, 0.1]);
    const res = postprocess(logits, 0.7129, { probThreshold: 0.57, tau: 0.31 });
    expect(res.unknown).toBe(true);
    expect(res.top3.length).toBe(3);
  });

  it('rejects when centroid cosine similarity is below tau (0.31)', () => {
    // High probability ~ 0.99, but centroid similarity low (e.g. 0.20 < 0.31)
    const logits = new Float32Array([10.0, 1.0, 0.1]);
    const res = postprocess(logits, 0.7129, {
      probThreshold: 0.57,
      tau: 0.31,
      maxCentroidSim: 0.20,
    });
    expect(res.unknown).toBe(true);
  });
});

describe('Similar Species Engine', () => {
  it('computes cosine similarity accurately', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(computeCosineSimilarity(a, b)).toBeCloseTo(1.0, 5);

    const c = [0, 1, 0];
    expect(computeCosineSimilarity(a, c)).toBeCloseTo(0.0, 5);
  });

  it('ranks similar species and applies genus bonus', () => {
    const probs = [0.70, 0.15, 0.10, 0.05];
    const embedding = [1, 0, 0];
    const centroids = {
      '0': [1, 0, 0], // Predicted top-1
      '1': [0.8, 0.6, 0], // cos = 0.8
      '2': [0.5, 0.866, 0], // cos = 0.5
      '3': [0.1, 0.99, 0], // cos = 0.1
    };
    const genusList: Record<number, string> = {
      0: 'Ocimum',
      1: 'Ocimum', // Same genus as top-1 -> gets +0.05 bonus
      2: 'Solanum',
      3: 'Ficus',
    };

    const matches = computeSimilar(probs, embedding, centroids, 0, {
      genusList,
      topK: 3,
    });

    expect(matches.length).toBe(3);
    expect(matches[0]?.speciesId).toBe(1);
    expect(matches[0]?.visual).toBeGreaterThan(0);
    expect(matches[0]?.final).toBeGreaterThan(matches[1]?.final ?? 0);
  });
});

describe('Class Activation Map (CAM)', () => {
  it('decodes float16 half precision numbers correctly', () => {
    expect(decodeFloat16(0x0000)).toBe(0);
    expect(decodeFloat16(0x3c00)).toBe(1.0);
    expect(decodeFloat16(0xbc00)).toBe(-1.0);
    expect(decodeFloat16(0x3555)).toBeCloseTo(0.33325, 4);
  });

  it('decodes an entire buffer of float16 values', () => {
    const raw = new Uint8Array([0x00, 0x3c, 0x00, 0xbc]); // 1.0, -1.0
    const decoded = decodeFloat16Buffer(raw.buffer);
    expect(decoded.length).toBe(2);
    expect(decoded[0]).toBe(1.0);
    expect(decoded[1]).toBe(-1.0);
  });

  it('computes exact ReLU CAM and min-max normalizes to [0, 1]', () => {
    // 2 channels, 7x7 spatial
    const features = new Float32Array(2 * 49);
    // Channel 0: positive activation in center
    features[24] = 2.0; // Center (3, 3)

    // Weights: class 0 has [1.0, -1.0]
    const weights = new Float32Array([1.0, -1.0]);

    const cam = computeCAM(features, weights, 0, 2, 7, 7);
    expect(cam.length).toBe(49);
    expect(cam[24]).toBeCloseTo(1.0, 4); // Max at center
    expect(cam[0]).toBeCloseTo(0.0, 4); // Min elsewhere
  });

  it('upsamples 7x7 CAM smoothly', () => {
    const cam7 = new Float32Array(49);
    cam7[24] = 1.0;
    const upsampled = upsampleCAM(cam7, 28, 28);
    expect(upsampled.length).toBe(28 * 28);
    expect(upsampled[14 * 28 + 14]).toBeGreaterThan(0.5);
  });
});

describe('Multi-Photo Fusion', () => {
  it('averages probabilities and embeddings across photos', () => {
    const inf1 = {
      probs: new Float32Array([0.8, 0.2]),
      embedding: new Float32Array([1, 0]),
      camData: new Float32Array(49),
    };
    const inf2 = {
      probs: new Float32Array([0.6, 0.4]),
      embedding: new Float32Array([0, 1]),
      camData: new Float32Array(49),
    };

    const result = fuseMultiPhotoInference([inf1, inf2]);
    expect(result.top3.length).toBe(2);
    // Average top1 prob: (0.8 + 0.6) / 2 = 0.70
    expect(result.top3[0]?.prob).toBeCloseTo(0.70, 4);
    expect(result.top3[0]?.speciesId).toBe(0);
    expect(result.tier).toBe('medium');
  });
});
