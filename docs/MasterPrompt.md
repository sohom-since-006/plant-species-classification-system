# Master Prompt: Plant Species Classification System

Build a production-grade, highly aesthetic web application for plant species classification with on-device ONNX inference, a Supabase backend, and a modern Python ML training pipeline in `ml/`.

Read `docs/PRD.md`, `docs/TRD.md`, `docs/ARCHITECTURE.md`, `docs/BACKEND_SCHEMA.md`, `docs/DESIGN.md`, `docs/DESIGN_SYSTEM.md`, `docs/CODE_STYLE.md`, and `docs/SECURITY.md` before coding. When files conflict, `TRD.md` wins on ML behavior and `DESIGN_SYSTEM.md` wins on visuals.

---

## PART A: Design system and foundations

### Visual direction
Cinematic, dark botanical luxury: pure black canvas (dark) / alabaster (light), editorial italic serif headlines (Instrument Serif), clean body text (Barlow), liquid glass cards with hairline gradient borders, and restrained botanical green accents.

### Color tokens (CSS variables in `styles/index.css`)
- Dark: `--bg: #000000`, `--fg: #ffffff`, `--fg-muted: rgba(255,255,255,0.8)`, `--fg-subtle: rgba(255,255,255,0.6)`, `--glass-fill: rgba(255,255,255,0.01)`, `--glass-edge-hi: rgba(255,255,255,0.45)`, `--glass-edge-mid: rgba(255,255,255,0.15)`, `--glass-inset: rgba(255,255,255,0.10)`, `--accent: #6EE7A8`, `--warn: #F5C26B`, `--danger: #F27C7C`, `--cta-bg: #ffffff`, `--cta-fg: #000000`, `--glow-color: rgba(110, 231, 168, 0.15)`, `--glow-edge: rgba(110, 231, 168, 0.45)`, `--spore-color: rgba(110, 231, 168, 0.65)`.
- Light: `--bg: #F8F9FA`, `--fg: #0B0B0C`, `--fg-muted: rgba(11,11,12,0.65)`, `--fg-subtle: rgba(11,11,12,0.5)`, `--glass-fill: rgba(0,0,0,0.02)`, `--glass-edge-hi: rgba(0,0,0,0.22)`, `--glass-edge-mid: rgba(0,0,0,0.08)`, `--glass-inset: rgba(255,255,255,0.7)`, `--accent: #1F7A4D`, `--warn: #B7791F`, `--danger: #C53030`, `--cta-bg: #0B0B0C`, `--cta-fg: #ffffff`, `--glow-color: rgba(31, 122, 77, 0.12)`, `--glow-edge: rgba(31, 122, 77, 0.35)`, `--spore-color: rgba(183, 121, 31, 0.55)`.

### Typography
- Headings: `font-heading` = `'Instrument Serif', serif`, always italic with negative tracking.
- Body: `font-body` = `'Barlow', sans-serif`, 300/400/500/600.
- Botanical names are always italic.

### Liquid glass
Two classes in `styles/index.css`:
1. `.liquid-glass`: backdrop blur 4px, fill `--glass-fill`, subtle top inset highlight, and hairline border via `::before` pseudo-element using `linear-gradient` masked with `mask-composite: exclude`.
2. `.liquid-glass-strong`: backdrop blur 50px, heavier edge and shadow for buttons, modals, floating pills.
3. `.cursor-glow`: spotlight effect illuminating hairline glass borders and translucent card surfaces under the cursor.

### Custom SVG icons (inline, no icon library)
ArrowUpRight (stroke, paths "M7 17L17 7" and "M7 7h10v10"), Play (filled polygon "6 4 20 12 6 20 6 4"), Clock (stroke 1.5, circle r=9 + "M12 7v5l3 2"), Globe (stroke 1.5, circle r=9 + horizontal line + two arcs), Image, Movie, Lightbulb (filled Material-style), plus Leaf, Camera, Upload, Sun, Moon, Search, History, BarChart, Info, ThumbsUp, ThumbsDown.

### Media config
Put video URLs in `src/config/media.ts` so they can be swapped easily:
- hero: `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4`
- capabilities: `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_093722_ccfc7ebf-182f-419f-8a62-2dc02db7dd9d.mp4`
- Add `howItWorks` and `cta` entries (reuse the two above until I supply plant-themed videos).

---

## PART B: Landing page (`/`), parallax scrolling

Sections, all full-bleed, pure black (dark) / alabaster (light) base, videos as
atmosphere with a dark gradient overlay to keep text at 4.5:1 contrast.

