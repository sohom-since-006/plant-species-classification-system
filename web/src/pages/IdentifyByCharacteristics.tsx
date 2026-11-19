import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { getSpeciesSync } from '@/services/speciesService';
import {
  classifyBotanicalTraits,
  type BotanicalTraitsInput,
  type DecisionTreeResult,
} from '@/ml/decisionTreeRunner';
import {
  ArrowUpRight,
  Leaf,
  ShieldCheck,
  CheckCircle,
  Info,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Trash2,
} from '@/components/icons';
import {
  springDefault,
  staggerContainer,
  staggerItem,
  usePrefersReducedMotion,
} from '@/lib/motion';

export type BotanicalTraitsForm = {
  plant_growth_habit: string;
  plant_height_m: number | null;
  thorns_or_spines: string;
  latex_or_sap: string;
  leaf_type: string;
  leaf_shape: string;
  leaf_margin: string;
  leaf_arrangement: string;
  leaf_venation: string;
  aroma_of_crushed_leaves: string;
  leaf_length_cm: number | null;
  leaf_width_cm: number | null;
  flower_present: string;
  flower_color: string;
  petal_count: number | null;
  is_composite_head: string;
};

const BLANK_FORM: BotanicalTraitsForm = {
  plant_growth_habit: '',
  plant_height_m: null,
  thorns_or_spines: '',
  latex_or_sap: '',
  leaf_type: '',
  leaf_shape: '',
  leaf_margin: '',
  leaf_arrangement: '',
  leaf_venation: '',
  aroma_of_crushed_leaves: '',
  leaf_length_cm: null,
  leaf_width_cm: null,
  flower_present: '',
  flower_color: '',
  petal_count: null,
  is_composite_head: '',
};

type AnalysisPhase = 'idle' | 'analyzing' | 'result';

const ANALYSIS_STEPS = [
  'Reading morphological traits...',
  'Walking taxonomic decision tree...',
  'Matching species & calculating leaf purity...',
];

