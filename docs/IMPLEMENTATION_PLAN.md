# IMPLEMENTATION PLAN

Rough timeline assumes steady daily work; adjust to your deadline.

## Phase 0: Setup (Day 1)
- [ ] Install NVIDIA driver, Python 3.11, Node 20, Git, VS Code
- [ ] Create GitHub repo, Vercel, Supabase, GBIF accounts
- [ ] Scaffold monorepo (`ml/`, `web/`, `supabase/`, `docs/`) and commit all MD files
- [ ] Verify GPU: `python -c "import torch; print(torch.cuda.is_available())"`

## Phase 1: Data (Days 2-3)
- [ ] Finalize `species_list.csv` (110-130 species)
- [ ] `01_download_images.py`: download per species, log licenses
- [ ] Review image counts; swap species below 150 images
- [ ] `02_clean_dataset.py`: dedupe, remove broken/small, grouped stratified split
- [ ] Build the `non_plant` negative set
- [ ] Collect about 300 own phone photos for the real-photo test set (optional but strongly recommended)

## Phase 2: Model (Days 4-6)
- [ ] `03_train.py` phase 1 (head) then phase 2 (fine-tune); AMP on RTX 3050
- [ ] `04_evaluate.py`: Top-1/5, F1, confusion matrix, ECE, rejection tuning
- [ ] Fit temperature, tune tau and the 0.35 threshold
- [ ] Iterate: fix weak classes (more data, merge indistinguishable pairs)
- [ ] `05_export_onnx.py`: ONNX + centroids + CAM weights + metadata; parity test
- [ ] Save `metrics.json` and update the README results table

## Phase 3: Backend (Day 7)
- [ ] Run `schema.sql`, enable RLS, create the storage bucket and policies
- [ ] Write `seed.sql` for every species (verify facts, add look-alike notes)
- [ ] Configure auth providers and redirect URLs
- [ ] Generate the bundled `species.json` fallback

## Phase 4: Frontend Foundation (Days 8-9)
- [ ] Vite + TS + Tailwind setup, fonts, tokens, theme toggle
- [ ] Glass CSS, base UI components, Navbar, Footer, PageBackground
- [ ] Router and all page shells

## Phase 5: Landing Page (Days 10-11)
- [ ] FadingVideo, BlurText, ParallaxLayer, Reveal
- [ ] Hero, Capabilities, How It Works, Try It CTA
- [ ] Reduced-motion and mobile pass

## Phase 6: Classifier (Days 12-15)
- [ ] ONNX worker, preprocess, session cache, load progress
- [ ] Upload/camera UI, validation, preview
- [ ] Postprocess: T, tiers, unknown, genus fallback
- [ ] ResultCard, ConfidenceRing, Top-3
- [ ] Similar species engine + UI
- [ ] CAM heatmap
- [ ] Multi-photo fusion
- [ ] Species details from Supabase with fallback

## Phase 7: Remaining Pages (Days 16-18)
- [ ] Explore + Species detail
- [ ] History (IndexedDB + Supabase), CSV export
- [ ] Feedback
- [ ] Dashboard from `metrics.json`
- [ ] About, Help, 404
- [ ] Optional: batch mode, auth UI, share image

## Phase 8: Quality (Days 19-20)
- [ ] Unit, component and e2e tests; a11y audit; Lighthouse
- [ ] Security review against `SECURITY.md`; CSP tested
- [ ] Cross-browser/mobile testing (Chrome, Edge, Firefox, Safari, Android, iOS)

## Phase 9: Ship (Day 21)
- [ ] Push to GitHub, connect Vercel, add env vars, deploy
- [ ] Smoke-test production, test sign-up, history, feedback
- [ ] Final README (metrics, screenshots, team), demo video

## Risks & Fallbacks
| Risk | Fallback |
|---|---|
| Training too slow/out of memory | Batch 16, image size 192, fewer species |
| Accuracy below target | More images per species, merge look-alikes, test-time augmentation |
| Model too heavy for phones | Quantize, or MobileNetV3 backbone |
| Supabase issues | Bundled `species.json` and local history |