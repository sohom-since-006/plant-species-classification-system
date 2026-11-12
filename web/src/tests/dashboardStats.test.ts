import { describe, it, expect } from 'vitest';
import { computeUserStats } from '@/features/dashboard/userStats';
import type { SavedPrediction } from '@/types/prediction';

describe('computeUserStats', () => {
  it('returns zeroed stats when predictions array is empty', () => {
    const stats = computeUserStats([]);
    expect(stats.totalScans).toBe(0);
    expect(stats.avgConfidence).toBe(0);
    expect(stats.highConfidenceRatio).toBe(0);
    expect(stats.uniqueSpeciesCount).toBe(0);
    expect(stats.topSpecies).toHaveLength(0);
    expect(stats.familyBreakdown).toHaveLength(0);
    expect(stats.timeline).toHaveLength(0);
    expect(stats.tierSplit).toHaveLength(4);
    expect(stats.tierSplit[0]?.count).toBe(0);
  });

  it('correctly aggregates scans, tiers, and confidence averages', () => {
    const mockPredictions: SavedPrediction[] = [
      {
        id: 'pred-1',
        speciesId: 0,
        confidence: 0.95,
        tier: 'high',
        top3: [],
        similar: [],
        imagePath: null,
        modelVersion: '1.0.0',
        createdAt: '2026-11-10T10:00:00Z',
        speciesName: 'Tulsi',
      },
      {
        id: 'pred-2',
        speciesId: 0,
        confidence: 0.85,
        tier: 'high',
        top3: [],
        similar: [],
        imagePath: null,
        modelVersion: '1.0.0',
        createdAt: '2026-11-10T12:00:00Z',
        speciesName: 'Tulsi',
      },
      {
        id: 'pred-3',
        speciesId: 20,
        confidence: 0.70,
        tier: 'medium',
        top3: [],
        similar: [],
        imagePath: null,
        modelVersion: '1.0.0',
        createdAt: '2026-11-11T09:00:00Z',
        speciesName: 'Hibiscus',
      },
      {
        id: 'pred-4',
        speciesId: null,
        confidence: 0.30,
        tier: 'unknown',
        top3: [],
        similar: [],
        imagePath: null,
        modelVersion: '1.0.0',
        createdAt: '2026-11-11T14:00:00Z',
      },
    ];

    const stats = computeUserStats(mockPredictions);

    expect(stats.totalScans).toBe(4);
    // (0.95 + 0.85 + 0.70 + 0.30) / 4 = 2.80 / 4 = 0.70 -> 70%
    expect(stats.avgConfidence).toBe(70);
    // 2 high out of 4 = 50%
    expect(stats.highConfidenceRatio).toBe(50);
    // 3 unique species names ('Tulsi', 'Hibiscus', 'Unknown Flora')
    expect(stats.uniqueSpeciesCount).toBe(3);

    // Check tier counts
    const highTier = stats.tierSplit.find((t) => t.tier === 'high');
    const mediumTier = stats.tierSplit.find((t) => t.tier === 'medium');
    const unknownTier = stats.tierSplit.find((t) => t.tier === 'unknown');
    expect(highTier?.count).toBe(2);
    expect(highTier?.percentage).toBe(50);
    expect(mediumTier?.count).toBe(1);
    expect(mediumTier?.percentage).toBe(25);
    expect(unknownTier?.count).toBe(1);
    expect(unknownTier?.percentage).toBe(25);

    // Check top species (Tulsi should be first with 2 scans)
    expect(stats.topSpecies[0]?.name).toBe('Tulsi');
    expect(stats.topSpecies[0]?.count).toBe(2);
    expect(stats.topSpecies[0]?.avgConfidence).toBe(90);

    // Check timeline sorting
    expect(stats.timeline).toHaveLength(2);
    expect(stats.timeline[0]?.date).toBe('2026-11-10');
    expect(stats.timeline[0]?.scans).toBe(2);
    expect(stats.timeline[1]?.date).toBe('2026-11-11');
    expect(stats.timeline[1]?.scans).toBe(2);
  });
});
