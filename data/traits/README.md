# Botanical Phenotypic Traits Dataset (50 Taxa Catalog)

This directory contains the curated botanical trait tables and field evaluation templates used to train and evaluate the **Plant Species Classification System using Decision Trees**.

> [!IMPORTANT]
> **Data Provenance & Verification Notice:**
> The trait values in this dataset were compiled by an AI assistant from cited botanical floras (Flora of China, Kew POWO, Flora of India) and were **not fully verified**. The reference servers blocked automated verification checks with Cloudflare HTTP 403 Forbidden. Consequently, **every row has `needs_verification = yes`** pending manual physical herbarium audit.

---

## 1. File Inventory

* `traits_50.csv`: The complete 50-species botanical trait matrix containing 16 diagnostic morphological and organoleptic traits, evidence classifications, source citations, and `needs_verification = yes` flags.
* `traits_pilot.csv`: The initial 10-species pilot trait table created during the pilot verification phase.
* `simulated_plant_traits_dataset.csv`: 5,000 simulated specimen records (100 per species) generated with uniform sampling within cited bounds, ±6% Gaussian measurement noise, 3% novice observer error, and 5–8% realistic field missingness.
* `simulated_plant_traits_clean.csv`: Cleaned dataset with missing values handled (numerical median, categorical `'missing_or_unobserved'`).
* `field_test_template.csv`: Standardized evaluation template containing physical specimen measurements (9 test specimens) used to test the decision tree in `ml/decision_tree/04_field_test.py`.

---

## 2. Feature Schema & Column Definitions

| Column Name | Data Type | Units / Valid Values | Description |
|---|---|---|---|
| `id` | Integer | `0` to `149` | Unique species index matching `ml/species_list.csv` and `supabase/seed.sql`. |
| `common_name` | String | e.g., "Tulsi", "Neem" | Primary English / vernacular name. |
| `scientific_name` | String | e.g., "Ocimum tenuiflorum" | Botanical binomial nomenclature (Genus + specific epithet). |
| `family` | String | e.g., "Lamiaceae", "Meliaceae" | Taxonomic botanical family. |
| `plant_growth_habit` | Categorical | `herb`, `shrub`, `tree`, `climber`, `grass`, `succulent`, `aquatic`, `epiphyte` | Primary architectural and structural growth habit. |
| `leaf_type` | Categorical | `simple`, `pinnately_compound`, `bipinnately_compound`, `palmately_compound`, `trifoliolate`, `scale_or_reduced` | Primary morphological leaf complexity. |
| `leaf_shape` | Categorical | `ovate`, `elliptic`, `lanceolate`, `linear`, `oblong`, `cordate`, `orbicular`, `palmate_lobed`, `pinnatisect`, `spatulate`, `needle_or_scale` | Geometric outline of typical mature leaf blade / leaflet. |
| `leaf_margin` | Categorical | `entire`, `serrate`, `dentate`, `crenate`, `lobed`, `undulate`, `ciliate`, `spiny` | Outer margin boundary anatomy. |
| `leaf_arrangement` | Categorical | `alternate`, `opposite`, `whorled`, `basal_rosette`, `spiral`, `distichous` | Phyllotaxis (arrangement of leaves along the stem). |
| `leaf_venation` | Categorical | `pinnate`, `palmate`, `parallel`, `reticulate`, `arcuate`, `absent_or_obscure` | Pattern of veins in the blade. |
| `leaf_length_min_cm` | Float | Centimeters (cm) | Minimum typical mature leaf blade / compound leaf length. |
| `leaf_length_max_cm` | Float | Centimeters (cm) | Maximum typical mature leaf blade / compound leaf length. |
| `leaf_width_min_cm` | Float | Centimeters (cm) | Minimum typical mature leaf blade / compound leaf width. |
| `leaf_width_max_cm` | Float | Centimeters (cm) | Maximum typical mature leaf blade / compound leaf width. |
| `plant_height_min_m` | Float | Meters (m) | Minimum typical mature vegetative plant height. |
| `plant_height_max_m` | Float | Meters (m) | Maximum typical mature vegetative plant height. |
| `flower_present` | Categorical | `yes`, `no`, `inconspicuous_or_absent` | Whether flowers are typically noticeable and present. |
| `flower_color` | Categorical | `white`, `yellow`, `red_or_crimson`, `pink_or_magenta`, `purple_or_violet`, `blue`, `orange`, `green`, `brown_or_inconspicuous`, `multi_colored`, `not_applicable` | Conspicuous floral coloration. |
| `petal_count` | Integer | `0` to `20` (capped) | Distinct petal / corolla lobe count (`0` for composite heads, apetalous flowers, or gymnosperms). |
| `is_composite_head` | Categorical | `yes`, `no` | Whether the inflorescence is an Asteraceae capitulum (e.g., Sunflower, Marigold). |
| `thorns_or_spines` | Categorical | `absent`, `spines_or_thorns_on_stem`, `prickles`, `spiny_leaf_margins` | Presence and type of physical defensive armatures. |
| `latex_or_sap` | Categorical | `watery_clear`, `milky_white`, `colored_yellow_red`, `sticky_resinous`, `none_apparent` | Biochemical exudate upon mechanical fracture of leaf or stem. |
| `aroma_of_crushed_leaves` | Categorical | `none_or_faint`, `aromatic_pleasant`, `pungent_or_strong`, `citrusy`, `foul_or_rank`, `sweet_floral` | Volatile secondary metabolites released upon crushing foliage. |
| `evidence_habit_morphology` | Categorical | `flora`, `observational`, `unverified` | Evidence basis for habit, leaf type, shape, margin, arrangement, and venation. |
| `evidence_numeric_dimensions` | Categorical | `flora`, `observational`, `unverified` | Evidence basis for quantitative leaf and height dimensions. |
| `evidence_floral` | Categorical | `flora`, `observational`, `unverified` | Evidence basis for floral presence, color, petal count, and composite status. |
| `evidence_sensory_special` | Categorical | `flora`, `observational`, `unverified` | Evidence basis for aroma, sap/latex, and thorns/spines. |
| `needs_verification` | Categorical | `no`, `yes` | Quality flag: `yes` for all 50 species due to Cloudflare-blocked automated verification. |
| `source_url` | String | Valid HTTP/HTTPS URL | Botanical reference source. |
| `source_notes` | String | Text description | Specific volume, page number, and diagnostic notes. |

