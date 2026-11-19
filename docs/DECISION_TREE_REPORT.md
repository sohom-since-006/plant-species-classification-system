# Final Technical & Academic Report: Plant Species Classification System Using Decision Trees

**Academic Course Milestone:** Final Technical Report  
**Project Title:** Plant Species Classification System Using Decision Trees  
**Authors:** Botanical ML Research & Engineering Team  
**System Target:** On-Device Taxonomic Dichotomous Key & Comparative Machine Learning Benchmark  
**Date:** November 2026  
**Catalog Scope:** 50 Botanical Taxa (from `ml/species_list.csv`) | 16 Human-Observable Phenotypic Features  

---

## Executive Abstract

Classical plant taxonomy has relied for centuries on *dichotomous keys*—sequential, rule-based branching decision frameworks that allow botanists, students, and field naturalists to distinguish species based on discrete morphological, vegetative, and reproductive characters. While modern computer vision models (such as our production `plant_model.v2.onnx` EfficientNet-B0 CNN) achieve strong predictive power directly from pixels (83.88% Top-1 and 94.39% Top-5 accuracy across all 4,939 test images; the earlier draft figure of 92.4% was incorrect and has been replaced), they operate as opaque, compute-intensive black boxes requiring high-resolution imagery and GPU/WASM accelerators.

This milestone develops, validates, and deploys a complementary **Symbolic Machine Learning System for Plant Classification using Decision Trees**. We engineered a 16-feature botanical schema spanning vegetative habit, phyllotaxis, foliar morphometrics, floral merosity, latex exudates, defensive armatures, and organoleptic aromas across **50 ecologically, agriculturally, and medicinally important species**. Trait bounds were compiled by an AI assistant from regional taxonomic floras (*Flora of China*, *Kew Plants of the World Online*, and *Botanical Survey of India*). Because reference repositories blocked automated verification scripts with Cloudflare anti-bot challenges (HTTP 403 Forbidden), all 50 species are formally cataloged with `needs_verification = yes` pending manual herbarium audit.

To evaluate algorithmic behavior under biological variability, we simulated a dataset of 5,000 specimens incorporating biological range overlap, $\pm 6\%$ multiplicative Gaussian measurement noise, 3% novice observer classification error, and 5–8% seasonal trait missingness. Through Stratified 5-Fold Cross-Validation and cost-complexity pruning ($\alpha = 0.0005$), our tuned Decision Tree achieved an internal **Test Accuracy of 99.50%** and a **Macro F1-Score of 0.9950** at depth 17 with 52 leaf nodes, compared against a Random Forest baseline (99.90%). 

Importantly, **high accuracy on simulated data measures how well the tree learned the simulated trait ranges, not field accuracy**. To rigorously test generalization, we conducted two additional real-world validations and established a physical field testing harness:
1. **Noise Stress Testing on Unseen Seed:** Evaluating the frozen decision tree on data simulated with an unobserved random seed (`seed=999`) under escalating noise tiers ($\pm 6\%$ to $\pm 40\%$ noise, up to 35% missingness). Top-1 accuracy degraded gracefully from 99.7% to 93.7% (Top-3 remaining $\ge 94.8\%$).
2. **Physical Laboratory Leaf Benchmark (UCI ID 241):** On the official UCI "One-Hundred Plant Species Leaves" dataset (1,599 real physical leaf specimens across 100 species, 192 continuous shape/margin/texture descriptors; CC BY 4.0), the Decision Tree achieved **50.84%** 5-fold CV accuracy (macro F1: 0.5074), while an ensemble Random Forest achieved **97.81%** (macro F1: 0.9781).
3. **Physical Field Testing:** Status is **pending ($n = 0$ real measured specimens)**. The 9 template rows currently in `data/traits/field_test_template.csv` are marked `source=demo_from_trait_table`, derived from the trait table to verify the software execution pipeline, and are explicitly excluded from physical specimen or field accuracy claims.

The model was serialized into a compact (~48 KB) JSON hierarchy and integrated into the React web application at `/identify-traits`. Operating 100% on-device with $< 0.1\text{ ms}$ evaluation latency, the web page provides continuous slider inputs (starting unset), missing-trait skip options, progress tracking, an interactive scanning analysis phase, honest leaf-purity metric labeling, and an explainable **Decision Trail** visualizing the exact taxonomic path from root to leaf node.

---

## 1. Introduction & Theoretical Foundations

### 1.1 Dichotomous Keys in Botany vs. Machine Learning
In botanical taxonomy, identification involves matching an unknown specimen against diagnostic criteria. A *dichotomous key* presents a series of paired, mutually exclusive statements (couplets) regarding morphological attributes (e.g., *"Leaves opposite vs. alternate"*, *"Latex present vs. absent"*). 

A mathematical **Decision Tree** (Breiman et al., 1984; Quinlan, 1986) is the direct machine-learning analog of the botanical dichotomous key. It constructs a directed acyclic tree graph where:
1. Each **internal node** tests an attribute $x_j$ against a threshold $\theta$:
   $$\text{Split: } x_j \le \theta \quad \text{vs.} \quad x_j > \theta$$
2. Each **branch** represents the outcome of the predicate test.
3. Each **leaf (terminal) node** holds a class probability distribution over the species catalog $Y \in \{1, \dots, C\}$.

### 1.2 Motivation: Explainable AI vs. Deep Convolutional Networks
While deep convolutional networks achieve strong accuracy on standardized imagery, they exhibit distinct operational limitations:
* **Interpretability Deficit:** Vision models cannot explain *why* a specimen is classified as *Ocimum tenuiflorum* rather than *Mentha spicata*; Grad-CAM heatmaps highlight leaf textures without clarifying diagnostic botanical characters.
* **Missing Modalities:** Images cannot convey leaf aroma, stem sap, or physical texture.
* **Field Accessibility:** Field researchers, students, and forest rangers often encounter damaged specimens or lack cameras with macro lenses.

By pairing vision models with a Decision Tree rule engine, the system delivers an explainable, multimodal identification suite.

---

## 2. Dataset Collection & Trait Engineering

