/**
 * decisionTreeRunner.ts
 * High-performance, client-side Decision Tree inference engine.
 * Traverses pre-trained JSON decision tree models with zero backend latency (< 0.2ms),
 * generating top-3 species predictions, calibrated confidence scores, and an explainable Decision Trail.
 */

import treeDataDefault from '@/data/decision_tree_50.json';

export interface BotanicalTraitsInput {
  plant_growth_habit: string;
  leaf_type: string;
  leaf_shape: string;
  leaf_margin: string;
  leaf_arrangement: string;
  leaf_venation: string;
  leaf_length_cm: number;
  leaf_width_cm: number;
  plant_height_m: number;
  flower_present: string;
  flower_color: string;
  petal_count: number;
  is_composite_head: string;
  thorns_or_spines: string;
  latex_or_sap: string;
  aroma_of_crushed_leaves: string;
}

export interface DecisionTrailStep {
  nodeId: number;
  feature: string;
  threshold: number;
  observedValue: number | string;
  conditionMet: boolean;
  explanation: string;
  depth: number;
}

export interface PredictionCandidate {
  speciesId: number;
  commonName: string;
  scientificName: string;
  family: string;
  probability: number;
}

export interface DecisionTreeResult {
  predictedId: number;
  commonName: string;
  scientificName: string;
  family: string;
  confidence: number;
  topPredictions: PredictionCandidate[];
  decisionTrail: DecisionTrailStep[];
  treeDepth: number;
  latencyMs: number;
}

interface TreeNode {
  id: number;
  is_leaf: boolean;
  feature?: string;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  predicted_id: number;
  predicted_name: string;
  confidence: number;
  samples?: number;
  top_predictions?: Array<{
    species_id: number;
    common_name: string;
    scientific_name: string;
    family: string;
    probability: number;
  }>;
}

interface DecisionTreeModel {
  metadata: {
    name: string;
    version: string;
    classes_count: number;
    tree_depth: number;
    leaf_nodes: number;
    accuracy: number;
    macro_f1: number;
  };
  numeric_features: string[];
  categorical_features: string[];
  encoded_feature_names: string[];
  species_catalog: Record<string, { id: number; common_name: string; scientific_name: string; family: string }>;
  root: TreeNode;
}

const typedTreeData = treeDataDefault as unknown as DecisionTreeModel;
const numericSet = new Set(typedTreeData.numeric_features);
const categoricalSet = new Set(typedTreeData.categorical_features);

/**
 * Format a human-readable botanical rationale for a given tree split.
 */
function formatStepExplanation(
  feature: string,
  threshold: number,
  observedVal: number | string,
  goesLeft: boolean,
  input: BotanicalTraitsInput
): string {
  if (numericSet.has(feature)) {
    const num = Number(observedVal);
    const unit = feature.includes('_cm') ? 'cm' : feature.includes('_m') ? 'm' : '';
    const featLabel = feature
      .replace(/_/g, ' ')
      .replace(' cm', '')
      .replace(' m', '');
    return goesLeft
      ? `${featLabel} (${num} ${unit}) is ≤ ${threshold} ${unit}`
      : `${featLabel} (${num} ${unit}) is > ${threshold} ${unit}`;
  }

  // Categorical feature encoded as {cat_name}_{cat_value}
  for (const cat of categoricalSet) {
    if (feature.startsWith(`${cat}_`)) {
      const targetVal = feature.slice(cat.length + 1);
      const catLabel = cat.replace(/_/g, ' ');
      const userSelection = String(input[cat as keyof BotanicalTraitsInput] || 'unspecified');
      const isMatch = userSelection === targetVal;

      if (isMatch) {
        return `${catLabel} is "${targetVal.replace(/_/g, ' ')}"`;
      } else {
        return `${catLabel} is NOT "${targetVal.replace(/_/g, ' ')}" (observed: "${userSelection.replace(/_/g, ' ')}")`;
      }
    }
  }

  return `${feature} evaluated (${observedVal}) ≤ ${threshold}`;
}

/**
 * Classifies a specimen from its 16 botanical features using the compiled decision tree.
 */
export function classifyBotanicalTraits(
  input: BotanicalTraitsInput,
  customModel?: DecisionTreeModel
): DecisionTreeResult {
  const startTime = performance.now();
  const model = customModel || typedTreeData;
  const root = model.root;

  const trail: DecisionTrailStep[] = [];
  let curr: TreeNode = root;
  let depth = 0;

  while (!curr.is_leaf && curr.left && curr.right && curr.feature && curr.threshold !== undefined) {
    const feat = curr.feature;
    const thresh = curr.threshold;
    let observedNum = 0.0;
    let observedDisplay: number | string = '';
    let goesLeft = true;

    if (numericSet.has(feat)) {
      const rawVal = input[feat as keyof BotanicalTraitsInput];
      observedNum = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : 0.0;
      observedDisplay = observedNum;
      goesLeft = observedNum <= thresh;
    } else {
      // Find categorical parent attribute
      let parentCat = '';
      let targetVal = '';
      for (const cat of categoricalSet) {
        if (feat.startsWith(`${cat}_`)) {
          parentCat = cat;
          targetVal = feat.slice(cat.length + 1);
          break;
        }
      }

      if (parentCat) {
        const userChoice = String(input[parentCat as keyof BotanicalTraitsInput] || '');
        observedNum = userChoice === targetVal ? 1.0 : 0.0;
        observedDisplay = userChoice;
      } else {
        observedNum = 0.0;
        observedDisplay = 'unmatched';
      }

      goesLeft = observedNum <= thresh;
    }

    trail.push({
      nodeId: curr.id,
      feature: feat,
      threshold: thresh,
      observedValue: observedDisplay,
      conditionMet: !goesLeft,
      explanation: formatStepExplanation(feat, thresh, observedDisplay, goesLeft, input),
      depth,
    });

    curr = goesLeft ? curr.left : curr.right;
    depth++;
  }

  const predId = curr.predicted_id;
  const speciesMeta = model.species_catalog[String(predId)] || {
    id: predId,
    common_name: curr.predicted_name,
    scientific_name: 'Unknown taxon',
    family: 'Unknown',
  };

  const topPredictions: PredictionCandidate[] = (curr.top_predictions || [
    {
      species_id: predId,
      common_name: speciesMeta.common_name,
      scientific_name: speciesMeta.scientific_name,
      family: speciesMeta.family,
      probability: curr.confidence,
    },
  ]).map((p) => ({
    speciesId: p.species_id,
    commonName: p.common_name,
    scientificName: p.scientific_name,
    family: p.family,
    probability: p.probability,
  }));

  const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    predictedId: predId,
    commonName: speciesMeta.common_name,
    scientificName: speciesMeta.scientific_name,
    family: speciesMeta.family,
    confidence: curr.confidence,
    topPredictions,
    decisionTrail: trail,
    treeDepth: depth,
    latencyMs,
  };
}

