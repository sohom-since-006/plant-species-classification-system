# ARCHITECTURE

## 1. High-Level Diagram
```
                 +---------------------------+
                 |        GitHub repo        |
                 +-------------+-------------+
                               | push to main
                               v
+---------+      +-------------+-------------+      +----------------+
| Browser | <--> |   Vercel (static React)   |      |   Supabase     |
|         |      |   + /models/*.onnx etc.   |      |  Postgres/Auth |
|  ONNX   |      +---------------------------+      |  Storage/RLS   |
| Runtime |                                         +--------^-------+
|  (WASM) |-------------- supabase-js (anon + RLS) -----------+
+----+----+
     |
     v
 Web Worker: preprocess -> model -> post-process -> result
```

## 2. Two Pipelines
**Offline (your laptop, once):** species list -> download images -> clean/split -> train -> evaluate -> export ONNX + metadata -> build coarse distribution (`06_build_distribution.py`) -> copy artifacts into `web/public/models/` and `web/public/data/`.
**Online (user's browser):** load model -> classify on-device -> optionally save history/feedback to Supabase.

## 3. Frontend Modules
```
web/src/
  app/            router, providers, layout
  pages/          Home, Classify, Explore, SpeciesDetail, History, Dashboard, About, Help, NotFound
  features/
    classify/     UploadZone, CameraCapture, ResultCard, ConfidenceRing,
                  SimilarSpecies, HeatmapView, FeedbackPanel, MultiPhotoTray
    species/      SpeciesGrid, SpeciesFilters, SpeciesInfo
    distribution/ DistributionMap, SeasonalityChart, FoundInList, useDistribution
    charts/       AccuracyChart, FamilyBreakdown, SplitChart, HistoryTimeline
                  (PROPOSED: Recharts, react-simple-maps pending user approval)
    history/      HistoryList, HistoryStore
    dashboard/    MetricsCards, ConfusionMatrix, ClassTable, CalibrationChart
    auth/         AuthModal, useSession
  ml/
    worker.ts     Web Worker entry
    preprocess.ts resize/crop/normalize
    session.ts    ONNX session + cache
    postprocess.ts softmax/T, top-k, tiers, unknown rule
    similar.ts    centroid cosine + final score
    cam.ts        class activation map
    fuse.ts       multi-photo fusion
  components/
    ui/           GlassCard, GlassButton, CursorGlow, Badge, Tabs, Toggle, Modal, Toast
    motion/       BlurText, FadingVideo, ParallaxLayer, Reveal,
                  ScanAnimation, ParticleBackground, presets.ts
    layout/       Navbar, Footer, PageBackground
  lib/            supabase.ts, theme.ts, format.ts, csv.ts, cursorGlow.ts
  styles/         index.css (glass classes, tokens, glow variables)
  config/         media.ts (video URLs), constants.ts
  types/          species.ts, distribution.ts, ml.ts
```

## 4. ML Runtime Details
- The worker owns the ONNX session. The main thread posts `{imageBitmap}` and receives `{result}`.
- Backend order: WebGL if available, else WASM (SIMD + threads if cross-origin-isolated, else single-thread).
- The model and metadata are fetched once and cached via the Cache API (versioned by `model_meta.version`).
- Inference results are plain JSON, so the UI is testable without the model.

## 5. Data Flow: Identify
1. UI displays `ScanAnimation` while sending image(s) to the worker, progressing through real pipeline stages ("Reading image" -> "Detecting structure" -> "Matching species" -> "Calibrating confidence") with a 250 ms minimum display time per stage.
2. The worker preprocesses, runs ONNX, returns logits/embedding/features.
3. `postprocess` applies T, tiers, and the unknown rule. `similar` ranks look-alikes. `cam` builds the heatmap.
4. The UI fetches species record and distribution data (`species_distribution.json` / Supabase cache) and triggers a staged result reveal.
5. If the user chose "save": a row goes to `predictions` (Supabase if logged in, otherwise IndexedDB).

## 6. Resilience
- Species details have a bundled `species.json` and `species_distribution.json` fallback, so identification and distribution mapping work offline and if Supabase is down.
- Model load failure shows a retry card.
- Unsupported browsers get a clear message.

## 7. Theming
CSS variables on `:root[data-theme="dark"|"light"]`, toggled by `theme.ts`, persisted to localStorage, defaulting to the system preference (site default is dark).

## 8. Deployment
- GitHub `main` -> Vercel production; PRs -> preview deployments.
- `vercel.json` sets security headers and long-cache headers for `/models/*` (immutable, file names include a version).
- CI (GitHub Actions): typecheck, lint, unit tests, build.

## 9. Key Decisions
| Decision | Reason |
|---|---|
| On-device inference | Free hosting, privacy, no cold starts |
| EfficientNet-B0 | Best accuracy/size/speed for 6 GB training and browser |
| Supabase | Auth + DB + storage in one free tier |
| CAM instead of Grad-CAM | Exact for GAP+linear heads, runs without gradients |
| Static species fallback | Resilience and instant first paint |
| Coarse regional distribution JSON | Compact payload (<300 KB), zero GPS coordinate privacy risks, high speed |
| Shared pointer listener for cursor glow | High visual fidelity with zero DOM event listener proliferation |
| Visibility-aware particle background | Organic spore/pollen atmosphere with zero background tab battery drain |