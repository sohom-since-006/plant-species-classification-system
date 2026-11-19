# DECISION TREE EXPANSION PLAN: Botanical Characteristic Classification (50-Species Scope & Pilot)

**Document Status:** Approved Architecture & Pilot Specification  
**Target Module:** Botanical Phenotypic Classification via Decision Trees (`ml/decision_tree/` & `web/src/pages/IdentifyByCharacteristics.tsx`)  
**Catalog Scope:** Curated 50 Botanical Species (from `ml/species_list.csv`) + Comparative Benchmark on UCI Plant Leaves (ID 241)  
**Pilot Status:** 10-Species Pilot Completed (`data/traits/traits_pilot.csv`) — 100% Sourced, 0.0% Uncertainty  

---

## Executive Summary

This specification defines the complete architecture, data engineering pipeline, training strategy, browser-based edge inference runtime, and academic reporting structure for the **Plant Species Classification System using Decision Trees**.

While our primary Vision AI pipeline (`plant_model.v2.onnx`) classifies specimens from raw imagery using an EfficientNet-B0 convolutional backbone, this milestone introduces a complementary **morphological and phenotypic classification engine**. Users, students, field botanists, and gardeners can identify plant species by entering simple, human-measurable botanical traits (e.g., leaf dimensions, leaf shape, margin, venation, flower color, petal count, sap, and aroma).

The engine operates 100% on-device in the browser using a serialized JSON decision tree parser with zero backend latency, explains its decisions through an interactive step-by-step **Decision Trail**, and provides an academic benchmark comparing Decision Trees, Random Forests, and Deep CNNs.

---

## 1. Scope: The Curated 50-Species Catalog

### 1.1 Rationale for 50 Species (vs. Full 150)
Rather than attempting a superficial sweep across all 150 taxa, the Decision Tree pipeline focuses on a **curated subset of 50 species** selected strictly from `ml/species_list.csv`. This decision is grounded in sound machine learning and botanical principles:

1. **Academic Feasibility & Verifiability:** Sourcing 16 rigorous, peer-reviewed botanical parameters per species requires deep manual cross-referencing against authoritative regional floras. A 50-species dataset ($50 \times 16 = 800$ verified data points) represents a standard, achievable scope for academic coursework and university herbarium projects without risking data fabrication on obscure taxa.
2. **Standard Multiclass Decision Tree Benchmark:** In classical machine learning literature, 50 classes provides an ideal problem space for decision tree branching depth ($\log_2(50) \approx 6$, with realistic tree depths of 10 to 16 splits) without suffering from extreme node fragmentation or rampant singleton leaf overfitting.
3. **Comprehensive Taxonomic Representation:** The 50 chosen species span **all 8 major growth habits** (trees, shrubs, herbs, climbers, grasses, succulents, aquatics, epiphytes) and represent 30 distinct plant families.
4. **Stress-Testing on Deliberate Look-Alike Clusters:** The 50 species deliberately include classic confusing species pairs (e.g., Tulsi vs. Mint vs. Sweet Basil; Peepal vs. Banyan vs. Rubber Plant; Jasmine vs. Night Jasmine vs. Crape Jasmine; Frangipani vs. Oleander vs. Nag Champa) to test whether phenotypic rules can resolve subtle taxonomic divergences.

### 1.2 The 50 Selected Species

