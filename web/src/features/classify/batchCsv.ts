export interface BatchExportRow {
  filename: string;
  commonName: string;
  scientificName: string;
  confidence: number; // 0 to 1
  tier: string;
  rejected: boolean;
  family?: string;
  top2?: string;
  top3?: string;
}

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // If string contains comma, quote, or newline, escape quotes and wrap in quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function exportBatchToCsv(rows: BatchExportRow[]): string {
  const headers = [
    'Filename',
    'Common Name',
    'Scientific Name',
    'Confidence (%)',
    'Confidence Tier',
    'Rejected / Out of Distribution',
    'Botanical Family',
    'Top 2 Candidate',
    'Top 3 Candidate',
  ];

  const headerLine = headers.map(escapeCsvField).join(',');

  const dataLines = rows.map((r) => {
    const confPercent = Math.round(r.confidence * 1000) / 10;
    return [
      escapeCsvField(r.filename),
      escapeCsvField(r.commonName),
      escapeCsvField(r.scientificName),
      escapeCsvField(`${confPercent}%`),
      escapeCsvField(r.tier),
      escapeCsvField(r.rejected ? 'Yes' : 'No'),
      escapeCsvField(r.family || 'Unknown'),
      escapeCsvField(r.top2 || 'N/A'),
      escapeCsvField(r.top3 || 'N/A'),
    ].join(',');
  });

  return [headerLine, ...dataLines].join('\r\n');
}

export function downloadCsv(csvContent: string, filename = 'plantai_batch_predictions.csv'): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

