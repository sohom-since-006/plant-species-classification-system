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
| `format` | percent formatting, name display |

## 2. Component Tests
UploadZone (valid and invalid files, size limit), ConfidenceRing (value to dash offset), TierBadge (text and color), SimilarSpecies (rows and percentages), ThemeToggle (persists, sets `data-theme`), FeedbackPanel (submits, validation), SpeciesFilters.

## 3. End-to-End (Playwright)
1. Landing loads, headline visible, "Start Identifying" navigates to `/classify`.
2. Upload a fixture photo, click Identify, see species, confidence, Top-3.
3. Upload a non-plant fixture, see the "unknown" message.
4. Toggle dark/light; the choice persists after reload.
5. Explore: search "tulsi", open the detail page, see look-alikes.
6. History: a saved prediction appears; delete works; CSV downloads.
7. Feedback submits and shows a thank-you toast.
8. Offline-ish: block Supabase and confirm the identification still works via the fallback.
Run on Chromium, Firefox and WebKit; plus mobile viewports (Pixel 5, iPhone 13).

## 4. ML Validation (`ml/tests`)
- **Data integrity:** no image appears in more than one split; every class has at least 150 train images; labels match `species_list.csv`.
- **Export parity:** PyTorch vs ONNX logits within 1e-3 on 50 fixed images; output names/shapes match the TRD contract.
- **Metrics gates (fail the build if below):** Top-1 at least 0.90, Top-5 at least 0.97, ECE at most 0.05, non-plant rejection at least 0.90. Adjust gates only with a documented reason.
- **Per-class floor:** flag any class with F1 below 0.70 for review.
- **Real-photo set:** report separately; target at least 0.80 Top-1.
- **Golden tests:** 20 fixed images with expected top-1 species, run in the browser worker via Playwright to catch preprocessing drift between Python and TypeScript.

## 5. Non-Functional
- **Performance:** model load, time to first result (target under 2 s), Lighthouse at least 85 performance.
- **Accessibility:** axe has zero serious violations; keyboard-only run-through; contrast checks on both themes; reduced-motion verified.
- **Responsive:** 360, 768, 1280, 1920 px screenshots.
- **Security:** try uploading a renamed `.exe`, an oversized file, and a corrupted image; confirm RLS by trying to read another user's rows with a second account; check headers with a scanner.

## 6. Manual Test Checklist (before release)
- [ ] Ten real photos per category (leaf, flower, fruit, whole plant) from your phone
- [ ] Look-alike pairs behave sensibly (tulsi vs basil vs mint)
- [ ] Blurry, dark, and cropped photos give honest low confidence
- [ ] Heatmap highlights the plant, not the background
- [ ] Both themes look right on every page
- [ ] No console errors; no layout shift on result render

## 7. CI (GitHub Actions)
On every PR: install, typecheck, lint, unit and component tests, build. On `main`: also e2e against a preview deployment. Weekly: `npm audit`, `pip-audit`.

## 8. Bug Reporting
Template: steps, expected, actual, browser/device, screenshot, console output.