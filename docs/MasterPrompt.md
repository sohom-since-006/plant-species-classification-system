# MASTER PROMPT: Build the Plant Species Classification System

You are a senior full-stack engineer and designer. Build the complete website
described below inside the `web/` folder of this repo. First read `AGENTS.md`
and every file in `docs/`; they are the source of truth for behavior, design,
schema, security and testing. This prompt is the build brief. Where a doc and this
prompt disagree on ML behavior, follow `docs/TRD.md`; on visuals, follow
`docs/DESIGN_SYSTEM.md`. Work in the phases at the end and stop after each phase
for me to review.

---

## PART A: Base design (landing page foundation)

Build a React + Vite + TypeScript + Tailwind CSS site with a dark, cinematic
"liquid glass" look and smooth blur/fade animations using Framer Motion.

### Fonts (Google Fonts, via `<link>` in `index.html`)
- Instrument Serif (italic) for all headings (`font-heading`)
- Barlow (300, 400, 500, 600) for body text (`font-body`)
Tailwind `fontFamily`: `heading: ["'Instrument Serif'", 'serif']`, `body: ["'Barlow'", 'sans-serif']`.
Base CSS: `html, body { background: var(--bg); color: var(--fg); font-family: 'Barlow', sans-serif; }`

### Liquid glass
Implement `.liquid-glass` (blur 4px, fill rgba(255,255,255,0.01), luminosity
blend, inset highlight, gradient-stroke border via `::before` with
`padding:1.4px` and the xor mask-composite trick) and `.liquid-glass-strong`
(blur 50px, extra drop shadow `4px 4px 4px rgba(0,0,0,0.05)`, stronger edge
alpha 0.5/0.2). Use the exact CSS and CSS variables from `docs/DESIGN_SYSTEM.md`
so both dark and light themes work.

### FadingVideo component
`<video>` wrapper accepting `src` (string or string[]), `className`, `style`:
1. Starts at `opacity: 0`.
2. On `loadeddata`, fade in over 500 ms using `requestAnimationFrame`.
3. On `timeupdate`, when remaining time is at most 0.55 s, fade out over 550 ms.
4. On `ended`: single source resets `currentTime` to 0, replays, fades in; array advances to the next index (cycling).
5. `autoPlay`, `muted`, `playsInline`, `preload="auto"`. Respect `prefers-reduced-motion` by showing the poster/first frame only.

### BlurText component
Word-by-word staggered blur-in using Framer Motion: split by spaces; each word is
a `motion.span` (`display:inline-block`, `marginRight:0.28em`); trigger via
IntersectionObserver (threshold 0.1); animate `filter` blur(10px) to blur(0px),
`opacity` 0 to 1, `y` 50 to 0; 0.7 s per word, 100 ms stagger; container is flex,
wrap, centered, `rowGap:0.1em`.

### Shared entrance animation
`initial {filter:'blur(10px)', opacity:0, y:20}` to `animate {filter:'blur(0px)', opacity:1, y:0}`, 0.8 s easeOut.

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
- Headline via BlurText: **"Know Every Plant You Meet"**, classes `text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic leading-[0.8] tracking-[-4px]`.
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
- Floating leaf silhouettes (SVG) at 3 depths drifting at 0.2x, 0.5x, 0.8x.

### 4. Try It (CTA) + Footer
- Big headline "Ready to meet your plants?" with a primary "Start Identifying" button and a drag-and-drop mini zone that navigates to `/classify` with the chosen file.
- Footer: links, disclaimer ("Identification is probabilistic. Never eat or use a plant based only on this result."), credits (GBIF, iNaturalist).

Implement parallax with Framer Motion `useScroll` and `useTransform`. Disable parallax and blur under `prefers-reduced-motion`.

---

## PART C: App pages (not parallax)

All pages share `PageBackground`: slowly drifting aurora gradients (green/teal/emerald
glows, 20-40 s loops, GPU-friendly CSS) or a very dim looping video with a heavy
overlay; glass cards on top; content max-width 1200 px. Fade-up on mount (0.4 s).

### `/classify`
- Lazy-load the model with a progress bar; cache it. Show a clear retry card on failure.
- UploadZone (dashed glass; drag-and-drop, browse, camera capture), validation (JPG/PNG/WEBP, max 10 MB), preview, replace/remove, sample images.
- MultiPhotoTray: up to 3 photos with "Combined from N photos" note.
- Identify button with an analyzing animation.
- Results (follow `docs/TRD.md` sections 5-8): ConfidenceRing + tier badge (text and color), species name and italic scientific name, Top-3 bars, genus fallback note, unknown/low-confidence messages from `docs/PRODUCT.md`.
- Tabs: **Details** (names in English/Hindi/Bengali, taxonomy chips, identifying features, habitat, uses, care, toxicity note), **Similar species** (table: ML %, Visual Match %, Final Match %, bar chart, "how to tell apart", click-through), **Heatmap** (side-by-side original and CAM overlay with an opacity slider and legend), **Feedback** (thumbs up/down, searchable correct-species picker, optional comment).
- Actions: save to history, download result as image, classify another.
- Footer disclaimers on every result.

### `/explore` and `/species/:slug`
Search, filters (family, type, origin), species cards with reference images, URL-synced
filters, skeleton loaders. Detail page with hero, all fields, and look-alike cards.

### `/history`
Local (IndexedDB) for guests, Supabase `predictions` for logged-in users, thumbnails,
confidence, date, delete, clear all, CSV export. Optional batch classification mode
(multi-file upload, results table, CSV download).