### Navbar (fixed, `top-4 left-0 right-0 z-50`, `px-8 lg:px-16`)
- Left: `liquid-glass` circle (h-12 w-12) with italic "P" in `font-heading text-2xl`.
- Center (hidden on mobile): `liquid-glass rounded-full p-1.5` pill with links Home, Identify, Explore, History, Dashboard, About, plus a solid CTA "Identify" with ArrowUpRight.
- Right: theme toggle (glass circle, sun/moon) and the avatar/Login button. Mobile: hamburger menu in a glass sheet.

### 1. Hero (`h-screen`)
- Background `<FadingVideo>` at `absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top`, `width:120%; height:120%`.
- Badge (delay 0.4): `liquid-glass rounded-full` with a white "New" chip and text "120+ species identified instantly, right in your browser".
- Headline via BlurText: **"Plant Species Classification System"** (classes `text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic leading-[0.8] tracking-[-4px]`, max-w-5xl) with tagline **"Know Every Plant You Meet"** in `font-heading italic text-2xl` directly under it.
- Sub (delay 0.8): "Upload a photo of a leaf, flower, or whole plant. Get the species, an honest confidence score, look-alike matches, and everything worth knowing, with no sign-up and no photo ever leaving your device."
- CTAs (delay 1.1): "Start Identifying" (`liquid-glass-strong rounded-full px-5 py-2.5`, ArrowUpRight) and "See How It Works" (Play icon, scrolls to section 3).
- Stat cards (delay 1.3), two `liquid-glass p-5 w-[220px] rounded-[1.25rem]`: Clock "< 2 s / Average time to identify a plant"; Globe "120+ / Species, from Indian herbs to global garden favorites". Read the real species count from `model_meta.json` when present. Numbers use `text-4xl font-heading italic tracking-[-1px]`.
- Trust bar (delay 1.4): glass pill "Built on open biodiversity data and open tools", then names GBIF, iNaturalist, PyTorch, ONNX, Supabase in `font-heading italic text-2xl md:text-3xl`.
- Parallax: video translates at about 0.3x scroll; hero content fades and blurs slightly as it leaves.

### 2. Capabilities (`min-h-screen`)
- Background video (`inset-0 object-cover`), parallax at about 0.2x.
- Label "// Capabilities"; heading "Plant science,\nmade effortless" (`text-6xl md:text-7xl lg:text-[6rem] font-heading italic leading-[0.9] tracking-[-3px]`).
- Grid `grid-cols-1 md:grid-cols-3 gap-6`, three cards (`liquid-glass rounded-[1.25rem] p-6 min-h-[360px] flex flex-col`): icon box (`liquid-glass h-11 w-11 rounded-[0.75rem]`) top-left, tags top-right (glass pills, 11px), spacer, then title (`font-heading italic text-3xl md:text-4xl tracking-[-1px]`) and body (`text-sm font-light leading-snug max-w-[32ch]`).
  1. **Identify**: icon Image; tags Leaf, Flower, Fruit, Whole Plant; "Snap or upload any part of a plant. Our model recognizes species across Indian and global flora in seconds."
  2. **Explain**: icon Lightbulb; tags Confidence, Heatmap, Look-alikes, Match %; "See why the model decided: calibrated confidence, an attention heatmap, and the species it is most often confused with."
  3. **Explore**: icon Movie replaced by Leaf; tags Uses, Habitat, Care, Names; "Every species comes with names in English, Hindi and Bengali, identifying features, uses, habitat and care tips."
- Cards stagger in with `Reveal` (blur-in) and drift at slightly different speeds for depth.

### 3. How It Works (`min-h-screen`)
- Three large numbered steps (01 Upload, 02 Analyze, 03 Understand), each a glass card that pins and slides over the previous one on scroll (sticky stacking parallax). Include a looping mini-demo mockup of the result card. Copy: Upload: "Drop a photo or use your camera." Analyze: "A compact neural network runs entirely on your device." Understand: "Get the species, confidence, look-alikes and care notes."

### 4. Try It (CTA) + Footer
- Big headline "Ready to meet your plants?" with a primary "Start Identifying" button and a drag-and-drop mini zone that navigates to `/classify` with the chosen file.
- Footer: links, disclaimer ("Identification is probabilistic. Never eat or use a plant based only on this result."), credits (GBIF, iNaturalist).

Implement parallax with Framer Motion `useScroll` and `useTransform`. Disable parallax and blur under `prefers-reduced-motion`.

---

## PART C: App pages (not parallax)

