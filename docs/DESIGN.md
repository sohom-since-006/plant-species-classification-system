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
| **App pages** (`/classify`, `/explore`, `/history`, `/dashboard`, `/about`, `/help`) | Calm "live background": slowly drifting aurora gradients (green/teal/emerald glows) or a very dim looping video, with glass cards on top. No heavy parallax. |

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

## Motion
- Landing: staggered blur-in (blur 10px to 0, y 20 to 0, opacity 0 to 1, 0.8 s easeOut); per-word `BlurText` for the headline; background video fade in/out at loop edges.
- Parallax: video layers move at 0.2-0.4x scroll speed; foreground cards at 1x; subtle scale/opacity shifts between sections; a floating leaf silhouette layer drifting at different speeds.
- App pages: gentle fade-up on mount (0.4 s), tab content crossfade, confidence ring animates from 0 to value, similar-species bars grow in.
- Respect `prefers-reduced-motion`: disable parallax and blur, keep simple fades.

## Layout
- Navbar: fixed, glass pill. Left monogram "P", center links with a primary "Identify" button, right theme toggle (and avatar when logged in). Collapses to a menu on mobile.
- Content width: max 1200 px on app pages; landing sections are full-bleed.
- Cards: `rounded-[1.25rem]`, `p-6`, glass.

## Key Screens
1. **Landing:** Hero, Capabilities (3 cards), How It Works (3 steps), Try It CTA, footer.
2. **Classify:** large upload zone (dashed glass), preview, Identify button. Result: left image + heatmap toggle, right result card with confidence ring, tier badge and tabs (Details / Similar / Heatmap / Feedback).
3. **Explore:** search bar, filter chips (family, type, origin), species card grid with reference image.
4. **Species detail:** hero image, names, taxonomy chips, sections for features/uses/care, look-alike cards with "how to tell apart".
5. **Dashboard:** metric cards, confusion matrix heatmap, per-class table, calibration chart.
6. **History:** list of thumbnails with species, confidence, date; delete and CSV export.

## Imagery
Use real plant photography (reference images from open licenses) in cards; videos as atmosphere only. Always keep text contrast at least 4.5:1 using overlays where needed.

## Icons
Custom inline SVGs as in the original design (ArrowUpRight, Play, Clock, Globe, Image, Movie, Lightbulb) plus: Leaf, Camera, Upload, Sun, Moon, Search, History, BarChart, Info, ThumbsUp, ThumbsDown.