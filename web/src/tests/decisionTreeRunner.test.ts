import { describe, it, expect } from 'vitest';
import {
  classifyBotanicalTraits,
  SAMPLE_TRAIT_PRESETS,
  type BotanicalTraitsInput,
} from '@/ml/decisionTreeRunner';

describe('Decision Tree Client-Side Edge Runner', () => {
  it('correctly classifies Tulsi (Holy Basil) preset with high confidence and decision trail', () => {
    const tulsiPreset = SAMPLE_TRAIT_PRESETS[0]!;
    const result = classifyBotanicalTraits(tulsiPreset.traits);

    expect(result.predictedId).toBe(0);
    expect(result.commonName).toBe('Tulsi');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.decisionTrail.length).toBeGreaterThan(0);
    expect(result.latencyMs).toBeLessThan(50); // Edge latency < 50ms (typically < 1ms)
  });

  it('correctly classifies Neem preset', () => {
    const neemPreset = SAMPLE_TRAIT_PRESETS[1]!;
    const result = classifyBotanicalTraits(neemPreset.traits);

    expect(result.predictedId).toBe(1);
    expect(result.commonName).toBe('Neem');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('correctly classifies Aloe vera with spiny margin and succulent habit', () => {
    const aloePreset = SAMPLE_TRAIT_PRESETS[2]!;
    const result = classifyBotanicalTraits(aloePreset.traits);

    expect(result.predictedId).toBe(2);
    expect(result.commonName).toBe('Aloe vera');
  });

  it('correctly classifies Peepal and distinguishes it from Banyan via leaf dimensions/shape', () => {
    const peepalPreset = SAMPLE_TRAIT_PRESETS[3]!;
    const result = classifyBotanicalTraits(peepalPreset.traits);

    expect(result.predictedId).toBe(17);
    expect(result.commonName).toBe('Peepal');
  });

  it('correctly handles composite flower head for Sunflower (Asteraceae)', () => {
    const sunflowerPreset = SAMPLE_TRAIT_PRESETS[4]!;
    const result = classifyBotanicalTraits(sunflowerPreset.traits);

    expect(result.predictedId).toBe(92);
    expect(result.commonName).toBe('Sunflower');
  });

  it('gracefully handles missing or zeroed inputs without throwing runtime errors', () => {
    const partialInput: BotanicalTraitsInput = {
      plant_growth_habit: 'tree',
      leaf_type: 'simple',
      leaf_shape: 'ovate',
      leaf_margin: 'entire',
      leaf_arrangement: 'alternate',
      leaf_venation: 'pinnate',
      leaf_length_cm: 15.0,
      leaf_width_cm: 8.0,
      plant_height_m: 10.0,
      flower_present: 'inconspicuous_or_absent',
      flower_color: 'brown_or_inconspicuous',
      petal_count: 0,
      is_composite_head: 'no',
      thorns_or_spines: 'absent',
      latex_or_sap: 'milky_white',
      aroma_of_crushed_leaves: 'none_or_faint',
    };

    expect(() => classifyBotanicalTraits(partialInput)).not.toThrow();
    const res = classifyBotanicalTraits(partialInput);
    expect(res.topPredictions.length).toBeGreaterThan(0);
  });
});