| ID | Common Name | Scientific Name | Family | Growth Habit | Key Diagnostic / Look-Alike Role |
|---|---|---|---|---|---|
| **0** | Tulsi (Holy Basil) | *Ocimum tenuiflorum* | Lamiaceae | Herb | Opposite, dentate, eugenol aroma; look-alike with Mint & Sweet Basil. |
| **1** | Neem | *Azadirachta indica* | Meliaceae | Tree | Pinnately compound, falcate serrate leaflets, sulfurous odor. |
| **2** | Aloe vera | *Aloe vera* | Asphodelaceae | Succulent | Fleshy rosette, spiny margins, yellow aloin sap with clear gel. |
| **3** | Turmeric | *Curcuma longa* | Zingiberaceae | Herb | Distichous simple leaf, warm spicy rhizomatous aroma. |
| **8** | Amla | *Phyllanthus emblica* | Phyllanthaceae | Tree | Feathery distichous simple branchlets, apetalous green-yellow flowers. |
| **9** | Curry leaf | *Murraya koenigii* | Rutaceae | Tree | Pinnate, asymmetric crenate leaflets, pungent curry aroma. |
| **11** | Bael | *Aegle marmelos* | Rutaceae | Tree | Trifoliolate compound leaf, sharp axillary thorns, citrus aroma. |
| **14** | Betel | *Piper betle* | Piperaceae | Climber | Cordate climbing vine, palmate veins, peppery warm aroma. |
| **15** | Lemongrass | *Cymbopogon citratus* | Poaceae | Grass | Clumping monocot, linear strap blades, parallel venation, citral aroma. |
| **16** | Mint (Spearmint) | *Mentha spicata* | Lamiaceae | Herb | Opposite, lanceolate, serrate, menthol/carvone aroma; look-alike with Tulsi. |
| **17** | Peepal | *Ficus religiosa* | Moraceae | Tree | Cordate with long caudate acumen drip-tip, milky latex; look-alike with Banyan. |
| **18** | Banyan | *Ficus benghalensis* | Moraceae | Tree | Large coriaceous ovate leaf, aerial prop roots, milky latex; look-alike with Peepal. |
| **20** | Hibiscus | *Hibiscus rosa-sinensis* | Malvaceae | Shrub | Alternate ovate serrate, 5 petals, conspicuous monadelphous staminal column. |
| **21** | Marigold | *Tagetes erecta* | Asteraceae | Herb | Pinnatisect foliage, composite head (`is_composite_head=yes`), pungent aroma. |
| **22** | Jasmine (Mogra) | *Jasminum sambac* | Oleaceae | Shrub | Opposite simple ovate, intensely fragrant white salverform flowers. |
| **23** | Lotus | *Nelumbo nucifera* | Nelumbonaceae | Aquatic | Large orbicular peltate floating leaf, giant multi-petaled emergent flower. |
| **24** | Rose | *Rosa spp.* | Rosaceae | Shrub | Pinnately compound, prickles, 5 petals wild / many cultivated. |
| **25** | Frangipani | *Plumeria rubra* | Apocynaceae | Tree | Thick succulent branches, obovate spiral leaves, 5 petals, milky latex. |
| **26** | Oleander | *Nerium oleander* | Apocynaceae | Shrub | Linear-lanceolate whorled leaves, 5 petals, milky latex, highly toxic. |
| **27** | Bougainvillea | *Bougainvillea spectabilis* | Nyctaginaceae | Climber | Thorny scandent shrub, 3 papery colorful petaloid bracts. |
| **28** | Butterfly pea | *Clitoria ternatea* | Fabaceae | Climber | Pinnate 5-7 leaflets, papilionaceous deep blue solitary flower. |
| **29** | Night jasmine (Parijat) | *Nyctanthes arbor-tristis* | Oleaceae | Tree | Opposite scabrous rough leaves, white corolla with bright orange tube. |
| **30** | Gulmohar | *Delonix regia* | Fabaceae | Tree | Bipinnate feathery foliage, 5 large scarlet petals with banner blotch. |
| **31** | Periwinkle (Sadabahar)| *Catharanthus roseus* | Apocynaceae | Herb | Opposite elliptic entire glossy, 5 salverform petals, watery/milky sap. |
| **32** | Ixora | *Ixora coccinea* | Rubiaceae | Shrub | Opposite sessile oblong leathery leaves, dense clusters of 4-petaled scarlet flowers. |
| **38** | Amaltas | *Cassia fistula* | Fabaceae | Tree | Even-pinnate leaves, pendulous sprays of 5 bright golden-yellow petals. |
| **40** | Mango | *Mangifera indica* | Anacardiaceae | Tree | Alternate simple oblong-lanceolate, entire, turpentine/resinous leaf aroma. |
| **41** | Coconut | *Cocos nucifera* | Arecaceae | Tree | Monocot palm, unbranched trunk, massive pinnatisect fronds. |
| **42** | Banana | *Musa acuminata* | Musaceae | Herb | Giant pseudostem, massive simple oblong leaf blade, pinnate-parallel veins. |
| **43** | Papaya | *Carica papaya* | Caricaceae | Tree | Soft-wooded tree, giant palmately 7-9 lobed leaves, milky latex. |
| **44** | Guava | *Psidium guajava* | Myrtaceae | Tree | Opposite elliptic-oblong, prominent impressed veins, 4-5 white petals, aromatic. |
| **45** | Pomegranate | *Punica granatum* | Lythraceae | Shrub | Opposite narrow oblong glossy, red fleshy persistent tubular calyx, 5-8 petals. |
| **47** | Tamarind | *Tamarindus indica* | Fabaceae | Tree | Even-pinnate compound leaves with 10-20 pairs of small oblong leaflets. |
| **51** | Lemon | *Citrus limon* | Rutaceae | Tree | Simple leaf with winged petiole, sharp axillary spines, pellucid citrus oil dots. |
| **54** | Bamboo | *Bambusa vulgaris* | Poaceae | Grass | Giant woody rhizomatous grass, hollow culms, linear blades with parallel venation. |
| **60** | Rice | *Oryza sativa* | Poaceae | Grass | Annual cereal grass, linear rough-scabrous blades, terminal panicle. |
| **67** | Tomato | *Solanum lycopersicum* | Solanaceae | Herb | Glandular hairy pinnatifid leaves, pungent aroma, 5-lobed yellow rotate corolla. |
| **68** | Chilli | *Capsicum annuum* | Solanaceae | Herb | Alternate simple ovate-elliptic, white 5-lobed flat corolla, non-aromatic leaf. |
| **70** | Okra | *Abelmoschus esculentus* | Malvaceae | Herb | Palmately 3-5 lobed serrate leaves, 5 yellow petals with dark purple basal spot. |
| **80** | Money plant | *Epipremnum aureum* | Araceae | Climber | Scandent vine, cordate variegated leaf blade, parallel-reticulate venation. |
| **81** | Snake plant | *Dracaena trifasciata* | Asparagaceae | Herb | Stiff erect succulent sword-like leaves with mottled cross-banding. |
| **83** | Monstera | *Monstera deliciosa* | Araceae | Climber | Giant cordate-orbicular leaves with deep natural perforations (fenestrations). |
| **85** | Rubber plant | *Ficus elastica* | Moraceae | Tree | Large thick leathery glossy elliptic leaves, pink stipular sheath, milky latex. |
| **87** | Prickly pear | *Opuntia ficus-indica* | Cactaceae | Succulent | Segmented cladodes (pads), clusters of sharp spines/glochids, yellow flowers. |
| **91** | Patharchatta (Air plant)| *Kalanchoe pinnata* | Crassulaceae | Succulent | Fleshy crenate leaves producing foliar plantlets in marginal notches. |
| **92** | Sunflower | *Helianthus annuus* | Asteraceae | Herb | Massive cordate-ovate rough leaves, giant composite head (`is_composite_head=yes`). |
| **97** | Sweet basil | *Ocimum basilicum* | Lamiaceae | Herb | Opposite ovate entire/crenate, sweet anise/clove aroma; look-alike with Tulsi. |
| **108** | Sensitive plant | *Mimosa pudica* | Fabaceae | Herb | Bipinnate thigmonastic leaves folding upon touch, prickles, pink puff flowers. |
| **137** | Nag Champa | *Plumeria pudica* | Apocynaceae | Shrub | Unique fiddle-shaped (panduriform) leaves, pure white 5-petaled flowers, milky sap. |
| **145** | Crown of thorns | *Euphorbia milii* | Euphorbiaceae | Succulent | Heavily spiny succulent stems, bright red paired petaloid cyathial bracts, milky latex. |