All pages share `PageBackground` and `ParticleBackground`: a lightweight HTML5 canvas of 35-50 drifting glowing spores (dark mode) or golden pollen granules (light mode) that gently react to cursor movements (attraction/repulsion), plus a soft spotlight following the pointer. Capped at DPR 1.5, pauses when the tab is hidden (`document.hidden`), passive slow drift on touch devices, and completely static under `prefers-reduced-motion`. Glass cards feature a subtle cursor spotlight glow (`CursorGlow`) powered by a single shared `pointermove` listener on `window`. Content max-width 1200 px. Global motion uses shared presets (`src/components/motion/presets.ts`) with route crossfades, staggered reveals, count-up numbers, hover/press micro-interactions, skeleton loaders, and spring modals.

### `/classify`
- Lazy-load the model with a progress bar; cache it. Show a clear retry card on failure.
- UploadZone (dashed glass; drag-and-drop, browse, camera capture), validation (JPG/PNG/WEBP, max 10 MB), preview, replace/remove, sample images.
- MultiPhotoTray: up to 3 photos with "Combined from N photos" note.
- Identify button with `ScanAnimation`: sweeping laser line vertically traversing the plant photo, glowing corner brackets, perspective grid, pulsing structural detection dots, real-pipeline stage text cycling ("Reading image" -> "Detecting structure" -> "Matching species" -> "Calibrating confidence"), progress ring, and a minimum display time of 250 ms per stage. Disabled under `prefers-reduced-motion`.
- Staged Result Reveal: Scanner dissolves cleanly into ResultCard. ConfidenceRing + tier badge (text and color), species name and italic scientific name, Top-3 bars, genus fallback note, unknown/low-confidence messages from `docs/PRODUCT.md`.
- Tabs:
  - **Details**: names in English/Hindi/Bengali, taxonomy chips, identifying features, habitat, uses, care, toxicity note, and the **Where it's found** section featuring an interactive regional distribution map (darker = more sightings), a ranked "Found in" regional list, and a 12-month seasonality chart.
  - **Similar species**: table (ML %, Visual Match %, Final Match %), bar chart, "how to tell apart", click-through to explore.
  - **Heatmap**: side-by-side original and CAM overlay with an opacity slider and legend.
  - **Feedback**: thumbs up/down, searchable correct-species picker, optional comment.
- Actions: save to history, download result as image, classify another.
- Footer disclaimers on every result.

### `/explore` and `/species/:slug`
- Explore: search, filters (family, type, origin), species counts by family breakdown chart, species card grid with reference images, URL-synced filters, skeleton loaders.
- Species detail page: hero image, names, taxonomy chips, sections for features/uses/care, look-alike cards with "how to tell apart", interactive "Where it's found" distribution map, "Found in" regional list, and 12-month seasonality chart.

### `/history`
Local (IndexedDB) for guests, Supabase `predictions` for logged-in users, thumbnails, confidence, date, delete, clear all, CSV export, and a **confidence tiers over time** timeline graph. Optional batch classification mode (multi-file upload, results table, CSV download).

### `/dashboard`
Read `metrics.json` and model statistics: metric cards (Top-1, Top-5, macro F1, ECE, species count, model size), images per species graph, Indian vs global distribution split chart, family breakdown chart, confusion matrix heatmap (zoom and hover), top confused pairs, per-class table (sortable), and reliability calibration diagram. Show "TBD" if a value is missing. Never invent numbers.
*(PROPOSED dependencies: Recharts for charts and react-simple-maps / lightweight GeoJSON SVG for maps; require user approval before installing).*

### `/about`, `/help`, 404
About: objective, dataset and licenses, model architecture, methodology flowchart, privacy note, and limitations. Help: photo tips (single leaf or flower, good light, plain background, fill the frame), supported formats, FAQ accordion, limits (110-130 species only), disclaimers. A friendly leaf-themed 404.

### Auth (optional, P2)
Supabase email and Google login in a glass modal; guests everywhere else. Sync theme to `profiles`.

---

## PART D: ML integration (follow `docs/TRD.md` exactly)

- Files in `web/public/models/`: `plant_model.onnx`, `labels.json`, `model_meta.json` (version, T, tau, thresholds, weights 0.6/0.4, mean/std), `centroids.json`, `cam_weights.bin`, `metrics.json`.
- Distribution data: `web/public/data/species_distribution.json` (coarse country, Indian state/province, and monthly seasonality facets generated by `ml/06_build_distribution.py`).
- Modules in `src/ml/`: `worker.ts`, `preprocess.ts`, `session.ts`, `postprocess.ts`, `similar.ts`, `cam.ts`, `fuse.ts`. Inference only in the Web Worker (WebGL then WASM fallback). Cache by `model_meta.version`.
- Until real model files exist, ship a **mock mode** (`VITE_MOCK_ML=true`) that returns deterministic fake results from fixtures so the whole UI can be built and tested, clearly badged "Demo mode" in the UI. Never present mock numbers as real metrics.
- Output of every inference is plain JSON `{top3, tier, unknown, similar[], camData, modelVersion}` so the UI is testable without the model.

