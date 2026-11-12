import { describe, it, expect } from 'vitest';
import { exportBatchToCsv, escapeCsvField, type BatchExportRow } from '@/features/classify/batchCsv';

describe('batchCsv export', () => {
  it('correctly escapes fields with commas and double quotes', () => {
    expect(escapeCsvField('Sweet Basil')).toBe('"Sweet Basil"');
    expect(escapeCsvField('Tulsi, Holy Basil')).toBe('"Tulsi, Holy Basil"');
    expect(escapeCsvField('Plant "Specimen" A')).toBe('"Plant ""Specimen"" A"');
  });

  it('generates standard RFC-4180 CSV with valid headers and data lines', () => {
    const mockRows: BatchExportRow[] = [
      {
        filename: 'leaf1.jpg',
        commonName: 'Holy Basil',
        scientificName: 'Ocimum tenuiflorum',
        confidence: 0.942,
        tier: 'high',
        rejected: false,
        family: 'Lamiaceae',
        top2: 'Sweet Basil (4.1%)',
        top3: 'Mint (1.2%)',
      },
      {
        filename: 'stone.jpg',
        commonName: 'Unknown / Non-Plant',
        scientificName: 'Flora incertae sedis',
        confidence: 0.22,
        tier: 'unknown',
        rejected: true,
        family: 'Unknown',
        top2: 'N/A',
        top3: 'N/A',
      },
    ];

    const csv = exportBatchToCsv(mockRows);
    const lines = csv.split('\r\n');

    expect(lines.length).toBe(3); // Header + 2 data rows
    expect(lines[0]).toContain('"Filename"');
    expect(lines[0]).toContain('"Common Name"');
    expect(lines[0]).toContain('"Confidence (%)"');

    // Row 1
    expect(lines[1]).toContain('"leaf1.jpg"');
    expect(lines[1]).toContain('"Holy Basil"');
    expect(lines[1]).toContain('"94.2%"');
    expect(lines[1]).toContain('"high"');
    expect(lines[1]).toContain('"No"');

    // Row 2
    expect(lines[2]).toContain('"stone.jpg"');
    expect(lines[2]).toContain('"Unknown / Non-Plant"');
    expect(lines[2]).toContain('"22%"');
    expect(lines[2]).toContain('"unknown"');
    expect(lines[2]).toContain('"Yes"');
  });
});
