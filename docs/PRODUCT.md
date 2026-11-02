# PRODUCT: Vision, Flows, Copy

## Vision
"Point at a plant. Know what it is, and how sure we are."

## Principles
1. Honest over impressive: show uncertainty, never fake confidence.
2. Private by default: photos stay on the device.
3. Fast: answers in seconds, no sign-up required.
4. Beautiful: a cinematic, calm interface that makes botany feel premium.

## Pages
| Route | Page | Purpose |
|---|---|---|
| `/` | Landing (parallax) | Explain and sell the product |
| `/classify` | Classify | Upload, predict, explore the result |
| `/explore` | Species library | Browse and search all species |
| `/species/:slug` | Species detail | Full info and look-alikes |
| `/history` | History | Past predictions |
| `/dashboard` | Model dashboard | Metrics and evaluation |
| `/about` | About | Project, dataset, method, team |
| `/help` | Help/FAQ | Photo tips and questions |
| `*` | 404 | Friendly not-found page |

## Primary Flow: Identify a Plant
1. User opens `/classify` (or clicks "Start Identifying").
2. Model loads with a progress bar (first visit only).
3. User drops a photo or opens the camera. Preview appears.
4. User clicks **Identify**. A short analyzing animation plays.
5. Result card shows: species name, scientific name, confidence ring, tier badge.
6. Tabs: **Details**, **Similar species**, **Heatmap**, **Feedback**.
7. User can save to history, share, or classify another.

## Edge Flows
- **Low confidence:** "We're not sure. Here are the closest matches. Try a clearer photo of a single leaf or flower."
- **Not a plant / unknown:** "This doesn't look like a plant we know yet." Offer photo tips.
- **Multi-photo:** user adds up to 3 photos, result says "Combined from 3 photos".
- **Wrong prediction:** thumbs-down, pick the correct species from a searchable list, submit.

## Landing Page Copy (default)
- Badge: "New | 120+ species identified instantly, right in your browser"
- Headline: "Plant Species Classification System"
- Tagline: "Know Every Plant You Meet"
- Sub: "Upload a photo of a leaf, flower, or whole plant. Get the species, an honest confidence score, look-alike matches, and everything worth knowing, with no sign-up and no photo ever leaving your device."
- CTAs: "Start Identifying" / "See How It Works"
- Stat cards: "< 2 s | Average time to identify a plant", "120+ | Species, from Indian herbs to global garden favorites" (numbers updated from real metrics after training)
- Trust bar text: "Built on open biodiversity data from"; names: GBIF, iNaturalist, PyTorch, ONNX, Supabase
- Capabilities heading: "Plant science, made effortless"
  - Identify: tags [Leaf, Flower, Fruit, Whole Plant], "Snap or upload any part of a plant. Our model recognizes species across Indian and global flora in seconds."
  - Explain: tags [Confidence, Heatmap, Look-alikes, Match %], "See why the model decided: calibrated confidence, an attention heatmap, and the species it is most often confused with."
  - Explore: tags [Uses, Habitat, Care, Names], "Every species comes with names in English, Hindi and Bengali, identifying features, uses, habitat and care tips."

## Tone
Calm, precise, slightly editorial. Never salesy. Avoid hype words.

## Safety Copy (required)
- Result footer: "Identification is probabilistic. Never eat or use a plant based only on this result."
- Medicinal sections: "Educational information only, not medical advice."

## Analytics (privacy-friendly, optional)
Page views, identify count, tier distribution, feedback rate. No images, no personal data.