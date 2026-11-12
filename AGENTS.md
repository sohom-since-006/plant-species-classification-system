# AGENTS.md: Rules for AI Coding Agents

Read this file first, then the docs listed below, before changing anything.

## Project
Plant Species Classification System: React + Vite + TS + Tailwind website with
on-device ONNX inference and a Supabase backend, plus a Python training pipeline in `ml/`.

## Read Before Coding
`docs/PRD.md`, `docs/TRD.md`, `docs/ARCHITECTURE.md`, `docs/BACKEND_SCHEMA.md`,
`docs/DESIGN.md`, `docs/DESIGN_SYSTEM.md`, `docs/CODE_STYLE.md`, `docs/SECURITY.md`.
When files conflict, `TRD.md` wins on ML behavior and `DESIGN_SYSTEM.md` wins on visuals.

## Commands
```
cd web && npm install
npm run dev          # local dev
npm run typecheck    # tsc --noEmit
npm run lint
npm run test         # vitest
npm run e2e          # playwright
npm run build
cd ml && pytest
```
Run typecheck, lint, and tests before declaring any task done.

## Hard Rules
1. TypeScript strict. No `any` without a comment explaining why.
2. Never put secrets in the repo. The Supabase service-role key must never appear in `web/`.
3. Never invent ML metrics. Show "TBD" or read from `metrics.json`.
4. Never fabricate species facts. Use `supabase/seed.sql`; flag uncertain facts with `TODO(verify)`.
5. Use design tokens and the glass classes; no hardcoded colors outside `index.css`.
6. Every animation must respect `prefers-reduced-motion`.
7. Inference runs in the Web Worker, never on the main thread.
8. Keep the Medicinal/safety disclaimers wherever uses or edibility appear.
9. Do not add dependencies without need; prefer the stack already chosen.
10. Do not modify generated model artifacts by hand.

## Do / Don't
- Do write small, focused components and pure functions for ML post-processing.
- Do add tests with every feature.
- Don't use inline styles except for dynamic values (e.g., ring dash offset).
- Don't fetch the model outside `ml/session.ts`.
- Don't send user images anywhere unless the user opted in.

## Definition of Done
Typecheck, lint and tests pass. The feature works in the dark botanical theme and on mobile (360 px). Keyboard accessible. No console errors. Docs updated if behavior changed.

## Commit Style
Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.