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
Dark-mode `--glass-edge-hi` is 0.45 for `.liquid-glass` and 0.5 for `-strong`; mid is 0.15 and 0.2 respectively. Set per-class overrides if you want exact parity.

## Components
| Component | Spec |
|---|---|
| `GlassCard` | `.liquid-glass rounded-[1.25rem] p-6` |
| `GlassButton` (primary) | `.liquid-glass-strong rounded-full px-5 py-2.5` + icon |
| `SolidButton` (CTA) | `rounded-full px-5 py-2.5 bg-[var(--cta-bg)] text-[var(--cta-fg)] font-medium` |
| `Pill/Tag` | `.liquid-glass rounded-full px-3 py-1 text-[11px] whitespace-nowrap` |
| `IconBox` | `.liquid-glass h-11 w-11 rounded-[0.75rem]` |
| `Tabs` | glass pill container, active tab has solid CTA fill |
| `ConfidenceRing` | SVG ring, stroke colored by tier, animated dash offset, % in heading font |
| `MatchBar` | glass track, accent fill, % label right |
| `TierBadge` | pill: High / Medium / Low / Unknown with tier color dot |
| `UploadZone` | dashed glass, drag-over highlights the border with the accent |
| `Toggle` (theme) | glass circle with sun/moon icon swap animation |
| `Modal`, `Toast` | strong glass, focus-trapped, `aria-live` for toasts |
| `PageBackground` | animated aurora gradients (CSS) or dim video + dark overlay |

## Spacing, Radius, Elevation
- Spacing scale: Tailwind default; page padding `px-8 md:px-16 lg:px-20`.
- Radius: pills `rounded-full`, cards `rounded-[1.25rem]`, icon boxes `rounded-[0.75rem]`.
- Elevation levels: L0 canvas, L1 `.liquid-glass`, L2 `.liquid-glass-strong`.

## Motion Presets
```ts
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
- All icons have `aria-hidden` or labels; the heatmap has an alt description.
- Never convey tier by color alone (always include the text label).
- `prefers-reduced-motion`: replace blur/parallax with opacity fades.