### 2.1 The Curated 50-Species Taxonomic Catalog
Rather than spreading trait curation thinly across all 150 project species, we selected a representative subset of **50 species** from `ml/species_list.csv`. The selection criteria satisfied:
1. **Structural Diversity:** Balanced representation across all 8 major growth habits:
   * **Trees (18 species):** Neem, Banyan, Peepal, Mango, Coconut, Guava, Lemon, Tamarind, Bael, Amaltas, Amla, Curry leaf, Rubber plant, Gulmohar, Frangipani, Night jasmine, Papaya, Bamboo.
   * **Herbs (15 species):** Tulsi, Sweet basil, Mint, Turmeric, Periwinkle, Marigold, Sunflower, Tomato, Chilli, Okra, Snake plant, Sensitive plant, Banana, Rice, Patharchatta.
   * **Shrubs (7 species):** Hibiscus, Rose, Jasmine, Oleander, Ixora, Pomegranate, Nag Champa.
   * **Climbers (5 species):** Betel, Butterfly pea, Bougainvillea, Money plant, Monstera.
   * **Succulents (3 species):** Aloe vera, Prickly pear, Crown of thorns.
   * **Grasses (3 species):** Lemongrass, Bamboo, Rice.
   * **Aquatics (1 species):** Lotus.
2. **Taxonomic Span:** Representation across 30 plant families (Lamiaceae, Moraceae, Fabaceae, Rutaceae, Malvaceae, Asteraceae, Apocynaceae, Poaceae, Solanaceae, etc.).
3. **Deliberate Look-Alike Stress Testing:** Incorporation of classically confusing species clusters:
   * *Cluster 1 (Lamiaceae herbs):* Tulsi (*Ocimum tenuiflorum*), Mint (*Mentha spicata*), Sweet basil (*Ocimum basilicum*).
   * *Cluster 2 (Moraceae trees):* Peepal (*Ficus religiosa*), Banyan (*Ficus benghalensis*), Rubber plant (*Ficus elastica*).
   * *Cluster 3 (Apocynaceae):* Frangipani (*Plumeria rubra*), Nag Champa (*Plumeria pudica*), Oleander (*Nerium oleander*).

### 2.2 The 16-Feature Diagnostic Schema
To reflect field measurements without requiring laboratory microscopy, we defined 16 standardized features:

| # | Feature Identifier | Variable Type | Permitted Values / Measurement Unit | Botanical Function |
|---|---|---|---|---|
| **1** | `plant_growth_habit` | Categorical | `herb`, `shrub`, `tree`, `climber`, `grass`, `succulent`, `aquatic` | Gross habit architecture. |
| **2** | `leaf_type` | Categorical | `simple`, `pinnately_compound`, `bipinnately_compound`, `trifoliolate`, `scale_or_reduced` | Blade subdivision structure. |
| **3** | `leaf_shape` | Categorical | `ovate`, `elliptic`, `lanceolate`, `linear`, `oblong`, `cordate`, `orbicular`, `palmate_lobed`, `spatulate` | Blade geometric contour. |
| **4** | `leaf_margin` | Categorical | `entire`, `serrate`, `dentate`, `crenate`, `lobed`, `spiny` | Outer margin boundary anatomy. |
| **5** | `leaf_arrangement` | Categorical | `alternate`, `opposite`, `whorled`, `basal_rosette`, `spiral`, `distichous` | Phyllotaxis along stems. |
| **6** | `leaf_venation` | Categorical | `pinnate`, `palmate`, `parallel`, `reticulate`, `absent_or_obscure` | Vascular bundle architecture. |
| **7** | `leaf_length_cm` | Continuous | $0.5\text{ to }500.0\text{ cm}$ | Blade / compound frond length. |
| **8** | `leaf_width_cm` | Continuous | $0.15\text{ to }120.0\text{ cm}$ | Maximum laminar breadth. |
| **9** | `plant_height_m` | Continuous | $0.1\text{ to }35.0\text{ m}$ | Mature vegetative height. |
| **10** | `flower_present` | Categorical | `yes`, `no`, `inconspicuous_or_absent` | Reproductive organ visibility. |
| **11** | `flower_color` | Categorical | `white`, `yellow`, `red_or_crimson`, `pink_or_magenta`, `purple_or_violet`, `blue`, `orange`, `green`, `brown_or_inconspicuous` | Predominant corolla pigment. |
| **12** | `petal_count` | Discrete | $0\text{ to }20$ (integer) | Corolla lobe / petal merosity ($0$ for apetalous or composite). |
| **13** | `is_composite_head`| Categorical | `yes`, `no` | Asteraceae pseudanthium capitulum. |
| **14** | `thorns_or_spines` | Categorical | `absent`, `spines_or_thorns_on_stem`, `prickles`, `spiny_leaf_margins` | Physical anti-herbivory armatures. |
| **15** | `latex_or_sap` | Categorical | `none_apparent`, `milky_white`, `watery_clear`, `colored_yellow_red`, `sticky_resinous` | Mechanical exudates upon stem fracture. |
| **16** | `aroma_of_crushed_leaves` | Categorical | `none_or_faint`, `aromatic_pleasant`, `pungent_or_strong`, `citrusy`, `sweet_floral` | Volatile secondary metabolites. |

### 2.3 Data Provenance & Verification Audit
Trait values were compiled by an AI assistant from authoritative published floras:
* *Flora of China* (Missouri Botanical Garden & Harvard University Herbaria)
* *Plants of the World Online (POWO)* (Royal Botanic Gardens, Kew)
* *Flora of Pakistan* (eFloras)
* *The Wealth of India* (CSIR) & *Indian Medicinal Plants* (Kirtikar & Basu)

