import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { getSpeciesSync } from '@/services/speciesService';
import {
  classifyBotanicalTraits,
  SAMPLE_TRAIT_PRESETS,
  type BotanicalTraitsInput,
} from '@/ml/decisionTreeRunner';
import { ArrowUpRight, Leaf, ShieldCheck, CheckCircle, Info } from '@/components/icons';
import { springDefault } from '@/lib/motion';

const INITIAL_TRAITS: BotanicalTraitsInput = { ...SAMPLE_TRAIT_PRESETS[0]!.traits };

export function IdentifyByCharacteristics() {
  useDocumentTitle('Identify by Botanical Characteristics — Decision Tree Dichotomous Key');

  const [traits, setTraits] = useState<BotanicalTraitsInput>(INITIAL_TRAITS);
  const [selectedPreset, setSelectedPreset] = useState<string>('Tulsi (Holy Basil)');

  // Run instant edge inference whenever traits change
  const result = useMemo(() => {
    return classifyBotanicalTraits(traits);
  }, [traits]);

  const primarySpecies = useMemo(() => {
    return getSpeciesSync(result.predictedId);
  }, [result.predictedId]);

  const handleTraitChange = <K extends keyof BotanicalTraitsInput>(
    field: K,
    value: BotanicalTraitsInput[K]
  ) => {
    setSelectedPreset('');
    setTraits((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoadPreset = (preset: typeof SAMPLE_TRAIT_PRESETS[0]) => {
    setSelectedPreset(preset.label);
    setTraits({ ...preset.traits });
  };

  const aspectRatio = (traits.leaf_length_cm / (traits.leaf_width_cm || 1)).toFixed(2);

  return (
    <div className="min-h-screen pb-24 text-[var(--fg)]">
      {/* Hero Header */}
      <PageHero
        badge="Taxonomic Decision Tree"
        title="Identify by Characteristics"
        italicSubtitle="Botanical Dichotomous Key"
        description="Classify plant specimens from human-observable morphological attributes using our interpretable, on-device Decision Tree trained across 50 rigorously sourced botanical species."
        compact
      >
        {/* Scope Notice */}
        <div className="mt-3 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 max-w-full text-center">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Decision tree covers <strong>50 species</strong>. Use{' '}
              <Link to="/identify" className="underline hover:text-white font-medium">
                Identify by Photo
              </Link>{' '}
              for all 150.
            </span>
          </div>
        </div>

        {/* Preset Plant Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs uppercase font-mono tracking-wider text-[var(--fg-muted)] mr-1">
            Demo examples, taken from the trait table:
          </span>
          {SAMPLE_TRAIT_PRESETS.map((preset) => {
            const isActive = selectedPreset === preset.label;
            return (
              <button
                key={preset.label}
                onClick={() => handleLoadPreset(preset)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/20'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60'
                }`}
                aria-pressed={isActive}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Academic Model Stats Banner */}
        <div className="liquid-glass rounded-2xl p-4 mb-4 border border-emerald-800/30 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">Edge Decision Tree Classifier v1.0</div>
              <div className="text-[var(--fg-muted)]">50 Catalog Taxa • Depth 17 • 52 Leaf Nodes • &lt; 0.1 ms Traversal</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 font-mono">
            <span className="px-2.5 py-1 rounded bg-black/40 border border-emerald-900/50 text-emerald-400">
              Simulated Accuracy: <strong className="text-white">99.5%</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-black/40 border border-emerald-900/50 text-emerald-400">
              Macro F1: <strong className="text-white">0.995</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-black/40 border border-emerald-900/50 text-emerald-400 hidden sm:inline">
              Random Forest: <strong className="text-white">99.9%</strong>
            </span>
          </div>
        </div>

        {/* Academic Simulation Limitation Notice */}
        <div className="liquid-glass rounded-2xl p-4 mb-8 border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200/90 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Limitation:</strong> Accuracy on simulated data (99.5%) measures how well the tree learned the simulated botanical trait ranges, not real-world field accuracy. In real field conditions, accuracy depends on observer measurement precision, leaf phenological maturity, and non-blooming seasons. Under our empirical noise stress tests (±30% noise &amp; 30% missingness), top-1 accuracy degrades to 95.3% (96.0% top-3).
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Growth Habit & Stem */}
            <div className="liquid-glass rounded-2xl p-6 border border-emerald-900/40">
              <h2 className="text-lg font-heading text-white flex items-center gap-2 mb-4">
                <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                  1
                </span>
                Habit & Stem Characteristics
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Growth Habit
                  </label>
                  <select
                    value={traits.plant_growth_habit}
                    onChange={(e) => handleTraitChange('plant_growth_habit', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="herb">Herb (Soft, non-woody)</option>
                    <option value="shrub">Shrub (Woody, multi-stemmed)</option>
                    <option value="tree">Tree (Single woody trunk)</option>
                    <option value="climber">Climber / Vine (Scandent)</option>
                    <option value="grass">Grass / Graminoid</option>
                    <option value="succulent">Succulent (Fleshy water-storing)</option>
                    <option value="aquatic">Aquatic (Floating / emergent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Plant Height: <span className="text-emerald-400 font-bold">{traits.plant_height_m} m</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="35.0"
                    step="0.1"
                    value={traits.plant_height_m}
                    onChange={(e) => handleTraitChange('plant_height_m', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[var(--fg-muted)] mt-1">
                    <span>0.1 m</span>
                    <span>15 m</span>
                    <span>35 m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Thorns / Defensive Armatures
                  </label>
                  <select
                    value={traits.thorns_or_spines}
                    onChange={(e) => handleTraitChange('thorns_or_spines', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="absent">Absent (Smooth / unarmed)</option>
                    <option value="spines_or_thorns_on_stem">Spines or Thorns on Stem</option>
                    <option value="prickles">Prickles (Epidermal roses/mimosa)</option>
                    <option value="spiny_leaf_margins">Spiny Leaf Margins (Aloe)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Latex or Sap Exudate
                  </label>
                  <select
                    value={traits.latex_or_sap}
                    onChange={(e) => handleTraitChange('latex_or_sap', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="none_apparent">None Apparent</option>
                    <option value="milky_white">Milky White (Ficus, Euphorbia)</option>
                    <option value="watery_clear">Watery Clear</option>
                    <option value="colored_yellow_red">Colored Yellow / Red (Aloe)</option>
                    <option value="sticky_resinous">Sticky Resinous (Mango)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Foliage & Leaf Morphometrics */}
            <div className="liquid-glass rounded-2xl p-6 border border-emerald-900/40">
              <h2 className="text-lg font-heading text-white flex items-center gap-2 mb-4">
                <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                  2
                </span>
                Foliage Morphology & Dimensions
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Leaf Type
                  </label>
                  <select
                    value={traits.leaf_type}
                    onChange={(e) => handleTraitChange('leaf_type', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="simple">Simple (Undivided blade)</option>
                    <option value="pinnately_compound">Pinnately Compound (Neem, Rose)</option>
                    <option value="bipinnately_compound">Bipinnately Compound (Gulmohar, Mimosa)</option>
                    <option value="trifoliolate">Trifoliolate (Bael)</option>
                    <option value="scale_or_reduced">Scale or Reduced (Cactus)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Leaf Outline Shape
                  </label>
                  <select
                    value={traits.leaf_shape}
                    onChange={(e) => handleTraitChange('leaf_shape', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ovate">Ovate (Egg-shaped, wider at base)</option>
                    <option value="elliptic">Elliptic (Widest at middle)</option>
                    <option value="lanceolate">Lanceolate (Lance-like, pointed)</option>
                    <option value="linear">Linear (Long and narrow strap)</option>
                    <option value="oblong">Oblong (Parallel margins)</option>
                    <option value="cordate">Cordate (Heart-shaped, Peepal/Betel)</option>
                    <option value="orbicular">Orbicular (Circular, Lotus)</option>
                    <option value="palmate_lobed">Palmate Lobed (Papaya, Okra)</option>
                    <option value="spatulate">Spatulate / Panduriform (Nag Champa)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Leaf Margin
                  </label>
                  <select
                    value={traits.leaf_margin}
                    onChange={(e) => handleTraitChange('leaf_margin', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="entire">Entire (Smooth edge)</option>
                    <option value="serrate">Serrate (Saw-toothed forward)</option>
                    <option value="dentate">Dentate (Sharp outward teeth, Tulsi)</option>
                    <option value="crenate">Crenate (Scalloped blunt rounded teeth)</option>
                    <option value="lobed">Lobed (Deep sinuses, Monstera/Papaya)</option>
                    <option value="spiny">Spiny (Rigid prickly teeth, Aloe)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Leaf Arrangement (Phyllotaxis)
                  </label>
                  <select
                    value={traits.leaf_arrangement}
                    onChange={(e) => handleTraitChange('leaf_arrangement', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="alternate">Alternate (One leaf per node)</option>
                    <option value="opposite">Opposite (Pairs facing across stem)</option>
                    <option value="whorled">Whorled (3+ leaves in a circle, Oleander)</option>
                    <option value="basal_rosette">Basal Rosette (Radiating from base)</option>
                    <option value="spiral">Spiral (Ascending helix)</option>
                    <option value="distichous">Distichous (Two opposite vertical ranks)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Leaf Venation
                  </label>
                  <select
                    value={traits.leaf_venation}
                    onChange={(e) => handleTraitChange('leaf_venation', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pinnate">Pinnate (Central midrib with laterals)</option>
                    <option value="palmate">Palmate (Several primary veins from base)</option>
                    <option value="parallel">Parallel (Monocot grasses / palms)</option>
                    <option value="absent_or_obscure">Absent or Obscure (Succulents)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Aroma of Crushed Leaves
                  </label>
                  <select
                    value={traits.aroma_of_crushed_leaves}
                    onChange={(e) => handleTraitChange('aroma_of_crushed_leaves', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="none_or_faint">None or Faint</option>
                    <option value="aromatic_pleasant">Aromatic Pleasant (Mint, Basil)</option>
                    <option value="pungent_or_strong">Pungent / Strong (Tulsi, Neem, Curry)</option>
                    <option value="citrusy">Citrusy (Lemon, Lemongrass, Bael)</option>
                    <option value="sweet_floral">Sweet Floral (Jasmine foliage)</option>
                  </select>
                </div>
              </div>

              {/* Dimension Sliders */}
              <div className="pt-4 border-t border-emerald-900/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Leaf Length
                    </label>
                    <span className="text-emerald-400 font-mono font-bold text-xs">
                      {traits.leaf_length_cm} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="100.0"
                    step="0.5"
                    value={traits.leaf_length_cm}
                    onChange={(e) => handleTraitChange('leaf_length_cm', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Leaf Width
                    </label>
                    <span className="text-emerald-400 font-mono font-bold text-xs">
                      {traits.leaf_width_cm} cm (Ratio: {aspectRatio})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="60.0"
                    step="0.2"
                    value={traits.leaf_width_cm}
                    onChange={(e) => handleTraitChange('leaf_width_cm', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Floral Characters */}
            <div className="liquid-glass rounded-2xl p-6 border border-emerald-900/40">
              <h2 className="text-lg font-heading text-white flex items-center gap-2 mb-4">
                <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                  3
                </span>
                Floral Characteristics & Merosity
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Flower Presence
                  </label>
                  <select
                    value={traits.flower_present}
                    onChange={(e) => handleTraitChange('flower_present', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="yes">Yes (Conspicuous flowers)</option>
                    <option value="inconspicuous_or_absent">Inconspicuous or Absent (Ficus, Grass)</option>
                    <option value="no">No (Non-flowering)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Primary Flower Color
                  </label>
                  <select
                    value={traits.flower_color}
                    onChange={(e) => handleTraitChange('flower_color', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="white">White / Cream</option>
                    <option value="yellow">Yellow / Golden</option>
                    <option value="red_or_crimson">Red / Crimson / Scarlet</option>
                    <option value="pink_or_magenta">Pink / Magenta</option>
                    <option value="purple_or_violet">Purple / Violet / Lilac</option>
                    <option value="blue">Blue (Butterfly pea)</option>
                    <option value="orange">Orange (Marigold, Parijat tube)</option>
                    <option value="green">Greenish (Rice, Snake plant)</option>
                    <option value="brown_or_inconspicuous">Brown / Inconspicuous (Figs)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Petal Count: <span className="text-emerald-400 font-bold">{traits.petal_count}</span>
                    </label>
                    <span className="text-[10px] text-[var(--fg-muted)]">(0 for apetalous / composite)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={traits.petal_count}
                    onChange={(e) => handleTraitChange('petal_count', parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[var(--fg-muted)] mt-1">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[var(--fg-muted)] mb-1.5">
                    Composite Flower Head (Asteraceae)
                  </label>
                  <select
                    value={traits.is_composite_head}
                    onChange={(e) => handleTraitChange('is_composite_head', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="no">No (Simple individual flowers)</option>
                    <option value="yes">Yes (Sunflower, Marigold capitulum)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Prediction & Decision Trail (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Prediction Result Card */}
            <motion.div
              layout
              transition={springDefault}
              className="liquid-glass rounded-3xl p-6 border-2 border-emerald-500/40 shadow-xl shadow-emerald-950/50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/20">
                Rule Tree Prediction
              </div>

              <div className="flex items-start gap-4 mb-4">
                {primarySpecies.referenceImages?.[0] ? (
                  <img
                    src={primarySpecies.referenceImages[0]}
                    alt={result.commonName}
                    className="w-20 h-20 rounded-2xl object-cover border border-emerald-700/40 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-emerald-900/40 flex items-center justify-center text-emerald-400 border border-emerald-700/40 shrink-0">
                    <Leaf className="w-8 h-8" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                    {result.family} Family
                  </div>
                  <h3 className="text-2xl font-heading text-white truncate leading-tight">
                    {result.commonName}
                  </h3>
                  <p className="text-xs italic text-[var(--fg-muted)] truncate">
                    {result.scientificName}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {(result.confidence * 100).toFixed(1)}% Confidence
                    </span>
                    <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                      {result.treeDepth} Tree Splits
                    </span>
                  </div>
                </div>
              </div>

              {/* Link to Full Species Encyclopedia Profile */}
              <Link to={`/species/${primarySpecies.slug}`} className="block mb-6">
                <SolidButton className="w-full text-xs py-2 justify-center">
                  View {result.commonName} Full Botanical Profile{' '}
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </SolidButton>
              </Link>

              {/* Alternate Candidate Species */}
              {result.topPredictions.length > 1 && (
                <div className="pt-4 border-t border-emerald-900/40 mb-4">
                  <div className="text-[11px] font-mono uppercase text-[var(--fg-muted)] mb-2">
                    Alternative Candidates at Current Leaf Node:
                  </div>
                  <div className="space-y-2">
                    {result.topPredictions.slice(1, 3).map((cand) => (
                      <div
                        key={cand.speciesId}
                        className="flex items-center justify-between text-xs bg-black/30 px-3 py-2 rounded-xl border border-emerald-900/30"
                      >
                        <div>
                          <span className="text-white font-medium">{cand.commonName}</span>{' '}
                          <span className="italic text-[var(--fg-muted)]">({cand.scientificName})</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {(cand.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical/Safety Disclaimer */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Notice:</strong> Botanical rule predictions are for academic taxonomy
                  and study. Never ingest wild specimens based solely on algorithmic classification.
                </span>
              </div>
            </motion.div>

            {/* Visual Decision Trail */}
            <div className="liquid-glass rounded-3xl p-6 border border-emerald-900/40">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-heading text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-400" />
                  Taxonomic Decision Trail ({result.decisionTrail.length} Steps)
                </h4>
                <span className="text-[10px] font-mono text-emerald-400">
                  {result.latencyMs} ms
                </span>
              </div>
              <p className="text-xs text-[var(--fg-muted)] mb-4">
                The exact branching logic followed by the Decision Tree from root to terminal leaf node:
              </p>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {result.decisionTrail.map((step, idx) => (
                  <div
                    key={step.nodeId}
                    className="p-2.5 rounded-xl bg-black/40 border border-emerald-900/30 text-xs flex items-start gap-2.5"
                  >
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium">{step.explanation}</div>
                      <div className="text-[10px] font-mono text-[var(--fg-muted)] mt-0.5">
                        Node #{step.nodeId} • Feature: <span className="text-emerald-400">{step.feature}</span>
                      </div>
                    </div>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Provenance & Verification Footer */}
        <div className="mt-12 pt-8 border-t border-emerald-900/40 text-xs text-[var(--fg-muted)] space-y-2">
          <div className="flex items-center gap-2 font-mono uppercase tracking-wider text-emerald-400 text-[11px]">
            <ShieldCheck className="w-4 h-4" />
            Data Provenance &amp; Verification Status
          </div>
          <p className="leading-relaxed">
            Botanical trait bounds were compiled by an AI assistant from authoritative botanical floras (Flora of China / eFloras, Royal Botanic Gardens Kew POWO, and Flora of India). Automated web-verification scripts were blocked by reference repositories (Cloudflare HTTP 403). Consequently, all 50 species are formally categorized with <code className="px-1.5 py-0.5 bg-black/40 rounded border border-emerald-900/60 text-amber-300 font-mono text-[10px]">needs_verification = yes</code> pending manual taxonomic herbarium audit.
          </p>
          <p className="leading-relaxed">
            For physical laboratory measurements, see our benchmark on the <span className="text-white font-medium">UCI 100 Plant Species Leaves Dataset</span> (1,599 physical leaf specimens across 100 species; Decision Tree 50.84% CV / Random Forest 97.81% CV).
          </p>
        </div>
      </div>
    </div>
  );
}
export default IdentifyByCharacteristics;
