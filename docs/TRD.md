# TRD: Technical Requirements

## 1. Stack
| Area | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript (strict), Tailwind CSS, Framer Motion, React Router |
| Charts & Maps (PROPOSED) | Recharts (charts), react-simple-maps or lightweight GeoJSON SVG (maps) - requires user approval before installing |
| State/data | TanStack Query, Zustand (UI state) |
| Inference | onnxruntime-web (WASM, WebGL where available) |
| Backend | Supabase (Postgres, Auth, Storage, RLS) |
| Training | Python 3.11, PyTorch + CUDA, timm, albumentations, scikit-learn |
| Hosting | Vercel (frontend + model file), GitHub CI |

## 2. Dataset
- Source: GBIF/iNaturalist research-grade, openly licensed images (CC0, CC-BY, CC-BY-NC for non-commercial/academic use; license logged per image).
- Target: 250-400 images per species, mixed organs (whole plant, leaf, flower, fruit).
- Minimum: 150 images per species, otherwise swap the species.
- Split: 80% train / 10% validation / 10% test, stratified by species.
- De-duplication: perceptual hash; same-observation images stay in one split to prevent leakage.
- Extra: a `non_plant` negative set (about 3,000 images: objects, animals, scenes) used for rejection tuning.
- Credits: `ml/dataset_credits.csv` (image id, author, license, source URL).

## 3. Species List
`ml/species_list.csv`: `id, common_name, scientific_name, family, genus, type, origin, hindi_name, bengali_name, notes`.
Candidate groups (112 species, exact ids 0..111 preserved):
- Indian medicinal/sacred: Tulsi, Neem, Aloe vera, Turmeric, Ginger, Ashwagandha, Giloy, Brahmi, Amla, Curry leaf, Moringa, Bael, Arjuna, Ashoka, Betel, Lemongrass, Mint, Peepal, Banyan, Kalmegh
- Indian flowers: Hibiscus, Marigold, Jasmine, Lotus, Rose (genus-level Rosa spp., id 24), Frangipani, Oleander, Bougainvillea, Butterfly pea / Aparajita (Clitoria ternatea, id 28, replaces Tuberose), Night jasmine, Gulmohar, Periwinkle, Ixora, Lantana, Cockscomb, Crossandra, Canna, Balsam, Amaltas, Palash
- Indian trees/fruit: Mango, Coconut, Banana, Papaya, Guava, Pomegranate, Jackfruit, Tamarind, Jamun, Sapota, Custard apple, Lemon, Teak, Sal, Bamboo, Areca palm, Date palm, Silk cotton, Rain tree, Eucalyptus
- Crops/vegetables: Rice, Wheat, Maize, Sugarcane, Tea, Cotton, Mustard, Tomato, Chilli, Brinjal, Okra, Potato, Onion, Coriander, Spinach, Bottle gourd, Pumpkin, Cucumber, Peanut, Jute
- Houseplants: Money plant, Snake plant, Spider plant, Monstera, Peace lily, Rubber plant, Jade plant, Prickly pear, Boston fern, Aglaonema, Dieffenbachia, Patharchatta / Air plant (Kalanchoe pinnata, id 91)
- Garden/wild: Sunflower, Daisy, Dandelion, Lavender, Rosemary, Sweet basil, Tulip, Daffodil, Lily, Dahlia, Zinnia, Cosmos, Chrysanthemum, Gerbera, Foxtail orchid (Rhynchostylis retusa, id 106), Water hyacinth, Sensitive plant, Parthenium, Clover, Oak
Deliberate look-alike pairs: Tulsi/Sweet basil/Mint, Jasmine/Night jasmine, Frangipani/Oleander, Banyan/Peepal/Rubber plant.

## 4. Model
- Backbone: EfficientNet-B0 (ImageNet pretrained, via timm), input 224x224.
- Head: global average pool, then dropout, then Linear(1280, N). Also returns the 1280-d pooled embedding.
- Training (RTX 3050 6 GB): AMP (fp16), batch size 32 (fallback 16), AdamW, cosine schedule.
  - Phase 1: 3-5 epochs, backbone frozen, head only, lr 1e-3.
  - Phase 2: 20-30 epochs, full fine-tune, lr 2e-4 (backbone), 1e-3 (head).
  - Label smoothing 0.1, mixup/cutmix p=0.3, early stopping on validation loss.
- Augmentation: random resized crop (0.5-1.0), flips, rotation, color jitter, blur, perspective, random erasing.
- Calibration: fit a single temperature T on the validation set; `04_evaluate.py` writes T, tau and thresholds to its output, and `05_export_onnx.py` assembles the final `model_meta.json`.
- Class-balanced sampling if the min/max class ratio is below 0.5.

## 5. Inference Contract (browser)
Preprocess: resize shorter side to 256, center crop 224 (multi-crop optional for test-time augmentation), RGB, scale to 0-1, normalize mean [0.485,0.456,0.406], std [0.229,0.224,0.225], NCHW float32.
ONNX outputs: `logits [1,N]`, `embedding [1,1280]`, `features [1,1280,7,7]`.
Post-process:
1. `probs = softmax(logits / T)`.
2. Top-3 by probability.
3. Unknown rule: reject if `max(probs) < 0.35` OR `max cosine(embedding, centroid) < tau`; tau is tuned on the non-plant set and stored in `model_meta.json`.
4. Tier: High >0.85, Medium 0.60-0.85, Low <0.60.
5. Genus fallback: if top-1 < 0.60 and the top-3 share a genus, show "Likely genus X".

