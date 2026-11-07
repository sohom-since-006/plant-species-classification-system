/** Format a probability (0-1) as a percentage string */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a species name for display */
export function formatSpeciesName(commonName: string, scientificName: string): string {
  return `${commonName} (${scientificName})`;
}

/** Truncate text to a maximum length with an ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
