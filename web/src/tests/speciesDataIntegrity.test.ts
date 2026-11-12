import { describe, it, expect } from 'vitest';
import speciesJsonRaw from '@/data/species.json';
import type { Species } from '@/types/species';

const speciesData = speciesJsonRaw as Record<string, Species>;

describe('Species Data & Image Integrity', () => {
  it('contains all 112 species (0..111)', () => {
    for (let id = 0; id < 112; id++) {
      const sp = speciesData[String(id)];
      expect(sp).toBeDefined();
      expect(sp?.id).toBe(id);
    }
  });

  it('uses local webp image paths and no external unsplash URLs', () => {
    for (let id = 0; id < 112; id++) {
      const sp = speciesData[String(id)];
      expect(sp).toBeDefined();
      if (!sp) continue;

      expect(sp.referenceImages).toBeDefined();
      expect(sp.referenceImages.length).toBeGreaterThan(0);
      expect(sp.referenceImages[0]).toBe(`/species/${id}.webp`);

      // Verify no unsplash or external stock urls
      for (const img of sp.referenceImages) {
        expect(img).not.toContain('unsplash.com');
        expect(img.startsWith('/species/')).toBe(true);
      }
    }
  });

  it('verifies non-toxic status for Mint, Peepal, Lemongrass, Ashoka, and Betel', () => {
    const ashoka = speciesData['13'];
    expect(ashoka?.commonName.toLowerCase()).toContain('ashoka');
    expect(ashoka?.isToxic).toBe(false);

    const betel = speciesData['14'];
    expect(betel?.commonName.toLowerCase()).toContain('betel');
    expect(betel?.isToxic).toBe(false);

    const lemongrass = speciesData['15'];
    expect(lemongrass?.commonName.toLowerCase()).toContain('lemongrass');
    expect(lemongrass?.isToxic).toBe(false);

    const mint = speciesData['16'];
    expect(mint?.commonName.toLowerCase()).toContain('mint');
    expect(mint?.isToxic).toBe(false);

    const peepal = speciesData['17'];
    expect(peepal?.commonName.toLowerCase()).toContain('peepal');
    expect(peepal?.isToxic).toBe(false);
  });

  it('verifies toxic status for genuinely harmful species', () => {
    expect(speciesData['25']?.isToxic).toBe(true);
    expect(speciesData['26']?.isToxic).toBe(true);
    expect(speciesData['31']?.isToxic).toBe(true);
    expect(speciesData['33']?.isToxic).toBe(true);
    expect(speciesData['80']?.isToxic).toBe(true);
    expect(speciesData['90']?.isToxic).toBe(true);
    expect(speciesData['98']?.isToxic).toBe(true);
    expect(speciesData['99']?.isToxic).toBe(true);
  });

  it('includes proper image credits for dataset provenance', () => {
    for (let id = 0; id < 112; id++) {
      const sp = speciesData[String(id)];
      expect(sp).toBeDefined();
      if (!sp) continue;

      expect(sp.imageCredit).toBeDefined();
      if (sp.imageCredit) {
        expect(typeof sp.imageCredit.observer).toBe('string');
        expect(typeof sp.imageCredit.license).toBe('string');
      }
    }
  });

  it('verifies fact-check integrity: 91 verified TODO(verify) restored, no curative claims, and fetch-passing literature sources populated', () => {
    const rawText = JSON.stringify(speciesData);
    const todoMatches = rawText.match(/TODO\(verify\)/g);
    expect(todoMatches?.length).toBe(91);

    // Forbidden medical claims
    for (let id = 0; id < 112; id++) {
      const sp = speciesData[String(id)];
      if (!sp) continue;
      const combined = [sp.toxicityNote || '', ...sp.uses].join(' ');
      expect(combined).not.toMatch(/\b(treats|treating|cures|curing|proven)\b/i);
    }

    // Periwinkle (31) check
    const periwinkle = speciesData['31'];
    expect(periwinkle).toBeDefined();
    if (periwinkle) {
      expect(periwinkle.isToxic).toBe(true);
      expect(periwinkle.toxicityNote).toContain('CRITICAL TOXICITY WARNING');
      expect(periwinkle.toxicityNote).toContain('contraindicated');
      for (const use of periwinkle.uses) {
        expect(use.toLowerCase()).not.toContain('diabetes');
        expect(use.toLowerCase()).not.toContain('blood sugar');
      }
    }

    // Key toxic and warning species check
    const oleander = speciesData['26'];
    expect(oleander?.isToxic).toBe(true);
    expect(oleander?.toxicityNote).toMatch(/DEADLY TOXIC/i);

    const bottleGourd = speciesData['75'];
    expect(bottleGourd?.toxicityNote).toMatch(/CRITICAL TOXICITY WARNING/i);
    expect(bottleGourd?.toxicityNote).toMatch(/cucurbitacins/i);

    const neem = speciesData['1'];
    expect(neem?.toxicityNote).toMatch(/SAFETY ALERT & PEDIATRIC TOXICITY WARNING/i);

    const moringa = speciesData['10'];
    expect(moringa?.toxicityNote).toMatch(/spirochin/i);

    // Verify sources array presence (only fetch-passing sources retained)
    let speciesWithSources = 0;
    for (let id = 0; id < 112; id++) {
      const sp = speciesData[String(id)];
      if (sp && sp.sources && sp.sources.length > 0) {
        speciesWithSources++;
        for (const src of sp.sources) {
          expect(src.name).toBeDefined();
          expect(src.url.startsWith('http')).toBe(true);
        }
      }
    }
    expect(speciesWithSources).toBe(13);
  });
});
