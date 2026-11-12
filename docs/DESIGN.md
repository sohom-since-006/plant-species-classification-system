# DESIGN: Visual Direction

## Concept
A dark, cinematic botanical experience: a pure black canvas, atmospheric video
or live gradients, and translucent "liquid glass" surfaces with hairline
gradient borders. Editorial italic serif headlines against light, clean body
text. Think "luxury film title card meets field guide".

## Two Visual Modes of the Site
| Area | Treatment |
|---|---|
| **Landing page** (`/`) | Full-screen cinematic video sections, parallax depth layers, blur-in text |
| **App pages** (`/classify`, `/explore`, `/history`, `/dashboard`, `/about`, `/help`) | Interactive live background: drifting glowing spores (dark) or pollen (light) that softly react to cursor proximity, paired with cursor-following spotlight glows on glass cards and buttons. Content max-width 1200 px. |

## Themes
- **Dark (default):** black canvas, white text, glass fills near-transparent.
- **Light:** soft alabaster canvas, charcoal text, dark-tinted glass, inverted black CTA. Toggle in the navbar (sun/moon icon), remembers choice, follows the system on first visit.

## Typography
- Headings: **Instrument Serif**, italic, tight negative tracking, tight line height.
- Body/UI: **Barlow** 300/400/500/600.
- Scientific names are always italic (it's a botanical convention).

## Color
Base is monochrome; accent is a restrained botanical green used sparingly (confidence ring, success states, heatmap legend, active tab).
- Accent: `#6EE7A8` (dark) / `#1F7A4D` (light).
- Warning (low confidence): amber `#F5C26B`.
- Error: soft red `#F27C7C`.
- Tiers: High = accent, Medium = amber, Low = orange-red, Unknown = neutral grey.

## Motion & Interaction System
- **Shared Motion Presets:** Centralized presets file (`presets.ts`) with unified easings (`[0.16, 1, 0.3, 1]`) and calibrated durations (0.2 s micro, 0.4 s macro, 0.8 s hero).
- **Route / Page Transitions:** `<AnimatePresence mode="wait">` wrapping routes; graceful cross-fade with subtle y-translation (12 px).
- **Staggered Reveals:** Grid cards and list rows reveal sequentially with 0.05 s cascade stagger.
- **Micro-interactions:** Interactive cards lift slightly on hover (`y: -2px`); buttons feature a spring press scale (`scale: 0.98`).
- **Spring Modals & Toasts:** Modals pop with a spring damping (`damping: 25, stiffness: 300`); toasts slide up and fade out smoothly.
- **Skeleton Loaders:** Glass shimmer sweep animation across pending card layouts.
- **Count-Up Numbers:** Statistics and match percentages animate from 0 to target with easeOutExpo.
- **Scan Animation (`/classify`):**
  - Sweeping laser scan line vertically traversing the plant photo.
  - Glowing viewfinder corner brackets, subtle perspective grid overlay, and pulsing structural detection dots.
  - Stage indicator text cycling through real pipeline phases: "Reading image" -> "Detecting structure" -> "Matching species" -> "Calibrating confidence", synchronized with a progress ring.
  - Minimum display time of 250 ms per stage to eliminate stutter on fast devices.
  - Staged reveal: upon completion, the scanner dissolves into the ResultCard, triggering sequential reveals for the confidence ring, top predictions, and detailed tabs.
- **Interactive Live Background (`ParticleBackground`):**
  - Atmospheric dark theme: 35-50 drifting emerald and teal glowing spores.
  - Physics: gentle cursor repulsion/attraction field within a 120 px radius.
  - Battery/GPU budget: DPR capped at 1.5; animation completely pauses when tab is hidden (`document.hidden`). Touch devices run low-velocity ambient drift with no pointer interaction.
- **Cursor Spotlight Glow:**
  - Radial gradient spotlight following pointer on `.liquid-glass` cards, buttons, and navigation pills, illuminating hairline borders and translucent surfaces under the cursor.
  - Powered by one shared passive `pointermove` listener on window updating CSS variables. Disabled on touch screens.
- **Reduced Motion:** When `prefers-reduced-motion` is detected, all parallax, blur transitions, spore drift, scan line sweeps, and spring bounces are bypassed; immediate static opacity crossfades are used instead.

## Layout
- Navbar: fixed, glass pill. Left brand logo, center links with a primary "Identify" button (and avatar when logged in). Collapses to a menu on mobile.
- Content width: max 1200 px on app pages; landing sections are full-bleed.
- Cards: `rounded-[1.25rem]`, `p-6`, glass with cursor spotlight illumination.

## Key Screens
1. **Landing:** Hero, Capabilities (3 cards), How It Works (3 steps), Try It CTA, footer.
2. **Classify:** Upload zone (dashed glass), preview, camera, Identify CTA. During classification: visual `ScanAnimation` with laser sweep and stage progression. Result: image + heatmap toggle on left; right card with confidence ring, tier badge, Top-3 matches, and tabs (Details, Similar species, Heatmap, Feedback). The Details tab includes the "Where it's found" distribution map, "Found in" regional list, and 12-month seasonality chart.
3. **Explore:** Search bar, filter chips (family, type, origin), species counts by family chart, species card grid with reference images and cursor glow.
4. **Species detail:** Hero image, names, taxonomy chips, sections for features/uses/care, look-alike cards with "how to tell apart", interactive "Where it's found" distribution map (darker = more sightings), "Found in" regional list, and seasonality chart.
5. **Dashboard:** Metric cards, confusion matrix heatmap, per-class table, calibration diagram, images per species chart, Indian vs global distribution split, and family breakdown graph.
6. **History:** List of past thumbnails with species, confidence, date; confidence tiers over time timeline graph; delete and CSV export.

## Imagery
Use real plant photography (reference images from open licenses) in cards; videos as atmosphere only. Always keep text contrast at least 4.5:1 using overlays where needed.

## Icons
Custom inline SVGs as in the original design (ArrowUpRight, Play, Clock, Globe, Image, Movie, Lightbulb) plus: Leaf, Camera, Upload, Sun, Moon, Search, History, BarChart, Info, ThumbsUp, ThumbsDown.