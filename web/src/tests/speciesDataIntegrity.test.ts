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
});
