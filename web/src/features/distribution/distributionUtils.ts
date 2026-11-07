import type { CountryObservation, StateObservation } from '@/types/distribution';

export interface GroupedCountry {
  code: string;
  name: string;
  count: number;
}

export interface StateCartogramTile {
  code: string;
  name: string;
  col: number; // 0..7
  row: number; // 0..7
}

export interface MonthDataPoint {
  month: string;
  shortMonth: string;
  monthIndex: number; // 1..12
  count: number;
}

export const MONTH_NAMES = [
  { short: 'Jan', full: 'January' },
  { short: 'Feb', full: 'February' },
  { short: 'Mar', full: 'March' },
  { short: 'Apr', full: 'April' },
  { short: 'May', full: 'May' },
  { short: 'Jun', full: 'June' },
  { short: 'Jul', full: 'July' },
  { short: 'Aug', full: 'August' },
  { short: 'Sep', full: 'September' },
  { short: 'Oct', full: 'October' },
  { short: 'Nov', full: 'November' },
  { short: 'Dec', full: 'December' },
];

/**
 * Approximate geographic tile-grid cartogram layout for all 36 Indian States & Union Territories.
 * Fixed 8-column by 8-row grid with NO map boundary or country outline.
 */
export const INDIA_CARTOGRAM_TILES: StateCartogramTile[] = [
  // Row 0: Far North
  { code: 'JK', name: 'Jammu and Kashmir', col: 1, row: 0 },
  { code: 'LA', name: 'Ladakh', col: 2, row: 0 },

  // Row 1: North
  { code: 'PB', name: 'Punjab', col: 1, row: 1 },
  { code: 'HP', name: 'Himachal Pradesh', col: 2, row: 1 },
  { code: 'UK', name: 'Uttarakhand', col: 3, row: 1 },

  // Row 2: North / NCR / East Himalayas
  { code: 'HR', name: 'Haryana', col: 1, row: 2 },
  { code: 'CH', name: 'Chandigarh', col: 2, row: 2 },
  { code: 'DL', name: 'Delhi', col: 3, row: 2 },
  { code: 'UP', name: 'Uttar Pradesh', col: 4, row: 2 },
  { code: 'SK', name: 'Sikkim', col: 5, row: 2 },
  { code: 'AR', name: 'Arunachal Pradesh', col: 7, row: 2 },

  // Row 3: West / Central / Gangetic / Northeast
  { code: 'RJ', name: 'Rajasthan', col: 0, row: 3 },
  { code: 'MP', name: 'Madhya Pradesh', col: 2, row: 3 },
  { code: 'BR', name: 'Bihar', col: 4, row: 3 },
  { code: 'AS', name: 'Assam', col: 6, row: 3 },
  { code: 'NL', name: 'Nagaland', col: 7, row: 3 },

  // Row 4: West / Central / East / Northeast
  { code: 'GJ', name: 'Gujarat', col: 0, row: 4 },
  { code: 'CG', name: 'Chhattisgarh', col: 3, row: 4 },
  { code: 'JH', name: 'Jharkhand', col: 4, row: 4 },
  { code: 'WB', name: 'West Bengal', col: 5, row: 4 },
  { code: 'ML', name: 'Meghalaya', col: 6, row: 4 },
  { code: 'MN', name: 'Manipur', col: 7, row: 4 },

  // Row 5: Deccan / Coastal / Northeast
  { code: 'DND', name: 'Dadra and Nagar Haveli and Daman and Diu', col: 1, row: 5 },
  { code: 'MH', name: 'Maharashtra', col: 2, row: 5 },
  { code: 'OD', name: 'Odisha', col: 4, row: 5 },
  { code: 'TR', name: 'Tripura', col: 6, row: 5 },
  { code: 'MZ', name: 'Mizoram', col: 7, row: 5 },

  // Row 6: South Deccan
  { code: 'GA', name: 'Goa', col: 1, row: 6 },
  { code: 'KA', name: 'Karnataka', col: 2, row: 6 },
  { code: 'TG', name: 'Telangana', col: 3, row: 6 },
  { code: 'AP', name: 'Andhra Pradesh', col: 4, row: 6 },

  // Row 7: Deep South & Island Territories
  { code: 'LD', name: 'Lakshadweep', col: 1, row: 7 },
  { code: 'KL', name: 'Kerala', col: 2, row: 7 },
  { code: 'TN', name: 'Tamil Nadu', col: 3, row: 7 },
  { code: 'PY', name: 'Puducherry', col: 4, row: 7 },
  { code: 'AN', name: 'Andaman and Nicobar Islands', col: 6, row: 7 },
];

/**
 * Groups raw sorted country observations into top N plus "Other".
 */
export function groupTopCountries(
  countries: CountryObservation[] | undefined | null,
  topN: number = 8,
): GroupedCountry[] {
  if (!countries || countries.length === 0) {
    return [];
  }

  const sorted = [...countries].sort((a, b) => b.count - a.count);

  if (sorted.length <= topN) {
    return sorted.map((c) => ({
      code: c.code,
      name: c.name,
      count: c.count,
    }));
  }

  const topItems = sorted.slice(0, topN).map((c) => ({
    code: c.code,
    name: c.name,
    count: c.count,
  }));

  const otherSum = sorted.slice(topN).reduce((sum, c) => sum + c.count, 0);

  if (otherSum > 0) {
    topItems.push({
      code: 'OTHER',
      name: 'Other',
      count: otherSum,
    });
  }

  return topItems;
}

export interface StateStats {
  count: number;
  share: number; // 0 to 1
  sharePct: string;
}

export interface IndiaStateStatsResult {
  stateStatsMap: Map<string, StateStats>;
  recordsWithState: number;
  totalIndiaRecords: number;
  maxStateCount: number;
  maxShare: number;
}

/**
 * Computes individual state records share of the total records that include a state.
 */
export function calculateIndiaStateStats(
  states: StateObservation[] | undefined | null,
  countries: CountryObservation[] | undefined | null,
): IndiaStateStatsResult {
  const stateStatsMap = new Map<string, StateStats>();
  const validStates = states || [];

  const recordsWithState = validStates.reduce((sum, s) => sum + s.count, 0);

  const indiaEntry = countries?.find((c) => c.code === 'IN');
  const totalIndiaRecords = indiaEntry ? indiaEntry.count : recordsWithState;

  let maxStateCount = 0;
  for (const s of validStates) {
    if (s.count > maxStateCount) {
      maxStateCount = s.count;
    }
  }

  const maxShare = recordsWithState > 0 ? maxStateCount / recordsWithState : 0;

  for (const s of validStates) {
    const share = recordsWithState > 0 ? s.count / recordsWithState : 0;
    const sharePct = (share * 100).toFixed(1) + '%';
    stateStatsMap.set(s.name, {
      count: s.count,
      share,
      sharePct,
    });
  }

  return {
    stateStatsMap,
    recordsWithState,
    totalIndiaRecords,
    maxStateCount,
    maxShare,
  };
}

/**
 * Formats 12 month numbers into structured array with short and full month names.
 */
export function formatMonthSeasonality(months: number[] | undefined | null): MonthDataPoint[] {
  const safeMonths = months && months.length === 12 ? months : new Array(12).fill(0);

  return safeMonths.map((count, index) => ({
    month: MONTH_NAMES[index]?.full ?? `Month ${index + 1}`,
    shortMonth: MONTH_NAMES[index]?.short ?? `M${index + 1}`,
    monthIndex: index + 1,
    count: Math.max(0, count),
  }));
}
