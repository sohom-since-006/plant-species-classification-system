import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SPECIES_COUNT, SPECIES_COUNT_LABEL } from '@/config/constants';
import speciesJsonRaw from '@/data/species.json';

const speciesData = speciesJsonRaw as Record<string, unknown>;

describe('Species Count Consistency & Single Source of Truth', () => {
  it('has SPECIES_COUNT equal to exactly the number of cataloged species', () => {
    const totalSpecies = Object.keys(speciesData).length;
    expect(totalSpecies).toBe(150);
    expect(SPECIES_COUNT).toBe(150);
    expect(SPECIES_COUNT_LABEL).toBe('150 species');
  });

  it('ensures web/index.html meta tags contain exactly "150 species" and no stale counts', () => {
    // Resolve web/index.html relative to test file or cwd
    const indexPath = path.resolve(__dirname, '../../index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
    const htmlContent = fs.readFileSync(indexPath, 'utf-8');

    // Must contain 150 species in description, og:description, twitter:description, title
    expect(htmlContent).toContain('150 species');
    expect(htmlContent).toContain('<title>Plant Species Classification System (150 species) | PlantAI</title>');

    // Must not contain stale species counts
    const forbiddenPatterns = [
      /112\s+species/i,
      /112\s+cataloged\s+species/i,
      /120\+?\s+species/i,
      /110\s+species/i,
      /130\s+species/i,
      /100\+\s+species/i,
      /150\+\s+species/i,
      /plus\s+species/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(htmlContent).not.toMatch(pattern);
    }
  });

  it('scans web/src source files to ensure no hard-coded divergent species counts exist', () => {
    const srcDir = path.resolve(__dirname, '..');
    const sourceFiles: string[] = [];

    function collectFiles(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip tests, node_modules, and data assets directory
          if (entry.name === 'tests' || entry.name === 'node_modules' || entry.name === 'data') {
            continue;
          }
          collectFiles(fullPath);
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          sourceFiles.push(fullPath);
        }
      }
    }

    collectFiles(srcDir);
    expect(sourceFiles.length).toBeGreaterThan(10);

    const forbiddenSpeciesPatterns = [
      /\b120\+\s+species\b/i,
      /\b120\s+species\b/i,
      /\b112\s+species\b/i,
      /\b112\s+cataloged\s+species\b/i,
      /\b110\s+species\b/i,
      /\b130\s+species\b/i,
      /\b100\+\s+species\b/i,
      /\b150\+\s+species\b/i,
      /\bplus\s+species\b/i,
      /\bone\s+hundred\s+(?:and\s+)?(?:twelve|twenty|ten|thirty)\s+species\b/i,
    ];

    const violations: { file: string; line: number; match: string; text: string }[] = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        // Ignore comments that explicitly document historical v1 changes if any
        if (lineText.trim().startsWith('//') || lineText.trim().startsWith('*')) {
          return;
        }

        for (const pattern of forbiddenSpeciesPatterns) {
          const match = pattern.exec(lineText);
          if (match) {
            violations.push({
              file: path.relative(srcDir, file),
              line: idx + 1,
              match: match[0],
              text: lineText.trim(),
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      console.error('Found hard-coded species count violations:', violations);
    }
    expect(violations).toEqual([]);
  });
});
