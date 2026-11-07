# DESIGN SYSTEM

## Tokens (CSS variables, `styles/index.css`)
```css
:root, :root[data-theme="dark"] {
  --bg: #000000;
  --fg: #ffffff;
  --fg-muted: rgba(255,255,255,0.8);
  --fg-subtle: rgba(255,255,255,0.6);
  --glass-fill: rgba(255,255,255,0.01);
  --glass-edge-hi: rgba(255,255,255,0.45);
  --glass-edge-mid: rgba(255,255,255,0.15);
  --glass-inset: rgba(255,255,255,0.10);
  --accent: #6EE7A8;
  --warn: #F5C26B;
  --danger: #F27C7C;
  --cta-bg: #ffffff;
  --cta-fg: #000000;
  --glow-color: rgba(110, 231, 168, 0.15);
  --glow-edge: rgba(110, 231, 168, 0.45);
  --glow-radius: 280px;
  --spore-color: rgba(110, 231, 168, 0.65);
}
:root[data-theme="light"] {
  --bg: #F8F9FA;
  --fg: #0B0B0C;
  --fg-muted: rgba(11,11,12,0.65);
  --fg-subtle: rgba(11,11,12,0.5);
  --glass-fill: rgba(0,0,0,0.02);
  --glass-edge-hi: rgba(0,0,0,0.22);
  --glass-edge-mid: rgba(0,0,0,0.08);
  --glass-inset: rgba(255,255,255,0.7);
  --accent: #1F7A4D;
  --warn: #B7791F;
  --danger: #C53030;
  --cta-bg: #0B0B0C;
  --cta-fg: #ffffff;
  --glow-color: rgba(31, 122, 77, 0.12);
  --glow-edge: rgba(31, 122, 77, 0.35);
  --glow-radius: 280px;
  --spore-color: rgba(183, 121, 31, 0.55);
}
html, body { background: var(--bg); color: var(--fg); font-family: 'Barlow', sans-serif; }
```

## Typography Scale
| Role | Classes |
|---|---|
| Hero headline | `font-heading italic text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.8] tracking-[-4px]` |
| Section heading | `font-heading italic text-6xl md:text-7xl lg:text-[6rem] leading-[0.9] tracking-[-3px]` |
| Page title (app) | `font-heading italic text-5xl md:text-6xl leading-[0.9] tracking-[-2px]` |
| Card title | `font-heading italic text-3xl md:text-4xl tracking-[-1px] leading-none` |
| Body | `font-body font-light text-sm md:text-base leading-snug text-[var(--fg-muted)]` |
| Label/tag | `font-body font-medium text-xs tracking-wide` |
| Scientific name | `font-heading italic` |

Tailwind: `fontFamily: { heading: ["'Instrument Serif'", 'serif'], body: ["'Barlow'", 'sans-serif'] }`, with `darkMode: ['selector', '[data-theme="dark"]']`.

## Liquid Glass (`index.css`)
```css
.liquid-glass {
  background: var(--glass-fill);
  background-blend-mode: luminosity;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px var(--glass-inset);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    var(--glass-edge-hi) 0%, var(--glass-edge-mid) 20%,
    transparent 40%, transparent 60%,
    var(--glass-edge-mid) 80%, var(--glass-edge-hi) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
.liquid-glass-strong {
  background: var(--glass-fill);
  background-blend-mode: luminosity;
  -webkit-backdrop-filter: blur(50px);
  backdrop-filter: blur(50px);
  border: none;
  box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px var(--glass-inset);
  position: relative;
  overflow: hidden;
}
.liquid-glass-strong::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    var(--glass-edge-hi) 0%, var(--glass-edge-mid) 20%,
    transparent 40%, transparent 60%,
    var(--glass-edge-mid) 80%, var(--glass-edge-hi) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
```
Dark-mode `--glass-edge-hi` is 0.45 for `.liquid-glass` and 0.5 for `-strong`; mid is 0.15 and 0.2 respectively. Per-class overrides for `.liquid-glass-strong`:
```css
.liquid-glass-strong {
  --glass-edge-hi: rgba(255,255,255,0.50);
  --glass-edge-mid: rgba(255,255,255,0.20);
}
:root[data-theme="light"] .liquid-glass-strong {
  --glass-edge-hi: rgba(0,0,0,0.28);
  --glass-edge-mid: rgba(0,0,0,0.10);
}
```

