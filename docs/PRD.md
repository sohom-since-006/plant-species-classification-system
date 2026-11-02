# PRD: Plant Species Classification System

## 1. Overview
A website where a user uploads or captures a photo of a plant (leaf, flower,
fruit, or whole plant) and instantly gets the species, an honest confidence
score, similar-species suggestions with match percentages, an attention
heatmap, and full species details. Indian plants are the focus, with global
coverage.

## 2. Problem
Identifying plants is hard for students, gardeners, farmers, and nature
enthusiasts. Existing apps are often paywalled, send every photo to a server,
and give overconfident wrong answers. Few cover common Indian plants well.

## 3. Goals
- G1: Identify about 110-130 species with high accuracy from mixed plant parts.
- G2: Show calibrated confidence, so "90%" really means about 90%.
- G3: Give similar-species suggestions with percentages.
- G4: Run fast (under 2 s after the model loads) and free to host.
- G5: Deliver a cinematic, polished UI with dark and light modes.

## 4. Non-goals (v1)
- Plant disease detection
- Identifying all plants on Earth
- Native mobile apps
- Social features or user-to-user sharing
- Full UI translation (only Hindi/Bengali species names in v1)

## 5. Users
| Persona | Need |
|---|---|
| Student | Identify a plant for coursework, learn its details |
| Home gardener | Identify houseplants and garden plants, get care tips |
| Nature enthusiast | Identify wild plants and compare look-alikes |
| Evaluator/reviewer | See metrics, explainability, and system quality |

## 6. Functional Requirements
| ID | Requirement | Priority |
|---|---|---|
| F1 | Upload (drag-drop, browse), camera capture, preview, replace/remove | P0 |
| F2 | Validate file type (JPG/PNG/WEBP) and size (max 10 MB) | P0 |
| F3 | In-browser classification with Top-3 results and confidence % | P0 |
| F4 | Confidence tiers: High >85%, Medium 60-85%, Low <60% | P0 |
| F5 | Unknown / not-a-plant rejection with a helpful message | P0 |
| F6 | Species info panel (names, taxonomy, features, habitat, uses, care) | P0 |
| F7 | Similar species with ML %, Visual Match %, Final Match % | P0 |
| F8 | Attention heatmap overlay (CAM) with original side by side | P1 |
| F9 | Multi-photo mode (up to 3 images, fused prediction) | P1 |
| F10 | Species library: search, filter by family/type/origin | P0 |
| F11 | Prediction history (local for guests, Supabase for users) | P1 |
| F12 | Batch classification with CSV export | P2 |
| F13 | Feedback: correct/wrong, suggest the right species | P1 |
| F14 | Model dashboard: accuracy, confusion matrix, per-class table | P1 |
| F15 | Dark/light mode toggle, remembers choice | P0 |
| F16 | Parallax landing page | P0 |
| F17 | Optional auth (email, Google); guests allowed | P2 |
| F18 | About, Help/FAQ, 404 pages | P1 |
| F19 | Share/download result as image | P2 |

## 7. Non-Functional Requirements
- Performance: first model load under 5 s on broadband; inference under 2 s on a mid-range laptop.
- Model size: ONNX under 25 MB.
- Accessibility: WCAG 2.1 AA, keyboard navigable, reduced-motion support.
- Responsive: 360 px to 1920 px.
- Privacy: images are processed on-device; uploading is opt-in.
- Reliability: graceful errors for bad files, no WebGL/WASM support, offline model failure.

## 8. Success Metrics
| Metric | Target |
|---|---|
| Top-1 accuracy (held-out test) | at least 90% |
| Top-5 accuracy | at least 97% |
| Calibration error (ECE) | at most 0.05 |
| Non-plant rejection rate | at least 90% on a non-plant test set |
| Real-photo accuracy (own phone photos) | at least 80% |
| Lighthouse (Performance/Accessibility) | at least 85 / 95 |

These are targets, not promises. The actual numbers go in the README after evaluation.

## 9. Risks
| Risk | Mitigation |
|---|---|
| Too few images for some Indian species | Image-count check; swap species |
| Look-alike confusion | Similar-species engine, genus fallback |
| Dataset images unlike phone photos | Heavy augmentation, test on own photos |
| Overconfident predictions | Temperature scaling, rejection logic |
| Wrong medicinal info | Disclaimers, verify entries |

## 10. Release Plan
v1.0: P0 and P1 features. v1.1: P2 features. v2: disease detection, more species, translated UI.