---

## 2. Updated Botanical Feature Schema (16 Diagnostic Features)

To improve diagnostic accuracy for floral structures while maintaining simple field measurability, the schema separates petal counts from composite flower heads:
1. `petal_count`: Strictly numeric integer (0 to 20, capped). Set to `0` for apetalous flowers or gymnosperms.
2. `is_composite_head`: Dedicated boolean (`yes` / `no`) for Asteraceae heads (Sunflower, Marigold) where counting simple petals is biologically inaccurate.

### 2.1 Complete Feature Specification

| # | Feature Identifier | Type | Range / Allowed Categories | Botanical Definition |
|---|---|---|---|---|
| **1** | `plant_growth_habit` | Categorical | `herb`, `shrub`, `tree`, `climber`, `grass`, `succulent`, `aquatic`, `epiphyte` | Overall architectural growth form. |
| **2** | `leaf_type` | Categorical | `simple`, `pinnately_compound`, `bipinnately_compound`, `palmately_compound`, `trifoliolate`, `scale_or_reduced` | Leaf blade subdivision structure. |
| **3** | `leaf_shape` | Categorical | `ovate`, `elliptic`, `lanceolate`, `linear`, `oblong`, `cordate`, `orbicular`, `palmate_lobed`, `pinnatisect`, `spatulate`, `needle_or_scale` | Outline shape of typical mature blade. |
| **4** | `leaf_margin` | Categorical | `entire`, `serrate`, `dentate`, `crenate`, `lobed`, `undulate`, `ciliate`, `spiny` | Margin boundary pattern. |
| **5** | `leaf_arrangement` | Categorical | `alternate`, `opposite`, `whorled`, `basal_rosette`, `spiral`, `distichous` | Leaf placement order on stem. |
| **6** | `leaf_venation` | Categorical | `pinnate`, `palmate`, `parallel`, `reticulate`, `arcuate`, `absent_or_obscure` | Pattern of vein distribution. |
| **7** | `leaf_length_cm` | Numeric (cm) | `0.5` to `300.0` cm | Typical mature leaf blade length. |
| **8** | `leaf_width_cm` | Numeric (cm) | `0.2` to `120.0` cm | Typical mature leaf blade width. |
| **9** | `plant_height_m` | Numeric (m) | `0.05` to `60.0` m | Typical mature plant height. |
| **10** | `flower_present` | Categorical | `yes`, `no`, `inconspicuous_or_absent` | Visual presence of reproductive floral parts. |
| **11** | `flower_color` | Categorical | `white`, `yellow`, `red_or_crimson`, `pink_or_magenta`, `purple_or_violet`, `blue`, `orange`, `green`, `brown_or_inconspicuous`, `multi_colored`, `not_applicable` | Primary corolla / petaloid color. |
| **12** | `petal_count` | Numeric (Integer) | `0` to `20` (capped) | Count of distinct petals (`0` if apetalous or composite). |
| **13** | `is_composite_head` | Categorical | `yes`, `no` | Inflorescence is a pseudanthium / composite capitulum. |
| **14** | `thorns_or_spines` | Categorical | `absent`, `spines_or_thorns_on_stem`, `prickles`, `spiny_leaf_margins` | Physical defensive armatures. |
| **15** | `latex_or_sap` | Categorical | `watery_clear`, `milky_white`, `colored_yellow_red`, `sticky_resinous`, `none_apparent` | Biochemical exudate upon stem fracture. |
| **16** | `aroma_of_crushed_leaves` | Categorical | `none_or_faint`, `aromatic_pleasant`, `pungent_or_strong`, `citrusy`, `foul_or_rank`, `sweet_floral` | Volatile aromatic scent of crushed foliage. |

