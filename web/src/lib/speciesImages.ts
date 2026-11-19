import creditsData from '@/data/credits.json';

export type SpeciesImageCredit = {
  observer: string;
  license: string;
  source_url: string;
};

export const NEUTRAL_LEAF_PLACEHOLDER = '/species/neutral_leaf.svg';

/**
 * Returns the local WebP image path for a species ID (/species/{id}.webp).
 * Always returns our local file path, never an external URL or database column.
 * If the ID is missing or out of bounds (0..149), falls back to the neutral leaf SVG.
 */
export function getSpeciesImagePath(id: number | string | undefined | null): string {
  if (id === undefined || id === null || id === '') {
    return NEUTRAL_LEAF_PLACEHOLDER;
  }
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 0 || numId > 149) {
    return NEUTRAL_LEAF_PLACEHOLDER;
  }
  return `/species/${numId}.webp`;
}

/**
 * Returns the verified image credit from credits.json for a given species ID.
 */
export function getSpeciesImageCredit(id: number | string | undefined | null): SpeciesImageCredit | null {
  if (id === undefined || id === null || id === '') {
    return null;
  }
  const key = String(Number(id));
  const record = (creditsData as Record<string, Partial<SpeciesImageCredit> | undefined>)[key];
  if (!record) return null;
  return {
    observer: record.observer || 'iNaturalist Observer',
    license: record.license || 'CC-BY-NC 4.0',
    source_url: record.source_url || 'https://www.inaturalist.org',
  };
}

/**
 * Image error handler that replaces a broken image source with the neutral leaf placeholder.
 */
export function handleSpeciesImageError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
  if (!e.currentTarget.src.endsWith('neutral_leaf.svg')) {
    e.currentTarget.src = NEUTRAL_LEAF_PLACEHOLDER;
  }
}