**Honest Verification Audit:**  
When an automated HTTP validation script attempted to programmatically verify all cited URLs against `efloras.org` and `powo.science.kew.org`, 100% of automated requests were blocked by server-side anti-bot protections (Cloudflare HTTP 403 Forbidden). In accordance with scientific integrity guidelines, **we do not claim that these trait values have been verified by automated scrapers**. Instead, every entry in [`data/traits/traits_50.csv`](file:///d:/Antigravity/Plant%20Species%20Classification%20system/data/traits/traits_50.csv) maintains:
1. `needs_verification = yes` across all 50 species rows.
2. Explicit evidence classification tags: `evidence_habit_morphology = flora`, `evidence_numeric_dimensions = flora`, `evidence_floral = flora`, and `evidence_sensory_special = observational`.
3. Permanent documentation in [`data/traits/README.md`](file:///d:/Antigravity/Plant%20Species%20Classification%20system/data/traits/README.md) and on the web application footer that manual herbarium verification is required for full taxonomic certification.

### 2.4 Realistic Synthetic Simulation & Noise Injection Protocol
To test model generalizability without artificial separability, we implemented `ml/decision_tree/01_simulate_samples.py`, generating $N = 100$ specimens per species ($5,000$ specimens total) under four realistic constraints:
1. **Natural Range Overlap:** Specimen dimensions are uniformly sampled across real botanical min-max ranges. Closely related taxa retain overlapping dimensions (e.g., Tulsi leaf length $[2.0, 5.5]\text{ cm}$ overlaps with Mint $[2.5, 7.0]\text{ cm}$; Guava $[7.0, 15.0]\text{ cm}$ overlaps with Mango $[15.0, 32.0]\text{ cm}$).
2. **Multiplicative Gaussian Measurement Noise:**
   $$x_{\text{observed}} = x_{\text{sampled}} \cdot (1 + \epsilon), \quad \epsilon \sim \mathcal{N}(0, 0.06^2)$$
   This introduces $\pm 6\text{--}12\%$ measurement noise reflecting tape measure error and natural ecological variation.
3. **Novice Observer Error ($3\%$ Probability):** Categorical traits carry a $3\%$ confusion chance between adjacent states (e.g., dentate vs. serrate margins, ovate vs. elliptic blades, pungent vs. pleasant aromas).
4. **Field Missingness ($5\text{--}8\%$ Missing Observations):** Plants encountered out-of-bloom lack flower color ($413$ missing entries); uncrushed foliage lacks aroma data ($352$ missing entries); sap and height contain $206$ and $236$ unobserved values, respectively.
5. **Academic Watermark:**
   All exported datasets include the academic header:
   ```csv
   # SIMULATED BOTANICAL CORPUS (BOUNDED BY FLORA OF CHINA / KEW POWO RANGES WITH INDUCED MEASUREMENT NOISE AND 6% MISSINGNESS)
   ```

---

## 3. Exploratory Data Analysis (EDA)

The complete exploratory analysis script (`ml/decision_tree/02_run_eda.py`) processed the 5,000 simulated records. Below are the summary statistics across continuous traits:

### 3.1 Continuous Trait Descriptive Statistics
| Trait Variable | Observations | Mean | Std Dev | Median | Min | Max |
|---|---|---|---|---|---|---|
| **Leaf Length ($\text{cm}$)** | 5,000 | $30.98$ | $57.96$ | $14.28$ | $0.73$ | $536.27$ |
| **Leaf Width ($\text{cm}$)** | 5,000 | $11.10$ | $15.83$ | $5.52$ | $0.15$ | $131.67$ |
| **Plant Height ($\text{m}$)** | 4,764 | $6.31$ | $7.14$ | $3.05$ | $0.19$ | $32.48$ |
| **Petal Count** | 5,000 | $3.90$ | $3.02$ | $5.00$ | $0$ | $16$ |
| **Aspect Ratio (L/W)** | 5,000 | $3.24$ | $3.81$ | $2.25$ | $1.02$ | $38.45$ |

*Figure 1* illustrates the habit distribution across the 50 species: Trees ($36\%$) and Herbs ($30\%$) constitute the majority, followed by Shrubs ($14\%$), Climbers ($10\%$), Succulents ($6\%$), and Grasses ($6\%$).

```
Growth Habit Distribution (N=50 Species):
Tree       [==================] 18 species (36%)
Herb       [===============] 15 species (30%)
Shrub      [=======] 7 species (14%)
Climber    [=====] 5 species (10%)
Grass      [===] 3 species (6%)
Succulent  [===] 3 species (6%)
Aquatic    [=] 1 species (2%)
```

### 3.2 Visual Explorations & Key Taxonomic Insights
Five publication-quality visualization figures were generated and saved to `docs/images/decision_tree/`:

1. **`01_growth_habit_distribution.png`:** Bar chart showing species counts per growth habit category.
2. **`02_leaf_dimensions_aspect_ratio.png`:**
   * *(A)* Scatter plot of leaf length vs. width across habits (excluding giant palms $> 100\text{ cm}$ for scaling).
   * *(B)* Aspect ratio ($L/W$) boxplots revealing that Grasses (Graminoids) display an extreme aspect ratio median ($> 18.0$), cleanly separating them from Herbs and Shrubs ($L/W \approx 1.8\text{--}2.5$).
3. **`03_flower_color_and_petal_counts.png`:** 
   * Color frequencies show White and Yellow predominate across flora, followed by Pink/Magenta and Red.
   * Petal count distribution exhibits strong modes at $k = 0$ (apetalous/composite/unobserved), $k = 4$ (Brassicaceae/Rubiaceae), and $k = 5$ (Malvaceae/Fabaceae/Solanaceae).
4. **`04_feature_correlation_heatmap.png`:**
   * Pearson correlation between Leaf Length and Leaf Width is moderately strong ($r = +0.68$).
   * Correlation between Leaf Length and Plant Height is positive ($r = +0.48$).
   * Petal Count exhibits near-zero correlation with vegetative dimensions ($|r| < 0.08$), confirming its role as an independent orthogonal taxonomic discriminator.
5. **`05_lookalike_taxa_separability.png`:**
   * **Lamiaceae herbs:** Tulsi, Mint, and Sweet Basil share overlapping dimensions ($2\text{--}7\text{ cm}$ length, $1\text{--}3.5\text{ cm}$ width). However, crushed leaf aroma creates a clean boundary: Tulsi (pungent eugenol) vs. Sweet Basil (pleasant linalool/anise) vs. Mint (pleasant menthol/carvone), reinforced by leaf margins (dentate in Tulsi vs. serrate in Mint vs. entire in Basil).
   * **Moraceae trees:** Peepal, Banyan, and Rubber Plant all possess milky white latex and tree habit. Peepal separates through its caudate cordate drip-tip blade; Rubber Plant separates through its large leathery elliptic blade ($15\text{--}35\text{ cm}$); Banyan separates through its ovate coriaceous blade ($10\text{--}22\text{ cm}$).

---

## 4. Model Development & Hyperparameter Tuning

### 4.1 Feature Preprocessing & Encoding Pipeline
The training pipeline (`ml/decision_tree/03_train_and_evaluate.py`) implements a structured transformation:
1. **Numerical Imputation:** Continuous features missing at random (`plant_height_m`) are imputed using the column median.
2. **Categorical Imputation:** Missing categorical entries are assigned the explicit token `'missing_or_unobserved'`, allowing the tree to learn split rules for specimens observed without flowers or uncrushed foliage.
3. **One-Hot Encoding:** Categorical attributes are expanded into binary indicators ($0.0$ or $1.0$). This expands the feature space to **73 total dimensions** (4 numeric continuous + 69 binary category flags). One-hot representation guarantees that each tree split evaluates a single, transparent botanical question (e.g., *"Is growth habit tree? $\le 0.5$"*).
4. **Data Splitting:** Stratified $80/20$ partition ($4,000$ training records, $1,000$ test records), preserving exact class balance (80 train / 20 test per species).

### 4.2 Stratified 5-Fold Cross-Validation Grid Search
We evaluated $270$ hyperparameter candidate combinations across 5 stratified folds ($1,350$ total tree fits) optimizing for multi-class classification accuracy:

$$\text{Parameter Space: } \begin{cases}
\text{Criterion} \in \{\text{'gini'}, \text{'entropy'}\} \\
\text{Max Depth} \in \{10, 12, 14, 16, 18\} \\
\text{Min Samples Split} \in \{2, 4, 8\} \\
\text{Min Samples Leaf} \in \{1, 2, 4\} \\
\text{Cost-Complexity Pruning } (\alpha) \in \{0.0, 0.0005, 0.001\}
\end{cases}$$

### 4.3 Optimal Hyperparameters Found
The optimal configuration identified by GridSearchCV:
* **Splitting Criterion:** Gini Impurity ($I_G(t) = 1 - \sum_{i=1}^C p(i|t)^2$)
* **Max Tree Depth:** $18$ (effective pruned depth achieved: **17**)
* **Min Samples Split:** $8$
* **Min Samples Leaf:** $1$
* **Cost-Complexity Pruning Parameter ($\alpha$):** $0.0005$
* **Best 5-Fold Cross-Validation Accuracy:** **$99.45\%$**

Cost-complexity pruning ($\alpha = 0.0005$) successfully removed redundant single-sample leaves, yielding a compact tree of **52 leaf nodes** without degrading generalization accuracy.

---

## 5. Evaluation & Comparative Analysis

### 5.1 Test Set Performance Metrics & Honest Architectural Comparison
On the held-out test partition ($1,000$ samples across 50 classes), the pruned Decision Tree delivered near-optimal classification performance on the simulated trait distribution:

$$\text{Accuracy} = \frac{995}{1000} = \mathbf{99.50\%}$$

To provide an honest, unvarnished comparison, we evaluated:
1. **Decision Tree (Tuned):** Evaluated on the held-out simulated trait test set ($1,000$ samples, 50 classes).
2. **Random Forest Baseline (100 Trees):** Evaluated on the exact same simulated trait test set.
3. **Production Vision CNN (EfficientNet-B0 ONNX):** Evaluated on real photographic test images (`ml/runs/20261113_190516/eval/`):
   * *(a) Full 150-Species Test Set (4,939 real photos):* Evaluated from `metrics.json`, `confidence_tiers`, and `rejection.json`. The earlier draft figure of 92.4% was incorrect and has been replaced by the actual test set evaluation.
   * *(b) Restricted to 50 Tree Species (1,564 real photos):* Filtered strictly to test images of the 50 species in the decision tree catalog from `confusion_matrix.csv`.

| Performance Dimension | Decision Tree (Tuned) | Random Forest (100 Trees) | Vision CNN (50-Species Test Images) | Vision CNN (Full 150-Species Test Set) |
|---|---|---|---|---|
| **Input Modality** | Simulated Morphology Vectors | Simulated Morphology Vectors | Real RGB Photographs ($224 \times 224$) | Real RGB Photographs ($224 \times 224$) |
| **Test Set Size** | 1,000 simulated samples | 1,000 simulated samples | 1,564 real test photographs | 4,939 real test photographs |
| **Top-1 Accuracy** | **99.50%** (995 / 1,000) | **99.90%** (999 / 1,000) | **80.82%** (1,264 / 1,564) | **83.88%** (4,143 / 4,939) |
| **Top-5 Accuracy** | **99.80%** (998 / 1,000) | **100.0%** (1,000 / 1,000) | **93.67%** (1,465 / 1,564) | **94.39%** (4,662 / 4,939) |
| **Macro Precision** | **0.9952** | **0.9990** | **0.8332** | **0.8379** |
| **Macro Recall** | **0.9950** | **0.9990** | **0.8078** | **0.8349** |
| **Macro F1-Score** | **0.9950** | **0.9990** | **0.8142** | **0.8325** |
| **Model Size / Weights**| **52 Leaves (~48 KB JSON)** | **100 Estimators (~4.2 MB)** | **4.0M Weights (16.2 MB ONNX)** | **4.0M Weights (16.2 MB ONNX)** |
| **Inference Latency** | **$< 0.1\text{ ms}$ (JavaScript CPU)** | **$\approx 8\text{ ms}$ (Python CPU)** | **$\approx 40\text{--}80\text{ ms}$ (WASM/WebGPU)** | **$\approx 40\text{--}80\text{ ms}$ (WASM/WebGPU)** |
| **Explainability** | **100% Deterministic Trail** | **Feature Importances (Gini)** | **Opaque (Grad-CAM Saliency)** | **Opaque (Grad-CAM Saliency)** |

> [!WARNING]
> **Modality Non-Comparability Notice:**  
> The Decision Tree (simulated morphometrics) and the Vision CNN (real pixel photographs) are **not directly comparable**. The Decision Tree's 99.50% accuracy reflects its capacity to partition bounded botanical distributions under simulated noise; it does not indicate that symbolic decision trees surpass deep neural networks on real uncurated photographic inputs. In fact, when isolated to a 50-class closed-world submatrix, the CNN achieves **93.35% accuracy** (1,264 / 1,354) and **0.9280 macro F1** directly from unassisted raw pixels. The earlier draft figure of 92.4% was incorrect and has been replaced.

### 5.2 Confusion Matrix Analysis
The confusion matrix (`docs/images/decision_tree/06_confusion_matrix.png`) exhibits a strong diagonal across all 50 species. 
* Exactly $45$ out of 50 species achieved a perfect $20/20$ ($100\%$) test accuracy.
* The remaining 5 test classification errors were confined to extreme boundary noise within deliberate look-alike pairs (1 sample of Banyan misclassified as Peepal due to high induced measurement noise on leaf breadth; 1 sample of Tulsi misclassified as Mint due to 3% simulated aroma observation error).

### 5.3 Top Feature Importances (MDI / Gini Importance)
The Gini importance (Mean Decrease in Impurity) reveals the most discriminative botanical features across the 50 taxa (`docs/images/decision_tree/07_feature_importance.png`):

```
Top Feature Importances (Normalized):
1. petal_count                          [==========] 0.1025
2. leaf_width_cm                        [========] 0.0820
3. leaf_arrangement_alternate           [======] 0.0615
4. leaf_type_simple                     [======] 0.0615
5. plant_height_m                       [======] 0.0583
6. leaf_length_cm                       [=====] 0.0521
7. latex_or_sap_milky_white             [====] 0.0410
8. aroma_of_crushed_leaves_pungent      [====] 0.0410
9. plant_growth_habit_tree              [====] 0.0410
10. is_composite_head_yes               [===] 0.0385
```

**Key Observation:** Floral merosity (`petal_count`) and leaf width (`leaf_width_cm`) serve as the strongest continuous discriminators, while phyllotaxis (`leaf_arrangement_alternate`), leaf complexity (`leaf_type_simple`), and biochemical exudates (`latex_or_sap_milky_white`) provide decisive categorical partitions.

---

### 5.4 Real-Data Benchmark: UCI One-Hundred Plant Species Leaves Dataset (UCI ID 241)

To evaluate how decision trees and random forests behave on **real physical laboratory measurements**, we conducted an independent benchmark on the official **UCI One-Hundred Plant Species Leaves Data Set** (UCI ID 241; Cope et al., 2012; Mallah, Cope & Orwell, 2013; Creative Commons Attribution 4.0 International).

* **Specimens & Scope:** 1,599 physical leaf specimens across 100 species collected at the Royal Botanic Gardens, Kew, UK.
* **Morphometric Features:** 192 continuous descriptors per specimen:
  * 64 Digital Shape Descriptors (contour curvature and centroid distance vectors)
  * 64 Digital Margin Descriptors (fine-scale boundary margin histograms)
  * 64 Digital Texture Descriptors (Gabor co-occurrence filter bank responses)
* **Evaluation Protocol:** Stratified 5-Fold Cross-Validation with identical cross-validation partitioning.
* **Execution Script:** [`ml/decision_tree/07_uci_leaves_experiment.py`](file:///d:/Antigravity/Plant%20Species%20Classification%20system/ml/decision_tree/07_uci_leaves_experiment.py).

#### Benchmark Results:
| Model Architecture | Stratified 5-Fold CV Accuracy | Macro Precision | Macro Recall | Macro F1-Score |
|---|---|---|---|---|
| **Single Decision Tree (Depth 16)** | **50.84%** | **0.5687** | **0.5083** | **0.5074** |
| **Random Forest Ensemble (100 Trees)**| **97.81%** | **0.9793** | **0.9781** | **0.9781** |

![Figure 9: Confusion Matrix on Real Laboratory Leaves (UCI ID 241)](docs/images/decision_tree/09_uci_leaves_confusion_matrix.png)

#### Critical Scientific Finding:
On 100 fine-grained species with 192 continuous continuous-valued descriptors:
* A **single axis-aligned Decision Tree** struggles with high-dimensional continuous feature spaces without categorical anchors, achieving **50.84% accuracy**. Because each node is restricted to an orthogonal split ($x_j \le \theta$), the tree fragments when separating fine-grained leaf margin histograms across 100 classes.
* A **Random Forest ensemble** achieves **97.81% accuracy** and **0.9781 macro F1**, confirming that tree-based bagging resolves axis-aligned variance and excels at laboratory morphometrics.
* In contrast, on our 50-species botanical catalog, the presence of **categorical architectural traits** (habit, sap, phyllotaxis, scent) enables a single decision tree to maintain high diagnostic precision (99.50%).

---

### 5.5 Robustness Stress Testing: Degradation under Measurement Noise & Missingness

To address the inherent limitation of synthetic simulation, we implemented an automated noise stress testing suite ([`ml/decision_tree/06_noise_stress_test.py`](file:///d:/Antigravity/Plant%20Species%20Classification%20system/ml/decision_tree/06_noise_stress_test.py)). 

We evaluated model degradation across escalating noise tiers:
* **Measurement Noise:** Multiplicative Gaussian std dev ranging from $\pm 6\%$ to $\pm 40\%$.
* **Observer Error:** Novice misidentification of adjacent categories ranging from $3\%$ to $25\%$.
* **Missingness:** Missing flowers, uncrushed leaves, and missing heights ranging from $6\%$ to $35\%$.
* **Unseen Seed Testing:** To prevent test data leakage, the frozen baseline decision tree was evaluated on an **independent, unobserved random seed (`seed=999`)** that was never seen during training or tuning.

| Noise Stress Tier | Measurement Noise (Std Dev) | Observer Error | Field Missingness | Frozen Tree Top-1 (Seed 999) | Frozen Tree Top-3 (Seed 999) | Retrained Tree Top-1 | Random Forest Top-1 |
|---|---|---|---|---|---|---|---|
| **Tier 1 (Baseline)** | $\pm 6\%$ | $3\%$ | $6\%$ | **99.7%** | **99.8%** | **99.5%** | **99.9%** |
| **Tier 2 (Moderate)** | $\pm 12\%$ | $6\%$ | $12\%$ | **99.1%** | **99.4%** | **99.5%** | **99.8%** |
| **Tier 3 (Substantial)**| $\pm 20\%$ | $12\%$ | $20\%$ | **97.7%** | **98.2%** | **98.6%** | **99.6%** |
| **Tier 4 (Severe)** | $\pm 30\%$ | $20\%$ | $30\%$ | **95.3%** | **96.0%** | **97.9%** | **98.7%** |
| **Tier 5 (Extreme)** | $\pm 40\%$ | $25\%$ | $35\%$ | **93.7%** | **94.8%** | **98.0%** | **98.5%** |

![Figure 8: Model Degradation under Measurement Noise and Missingness](docs/images/decision_tree/08_noise_stress_test.png)

#### Key Insights from Figure 8:
1. **Graceful Degradation:** The frozen decision tree maintains $\ge 95.3\%$ Top-1 accuracy even when measurement error reaches $\pm 30\%$ and 30% of features are unobserved.
2. **Top-3 Resiliency:** When primary classification fails under noise, Top-3 accuracy remains exceptionally robust ($\ge 96.0\%$ at $\pm 30\%$ noise; $\ge 94.8\%$ at $\pm 40\%$ noise).
3. **Ensemble Invariance:** Random Forest demonstrates near-complete invariance to noise, dropping only $1.4\%$ (from 99.9% to 98.5%) under extreme noise stress.

---

### 5.6 Comparative Synthesis: Side-by-Side Analysis of the Three Primary Results

To clearly distinguish the capabilities, scope, and boundaries of the models evaluated in this research, Table 5 compares the three primary symbolic and tree-based experiments side by side:

| Dimension | Experiment 1: Single Decision Tree on Simulated Botanical Data | Experiment 2: Single Decision Tree on Real Laboratory UCI Leaves | Experiment 3: Random Forest Ensemble on Real Laboratory UCI Leaves |
|---|---|---|---|
| **Data Provenance** | Simulated field specimens ($N=5,000$, 50 species) bounded by cited botanical floras | Real physical leaf specimens ($N=1,599$, 100 species) scanned at Royal Botanic Gardens, Kew | Real physical leaf specimens ($N=1,599$, 100 species) scanned at Royal Botanic Gardens, Kew |
| **Feature Modality** | 16 multimodal human traits (habit, phyllotaxis, sap, scent, metric sizes) | 192 continuous digital descriptors (64 shape, 64 margin, 64 texture histograms) | 192 continuous digital descriptors (64 shape, 64 margin, 64 texture histograms) |
| **Model Structure** | Single CART Tree (Depth 17, 52 leaf nodes, cost-complexity pruned) | Single CART Tree (Depth 16, tuned min-samples-split) | Ensemble of 100 Decision Trees with feature subsampling |
| **Observed Accuracy** | **99.50% Test Accuracy** (Macro F1: **0.9950**) | **50.84% 5-Fold CV Accuracy** (Macro F1: **0.5074**) | **97.81% 5-Fold CV Accuracy** (Macro F1: **0.9781**) |

#### Critical Analysis: What Each Result Does and Does Not Show

1. **Single Decision Tree on Simulated Botanical Data (99.50%):**
   * **What it shows:** Proves that given a rich multimodal combination of categorical architectural markers (growth habit, phyllotaxis, latex exudate, crushed leaf aroma) and quantitative dimensions, a single hierarchical tree has the mathematical expressive capacity to cleanly partition 50 species at shallow depth (depth 17). It validates that our cost-complexity pruning and feature engineering correctly encoded the botanical dichotomous couplets under moderate simulated noise and missingness.
   * **What it does NOT show:** It does **not** demonstrate real-world field classification accuracy on wild unmeasured plants. Because the training and testing datasets were sampled from the same underlying min-max trait bounds, this 99.50% accuracy reflects internal model capacity and taxonomic consistency rather than real-world wild field generalization across unmodeled phenotypic plasticity.

2. **Single Decision Tree on Real Laboratory UCI Leaves (50.84%):**
   * **What it shows:** Highlights the severe limitation of a single axis-aligned decision tree when applied to high-dimensional ($D = 192$), purely continuous-valued, fine-grained physical features without categorical taxonomic anchors. With 100 classes and only 16 physical samples per class, orthogonal splits ($x_j \le \theta$) suffer from axis-aligned variance, repeatedly slicing through overlapping continuous histograms and yielding a modest **50.84% accuracy**.
   * **What it does NOT show:** It does **not** indicate that decision trees are invalid for botany; rather, it underscores that traditional botanical keys depend heavily on *discrete qualitative characters* (e.g., *"leaves opposite vs. alternate"*, *"sap milky vs. watery"*) rather than subtle continuous differences in high-dimensional contour histograms.

3. **Random Forest Ensemble on Real Laboratory UCI Leaves (97.81%):**
   * **What it shows:** Proves that ensemble bagging with random feature subspaces resolves the axis-aligned variance problem of individual decision trees on continuous laboratory morphometrics, elevating classification performance from 50.84% to **97.81% accuracy** (macro F1: **0.9781**). It confirms that the 192 physical leaf descriptors contain rich, highly discriminative morphological signals that non-linear tree ensembles can extract with extreme precision.
   * **What it does NOT show:** It does **not** retain the human-readable, sequential explainability of a single decision path. An ensemble of 100 trees cannot be traced by a human botanist in the field as a sequential dichotomous key, exposing the classical engineering trade-off between individual interpretable decision paths and ensemble predictive power.

---

## 6. Client-Side Web Application Implementation

### 6.1 Edge Architecture & Serialization
To achieve instant, private inference without server dependencies, the decision tree was serialized into a nested JSON structure (`web/src/data/decision_tree_50.json` and `web/public/models/decision_tree_50.json`):
```json
{
  "id": 0,
  "is_leaf": false,
  "feature": "leaf_shape_palmate_lobed",
  "threshold": 0.5,
  "left": { ... },
  "right": { ... },
  "predicted_id": 0,
  "predicted_name": "Tulsi",
  "confidence": 0.995
}
```

The client-side inference runner (`web/src/ml/decisionTreeRunner.ts`):
* Evaluates incoming inputs in **$< 0.1\text{ ms}$**.
* Computes top-1 prediction, top-3 candidates, confidence percentages, and tree depth.
* Compiles the step-by-step **Decision Trail**.
* Bundles zero external runtime dependencies and operates completely offline.

### 6.2 The Interactive Web Interface (`/identify-traits`)
The new route (`web/src/pages/IdentifyByCharacteristics.tsx`) is accessible via the top navigation bar (**"Traits"**) and through a callout banner on the photo classification page (`/classify`).

**Key UI Capabilities:**
1. **Scope Notice Banner:** Explicitly informs users: *"Decision tree covers 50 species. Use Identify by Photo for all 150."* with a direct link to the camera classifier.
2. **Blank-Slate Interactive Form & Skip Policy:** Starts completely unselected with zero pre-filled traits. Continuous sliders (plant height, leaf length, leaf width, petal count) start unset (displaying 'Not set') and are activated only when moved. Every trait provides an explicit 'Not sure / skip' option; skipped traits use unbiased missing-value imputation (training population medians for continuous attributes, and unobserved category splits for discrete attributes). Requires at least 4 answered traits to activate the 'Submit / Identify' button.
3. **Structured Input Hierarchy:** 
   * *Section 1:* Habit, Plant Height slider ($0.1\text{--}35\text{ m}$), Thorns, Latex/Sap.
   * *Section 2:* Leaf type, Shape, Margin, Phyllotaxis, Venation, Leaf Length slider ($0.5\text{--}100\text{ cm}$), Leaf Width slider ($0.2\text{--}60\text{ cm}$), live Aspect Ratio ($L/W$), and Aroma.
   * *Section 3:* Flower Presence, Flower Color picker, Petal Count stepper ($0\text{--}20$), and Composite Head toggle.
4. **Honest Metric Labelling & Analysis Animation:** Replaced ambiguous '100% Confidence' with 'Leaf purity' (proportion of training specimens at the terminal leaf node) with explanatory tooltips. Submitting triggers an engaging 2.1-second scanning animation walking the tree rules (immediately bypassed when `prefers-reduced-motion` is active), with automatic outdated detection if inputs change post-prediction.
5. **Simulation Limitation & Medical Disclaimers:** Visible notices emphasizing that simulated accuracy does not equal field certainty, and that wild plants must never be ingested based on algorithmic classification.
6. **Data Provenance Footer:** Discloses AI compilation, Cloudflare verification blocks, and `needs_verification = yes` status across all catalog entries.
7. **Mobile Optimization:** Fully responsive layout with sticky bottom submit/progress bar tested and verified at 375 px and 360 px viewports.

---

## 7. Empirical Field Testing (Pending Real Physical Measurements)

To enable standardized verification on physical plant specimens, we designed the evaluation template [`data/traits/field_test_template.csv`](file:///d:/Antigravity/Plant%20Species%20Classification%20system/data/traits/field_test_template.csv) and developed the automated evaluation script [`ml/decision_tree/04_field_test.py`](file:///d:/Antigravity/Plant%20Species%20Classification%20system/ml/decision_tree/04_field_test.py).

### 7.1 Field Testing Status: Pending ($n = 0$ Real Measured Specimens)
* **Real Measured Physical Specimens:** **Pending ($n = 0$)**. No physical field specimens have been collected or measured yet.
* **Integrity Gate:** `ml/decision_tree/04_field_test.py` strictly computes field accuracy over rows with `source='measured'`. Because $n = 0$, reported field accuracy remains formally pending until field specimens are measured and logged.
* **Pipeline Verification on Demo Profiles:** The 9 current rows in `data/traits/field_test_template.csv` are marked `source=demo_from_trait_table`. They were derived directly from our botanical trait table bounds to verify that the parsing, missing-value imputation, and tree traversal logic execute reliably end-to-end without runtime errors. **These demo rows are explicitly excluded from physical specimen or field accuracy claims.**

Table 6 records the software pipeline test cases evaluated on the demo rows:

| Specimen Index | Provenance (`source`) | Demo Test Case | Trait Profile (Derived from Trait Table) | Ground Truth Taxon | Decision Tree Prediction | Confidence | Splits | Pipeline Status | Demo Profile Notes |
|---|---|---|---|---|---|---|---|---|---|
| **#1** | `demo_from_trait_table` | **Tulsi** | Herb, simple ovate, dentate, opposite, reticulate, $3.8\text{ cm} \times 2.1\text{ cm}$, purple flower, 5 petals, pungent aroma | *Ocimum tenuiflorum* | **Tulsi** (ID 0) | **100.0%** | 10 | Valid Path | Demo example derived from trait table; clove/eugenol fragrance. |
| **#2** | `demo_from_trait_table` | **Neem** | Tree, pinnately compound, lanceolate, serrate, alternate, pinnate, $28.5\text{ cm} \times 14.2\text{ cm}$, white flower, 5 petals, sulfurous odor | *Azadirachta indica* | **Neem** (ID 1) | **98.8%** | 16 | Valid Path | Demo example derived from trait table; bitter sulfurous odor. |
| **#3** | `demo_from_trait_table` | **Aloe vera** | Succulent, simple lanceolate, spiny margin, basal rosette, obscure veins, $42.0\text{ cm} \times 7.5\text{ cm}$, yellow flower, 6 petals, spiny margins, yellow latex | *Aloe vera* | **Aloe vera** (ID 2) | **100.0%** | 6 | Valid Path | Demo example derived from trait table; spiny margins and yellow latex. |
| **#4** | `demo_from_trait_table` | **Peepal** | Tree, simple cordate, entire margin, alternate, pinnate, $17.2\text{ cm} \times 11.5\text{ cm}$, milky white latex, absent flowers | *Ficus religiosa* | **Peepal** (ID 17) | **98.7%** | 16 | Valid Path | Demo example derived from trait table; caudate drip tips and milky latex. |
| **#5** | `demo_from_trait_table` | **Sunflower** | Herb, simple cordate, serrate margin, alternate, palmate, $24.0\text{ cm} \times 17.5\text{ cm}$, yellow composite head, absent thorns | *Helianthus annuus* | **Sunflower** (ID 92) | **100.0%** | 8 | Valid Path | Demo example derived from trait table; solitary composite capitulum. |
| **#6** | `demo_from_trait_table` | **Mint** | Herb, simple lanceolate, serrate, opposite, pinnate, $4.2\text{ cm} \times 1.8\text{ cm}$, purple flower, 4 petals, pleasant aromatic scent | *Mentha spicata* | **Mint** (ID 16) | **100.0%** | 14 | Valid Path | Demo example derived from trait table; refreshing spearmint aroma. |
| **#7** | `demo_from_trait_table` | **Hibiscus** | Shrub, simple ovate, serrate, alternate, palmate, $8.5\text{ cm} \times 5.2\text{ cm}$, scarlet flower, 5 petals, absent latex | *Hibiscus rosa-sinensis* | **Hibiscus** (ID 20) | **100.0%** | 8 | Valid Path | Demo example derived from trait table; showy scarlet flower. |
| **#8** | `demo_from_trait_table` | **Mango** | Tree, simple lanceolate, entire, alternate, pinnate, $21.0\text{ cm} \times 6.4\text{ cm}$, yellow flower, 5 petals, sticky resinous sap | *Mangifera indica* | **Mango** (ID 40) | **100.0%** | 14 | Valid Path | Demo example derived from trait table; dark coriaceous foliage with resinous sap. |
| **#9** | `demo_from_trait_table` | **Tulsi (Out of Bloom)** | Herb, simple ovate, dentate, opposite, reticulate, $4.1\text{ cm} \times 2.3\text{ cm}$, absent flowers, pungent aroma | *Ocimum tenuiflorum* | **Tulsi** (ID 0) | **100.0%** | 10 | Valid Path | Demo example derived from trait table; vegetative state without inflorescence. |

### 7.2 Protocol for Adding Real Field Measurements
To record and evaluate genuine field accuracy:
1. Measure living plant specimens in the field using a metric ruler/caliper (leaf length, leaf width, plant height, floral counts).
2. Append a new row to `data/traits/field_test_template.csv` with `source=measured` and detailed location notes.
3. Run `py -3.11 ml/decision_tree/04_field_test.py`. The script will detect all rows with `source=measured`, compute Top-1 and Top-3 field accuracy strictly over $n \ge 1$ physical specimens, and update `field_test_results.json`.

---

## 8. Botanical Limitations & Edge Cases

While the decision tree achieves high mathematical accuracy, real-world field botany involves natural edge cases that must be respected:
1. **Simulation vs. Field Reality:** Accuracy on simulated data measures how well the tree partitioned the simulated trait distributions. In wild conditions, observer measurement error, microclimatic variation, and atypical growth habits can cause tree traversal errors.
2. **Phenotypic Plasticity & Sun/Shade Leaves:** Leaves exposed to intense sunlight (sun leaves) are often smaller, thicker, and have lower aspect ratios than shade leaves on the same individual tree. Users should measure mature, typical sun leaves.
3. **Heterophylly & Juvenile Foliage:** Species such as *Eucalyptus*, *Monstera*, and *Ficus* display distinct juvenile foliage. Juvenile *Monstera deliciosa* leaves lack fenestrations (perforations), which can delay classification until adult characters develop.
4. **Deciduous & Non-Blooming Seasons:** During dry or winter seasons, flowering features (`flower_color`, `petal_count`) are absent. Our pipeline handles this through explicit median and `'missing_or_unobserved'` paths, but confidence naturally drops when reproductive characters are missing.
5. **Species Scope Boundary:** The Decision Tree is strictly bounded to the 50 species in its catalog. Attempting to classify a species outside these 50 will result in a forced partition to the morphologically closest taxon in the catalog. Users must refer to the 150-species Convolutional Vision Model (`/classify`) for full catalog coverage.

---

## 9. Conclusion & Multimodal Roadmap

This milestone successfully planned, implemented, trained, evaluated, and deployed a **Plant Species Classification System using Decision Trees**:
1. **Structured Botanical Schema:** 16 human-measurable diagnostic features across 50 botanical species with cited references.
2. **Honest Data Provenance:** Transparent disclosure of AI compilation and Cloudflare 403 automated check blocks, maintaining `needs_verification = yes` across all entries.
3. **Rigorous Stress Testing:** Documented performance degradation across 5 escalating noise tiers on unobserved random seeds (Figure 8).
4. **Physical Benchmark on Real Leaves:** 1,599-specimen laboratory validation on UCI ID 241 (Decision Tree 50.84% CV / Random Forest 97.81% CV, Figure 9).
5. **Empirical Field Testing Framework:** Created standardized template (`data/traits/field_test_template.csv`) and execution harness (`ml/decision_tree/04_field_test.py`) configured to compute accuracy strictly over real measured specimens (currently pending: $n = 0$ real measured specimens; demo rows excluded from accuracy claims).
6. **Zero-Latency Client Edge Deployment:** Sub-millisecond on-device execution in React at `/identify-traits` with full explainable decision trails.

**Future Work:** We plan to implement **Multimodal Late Fusion**, where neural feature embeddings from the vision CNN are concatenated with the decision tree's leaf node probabilities, delivering a unified hybrid classifier that combines visual intuition with taxonomic rule verification.
