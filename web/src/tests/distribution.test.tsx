import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  groupTopCountries,
  calculateIndiaStateStats,
  formatMonthSeasonality,
  INDIA_CARTOGRAM_TILES,
} from '@/features/distribution/distributionUtils';
import { IndiaCartogram } from '@/features/distribution/IndiaCartogram';
import { DistributionPanel } from '@/features/distribution/DistributionPanel';
import * as useDistModule from '@/features/distribution/useDistribution';

describe('Distribution Helpers - Country Grouping', () => {
  it('returns an empty array when input is null, undefined, or empty', () => {
    expect(groupTopCountries(null)).toEqual([]);
    expect(groupTopCountries(undefined)).toEqual([]);
    expect(groupTopCountries([])).toEqual([]);
  });

  it('returns all countries as-is when count is less than or equal to topN', () => {
    const sample = [
      { code: 'IN', name: 'India', count: 1000 },
      { code: 'TH', name: 'Thailand', count: 150 },
      { code: 'NP', name: 'Nepal', count: 50 },
    ];
    const result = groupTopCountries(sample, 8);
    expect(result).toHaveLength(3);
    expect(result[0]?.name).toBe('India');
    expect(result[1]?.name).toBe('Thailand');
    expect(result[2]?.name).toBe('Nepal');
    expect(result.some((c) => c.code === 'OTHER')).toBe(false);
  });

  it('groups items beyond topN into an "Other" entry with accumulated sum', () => {
    const sample = [
      { code: 'IN', name: 'India', count: 1000 },
      { code: 'TH', name: 'Thailand', count: 200 },
      { code: 'ID', name: 'Indonesia', count: 150 },
      { code: 'AU', name: 'Australia', count: 80 },
      { code: 'PH', name: 'Philippines', count: 60 },
      { code: 'MY', name: 'Malaysia', count: 40 },
      { code: 'US', name: 'United States', count: 30 },
      { code: 'LK', name: 'Sri Lanka', count: 20 },
      { code: 'PK', name: 'Pakistan', count: 15 },
      { code: 'BD', name: 'Bangladesh', count: 10 },
      { code: 'NP', name: 'Nepal', count: 5 },
    ];

    const result = groupTopCountries(sample, 8);
    expect(result).toHaveLength(9); // Top 8 + 1 "Other"
    expect(result[0]?.code).toBe('IN');
    expect(result[7]?.code).toBe('LK');

    const otherItem = result[8];
    expect(otherItem).toBeDefined();
    expect(otherItem?.code).toBe('OTHER');
    expect(otherItem?.name).toBe('Other');
    expect(otherItem?.count).toBe(15 + 10 + 5); // 30
  });

  it('sorts countries in descending order even if raw list was unsorted', () => {
    const sample = [
      { code: 'NP', name: 'Nepal', count: 10 },
      { code: 'IN', name: 'India', count: 500 },
      { code: 'TH', name: 'Thailand', count: 100 },
    ];
    const result = groupTopCountries(sample, 8);
    expect(result[0]?.code).toBe('IN');
    expect(result[1]?.code).toBe('TH');
    expect(result[2]?.code).toBe('NP');
  });
});

describe('Distribution Helpers - India State Share Calculation', () => {
  it('calculates state share as a proportion of records that include a state', () => {
    const sampleStates = [
      { name: 'Kerala', count: 100 },
      { name: 'Maharashtra', count: 60 },
      { name: 'Tamil Nadu', count: 40 },
    ];
    const sampleCountries = [{ code: 'IN', name: 'India', count: 300 }];

    const stats = calculateIndiaStateStats(sampleStates, sampleCountries);

    expect(stats.recordsWithState).toBe(200); // 100 + 60 + 40
    expect(stats.totalIndiaRecords).toBe(300);
    expect(stats.maxStateCount).toBe(100);
    expect(stats.maxShare).toBeCloseTo(0.5); // 100 / 200

    const keralaStat = stats.stateStatsMap.get('Kerala');
    expect(keralaStat).toBeDefined();
    expect(keralaStat?.count).toBe(100);
    expect(keralaStat?.share).toBe(0.5);
    expect(keralaStat?.sharePct).toBe('50.0%');

    const mhStat = stats.stateStatsMap.get('Maharashtra');
    expect(mhStat?.share).toBe(0.3); // 60 / 200
    expect(mhStat?.sharePct).toBe('30.0%');
  });

  it('handles empty state arrays without division by zero', () => {
    const stats = calculateIndiaStateStats([], [{ code: 'IN', name: 'India', count: 50 }]);
    expect(stats.recordsWithState).toBe(0);
    expect(stats.totalIndiaRecords).toBe(50);
    expect(stats.maxStateCount).toBe(0);
    expect(stats.maxShare).toBe(0);
  });

  it('falls back totalIndiaRecords to recordsWithState if India country code is missing', () => {
    const sampleStates = [{ name: 'West Bengal', count: 45 }];
    const stats = calculateIndiaStateStats(sampleStates, []);
    expect(stats.totalIndiaRecords).toBe(45);
    expect(stats.recordsWithState).toBe(45);
  });
});