---

## 3. Botanical Catalog & Verification Status (50 Species)

All 50 species are compiled from authoritative references (Flora of China, Kew POWO, Flora of India) and maintain `needs_verification = yes` pending manual taxonomic verification:

| ID | Common Name | Scientific Name | Botanical Family | Source Reference | Needs Verification |
|---|---|---|---|---|---|
| 0 | Tulsi | *Ocimum tenuiflorum* | Lamiaceae | Flora of China Vol. 17 | `yes` |
| 1 | Neem | *Azadirachta indica* | Meliaceae | Flora of China Vol. 11 | `yes` |
| 2 | Aloe vera | *Aloe vera* | Asphodelaceae | Flora of China Vol. 24 | `yes` |
| 3 | Amla | *Phyllanthus emblica* | Phyllanthaceae | Flora of China Vol. 11 | `yes` |
| 4 | Ashwagandha | *Withania somnifera* | Solanaceae | Flora of China Vol. 17 | `yes` |
| 5 | Brahmi | *Bacopa monnieri* | Plantaginaceae | Flora of China Vol. 18 | `yes` |
| 6 | Lemongrass | *Cymbopogon citratus* | Poaceae | Flora of China Vol. 22 | `yes` |
| 7 | Giloy | *Tinospora cordifolia* | Menispermaceae | Kew POWO urn:lsid:ipni.org:names:584346-1 | `yes` |
| 8 | Curry Tree | *Murraya koenigii* | Rutaceae | Flora of China Vol. 11 | `yes` |
| 9 | Guava | *Psidium guajava* | Myrtaceae | Flora of China Vol. 13 | `yes` |
| 10 | Papaya | *Carica papaya* | Caricaceae | Flora of China Vol. 13 | `yes` |
| 11 | Pomegranate | *Punica granatum* | Lythraceae | Flora of China Vol. 13 | `yes` |
| 12 | Lemon | *Citrus limon* | Rutaceae | Flora of China Vol. 11 | `yes` |
| 13 | Moringa | *Moringa oleifera* | Moringaceae | Flora of China Vol. 8 | `yes` |
| 14 | Shatavari | *Asparagus racemosus* | Asparagaceae | Kew POWO urn:lsid:ipni.org:names:531238-1 | `yes` |
| 15 | Gotu Kola | *Centella asiatica* | Apiaceae | Flora of China Vol. 14 | `yes` |
| 16 | Mint | *Mentha spicata* | Lamiaceae | Flora of China Vol. 17 | `yes` |
| 17 | Peepal | *Ficus religiosa* | Moraceae | Flora of China Vol. 5 | `yes` |
| 18 | Banyan | *Ficus benghalensis* | Moraceae | Flora of China Vol. 5 | `yes` |
| 19 | Eucalyptus | *Eucalyptus globulus* | Myrtaceae | Flora of China Vol. 13 | `yes` |
| 20 | Hibiscus | *Hibiscus rosa-sinensis* | Malvaceae | Flora of China Vol. 12 | `yes` |
| 21 | Rose | *Rosa indica* | Rosaceae | Flora of China Vol. 9 | `yes` |
| 22 | Jasmine | *Jasminum officinale* | Oleaceae | Flora of China Vol. 15 | `yes` |
| 23 | Marigold | *Tagetes erecta* | Asteraceae | Flora of China Vol. 20-21 | `yes` |
| 24 | Bougainvillea | *Bougainvillea spectabilis* | Nyctaginaceae | Flora of China Vol. 5 | `yes` |
| 25 | Bamboo | *Bambusa vulgaris* | Poaceae | Flora of China Vol. 22 | `yes` |
| 26 | Teak | *Tectona grandis* | Lamiaceae | Flora of China Vol. 17 | `yes` |
| 27 | Sandalwood | *Santalum album* | Santalaceae | Flora of China Vol. 5 | `yes` |
| 28 | Jamun | *Syzygium cumini* | Myrtaceae | Flora of China Vol. 13 | `yes` |
| 29 | Tamarind | *Tamarindus indica* | Fabaceae | Flora of China Vol. 10 | `yes` |
| 30 | Jackfruit | *Artocarpus heterophyllus* | Moraceae | Flora of China Vol. 5 | `yes` |
| 31 | Fenugreek | *Trigonella foenum-graecum* | Fabaceae | Flora of China Vol. 10 | `yes` |
| 32 | Coriander | *Coriandrum sativum* | Apiaceae | Flora of China Vol. 14 | `yes` |
| 33 | Ginger | *Zingiber officinale* | Zingiberaceae | Flora of China Vol. 24 | `yes` |
| 34 | Turmeric | *Curcuma longa* | Zingiberaceae | Flora of China Vol. 24 | `yes` |
| 35 | Clove | *Syzygium aromaticum* | Myrtaceae | Flora of China Vol. 13 | `yes` |
| 36 | Cinnamon | *Cinnamomum verum* | Lauraceae | Flora of China Vol. 7 | `yes` |
| 37 | Cardamom | *Elettaria cardamomum* | Zingiberaceae | Kew POWO urn:lsid:ipni.org:names:796502-1 | `yes` |
| 38 | Black Pepper | *Piper nigrum* | Piperaceae | Flora of China Vol. 4 | `yes` |
| 39 | Castor | *Ricinus communis* | Euphorbiaceae | Flora of China Vol. 11 | `yes` |
| 40 | Mango | *Mangifera indica* | Anacardiaceae | Flora of China Vol. 11 | `yes` |
| 41 | Banana | *Musa paradisiaca* | Musaceae | Flora of China Vol. 24 | `yes` |
| 42 | Coconut | *Cocos nucifera* | Arecaceae | Flora of China Vol. 23 | `yes` |
| 43 | Betel | *Piper betle* | Piperaceae | Flora of China Vol. 4 | `yes` |
| 44 | Henna | *Lawsonia inermis* | Lythraceae | Flora of China Vol. 13 | `yes` |
| 45 | Snake Plant | *Dracaena trifasciata* | Asparagaceae | Kew POWO urn:lsid:ipni.org:names:77189123-1 | `yes` |
| 46 | Money Plant | *Epipremnum aureum* | Araceae | Flora of China Vol. 23 | `yes` |
| 47 | Areca Palm | *Dypsis lutescens* | Arecaceae | Kew POWO urn:lsid:ipni.org:names:666795-1 | `yes` |
| 48 | Rubber Plant | *Ficus elastica* | Moraceae | Flora of China Vol. 5 | `yes` |
| 49 | Spider Plant | *Chlorophytum comosum* | Asparagaceae | Kew POWO urn:lsid:ipni.org:names:532986-1 | `yes` |

---

## 4. Empirical Simulation & Stress Test Results

* **Simulation Protocol:** Uniform distribution across minimum and maximum trait bounds; Gaussian multiplicative noise ($\sigma = 0.06$); 3% novice categorical confusion; 5–8% field missingness.
* **Trained Tree Model:** `ml/decision_tree/tree_model.json` (Depth 17, 52 Leaf Nodes).
* **Cross-Validation Accuracy:** 99.45% (5-fold stratified CV).
* **Test Set Accuracy:** 99.50% (Top-1), Macro F1: 0.9950.
* **Noise Stress Test Degradation (tested on unseen seed 999):**
  * Baseline ($\pm 6\%$ noise, 6% missing): 99.7% Top-1, 99.8% Top-3
  * Moderate ($\pm 12\%$ noise, 12% missing): 99.1% Top-1, 99.4% Top-3
  * Substantial ($\pm 20\%$ noise, 20% missing): 97.7% Top-1, 98.2% Top-3
  * Severe ($\pm 30\%$ noise, 30% missing): 95.3% Top-1, 96.0% Top-3
  * Extreme ($\pm 40\%$ noise, 35% missing): 93.7% Top-1, 94.8% Top-3