## Components
| Component | Spec |
|---|---|
| `GlassCard` | `.liquid-glass rounded-[1.25rem] p-6 relative overflow-hidden` with cursor glow |
| `GlassButton` (primary) | `.liquid-glass-strong rounded-full px-5 py-2.5` + icon + hover lift / press scale |
| `SolidButton` (CTA) | `rounded-full px-5 py-2.5 bg-[var(--cta-bg)] text-[var(--cta-fg)] font-medium active:scale-98` |
| `Pill/Tag` | `.liquid-glass rounded-full px-3 py-1 text-[11px] whitespace-nowrap` |
| `IconBox` | `.liquid-glass h-11 w-11 rounded-[0.75rem]` |
| `Tabs` | glass pill container, active tab has solid CTA fill with layoutId crossfade |
| `ConfidenceRing` | SVG ring, stroke colored by tier, animated dash offset, % in heading font |
| `MatchBar` | glass track, accent fill, % label right |
| `TierBadge` | pill: High / Medium / Low / Unknown with tier color dot |
| `UploadZone` | dashed glass, drag-over highlights border with accent and cursor spotlight |
| `Toggle` (theme) | glass circle with sun/moon icon swap animation |
| `Modal`, `Toast` | strong glass, spring-animated entrance, focus-trapped, `aria-live` for toasts |
| `CursorGlow` | Shared pointermove spotlight reflecting `--mouse-x`, `--mouse-y` onto glass surfaces |
| `ScanAnimation` | Laser sweep line, corner brackets, grid, glowing structure points, stage text cycle |
| `ParticleBackground` | HTML5 canvas of 35-50 drifting spores/pollen, DPR $\le 1.5$, cursor physics, tab-hidden pause |
| `DistributionMap` | Coarse choropleth regional density map (darker = more sightings) |
| `SeasonalityChart` | 12-month area/bar chart showing seasonal occurrence counts |
| `FoundInList` | Clean list of top countries and Indian states/provinces with sighting badges |

## Spacing, Radius, Elevation
- Spacing scale: Tailwind default; page padding `px-8 md:px-16 lg:px-20`.
- Radius: pills `rounded-full`, cards `rounded-[1.25rem]`, icon boxes `rounded-[0.75rem]`.
- Elevation levels: L0 canvas, L1 `.liquid-glass`, L2 `.liquid-glass-strong`.

## Shared Motion Presets (`src/components/motion/presets.ts`)
```ts
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOutExpo } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: 'easeIn' } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOutExpo } },
};

export const tabCrossfade = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: easeOutExpo } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};

export const modalSpring = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const buttonPress = {
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap: { scale: 0.98 },
};

export const blurIn = {
  initial: { filter: 'blur(10px)', opacity: 0, y: 20 },
  animate: { filter: 'blur(0px)', opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: 'easeOut' },
};
```
Stagger delays on landing: badge 0.4, sub 0.8, CTAs 1.1, stat cards 1.3, trust bar 1.4.

## Accessibility Rules
- Text contrast at least 4.5:1 (add overlay gradients over video).
- Visible focus ring: `outline: 2px solid var(--accent); outline-offset: 2px`.
- All icons have `aria-hidden` or labels; the heatmap and distribution map have accessible text tables.
- Never convey tier by color alone (always include the text label).
- `prefers-reduced-motion`: replace all blur, scan sweeps, spore drift, and parallax with static layouts and immediate opacity fades.
