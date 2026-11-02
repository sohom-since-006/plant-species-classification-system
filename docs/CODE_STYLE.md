# CODE STYLE

## General
- Prettier (default config, 100 cols) and ESLint with `@typescript-eslint` and `react-hooks`.
- Descriptive names; no abbreviations except common ones (`img`, `idx`, `cfg`).
- Prefer pure functions and small modules; one component per file.

## TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`.
- Use `type` for shapes, `interface` for public object contracts. No enums; use union types or `as const`.
- Shared domain types live in `src/types/`.
```ts
export type Tier = 'high' | 'medium' | 'low' | 'unknown';
export interface Prediction {
  speciesId: number;
  prob: number;
}
```

## React
- Function components and hooks only.
- File names: components `PascalCase.tsx`, hooks `useThing.ts`, utilities `camelCase.ts`.
- Props typed with an exported `Props` type; destructure in the signature.
- Side effects only in `useEffect` or event handlers; clean up observers/workers.
- Memoize only when measured (heatmap canvas, large grids).
- Server data via TanStack Query; UI-only state via local state or Zustand.

## Tailwind
- Class order: layout, spacing, sizing, typography, color, effects, state.
- Extract repeated class strings into components, not `@apply` (except the glass classes).
- Use CSS variables for theme colors: `text-[var(--fg-muted)]`.

## Imports
Order: React/libs, absolute `@/` aliases, relative, styles. `@` maps to `web/src`.

## Errors & Logging
- Never swallow errors; map them to user-friendly messages in one place (`lib/errors.ts`).
- No `console.log` in committed code (`console.error` only in error boundaries).

## ML Code (TypeScript)
- Pure functions with numeric arrays (`Float32Array`) and unit tests with fixtures.
- Constants (mean/std, thresholds) come from `model_meta.json`, not hardcoded.

## Python (`ml/`)
- Python 3.11, type hints, `black` + `ruff`, docstrings on public functions.
- Scripts are numbered, idempotent, and accept `--config` or CLI args; set seeds (`seed=42`) for reproducibility.
- Paths via `pathlib`; no absolute paths.
- Log metrics to `ml/runs/<timestamp>/` and write `metrics.json`.

## SQL
Lowercase keywords, snake_case names, every table has RLS enabled and policies documented.

## Git
- Branches: `feat/...`, `fix/...`. Small PRs. Conventional commits.
- Never commit: `dataset/`, `.env`, `ml/runs/` checkpoints, `.venv/`. Commit only final model artifacts in `web/public/models/`.