---

## 3. Data Integrity & Realistic Simulation Strategy

### 3.1 Pilot Phase Results (First 10 Species)
As an initial feasibility gate, a 10-species trait table was manually compiled and saved to [data/traits/traits_pilot.csv](file:///d:/Antigravity/Plant%20Species%20Classification%20system/data/traits/traits_pilot.csv) with documentation in [data/traits/README.md](file:///d:/Antigravity/Plant%20Species%20Classification%20system/data/traits/README.md):

* **Taxa Covered:** Tulsi (`0`), Neem (`1`), Aloe vera (`2`), Turmeric (`3`), Amla (`8`), Curry leaf (`9`), Bael (`11`), Betel (`14`), Lemongrass (`15`), Mint (`16`).
* **Source Quality:** **100% of species** have verified reference URLs from the *Flora of China* (eFloras), *Flora of Pakistan*, or *Kew Plants of the World Online (POWO)*.
* **Uncertainty Rate:** **0.0%** (0 out of 10 species required a `needs_verification = yes` flag).
* **Curation Time:** ~45 minutes for rigorous cross-flora extraction and unit validation.

### 3.2 Non-Trivial Synthetic Simulation & Noise Protocol
To prevent the model from learning artificially perfect decision boundaries, the dataset generator (`01_build_trait_dataset.py`) enforces **realistic environmental variance, observer noise, and missing observations**:

1. **Natural Range Overlap:**
   - Morphologically related species maintain their true overlapping metric bounds (e.g., Tulsi leaf length $[2.0, 5.5]$ cm overlaps with Mint $[2.5, 7.0]$ cm; Mango $[15.0, 30.0]$ cm overlaps with Guava $[7.0, 15.0]$ cm). The decision tree cannot rely on an unrealistic single cut-point.
2. **Measurement Noise Injection:**
   - Numeric dimensions (length, width, height) are injected with $\pm 5\text{--}10\%$ multiplicative Gaussian noise:
     $$x_{\text{observed}} = x_{\text{sampled}} \cdot (1 + \epsilon), \quad \epsilon \sim \mathcal{N}(0, 0.05^2)$$
   - Categorical traits carry a 3% random observer error probability reflecting novice misidentifications (e.g., mistaking a crenate margin for serrate, or dentate for serrate).
3. **Random Missing Values ($5\text{--}10\%$ Missingness):**
   - In field conditions, plants are frequently observed out-of-bloom (`flower_color` and `petal_count` unknown) or observers fail to crush leaves for aroma.
   - The generator randomly replaces $5\%\text{ to }10\%$ of feature values with `NaN` / missing indicators across the training and testing matrices.
4. **Pipeline Missing Value Handling:**
   - Numeric features with `NaN` are imputed via `SimpleImputer(strategy='median')`.
   - Categorical features with `NaN` are mapped to a dedicated `'missing_or_unobserved'` category token, enabling the decision tree to learn valid split rules even when key traits are absent.
5. **Academic Transparency:**
   - All synthetic datasets and evaluation reports are explicitly watermarked: `SIMULATED BOTANICAL CORPUS (BOUNDED BY FLORA OF CHINA / KEW POWO RANGES WITH 8% INDUCED MEASUREMENT NOISE)`.

### 3.3 Comparative Physical Benchmark: UCI Leaves Dataset (ID 241)
In addition to the 50-species field trait model, the project executes an independent validation on the real, laboratory-measured **UCI One-Hundred Plant Species Leaves Data Set**:
* **License:** Creative Commons Attribution 4.0 International (**CC BY 4.0**).
* **Scope:** 1,600 real physical leaf specimens across 100 species (16 samples per species).
* **Features:** 192 digital shape, margin, and texture descriptors extracted from high-resolution digital leaf scans.
* **Download:** Automated via `from ucimlrepo import fetch_ucirepo; uci_leaves = fetch_ucirepo(id=241)`.
* **Role:** Proves that the exact same Decision Tree and Random Forest algorithms perform effectively on physical, laboratory-extracted continuous leaf morphometrics.

---

## 4. Machine Learning & Browser Runtime Pipeline

### 4.1 Scripts Breakdown (`ml/decision_tree/`)
* `01_build_trait_dataset.py`: Parses verified trait tables, applies noise and missingness injection, and generates training ($N=100$ per species) and validation splits.
* `02_eda_and_visualizations.py`: Generates trait distribution boxplots, correlation heatmaps, and family separability plots.
* `03_train_decision_tree.py`: 5-fold Stratified Cross-Validation, hyperparameter grid search (`max_depth`, `min_samples_leaf`), and cost-complexity pruning (`ccp_alpha`).
* `04_benchmark_comparisons.py`: Trains Random Forest baseline and compares metrics against our EfficientNet-B0 CNN.
* `05_export_tree_json.py`: Serializes the optimal pruned tree into a compact `tree_model.json` for client-side browser execution.

### 4.2 Web Interface: "Identify by Botanical Characteristics"
* **New Route:** Accessible via `/identify-traits` (and linked directly from `/classify`).
* **Visual Form Inputs:**
  * Interactive SVG leaf shape selector (ovate, cordate, lanceolate, etc.).
  * Leaf margin and venation visual radios.
  * Continuous numeric sliders with intuitive real-world defaults.
  * Flower color picker swatches and composite head toggle.
* **Zero-Backend Edge Execution:**
  * The exported `tree_model.json` (~50 KB) loads into browser RAM.
  * `web/src/ml/decisionTreeRunner.ts` evaluates the input object in **$< 0.5 \text{ ms}$**.
* **Visual "Decision Trail":**
  * Displays the horizontal traversal path that the tree followed to reach its conclusion:
    $$\text{Habit: Herb} \longrightarrow \text{Leaf: Opposite} \longrightarrow \text{Margin: Dentate} \longrightarrow \text{Aroma: Eugenol} \longrightarrow \text{Tulsi (92%)}$$

---

## 5. Report Outline & Milestone Execution Plan

### 5.1 Academic Report Outline
* **Title:** Plant Species Classification System using Decision Tree: Comparative Study on 50 Sourced Botanical Taxa and the UCI Leaves Benchmark
* **1. Introduction & Background:** Taxonomy, dichotomous keys, symbolic rule-based learning vs deep neural networks.
* **2. Dataset Collection & Trait Engineering:**
  * 16-feature schema definition.
  * Authoritative sourcing methodology (eFloras, Kew POWO) and URL provenance.
  * Realistic simulation strategy (range overlap, Gaussian measurement noise, 5–10% missingness).
  * Secondary benchmark on the real UCI Plant Leaves Dataset (ID 241, CC BY 4.0).
* **3. Exploratory Data Analysis (EDA):** Trait distributions, leaf length/width aspect ratios, correlation heatmaps.
* **4. Model Development & Hyperparameter Tuning:** Information gain, grid search cross-validation, cost-complexity pruning.
* **5. Evaluation & Comparative Analysis:** Decision Tree vs. Random Forest vs. Convolutional Vision Model (EfficientNet-B0). Accuracy, Macro F1, Confusion Matrix.
* **6. Web Application Implementation:** Client-side JSON tree evaluator, UI walkthrough, interactive Decision Trail.
* **7. Field Testing & Case Studies:** Testing on real physical specimens (Tulsi, Hibiscus, Mint, Aloe vera).
* **8. Limitations:** Phenotypic plasticity, heterophylly, juvenile foliage.
* **9. Conclusion & Future Work:** Multimodal fusion of vision and phenotypic traits.

### 5.2 Estimated Effort per Step

| Step | Scope of Work | Estimated Hours |
|---|---|---|
| **Step 1: Pilot Completion (10 Species)** | Trait curation with source URLs and verification flags (*Completed*). | 1 hour |
| **Step 2: Remaining 40 Species Curation** | Complete `species_traits_50.csv` with verified Kew POWO / eFloras URLs. | 6–8 hours |
| **Step 3: Generator & EDA Scripts** | Noise injection script, missingness simulator, Seaborn/Matplotlib plots. | 4–5 hours |
| **Step 4: Decision Tree & Tuning** | Grid search CV, cost-complexity pruning, confusion matrix generation. | 4–5 hours |
| **Step 5: Random Forest & UCI Benchmarks**| Train Random Forest, run UCI dataset evaluation, compile comparison table. | 3–4 hours |
| **Step 6: JSON Exporter & Web Parser** | Export `tree_model.json`, write TypeScript browser runner and tests. | 3–4 hours |
| **Step 7: Web Page UI Development** | Build `/identify-traits` page, visual pickers, and Decision Trail flowchart. | 6–8 hours |
| **Step 8: Final Report Compilation** | Author academic report with methodology, figures, tables, and screenshots. | 5–6 hours |
| **Total Estimated Effort** | | **~32–41 hours** |