/**
 * Example botanical presets to allow users and interviewers to test instant identification.
 */
export const SAMPLE_TRAIT_PRESETS: Array<{
  label: string;
  subtitle: string;
  traits: BotanicalTraitsInput;
}> = [
  {
    label: 'Tulsi (Holy Basil)',
    subtitle: 'Opposite, dentate, eugenol aroma, purple flowers',
    traits: {
      plant_growth_habit: 'herb',
      leaf_type: 'simple',
      leaf_shape: 'ovate',
      leaf_margin: 'dentate',
      leaf_arrangement: 'opposite',
      leaf_venation: 'pinnate',
      leaf_length_cm: 3.8,
      leaf_width_cm: 2.1,
      plant_height_m: 0.65,
      flower_present: 'yes',
      flower_color: 'purple_or_violet',
      petal_count: 5,
      is_composite_head: 'no',
      thorns_or_spines: 'absent',
      latex_or_sap: 'none_apparent',
      aroma_of_crushed_leaves: 'pungent_or_strong',
    },
  },
  {
    label: 'Neem Tree',
    subtitle: 'Pinnately compound, serrate leaflets, sulfurous odor',
    traits: {
      plant_growth_habit: 'tree',
      leaf_type: 'pinnately_compound',
      leaf_shape: 'lanceolate',
      leaf_margin: 'serrate',
      leaf_arrangement: 'alternate',
      leaf_venation: 'pinnate',
      leaf_length_cm: 30.0,
      leaf_width_cm: 15.0,
      plant_height_m: 20.0,
      flower_present: 'yes',
      flower_color: 'white',
      petal_count: 5,
      is_composite_head: 'no',
      thorns_or_spines: 'absent',
      latex_or_sap: 'none_apparent',
      aroma_of_crushed_leaves: 'pungent_or_strong',
    },
  },
  {
    label: 'Aloe vera',
    subtitle: 'Fleshy rosette, spiny margins, yellow sap',
    traits: {
      plant_growth_habit: 'succulent',
      leaf_type: 'simple',
      leaf_shape: 'lanceolate',
      leaf_margin: 'spiny',
      leaf_arrangement: 'basal_rosette',
      leaf_venation: 'absent_or_obscure',
      leaf_length_cm: 45.0,
      leaf_width_cm: 7.5,
      plant_height_m: 0.7,
      flower_present: 'yes',
      flower_color: 'yellow',
      petal_count: 6,
      is_composite_head: 'no',
      thorns_or_spines: 'spiny_leaf_margins',
      latex_or_sap: 'colored_yellow_red',
      aroma_of_crushed_leaves: 'none_or_faint',
    },
  },
  {
    label: 'Peepal (Sacred Fig)',
    subtitle: 'Cordate with long drip tip, milky latex',
    traits: {
      plant_growth_habit: 'tree',
      leaf_type: 'simple',
      leaf_shape: 'cordate',
      leaf_margin: 'entire',
      leaf_arrangement: 'alternate',
      leaf_venation: 'pinnate',
      leaf_length_cm: 16.0,
      leaf_width_cm: 11.0,
      plant_height_m: 22.0,
      flower_present: 'inconspicuous_or_absent',
      flower_color: 'brown_or_inconspicuous',
      petal_count: 0,
      is_composite_head: 'no',
      thorns_or_spines: 'absent',
      latex_or_sap: 'milky_white',
      aroma_of_crushed_leaves: 'none_or_faint',
    },
  },
  {
    label: 'Sunflower',
    subtitle: 'Giant composite head, rough cordate leaves',
    traits: {
      plant_growth_habit: 'herb',
      leaf_type: 'simple',
      leaf_shape: 'cordate',
      leaf_margin: 'serrate',
      leaf_arrangement: 'alternate',
      leaf_venation: 'palmate',
      leaf_length_cm: 25.0,
      leaf_width_cm: 18.0,
      plant_height_m: 2.4,
      flower_present: 'yes',
      flower_color: 'yellow',
      petal_count: 0,
      is_composite_head: 'yes',
      thorns_or_spines: 'absent',
      latex_or_sap: 'none_apparent',
      aroma_of_crushed_leaves: 'none_or_faint',
    },
  },
];
