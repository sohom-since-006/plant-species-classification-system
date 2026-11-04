import { describe, it, expect } from 'vitest';
import { determineTier, postprocess } from '@/ml/postprocess';
import { getMockResult, hashImageInput, MOCK_FIXTURES } from '@/ml/mock';

describe('Tier Logic Boundaries (TRD Section 5)', () => {
  it('assigns "high" tier when confidence is strictly greater than 0.85', () => {
    expect(determineTier(0.8501)).toBe('high');
    expect(determineTier(0.94)).toBe('high');
    expect(determineTier(1.0)).toBe('high');
  });

  it('assigns "medium" tier at boundaries 0.60 to 0.85 inclusive', () => {
    expect(determineTier(0.85)).toBe('medium');
    expect(determineTier(0.75)).toBe('medium');
    expect(determineTier(0.60)).toBe('medium');
  });

  it('assigns "low" tier when confidence is below 0.60 down to 0.35', () => {
    expect(determineTier(0.599)).toBe('low');
    expect(determineTier(0.50)).toBe('low');
    expect(determineTier(0.35)).toBe('low');
  });

  it('assigns "unknown" tier when confidence is below 0.35', () => {
    expect(determineTier(0.349)).toBe('unknown');
    expect(determineTier(0.15)).toBe('unknown');
    expect(determineTier(0.0)).toBe('unknown');
  });

  it('assigns "unknown" tier whenever isUnknown flag is set, even with high probability', () => {
    expect(determineTier(0.95, true)).toBe('unknown');
    expect(determineTier(0.70, true)).toBe('unknown');
  });
});

describe('Post-processing & Genus Fallback', () => {
  it('performs softmax and temperature scaling', () => {
    const logits = new Float32Array([10, 5, 2]);
    const result = postprocess(logits, 1.0);

    expect(result.top3.length).toBe(3);
    expect(result.top3[0]?.speciesId).toBe(0);
    expect(result.top3[0]?.prob).toBeGreaterThan(0.85);
    expect(result.tier).toBe('high');
    expect(result.unknown).toBe(false);
  });

  it('triggers genus fallback when top-1 < 0.60 and top-3 share genus', () => {
    // 3 species of Ocimum with logits yielding top-1 prob ~ 0.49 (between 0.35 and 0.60)
    const logits = new Float32Array([3.0, 2.5, 2.0, 0.1]);
    const genusList = ['Ocimum', 'Ocimum', 'Ocimum', 'Solanum'];

    const result = postprocess(logits, 1.0, { genusList });

    expect(result.top3[0]?.prob).toBeGreaterThanOrEqual(0.35);
    expect(result.top3[0]?.prob).toBeLessThan(0.60);
    expect(result.tier).toBe('low');
    expect(result.genusFallback).toBe('Ocimum');
  });
});

describe('Mock ML Pipeline Determinism & Schema', () => {
  it('returns valid TRD JSON structure for all 4 fixtures', () => {
    for (let i = 0; i < 4; i++) {
      const res = getMockResult(undefined, i);
      expect(res).toHaveProperty('top3');
      expect(res).toHaveProperty('tier');
      expect(res).toHaveProperty('unknown');
      expect(res).toHaveProperty('similar');
      expect(res).toHaveProperty('camData');
      expect(res).toHaveProperty('modelVersion');
      expect(res).toHaveProperty('genusFallback');
      expect(Array.isArray(res.top3)).toBe(true);
      expect(Array.isArray(res.similar)).toBe(true);
    }
  });

  it('verifies fixture specific semantics', () => {
    // Fixture 0: High
    expect(MOCK_FIXTURES[0]?.tier).toBe('high');
    expect(MOCK_FIXTURES[0]?.top3[0]?.prob).toBeGreaterThan(0.85);

    // Fixture 1: Medium
    expect(MOCK_FIXTURES[1]?.tier).toBe('medium');
    expect(MOCK_FIXTURES[1]?.top3[0]?.prob).toBeGreaterThanOrEqual(0.60);
    expect(MOCK_FIXTURES[1]?.top3[0]?.prob).toBeLessThanOrEqual(0.85);

    // Fixture 2: Low with Genus Fallback
    expect(MOCK_FIXTURES[2]?.tier).toBe('low');
    expect(MOCK_FIXTURES[2]?.top3[0]?.prob).toBeLessThan(0.60);
    expect(MOCK_FIXTURES[2]?.genusFallback).toBe('Ocimum');

    // Fixture 3: Unknown / not-a-plant
    expect(MOCK_FIXTURES[3]?.tier).toBe('unknown');
    expect(MOCK_FIXTURES[3]?.unknown).toBe(true);
  });

  it('hashes deterministically: same input always produces same fixture', () => {
    const fileA = new File(['test-bytes-1'], 'leaf-sample.jpg', { type: 'image/jpeg' });
    const fileB = new File(['test-bytes-1'], 'leaf-sample.jpg', { type: 'image/jpeg' });

    const hashA = hashImageInput(fileA);
    const hashB = hashImageInput(fileB);
    expect(hashA).toBe(hashB);

    const resA = getMockResult(fileA);
    const resB = getMockResult(fileB);
    expect(resA.tier).toBe(resB.tier);
    expect(resA.top3[0]?.speciesId).toBe(resB.top3[0]?.speciesId);
  });
});
