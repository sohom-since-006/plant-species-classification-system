import type { SavedPrediction } from '@/types/prediction';
import { getSpeciesById } from '@/services/speciesService';

export interface TierSplitItem {
  tier: 'high' | 'medium' | 'low' | 'unknown';
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SpeciesFrequencyItem {
  name: string;
  scientificName: string;
  count: number;
  avgConfidence: number;
}

export interface FamilyFrequencyItem {
  family: string;
  count: number;
}

export interface TimelineDataPoint {
  date: string;
  scans: number;
  avgConfidence: number;
}

export interface ComputedUserStats {
  totalScans: number;
  avgConfidence: number;
  highConfidenceRatio: number;
  uniqueSpeciesCount: number;
  tierSplit: TierSplitItem[];
  topSpecies: SpeciesFrequencyItem[];
  familyBreakdown: FamilyFrequencyItem[];
  timeline: TimelineDataPoint[];
}

export function computeUserStats(predictions: SavedPrediction[]): ComputedUserStats {
  if (!predictions || predictions.length === 0) {
    return {
      totalScans: 0,
      avgConfidence: 0,
      highConfidenceRatio: 0,
      uniqueSpeciesCount: 0,
      tierSplit: [
        { tier: 'high', label: 'High (>85%)', count: 0, percentage: 0, color: '#10b981' },
        { tier: 'medium', label: 'Medium (60-85%)', count: 0, percentage: 0, color: '#f59e0b' },
        { tier: 'low', label: 'Low (<60%)', count: 0, percentage: 0, color: '#f43f5e' },
        { tier: 'unknown', label: 'Unknown / Rejected', count: 0, percentage: 0, color: '#64748b' },
      ],
      topSpecies: [],
      familyBreakdown: [],
      timeline: [],
    };
  }

  const totalScans = predictions.length;
  let confidenceSum = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let unknownCount = 0;

  const speciesMap = new Map<string, { count: number; confSum: number; scientific: string }>();
  const familyMap = new Map<string, number>();
  const dateMap = new Map<string, { count: number; confSum: number }>();

  for (const p of predictions) {
    const conf = typeof p.confidence === 'number' ? p.confidence : 0;
    confidenceSum += conf;

    // Tier counts
    if (p.tier === 'high') highCount++;
    else if (p.tier === 'medium') mediumCount++;
    else if (p.tier === 'low') lowCount++;
    else unknownCount++;

    // Species resolution
    const speciesObj = p.speciesId !== null ? getSpeciesById(p.speciesId) : undefined;
    const commonName = p.speciesName || speciesObj?.commonName || 'Unknown Flora';
    const scientificName = speciesObj?.scientificName || 'Flora spec.';

    const currSpecies = speciesMap.get(commonName) || { count: 0, confSum: 0, scientific: scientificName };
    currSpecies.count++;
    currSpecies.confSum += conf;
    speciesMap.set(commonName, currSpecies);

    // Family breakdown
    const family = speciesObj?.family || 'Unclassified';
    familyMap.set(family, (familyMap.get(family) || 0) + 1);

    // Timeline grouping (YYYY-MM-DD)
    const rawDate = p.createdAt ? new Date(p.createdAt) : new Date();
    const dateKey = isNaN(rawDate.getTime())
      ? new Date().toISOString().slice(0, 10)
      : rawDate.toISOString().slice(0, 10);

    const currDate = dateMap.get(dateKey) || { count: 0, confSum: 0 };
    currDate.count++;
    currDate.confSum += conf;
    dateMap.set(dateKey, currDate);
  }

  const avgConfidence = Math.round((confidenceSum / totalScans) * 1000) / 10;
  const highConfidenceRatio = Math.round((highCount / totalScans) * 1000) / 10;

  const tierSplit: TierSplitItem[] = [
    {
      tier: 'high',
      label: 'High (>85%)',
      count: highCount,
      percentage: Math.round((highCount / totalScans) * 1000) / 10,
      color: '#10b981',
    },
    {
      tier: 'medium',
      label: 'Medium (60-85%)',
      count: mediumCount,
      percentage: Math.round((mediumCount / totalScans) * 1000) / 10,
      color: '#f59e0b',
    },
    {
      tier: 'low',
      label: 'Low (<60%)',
      count: lowCount,
      percentage: Math.round((lowCount / totalScans) * 1000) / 10,
      color: '#f43f5e',
    },
    {
      tier: 'unknown',
      label: 'Unknown / Rejected',
      count: unknownCount,
      percentage: Math.round((unknownCount / totalScans) * 1000) / 10,
      color: '#64748b',
    },
  ];

  const topSpecies: SpeciesFrequencyItem[] = Array.from(speciesMap.entries())
    .map(([name, data]) => ({
      name,
      scientificName: data.scientific,
      count: data.count,
      avgConfidence: Math.round((data.confSum / data.count) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const familyBreakdown: FamilyFrequencyItem[] = Array.from(familyMap.entries())
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const timeline: TimelineDataPoint[] = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      scans: data.count,
      avgConfidence: Math.round((data.confSum / data.count) * 1000) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalScans,
    avgConfidence,
    highConfidenceRatio,
    uniqueSpeciesCount: speciesMap.size,
    tierSplit,
    topSpecies,
    familyBreakdown,
    timeline,
  };
}