### `/dashboard`
Read `metrics.json`: metric cards (Top-1, Top-5, macro F1, ECE, species count, model size),
confusion matrix heatmap (zoom and hover), top confused pairs, per-class table (sortable),
reliability diagram, dataset split summary. Show "TBD" if a value is missing. Never invent numbers.

### `/about`, `/help`, 404
About: objective, dataset and licenses, model architecture, methodology flowchart, privacy
note, team (team and contributor credits). Help: photo tips (single leaf
or flower, good light, plain background, fill the frame), supported formats, FAQ accordion, limits
(110-130 species only), disclaimers. A friendly leaf-themed 404.

### Auth (optional, P2)
Supabase email and Google login in a glass modal; guests everywhere else. Sync theme to `profiles`.

---

## PART D: ML integration (follow `docs/TRD.md` exactly)

- Files in `web/public/models/`: `plant_model.onnx`, `labels.json`, `model_meta.json` (version, T, tau, thresholds, weights 0.6/0.4, mean/std), `centroids.json`, `cam_weights.bin`, `metrics.json`.
- Modules in `src/ml/`: `worker.ts`, `preprocess.ts`, `session.ts`, `postprocess.ts`, `similar.ts`, `cam.ts`, `fuse.ts`. Inference only in the Web Worker (WebGL then WASM fallback). Cache by `model_meta.version`.
- Until real model files exist, ship a **mock mode** (`VITE_MOCK_ML=true`) that returns deterministic fake results from fixtures so the whole UI can be built and tested, clearly badged "Demo mode" in the UI. Never present mock numbers as real metrics.
- Output of every inference is plain JSON `{top3, tier, unknown, similar[], camData, modelVersion}` so the UI is testable without the model.

---

## PART E: Supabase (follow `docs/BACKEND_SCHEMA.md`)

Generate `supabase/schema.sql`, `supabase/seed.sql` (a few real species first, rest as a
template I will fill and verify; mark uncertain facts `TODO(verify)`), RLS policies, storage policies.
Frontend uses only the anon key and `@supabase/supabase-js`. Bundle `species.json` as an offline fallback
generated from the seed. Opt-in only for image uploads (re-encode to strip EXIF, max 1024 px).

---

## PART F: Theming

Dark default, light toggle in the navbar, persisted in localStorage, initial value from
the system preference, applied as `data-theme` on `<html>` before first paint (inline script in
`index.html`, no flash). All colors via CSS variables from `docs/DESIGN_SYSTEM.md`. Verify contrast on both themes.

---

## PART G: Quality bar

- TypeScript strict, ESLint, Prettier, path alias `@`.
- Responsive from 360 px; keyboard accessible; visible focus; axe zero serious issues; reduced-motion honored.
- Security per `docs/SECURITY.md`: `vercel.json` headers and CSP, no `dangerouslySetInnerHTML`, no secrets, upload validation.
- Tests per `docs/TESTING.md`: Vitest for ml modules, component tests, Playwright for the 8 flows, GitHub Actions CI.
- Performance: lazy-load routes and the model, code-split, self-host fonts or preconnect, optimized images.
- Deliver `.env.example`, `vercel.json`, and an updated README.

---

## PART H: Build phases (stop after each for review)

1. **Foundation:** scaffold, Tailwind, fonts, tokens, glass CSS, theme toggle, Navbar, Footer, PageBackground, router with page shells.
2. **Landing page:** FadingVideo, BlurText, Reveal, parallax sections 1-4, mobile and reduced-motion pass.
3. **Classifier UI in mock mode:** upload, camera, results, tabs, similar species, heatmap, feedback.
4. **Real ML wiring:** worker, preprocess, postprocess, similar, CAM, fusion, parity-tested against golden fixtures (when model files are available).
5. **Supabase:** schema, seed, library, species detail, history, feedback, optional auth, fallback JSON.
6. **Dashboard, About, Help, 404, batch mode.**
7. **Testing, accessibility, security, performance, deployment config.**

After each phase list what you built, how to run it, and what you need from me.

---

## PART I: Companion prompt: training scripts

When I say "build the ML pipeline", create `ml/` per `docs/TRD.md`: `species_list.csv` (from the
species groups), `01_download_images.py` (GBIF/iNaturalist research-grade, openly licensed, 250-400
per species, resumable, writes `dataset_credits.csv`, reports species under 150 images),
`02_clean_dataset.py` (perceptual-hash dedupe, drop corrupt/small images, grouped stratified
80/10/10 split, non-plant negatives), `03_train.py` (EfficientNet-B0 via timm, AMP, two phases,
augmentations, label smoothing, mixup/cutmix, early stopping, batch size fallback for 6 GB VRAM),
`04_evaluate.py` (Top-1/5, per-class report, confusion matrix, ECE, temperature fit, tau and
rejection threshold tuning, `metrics.json`), `05_export_onnx.py` (opset 17, outputs logits,
embedding, features; centroids; CAM weights; parity test), `requirements.txt`, and pytest tests.
All scripts seeded, idempotent, with clear CLI help and progress bars, written for Windows + CUDA.

---

## Rules
- Never fabricate metrics, species facts, or licenses.
- Ask me before adding any dependency outside the chosen stack.
- Keep the disclaimers visible wherever uses, edibility or identification results appear.
- Prefer small, tested, well-named modules; no dead code.