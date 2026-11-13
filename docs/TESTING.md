# TESTING

## Strategy
Test pyramid: many unit tests, some component tests, a few end-to-end tests, plus ML-specific validation.

## Tools
Web: Vitest, React Testing Library, Playwright, axe-core. ML: pytest, scikit-learn metrics.

## 1. Unit Tests (web)
| Module | Cases |
|---|---|
| `preprocess` | correct size, mean/std normalization, channel order, odd aspect ratios |
| `postprocess` | softmax sums to 1, temperature effect, tier boundaries (0.60, 0.85), unknown rule |
| `similar` | cosine math, clamping, genus bonus, excludes top-1, sorted output |
| `fuse` | average of 1/2/3 inputs, unknown if the fused result is low |
| `cam` | output shape, normalization, handles zero maps |
| `csv` | escaping commas/quotes, headers |
| `format` | percent formatting, name display, count formatting |
| `useDistribution` | parsing `species_distribution.json`, ID lookup, fallback on missing ID |
| `motion/presets` | presence of duration/easing tokens, reduced-motion fallback properties |

## 2. Component Tests
- **Classify components:** UploadZone (valid/invalid files, size limit), ConfidenceRing (value to dash offset), TierBadge (text and color), SimilarSpecies (rows and percentages), FeedbackPanel (submits, validation).
- **ScanAnimation:** cycles real pipeline stage texts ("Reading image" -> "Detecting structure" -> "Matching species" -> "Calibrating confidence"), obeys minimum display duration (250 ms/stage), bypasses visual scanner under `prefers-reduced-motion` with accessible text indicator.
- **ParticleBackground:** initializes HTML5 canvas, caps DPR to $\le 1.5$, caps particle count to 50, pauses animation loop when `document.hidden === true` (Page Visibility API), renders static particle snapshot when reduced motion is preferred.
- **CursorGlow:** sets `--mouse-x` and `--mouse-y` style properties on `pointermove`, remains inactive on touch devices (`@media (hover: none)`).
- **Distribution & Graphs:**
  - `DistributionMap`: renders choropleth density shading, handles zero/empty data gracefully, tooltip shows country/state name and observation count.
  - `SeasonalityChart`: renders 12-month data series, handles zero months, aria-label describes peak sighting months.
  - `FoundInList`: sorts regions descending by count, displays clean percentage/sighting badges.
  - Dashboard graphs (`AccuracyChart`, `FamilyBreakdown`, `SplitChart`, `HistoryTimeline`): render accurately with mock and real data, handle missing metrics gracefully.
- **Global UI:** SpeciesFilters, Modal (spring open/close, focus-trap), Toast (`aria-live`).

## 3. End-to-End (Playwright)
1. Landing loads, headline visible, "Start Identifying" navigates to `/classify`.
2. Upload a fixture photo, click Identify, observe `ScanAnimation` progressing through stages, then see result card, confidence, Top-3, and similar species.
3. Classify Details tab: click Details tab, verify "Where it's found" distribution map, regional list, and seasonality chart render.
4. Upload a non-plant fixture, see the "unknown" message.
5. Verify consistent dark botanical theme across all pages without layout shift or white flash.
6. Explore: search "tulsi", see species counts by family chart, open detail page, see distribution map, seasonality chart, and look-alikes.
7. History: saved prediction appears in session storage; confidence tiers over time graph renders from session history; delete works; clear all works; CSV downloads.
8. Dashboard: verify images per species, Indian vs global split, family breakdown, per-class table, confusion matrix, and calibration diagram render.
9. Reduced-motion verification: emulate `prefers-reduced-motion: reduce`, confirm scan laser sweeps, particle drift, and landing parallax are completely disabled.
10. Offline-ish: block Supabase and confirm identification and distribution display still work via bundled static fallbacks.
Run on Chromium, Firefox and WebKit; plus mobile viewports (Pixel 5, iPhone 13).

## 4. ML Validation (`ml/tests`)
- **Data integrity:** no image appears in more than one split; every class has at least 150 train images; labels match `species_list.csv`.
- **Distribution pipeline (`06_build_distribution.py`):**
  - Verifies output file `web/public/data/species_distribution.json` adheres to strict schema.
  - Validates that every species ID from `species_list.csv` is represented.
  - Asserts that seasonality arrays contain exactly 12 non-negative integer counts.
  - Confirms zero sensitive GPS coordinates are stored (coarse regional facets only).
- **Export parity:** PyTorch vs ONNX logits within 1e-3 on 50 fixed images; output names/shapes match the TRD contract.
- **Metrics gates (fail the build if below):** Top-1 at least 0.90, Top-5 at least 0.97, ECE at most 0.05, non-plant rejection at least 0.90. Adjust gates only with a documented reason.
- **Per-class floor:** flag any class with F1 below 0.70 for review.
- **Real-photo set:** report separately; target at least 0.80 Top-1.
- **Golden tests:** 20 fixed images with expected top-1 species, run in the browser worker via Playwright to catch preprocessing drift between Python and TypeScript.

## 5. Non-Functional
- **Performance:** model load, time to first result (target under 2 s), Lighthouse at least 85 performance, 60 fps animation budget.
- **Accessibility:** axe has zero serious violations; keyboard-only run-through; contrast checks on both themes; reduced-motion verified on all animated components.
- **Responsive:** 360, 768, 1280, 1920 px screenshots.
- **Security:** try uploading a renamed `.exe`, an oversized file, and a corrupted image; confirm RLS on species (read-only) and feedback (insert-only, no client read); check headers with a scanner.

## 6. Manual Test Checklist (before release)
- [ ] Ten real photos per category (leaf, flower, fruit, whole plant) from your phone
- [ ] Look-alike pairs behave sensibly (tulsi vs basil vs mint)
- [ ] Blurry, dark, and cropped photos give honest low confidence
- [ ] Heatmap highlights the plant, not the background
- [ ] Scan animation displays smoothly without visual flicker
- [ ] Interactive live background pauses when tab is hidden and doesn't lag mobile browsers
- [ ] Cursor glow tracks smoothly on desktop and stays off on touchscreens
- [ ] Distribution maps and seasonality charts load cleanly and display truthful observation patterns
- [ ] Both themes look right on every page
- [ ] No console errors; no layout shift on result render

## 7. CI (GitHub Actions)
On every PR: install, typecheck, lint, unit and component tests, build. On `main`: also e2e against a preview deployment. Weekly: `npm audit`, `pip-audit`.

## 8. Bug Reporting
Template: steps, expected, actual, browser/device, screenshot, console output.