describe('Distribution Helpers - Seasonality Formatting', () => {
  it('formats an array of 12 month numbers into structured month points', () => {
    const months = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
    const formatted = formatMonthSeasonality(months);

    expect(formatted).toHaveLength(12);
    expect(formatted[0]?.shortMonth).toBe('Jan');
    expect(formatted[0]?.month).toBe('January');
    expect(formatted[0]?.count).toBe(10);
    expect(formatted[11]?.shortMonth).toBe('Dec');
    expect(formatted[11]?.month).toBe('December');
    expect(formatted[11]?.count).toBe(120);
  });

  it('returns 12 zeroed entries when given null or an invalid length array', () => {
    const fallback = formatMonthSeasonality(null);
    expect(fallback).toHaveLength(12);
    expect(fallback.every((m) => m.count === 0)).toBe(true);

    const fallbackShort = formatMonthSeasonality([1, 2, 3]);
    expect(fallbackShort).toHaveLength(12);
    expect(fallbackShort.every((m) => m.count === 0)).toBe(true);
  });
});

describe('IndiaCartogram Component', () => {
  it('renders all 36 Indian States and Union Territories on the tile grid', () => {
    expect(INDIA_CARTOGRAM_TILES).toHaveLength(36);

    const states = [
      { name: 'Kerala', count: 115 },
      { name: 'Maharashtra', count: 77 },
    ];
    const countries = [{ code: 'IN', name: 'India', count: 1000 }];

    render(<IndiaCartogram states={states} countries={countries} />);

    expect(screen.getByText('India Regional Cartogram')).toBeInTheDocument();
    expect(
      screen.getByText('Based on records that include a state (192 of 1,000 India records).'),
    ).toBeInTheDocument();

    // Verify key state codes exist in grid
    expect(screen.getByText('KL')).toBeInTheDocument();
    expect(screen.getByText('MH')).toBeInTheDocument();
    expect(screen.getByText('DL')).toBeInTheDocument();
  });
});

describe('DistributionPanel - Data & Empty States', () => {
  it('renders a friendly empty state when species distribution record is null', () => {
    vi.spyOn(useDistModule, 'useDistribution').mockReturnValue({
      distribution: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DistributionPanel speciesId={999} />);

    expect(screen.getByText('No Recorded Observations')).toBeInTheDocument();
    expect(
      screen.getByText(/No recorded observation data is currently indexed on GBIF/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore GBIF/i })).toBeInTheDocument();
  });

  it('renders recorded observations header, note, and attribution when record is present', () => {
    vi.spyOn(useDistModule, 'useDistribution').mockReturnValue({
      distribution: {
        species_id: 0,
        scientific_name: 'Ocimum tenuiflorum',
        common_name: 'Tulsi',
        total: 1924,
        countries: [
          { code: 'IN', name: 'India', count: 1007 },
          { code: 'TH', name: 'Thailand', count: 145 },
        ],
        india_states: [{ name: 'Kerala', count: 115 }],
        months: [87, 63, 94, 143, 159, 125, 198, 226, 243, 203, 114, 128],
        generated_at: '2026-11-08T00:00:00Z',
        source: 'GBIF',
        label: 'Recorded observations (GBIF)',
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DistributionPanel speciesId={0} />);

    expect(screen.getByText('Recorded observations (GBIF)')).toBeInTheDocument();
    expect(
      screen.getByText(/This is not the plant's native range/i),
    ).toBeInTheDocument();
    expect(screen.getByText('1,924')).toBeInTheDocument();
    expect(screen.getByText('India Regional Cartogram')).toBeInTheDocument();
    expect(screen.getByText(/GBIF \(Global Biodiversity Information Facility\)/i)).toBeInTheDocument();
  });
});