---

## PART E: Supabase (follow `docs/BACKEND_SCHEMA.md`)

Generate `supabase/schema.sql`, `supabase/seed.sql` (a few real species first, rest as a template I will fill and verify; mark uncertain facts `TODO(verify)`), RLS policies, storage policies. Frontend uses only the anon key and `@supabase/supabase-js`. Bundle `species.json` as an offline fallback generated from the seed. Opt-in only for image uploads (re-encode to strip EXIF, max 1024 px).

---

## PART F: Theming

Dark default, light toggle in the navbar, persisted in localStorage, initial value from the system preference, applied as `data-theme` on `<html>` before first paint (inline script in `index.html`, no flash). All colors via CSS variables from `docs/DESIGN_SYSTEM.md`. Verify contrast on both themes.

---

## PART G: Quality bar

- TypeScript strict, ESLint, Prettier, path alias `@`.
- Responsive from 360 px; keyboard accessible; visible focus; axe zero serious issues; reduced-motion honored across all animations.
- Security per `docs/SECURITY.md`: `vercel.json` headers and CSP, no `dangerouslySetInnerHTML`, no secrets, upload validation.
- Tests per `docs/TESTING.md`: Vitest for ml modules and components, Playwright for e2e flows, reduced-motion verification, GitHub Actions CI.
- Performance: lazy-load routes and the model, code-split, self-host fonts or preconnect, optimized images, 60 fps animation budget.
- Deliver `.env.example`, `vercel.json`, and an updated README.

---

## PART H: Build phases (stop after each for review)

1. **Foundation:** scaffold, Tailwind, fonts, tokens, glass CSS, theme toggle, Navbar, Footer, PageBackground, router with page shells.
2. **Landing page:** FadingVideo, BlurText, Reveal, parallax sections 1-4, mobile and reduced-motion pass.
3. **Classifier UI in mock mode:** upload, camera, results, tabs, similar species, heatmap, feedback.
4. **Real ML wiring:** worker, preprocess, postprocess, similar, CAM, fusion, parity-tested against golden fixtures (when model files are available).
5. **Supabase:** schema, seed, library, species detail, history, feedback, optional auth, fallback JSON.
6. **Dashboard, About, Help, 404, batch mode.**
6b. **Motion and interaction pass:** shared motion presets (`presets.ts`), route transitions (`AnimatePresence`), ScanAnimation during classify, ParticleBackground (spores/pollen with visibility pause and DPR cap), CursorGlow on cards/buttons, micro-interactions, reduced-motion compliance.
6c. **Distribution and graphs:** `ml/06_build_distribution.py`, `species_distribution.json`, proposed chart and map dependencies approval (`recharts`, `react-simple-maps`), DistributionMap, SeasonalityChart, FoundInList, Dashboard statistics graphs, History timeline, Explore family breakdown.
7. **Testing, accessibility, security, performance, deployment config.**

After each phase list what you built, how to run it, and what you need from me.

---

## PART I: Companion prompt: training scripts

When I say "build the ML pipeline", create `ml/` per `docs/TRD.md`: `species_list.csv` (from the species groups), `01_download_images.py` (GBIF/iNaturalist research-grade, openly licensed, 250-400 per species, parallel ThreadPoolExecutor with 8 workers, resumable, writes `dataset_credits.csv`, reports species under 150 images), `ml/tools/contact_sheet.py` (24-thumbnail inspection grids), `02_clean_dataset.py` (perceptual-hash dedupe, drop corrupt/small images, grouped stratified 80/10/10 split, non-plant negatives), `03_train.py` (EfficientNet-B0 via timm, AMP, two phases, augmentations, label smoothing, mixup/cutmix, early stopping, batch size fallback for 6 GB VRAM), `04_evaluate.py` (Top-1/5, per-class report, confusion matrix, ECE, temperature fit, tau and rejection threshold tuning, `metrics.json`), `05_export_onnx.py` (opset 17, outputs logits, embedding, features; centroids; CAM weights; parity test), `06_build_distribution.py` (GBIF regional facets for country, Indian state/province, seasonality to `species_distribution.json`), `requirements.txt`, and pytest tests. All scripts seeded, idempotent, with clear CLI help and progress bars, written for Windows + CUDA.

---

## Rules
- Never fabricate metrics, species facts, or licenses.
- Ask me before adding any dependency outside the chosen stack.
- Do not mention or rely on third-party identification services.
- Keep the disclaimers visible wherever uses, edibility or identification results appear.
- Prefer small, tested, well-named modules; no dead code.