export function IdentifyByCharacteristics() {
  useDocumentTitle('Identify by Botanical Characteristics — Decision Tree Dichotomous Key');
  const prefersReduced = usePrefersReducedMotion();

  // 1. Start completely blank — no pre-filled values
  const [traits, setTraits] = useState<BotanicalTraitsForm>(BLANK_FORM);
  const [status, setStatus] = useState<AnalysisPhase>('idle');
  const [result, setResult] = useState<DecisionTreeResult | null>(null);
  const [isOutdated, setIsOutdated] = useState(false);
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Compute number of answered traits
  const answeredCount = useMemo(() => {
    let count = 0;
    if (traits.plant_growth_habit && traits.plant_growth_habit !== 'not_sure') count++;
    if (traits.plant_height_m !== null && !isNaN(traits.plant_height_m)) count++;
    if (traits.thorns_or_spines && traits.thorns_or_spines !== 'not_sure') count++;
    if (traits.latex_or_sap && traits.latex_or_sap !== 'not_sure') count++;
    if (traits.leaf_type && traits.leaf_type !== 'not_sure') count++;
    if (traits.leaf_shape && traits.leaf_shape !== 'not_sure') count++;
    if (traits.leaf_margin && traits.leaf_margin !== 'not_sure') count++;
    if (traits.leaf_arrangement && traits.leaf_arrangement !== 'not_sure') count++;
    if (traits.leaf_venation && traits.leaf_venation !== 'not_sure') count++;
    if (traits.aroma_of_crushed_leaves && traits.aroma_of_crushed_leaves !== 'not_sure') count++;
    if (traits.leaf_length_cm !== null && !isNaN(traits.leaf_length_cm)) count++;
    if (traits.leaf_width_cm !== null && !isNaN(traits.leaf_width_cm)) count++;
    if (traits.flower_present && traits.flower_present !== 'not_sure') count++;
    if (traits.flower_color && traits.flower_color !== 'not_sure') count++;
    if (traits.petal_count !== null && !isNaN(traits.petal_count)) count++;
    if (traits.is_composite_head && traits.is_composite_head !== 'not_sure') count++;
    return count;
  }, [traits]);

  const canSubmit = answeredCount >= 4;

  const primarySpecies = useMemo(() => {
    if (!result) return null;
    return getSpeciesSync(result.predictedId);
  }, [result]);

  const handleTraitChange = <K extends keyof BotanicalTraitsForm>(
    field: K,
    value: BotanicalTraitsForm[K]
  ) => {
    setTraits((prev) => ({ ...prev, [field]: value }));
    // If a result is already shown, mark it as outdated
    if (status === 'result') {
      setIsOutdated(true);
    }
  };

  const handleClearAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTraits(BLANK_FORM);
    setStatus('idle');
    setResult(null);
    setIsOutdated(false);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (prefersReduced) {
      // Skip animation under prefers-reduced-motion
      const treeInput: BotanicalTraitsInput = { ...traits };
      const output = classifyBotanicalTraits(treeInput);
      setResult(output);
      setStatus('result');
      setIsOutdated(false);
      return;
    }

    // Start 2.1-second analysing animation
    setStatus('analyzing');
    setIsOutdated(false);
    setAnalysisStepIdx(0);

    const stepInterval = 700;
    const step1Timer = setTimeout(() => setAnalysisStepIdx(1), stepInterval);
    const step2Timer = setTimeout(() => setAnalysisStepIdx(2), stepInterval * 2);

    timerRef.current = setTimeout(() => {
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      const treeInput: BotanicalTraitsInput = { ...traits };
      const output = classifyBotanicalTraits(treeInput);
      setResult(output);
      setStatus('result');
    }, 2100);
  };

  const aspectRatio =
    traits.leaf_length_cm !== null && traits.leaf_width_cm !== null && traits.leaf_width_cm > 0
      ? (traits.leaf_length_cm / traits.leaf_width_cm).toFixed(2)
      : null;

  return (
    <div className="min-h-screen pb-28 text-[var(--fg)]">
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
        <div className="liquid-glass rounded-2xl p-4 mb-6 border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200/90 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Limitation:</strong> Accuracy on simulated data (99.5%) measures how well the tree learned the simulated botanical trait ranges, not real-world field accuracy. Field testing on physical plants remains pending (<em>n</em> = 0 real measured specimens). In real field conditions, accuracy depends on observer measurement precision, leaf phenological maturity, and non-blooming seasons. Under our empirical noise stress tests (&plusmn;30% noise &amp; 30% missingness), top-1 accuracy degrades to 95.3% (96.0% top-3).
          </div>
        </div>

        {/* Progress & Guidance Banner */}
        <div className="liquid-glass rounded-2xl p-4 mb-8 border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between text-xs max-w-md">
              <span className="font-semibold text-white font-mono flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {answeredCount} of 16 traits answered
              </span>
              <span className="text-[var(--fg-muted)] font-mono">
                {Math.round((answeredCount / 16) * 100)}% complete
              </span>
            </div>
            <div className="w-full max-w-md h-2 rounded-full bg-black/50 overflow-hidden border border-emerald-900/50">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(4, (answeredCount / 16) * 100)}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-[var(--fg-muted)] md:text-right max-w-md">
            <span className="text-emerald-400 font-medium font-mono uppercase text-[11px] block sm:inline mr-1">
              ★ High-impact traits:
            </span>
            <span>Petal count, Leaf dimensions, Arrangement, Latex/Sap, and Growth Habit.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Growth Habit & Stem */}
            <div className="liquid-glass rounded-2xl p-6 border border-emerald-900/40">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading text-white flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                    1
                  </span>
                  Habit & Stem Characteristics
                </h2>
                <span className="text-[10px] font-mono text-[var(--fg-muted)]">Vegetative habit</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Growth Habit */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Growth Habit
                    </label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      High impact
                    </span>
                  </div>
                  <select
                    value={traits.plant_growth_habit}
                    onChange={(e) => handleTraitChange('plant_growth_habit', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select habit (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="herb">Herb (Soft, non-woody)</option>
                    <option value="shrub">Shrub (Woody, multi-stemmed)</option>
                    <option value="tree">Tree (Single woody trunk)</option>
                    <option value="climber">Climber / Vine (Scandent)</option>
                    <option value="grass">Grass / Graminoid</option>
                    <option value="succulent">Succulent (Fleshy water-storing)</option>
                    <option value="aquatic">Aquatic (Floating / emergent)</option>
                  </select>
                </div>

                {/* Plant Height Slider (Starts unset) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Plant Height
                    </label>
                    <div className="flex items-center gap-2">
                      {traits.plant_height_m === null ? (
                        <span className="text-xs font-mono text-[var(--fg-muted)] italic">Not set</span>
                      ) : (
                        <>
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {traits.plant_height_m} m
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTraitChange('plant_height_m', null)}
                            className="text-[10px] font-mono text-amber-400 hover:underline"
                            title="Reset to unset"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="35.0"
                    step="0.1"
                    value={traits.plant_height_m ?? 5.0}
                    onChange={(e) => handleTraitChange('plant_height_m', parseFloat(e.target.value))}
                    className={`w-full cursor-pointer accent-emerald-500 ${
                      traits.plant_height_m === null ? 'opacity-40' : 'opacity-100'
                    }`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[var(--fg-muted)] mt-1">
                    <span>0.1 m</span>
                    <span>{traits.plant_height_m === null ? 'Slide to set height' : '15 m'}</span>
                    <span>35 m</span>
                  </div>
                </div>

                {/* Thorns */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Thorns / Armatures
                    </label>
                  </div>
                  <select
                    value={traits.thorns_or_spines}
                    onChange={(e) => handleTraitChange('thorns_or_spines', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select thorns (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="absent">Absent (Smooth / unarmed)</option>
                    <option value="spines_or_thorns_on_stem">Spines or Thorns on Stem</option>
                    <option value="prickles">Prickles (Epidermal roses/mimosa)</option>
                    <option value="spiny_leaf_margins">Spiny Leaf Margins (Aloe)</option>
                  </select>
                </div>

                {/* Latex or Sap */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Latex or Sap Exudate
                    </label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      High impact
                    </span>
                  </div>
                  <select
                    value={traits.latex_or_sap}
                    onChange={(e) => handleTraitChange('latex_or_sap', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select sap (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading text-white flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                    2
                  </span>
                  Foliage Morphology & Dimensions
                </h2>
                <span className="text-[10px] font-mono text-[var(--fg-muted)]">Leaf characters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Leaf Type */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Leaf Type
                    </label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      High impact
                    </span>
                  </div>
                  <select
                    value={traits.leaf_type}
                    onChange={(e) => handleTraitChange('leaf_type', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select leaf type (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="simple">Simple (Undivided blade)</option>
                    <option value="pinnately_compound">Pinnately Compound (Neem, Rose)</option>
                    <option value="bipinnately_compound">Bipinnately Compound (Gulmohar, Mimosa)</option>
                    <option value="trifoliolate">Trifoliolate (Bael)</option>
                    <option value="scale_or_reduced">Scale or Reduced (Cactus)</option>
                  </select>
                </div>

                {/* Leaf Shape */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Leaf Outline Shape
                    </label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      High impact
                    </span>
                  </div>
                  <select
                    value={traits.leaf_shape}
                    onChange={(e) => handleTraitChange('leaf_shape', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select leaf shape (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
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

                {/* Leaf Margin */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Leaf Margin
                    </label>
                  </div>
                  <select
                    value={traits.leaf_margin}
                    onChange={(e) => handleTraitChange('leaf_margin', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select leaf margin (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="entire">Entire (Smooth edge)</option>
                    <option value="serrate">Serrate (Saw-toothed forward)</option>
                    <option value="dentate">Dentate (Sharp outward teeth, Tulsi)</option>
                    <option value="crenate">Crenate (Scalloped blunt rounded teeth)</option>
                    <option value="lobed">Lobed (Deep sinuses, Monstera/Papaya)</option>
                    <option value="spiny">Spiny (Rigid prickly teeth, Aloe)</option>
                  </select>
                </div>

                {/* Leaf Arrangement */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Leaf Arrangement
                    </label>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      High impact
                    </span>
                  </div>
                  <select
                    value={traits.leaf_arrangement}
                    onChange={(e) => handleTraitChange('leaf_arrangement', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select arrangement (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="alternate">Alternate (One leaf per node)</option>
                    <option value="opposite">Opposite (Pairs facing across stem)</option>
                    <option value="whorled">Whorled (3+ leaves in a circle, Oleander)</option>
                    <option value="basal_rosette">Basal Rosette (Radiating from base)</option>
                    <option value="spiral">Spiral (Ascending helix)</option>
                    <option value="distichous">Distichous (Two opposite vertical ranks)</option>
                  </select>
                </div>

                {/* Leaf Venation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Leaf Venation
                    </label>
                  </div>
                  <select
                    value={traits.leaf_venation}
                    onChange={(e) => handleTraitChange('leaf_venation', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select venation (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="pinnate">Pinnate (Central midrib with laterals)</option>
                    <option value="palmate">Palmate (Several primary veins from base)</option>
                    <option value="parallel">Parallel (Monocot grasses / palms)</option>
                    <option value="absent_or_obscure">Absent or Obscure (Succulents)</option>
                  </select>
                </div>

                {/* Aroma */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Aroma of Crushed Leaves
                    </label>
                  </div>
                  <select
                    value={traits.aroma_of_crushed_leaves}
                    onChange={(e) => handleTraitChange('aroma_of_crushed_leaves', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select aroma (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="none_or_faint">None or Faint</option>
                    <option value="aromatic_pleasant">Aromatic Pleasant (Mint, Basil)</option>
                    <option value="pungent_or_strong">Pungent / Strong (Tulsi, Neem, Curry)</option>
                    <option value="citrusy">Citrusy (Lemon, Lemongrass, Bael)</option>
                    <option value="sweet_floral">Sweet Floral (Jasmine foliage)</option>
                  </select>
                </div>
              </div>

              {/* Dimension Sliders (Both start unset) */}
              <div className="pt-4 border-t border-emerald-900/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Leaf Length Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                        Leaf Length
                      </label>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        High impact
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {traits.leaf_length_cm === null ? (
                        <span className="text-xs font-mono text-[var(--fg-muted)] italic">Not set</span>
                      ) : (
                        <>
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {traits.leaf_length_cm} cm
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTraitChange('leaf_length_cm', null)}
                            className="text-[10px] font-mono text-amber-400 hover:underline"
                            title="Reset to unset"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="100.0"
                    step="0.5"
                    value={traits.leaf_length_cm ?? 15.0}
                    onChange={(e) => handleTraitChange('leaf_length_cm', parseFloat(e.target.value))}
                    className={`w-full cursor-pointer accent-emerald-500 ${
                      traits.leaf_length_cm === null ? 'opacity-40' : 'opacity-100'
                    }`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[var(--fg-muted)] mt-1">
                    <span>0.5 cm</span>
                    <span>{traits.leaf_length_cm === null ? 'Slide to set length' : '50 cm'}</span>
                    <span>100 cm</span>
                  </div>
                </div>

                {/* Leaf Width Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                        Leaf Width
                      </label>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        High impact
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {traits.leaf_width_cm === null ? (
                        <span className="text-xs font-mono text-[var(--fg-muted)] italic">Not set</span>
                      ) : (
                        <>
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {traits.leaf_width_cm} cm {aspectRatio ? `(L/W: ${aspectRatio})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTraitChange('leaf_width_cm', null)}
                            className="text-[10px] font-mono text-amber-400 hover:underline"
                            title="Reset to unset"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="60.0"
                    step="0.2"
                    value={traits.leaf_width_cm ?? 6.0}
                    onChange={(e) => handleTraitChange('leaf_width_cm', parseFloat(e.target.value))}
                    className={`w-full cursor-pointer accent-emerald-500 ${
                      traits.leaf_width_cm === null ? 'opacity-40' : 'opacity-100'
                    }`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[var(--fg-muted)] mt-1">
                    <span>0.2 cm</span>
                    <span>{traits.leaf_width_cm === null ? 'Slide to set width' : '30 cm'}</span>
                    <span>60 cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Floral Characters */}
            <div className="liquid-glass rounded-2xl p-6 border border-emerald-900/40">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading text-white flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                    3
                  </span>
                  Floral Characteristics & Merosity
                </h2>
                <span className="text-[10px] font-mono text-[var(--fg-muted)]">Floral traits</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Flower Presence */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Flower Presence
                    </label>
                  </div>
                  <select
                    value={traits.flower_present}
                    onChange={(e) => handleTraitChange('flower_present', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select flowers (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="yes">Yes (Conspicuous flowers)</option>
                    <option value="inconspicuous_or_absent">Inconspicuous or Absent (Ficus, Grass)</option>
                    <option value="no">No (Non-flowering)</option>
                  </select>
                </div>

                {/* Primary Flower Color */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Primary Flower Color
                    </label>
                  </div>
                  <select
                    value={traits.flower_color}
                    onChange={(e) => handleTraitChange('flower_color', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select color (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
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

                {/* Petal Count Slider (Starts unset) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                        Petal Count
                      </label>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        High impact
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {traits.petal_count === null ? (
                        <span className="text-xs font-mono text-[var(--fg-muted)] italic">Not set</span>
                      ) : (
                        <>
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {traits.petal_count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTraitChange('petal_count', null)}
                            className="text-[10px] font-mono text-amber-400 hover:underline"
                            title="Reset to unset"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={traits.petal_count ?? 5}
                    onChange={(e) => handleTraitChange('petal_count', parseInt(e.target.value, 10))}
                    className={`w-full cursor-pointer accent-emerald-500 ${
                      traits.petal_count === null ? 'opacity-40' : 'opacity-100'
                    }`}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[var(--fg-muted)] mt-1">
                    <span>0</span>
                    <span>{traits.petal_count === null ? 'Slide to set petal count' : '10'}</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Composite Head */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-[var(--fg-muted)]">
                      Composite Head (Asteraceae)
                    </label>
                  </div>
                  <select
                    value={traits.is_composite_head}
                    onChange={(e) => handleTraitChange('is_composite_head', e.target.value)}
                    className="w-full bg-[#08120d] border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select type (or Skip) --</option>
                    <option value="not_sure">Not sure / skip</option>
                    <option value="no">No (Simple individual flowers)</option>
                    <option value="yes">Yes (Sunflower, Marigold capitulum)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Desktop Actions Bar */}
            <div className="liquid-glass rounded-2xl p-5 border border-emerald-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[var(--fg-muted)]">
                {canSubmit ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Ready to classify ({answeredCount} of 16 traits specified)
                  </span>
                ) : (
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    Answer at least 4 traits to identify species ({answeredCount}/16 answered)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={answeredCount === 0 && status === 'idle'}
                  className="px-4 py-2.5 rounded-xl border border-emerald-800/40 bg-black/30 hover:bg-emerald-950/40 text-xs font-mono text-[var(--fg-muted)] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>

                <SolidButton
                  onClick={handleSubmit}
                  disabled={!canSubmit || status === 'analyzing'}
                  className="flex-1 sm:flex-none justify-center py-2.5 px-6 text-sm"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {isOutdated ? 'Update Identification' : 'Submit / Identify'}
                </SolidButton>
              </div>
            </div>
          </div>

          {/* RIGHT: Dynamic Results Area (5 cols, sticky on desktop) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Outdated Result Notice */}
            {isOutdated && status === 'result' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass rounded-2xl p-4 border border-amber-500/40 bg-amber-950/30 text-xs text-amber-200 flex items-start justify-between gap-3 shadow-lg"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Traits Modified</div>
                    <div className="text-[11px] text-amber-200/90 leading-relaxed">
                      You modified input characteristics. Submit again to synchronize the prediction.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-medium shrink-0"
                >
                  Update
                </button>
              </motion.div>
            )}

            {/* ── STATE 1: IDLE / WAITING ──────────────────────────── */}
            {status === 'idle' && (
              <div className="liquid-glass rounded-3xl p-8 border border-emerald-900/40 text-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 opacity-80" />
                </div>
                <h3 className="text-lg font-heading text-white mb-2">Awaiting Specimen Traits</h3>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed mb-6 max-w-sm mx-auto">
                  Select at least <strong>4 observable botanical traits</strong> on the left and click{' '}
                  <strong className="text-white">"Submit / Identify"</strong>. The decision tree will traverse its compiled dichotomous key to predict the taxon.
                </p>

                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-900/30 text-left text-xs space-y-2">
                  <div className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider font-semibold">
                    Unbiased Missing-Trait Policy
                  </div>
                  <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                    Every trait has a <em>"Not sure / skip"</em> option. Skipped categorical traits are treated as unobserved; omitted numeric measurements use population median imputation from training.
                  </p>
                </div>
              </div>
            )}

            {/* ── STATE 2: ANALYSING ANIMATION ─────────────────────── */}
            {status === 'analyzing' && (
              <div
                className="liquid-glass rounded-3xl p-8 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/70 relative overflow-hidden min-h-[380px] flex flex-col justify-between"
                aria-live="polite"
              >
                {/* Botanical Grid Background */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="dt-scan-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                      <path
                        d="M 28 0 L 0 0 0 28"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="0.5"
                        strokeOpacity="0.4"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#dt-scan-grid)" />
                </svg>

                {/* Sweeping Scan Line */}
                {!prefersReduced && (
                  <motion.div
                    className="absolute left-0 right-0 h-[2px] z-10 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, var(--accent) 25%, #ffffff 50%, var(--accent) 75%, transparent 100%)',
                      boxShadow: '0 0 16px 3px var(--accent)',
                    }}
                    initial={{ top: '5%' }}
                    animate={{
                      top: ['5%', '92%', '5%'],
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 1.8,
                      ease: 'easeInOut',
                      repeat: Infinity,
                    }}
                  />
                )}

                {/* Header status */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-xs font-mono uppercase text-emerald-400 tracking-wider">
                      Evaluating Tree Rules
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                    {answeredCount} Inputs Specified
                  </span>
                </div>

                {/* Central Animation: Tree Pulse & Radar */}
                <div className="relative z-10 text-center my-6">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    {!prefersReduced && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                      />
                    )}
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                      <Leaf className="w-8 h-8" />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={analysisStepIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="mt-4"
                    >
                      <div className="text-base font-heading text-white">
                        {ANALYSIS_STEPS[analysisStepIdx]}
                      </div>
                      <div className="text-xs text-emerald-300/80 font-mono mt-1">
                        Traversing {50} species • Branching depth &le; 17
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom Step Dots */}
                <div className="relative z-10 flex justify-center items-center gap-2 pt-4 border-t border-emerald-900/40">
                  {ANALYSIS_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === analysisStepIdx
                          ? 'w-6 bg-emerald-400'
                          : i < analysisStepIdx
                          ? 'w-2 bg-emerald-600'
                          : 'w-2 bg-emerald-950 border border-emerald-900'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── STATE 3: PREDICTION RESULT ───────────────────────── */}
            {status === 'result' && result && (
              <motion.div
                variants={staggerContainer(0.08, 0.02)}
                initial={prefersReduced ? false : 'hidden'}
                animate="show"
                className="space-y-6"
              >
                {/* 1. Primary Species Card */}
                <motion.div
                  variants={staggerItem}
                  transition={springDefault}
                  className={`liquid-glass rounded-3xl p-6 border-2 transition-colors relative overflow-hidden shadow-xl shadow-emerald-950/50 ${
                    isOutdated ? 'border-amber-500/40 opacity-90' : 'border-emerald-500/50'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/20">
                    Decision Tree Result
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    {primarySpecies?.referenceImages?.[0] ? (
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

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {/* Honest Metric Label: Leaf Purity */}
                        <div className="group relative">
                          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 cursor-help">
                            Leaf purity: {(result.confidence * 100).toFixed(1)}%
                            <Info className="w-3 h-3 text-emerald-400" />
                          </span>
                          <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 z-20 w-64 p-2 bg-black/95 text-[10px] text-gray-300 rounded-lg border border-emerald-800/60 shadow-xl leading-normal pointer-events-none">
                            <strong>Leaf purity:</strong> The proportion of training samples matching this terminal leaf. This is not a real-world field accuracy.
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-[var(--fg-muted)]">
                          {result.treeDepth} Splits ({result.latencyMs} ms)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Species Encyclopedia Link */}
                  {primarySpecies?.slug && (
                    <Link to={`/species/${primarySpecies.slug}`} className="block mb-5">
                      <SolidButton className="w-full text-xs py-2 justify-center">
                        View {result.commonName} Full Botanical Profile{' '}
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </SolidButton>
                    </Link>
                  )}

                  {/* Alternative Candidate Species */}
                  {result.topPredictions.length > 1 && (
                    <div className="pt-4 border-t border-emerald-900/40 mb-4">
                      <div className="text-[11px] font-mono uppercase text-[var(--fg-muted)] mb-2 flex items-center justify-between">
                        <span>Alternative Candidates at Terminal Leaf:</span>
                        <span className="text-[10px] text-emerald-400 font-normal">Leaf Share</span>
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
                      <strong>Safety Notice:</strong> Botanical rule predictions are for academic taxonomy and study. Never ingest wild specimens based solely on algorithmic classification.
                    </span>
                  </div>
                </motion.div>

                {/* 2. Visual Decision Trail */}
                <motion.div
                  variants={staggerItem}
                  className="liquid-glass rounded-3xl p-6 border border-emerald-900/40"
                >
                  <div className="flex items-center justify-between mb-2">
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
                      <motion.div
                        key={step.nodeId}
                        initial={prefersReduced ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: prefersReduced ? 0 : 0.05 * idx, duration: 0.25 }}
                        className="p-2.5 rounded-xl bg-black/40 border border-emerald-900/30 text-xs flex items-start gap-2.5"
                      >
                        <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium leading-relaxed">
                            {step.explanation}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--fg-muted)] mt-0.5">
                            Node #{step.nodeId} • Feature: <span className="text-emerald-400">{step.feature}</span>
                          </div>
                        </div>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-1" />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
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
          <p className="leading-relaxed">
            <strong>Field Testing:</strong> Status is pending (<em>n</em> = 0 real measured specimens). The demo rows in <code className="px-1.5 py-0.5 bg-black/40 rounded border border-emerald-900/60 text-emerald-300 font-mono text-[10px]">data/traits/field_test_template.csv</code> are synthetic examples derived from trait bounds for pipeline verification, not physical measurements. Real field accuracy will be evaluated once wild measured specimens are added with <code className="text-emerald-400 font-mono text-[10px]">source=measured</code>.
          </p>
        </div>
      </div>

      {/* ── MOBILE STICKY BOTTOM BAR (Screens < lg) ────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-black/90 backdrop-blur-md border-t border-emerald-900/60 z-30 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-xs font-mono font-semibold text-white">
            {answeredCount}/16 Traits
          </span>
          <span className="text-[10px] text-[var(--fg-muted)]">
            {canSubmit ? 'Ready to classify' : 'Need ≥ 4 traits'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {answeredCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 rounded-xl border border-emerald-800/40 bg-black/40 text-[var(--fg-muted)] hover:text-white"
              title="Clear all"
              aria-label="Clear all inputs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <SolidButton
            onClick={handleSubmit}
            disabled={!canSubmit || status === 'analyzing'}
            className="py-2 px-4 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {isOutdated ? 'Update' : 'Identify'}
          </SolidButton>
        </div>
      </div>
    </div>
  );
}

export default IdentifyByCharacteristics;