## 6. Similar Species Engine
For each species k other than the top-1:
```
ml_k      = probs[k]
visual_k  = clamp((cos(embedding, centroid_k) - 0.30) / 0.70, 0, 1)
final_k   = 0.6 * ml_k + 0.4 * visual_k
```
Rank by `final_k`; show the top 3-5 with all three percentages. Species in the same genus get +0.05 (capped at 1). Centroids are the mean training-set embeddings per class, computed by `04_evaluate.py` / `05_export_onnx.py` and saved to `centroids.json`. Weights are configurable in `model_meta.json`.

## 7. Attention Heatmap
The head is global-average-pool plus linear, so the class activation map is exact:
`CAM = ReLU(sum_c W[class, c] * features[c])`, upsampled to the image, normalized, and overlaid with a colormap.
Classifier weights `W` ship in `cam_weights.bin` (N x 1280 float16). No gradients are needed in the browser. In the UI this is labeled "Attention heatmap".

## 8. Multi-photo Fusion
Average the temperature-scaled probabilities and embeddings across up to 3 images (weights equal), then apply the same post-processing.

## 9. Export & Verification
- `05_export_onnx.py`: export opset 17, dynamic batch, then quantize (dynamic int8 optional; ship fp16/fp32 if accuracy drops more than 0.5 points).
- Parity test: PyTorch vs ONNX logits must match within 1e-3 on 50 fixed images.
- Artifacts: `plant_model.onnx`, `labels.json`, `model_meta.json`, `centroids.json`, `cam_weights.bin`, `metrics.json`.

## 10. Evaluation
Top-1, Top-5, macro precision/recall/F1, per-class table, confusion matrix, top confused pairs, ECE and reliability diagram, non-plant rejection rate, and a separate real-photo set (about 300 own phone photos, never used for training).

## 11. Web Requirements
- Load the model lazily on the Classify page; cache with the Cache API/Service Worker; show progress.
- Run inference in a Web Worker so the UI never blocks.
- Fallback WASM backend if WebGL fails; clear error if neither works.
- Strip EXIF by re-encoding through canvas before any optional upload.

## 12. Environments
`.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Nothing else is secret on the client. The service-role key is never in the repo or the frontend.

## 13. Species Distribution Pipeline (Where It's Found)
- Script: `ml/06_build_distribution.py` queries the GBIF occurrence API using aggregation facets (`facet=country`, `facet=stateProvince`, `facet=month&limit=0`) for each species in `ml/species_list.csv`.
- Output: `web/public/data/species_distribution.json` (compact, coarse data only; no individual GPS points or sensitive location coordinates).
- Schema:
```json
{
  "version": "1.0",
  "generated_at": "ISO-8601",
  "species": {
    "<species_id>": {
      "scientific_name": "Ocimum tenuiflorum",
      "common_name": "Tulsi",
      "total_records": 12450,
      "countries": { "IN": 8200, "NP": 450, "BD": 320, "TH": 190 },
      "indian_states": { "Uttar Pradesh": 1420, "West Bengal": 1100, "Maharashtra": 980 },
      "seasonality": [120, 150, 310, 450, 600, 720, 890, 940, 810, 520, 310, 180]
    }
  }
}
```
- Frontend usage: species detail page (`/species/:slug`) and the Details tab in classification results render a choropleth density map (darker = more sightings), a top regional "Found in" list, and a 12-month seasonality area/bar chart.

## 14. Motion & Animation Technical Contracts
- **Scan Animation Contract (`ScanAnimation`):**
  - Triggered during image classification. Visual elements: sweeping laser scan line, pulsating corner brackets, faint perspective grid, glowing structural keypoints.
  - Text cycling strictly follows real pipeline phases:
    1. Preprocess: "Reading image"
    2. Model inference: "Detecting structure"
    3. Postprocess: "Matching species"
    4. Calibration & explainability: "Calibrating confidence"
  - Display budget: Minimum 250 ms per stage to avoid visual flicker. When inference completes, transitions cleanly to a staged result reveal.
  - Accessibility: Under `prefers-reduced-motion: reduce`, scan sweeps, grids, and particle pulses are bypassed; displays a calm static progress bar or immediate result.
- **Interactive Live Background Performance Budget (`ParticleBackground`):**
  - Renders drifting glowing spores (dark mode) or golden pollen granules (light mode) on an HTML5 `<canvas>`.
  - Resolution capping: Canvas Device Pixel Ratio is clamped to `min(window.devicePixelRatio, 1.5)`.
  - Particle limit: Maximum 50 particles.
  - Power & Tab Visibility: Listens to the Page Visibility API (`visibilitychange`); the `requestAnimationFrame` loop pauses completely when `document.hidden === true`.
  - Touch Fallback: On devices with `@media (hover: none)`, pointer attraction/repulsion calculations are disabled in favor of passive, low-velocity organic drift.
  - Reduced Motion: Renders a single static particle distribution on mount without running an animation loop.
- **Cursor Glow Spotlight Contract (`CursorGlow`):**
  - Highlights card surfaces and hairline glass edges relative to cursor location.
  - Managed by a single passive `pointermove` listener on `window`, scheduled via `requestAnimationFrame`.
  - Injects `--mouse-x` and `--mouse-y` coordinates into active card styles.
  - Entirely disabled on touch devices (`@media (hover: none)`).