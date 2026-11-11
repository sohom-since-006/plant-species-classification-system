import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  getSpeciesById,
  hasRichContent,
  getMissingContentIds,
  getAllSpecies,
} from '@/services/speciesService';
import { ResultCard } from '@/features/classify/ResultCard';
import { SimilarSpecies } from '@/features/classify/SimilarSpecies';
import type { ClassificationResult } from '@/types/prediction';

describe('Species Resolution and Content Completeness', () => {
  it('resolves species ID 40 as Mango with complete botanical monograph', () => {
    const mango = getSpeciesById(40);
    expect(mango).toBeDefined();
    expect(mango.commonName).toBe('Mango');
    expect(mango.scientificName).toBe('Mangifera indica');
    expect(mango.family).toBe('Anacardiaceae');
    expect(mango.genus).toBe('Mangifera');
    expect(mango.namesHindi).toContain('आम');
    expect(mango.namesBengali).toContain('আম');
    expect(mango.plantType).toBe('tree');
    expect(hasRichContent(40)).toBe(true);
    expect(mango.identifyingFeatures.length).toBeGreaterThan(0);
    expect(mango.uses.length).toBeGreaterThan(0);
    expect(mango.careTips.length).toBeGreaterThan(0);
    expect(mango.toxicityNote).toBeTruthy();
  });

  it('guarantees every species index 0..111 has real taxonomy and regional names (never "Species #N")', () => {
    const all = getAllSpecies();
    expect(all.length).toBe(112);

    for (let id = 0; id < 112; id++) {
      const sp = getSpeciesById(id);
      expect(sp.id).toBe(id);
      expect(sp.commonName).not.toContain('Species #');
      expect(sp.commonName.length).toBeGreaterThan(0);
      expect(sp.scientificName.length).toBeGreaterThan(0);
      expect(sp.family.length).toBeGreaterThan(0);
      expect(sp.genus.length).toBeGreaterThan(0);
      expect(sp.namesHindi).not.toBeNull();
      expect(sp.namesBengali).not.toBeNull();
    }
  });

  it('identifies which species IDs currently lack rich monograph content', () => {
    const missing = getMissingContentIds();
    expect(missing).toBeInstanceOf(Array);
    expect(missing).not.toContain(40); // Mango has content
    expect(missing).not.toContain(0);  // Tulsi has content
    expect(missing).not.toContain(1);  // Neem has content
    expect(missing).not.toContain(2);  // Aloe vera has content
    expect(missing).not.toContain(97); // Sweet Basil has content
    expect(missing.length).toBeGreaterThan(0);
  });
});

describe('ResultCard with Mango and Regional Names', () => {
  const mangoResult: ClassificationResult = {
    top3: [
      { speciesId: 40, prob: 0.945 },
      { speciesId: 1, prob: 0.032 },
      { speciesId: 17, prob: 0.015 },
    ],
    tier: 'high',
    unknown: false,
    similar: [
      { speciesId: 12, ml: 0.02, visual: 0.78, final: 0.324 },
      { speciesId: 17, ml: 0.015, visual: 0.65, final: 0.269 },
    ],
    camData: null,
    modelVersion: 'v1.0.0',
    genusFallback: null,
  };

  it('renders Mango headline with scientific and bilingual Hindi/Bengali names', () => {
    const topSpecies = getSpeciesById(40);
    const candidateSpecies = mangoResult.top3.map((p) => getSpeciesById(p.speciesId));

    render(
      <MemoryRouter>
        <ResultCard
          result={mangoResult}
          topSpecies={topSpecies}
          candidateSpecies={candidateSpecies}
        />
      </MemoryRouter>
    );

    // Headline
    expect(screen.getByText('Mango')).toBeInTheDocument();
    expect(screen.getByText('Mangifera indica')).toBeInTheDocument();
    expect(screen.getByText(/Family: Anacardiaceae/i)).toBeInTheDocument();
    // Headline & Candidate matches render Hindi and Bengali names
    expect(screen.getByText(/Hindi:/)).toBeInTheDocument();
    expect(screen.getAllByText(/आम/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Bengali:/)).toBeInTheDocument();
    expect(screen.getAllByText(/আম/).length).toBeGreaterThanOrEqual(1);

    // Top candidates must not display Species #N
    expect(screen.queryByText(/Species #/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Species ID #/)).not.toBeInTheDocument();
  });
});

describe('SimilarSpecies Component with Real Species', () => {
  it('renders real species names, same genus badge, and regional names', () => {
    const topSpecies = getSpeciesById(40);
    const speciesMap = new Map();
    getAllSpecies().forEach((s) => speciesMap.set(s.id, s));

    const matches = [
      { speciesId: 12, ml: 0.02, visual: 0.78, final: 0.324 },
    ];

    render(
      <MemoryRouter>
        <SimilarSpecies
          similarMatches={matches}
          topSpecies={topSpecies}
          speciesMap={speciesMap}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Species #/)).not.toBeInTheDocument();
    expect(screen.getByText('Terminalia arjuna')).toBeInTheDocument();
  });
});
