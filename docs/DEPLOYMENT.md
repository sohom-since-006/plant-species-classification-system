# Deployment Guide

Production deployment guide for the Plant Species Classification System on Vercel and Supabase.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or later
- **Supabase**: Account with a new or existing project
- **Vercel**: Account connected to the GitHub repository

---

## 2. Supabase Configuration

Execute the following in your Supabase project's **SQL Editor** in exact order:

1. **Schema & Policies**:
   - Run [`supabase/schema.sql`](file:///supabase/schema.sql)
   - Configures the 6 application tables (`species`, `species_look_alikes`, `model_versions`, `profiles`, `predictions`, `feedback`)
   - Enables Row Level Security (RLS) on all tables
   - Creates the private storage bucket `uploads` (5 MB file limit, user-isolated folder policies)
2. **Species Reference Data**:
   - Run [`supabase/seed.sql`](file:///supabase/seed.sql)
   - Populates reference catalog of 112 Indian botanical species with taxonomies, regional vernacular names, and look-alikes.

---

## 3. Environment Variables

Configure the following environment variables in the **Vercel Project Settings > Environment Variables** (for Production and Preview):

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Supabase Project API URL | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase Public Anonymous API Key | `eyJhbGciOi...` |
| `VITE_MOCK_ML` | **Yes** | Set strictly to `false` for real ONNX inference | `false` |

> [!CAUTION]
> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in Vercel client environment variables or git history. The frontend only requires the public anonymous key.
> The production build command will fail fatally if `VITE_MOCK_ML=true`.

---

## 4. Vercel Deployment Settings

The repository includes a ready-to-use [`vercel.json`](file:///vercel.json).

### Option A: Repository Root (Recommended)
- **Framework Preset**: Vite
- **Root Directory**: `.`
- **Build Command**: `cd web && npm run build`
- **Output Directory**: `web/dist`
- **Install Command**: `npm install`

### Option B: Subdirectory (`web`)
- **Framework Preset**: Vite
- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

## 5. Security & Caching Headers

Both [`vercel.json`](file:///vercel.json) and [`web/vercel.json`](file:///web/vercel.json) enforce:

- **WASM / WebGPU Isolation**:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
  - Enables `crossOriginIsolated` state required for high-performance multi-threaded SIMD inference.
- **Content Security Policy (CSP)**:
  - Whitelists Supabase, Google Fonts, and Wikimedia assets.
  - Requires `'wasm-unsafe-eval'` for ONNX Runtime Web assembly compilation.
- **Immutable Long-Term Caching (`max-age=31536000, immutable`)**:
  - Large static model weights: `/models/plant_model.v1.onnx`, `/models/cam_weights.v1.bin`, `/models/centroids.v1.json`
  - Botanical assets & photos: `/species/*`, `/assets/*`
- **Zero-Cache Dynamic Revalidation (`max-age=0, must-revalidate`)**:
  - Model manifest: `/models/model_meta.json` (allows instant client model updates)
  - Service Worker: `/sw.js` (ensures clients pick up new offline caches upon deployment)
  - Entrypoint: `/index.html`

---

## 6. Post-Deployment Verification

1. **Verify Live WASM SIMD**:
   - Open browser DevTools Console.
   - Navigate to `/classify`.
   - Verify `crossOriginIsolated === true` and ONNX Runtime session loads without warnings.
2. **Verify Offline Fallbacks**:
   - Disconnect network in DevTools.
   - Run classification on sample specimens; confirm cached offline inference succeeds.
3. **Run Health Checks**:
   - Run typecheck, lint, and test suites:
     ```bash
     cd web
     npm run typecheck
     npm run lint
     npm run test
     npm run build
     ```
