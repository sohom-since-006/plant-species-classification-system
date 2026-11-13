# SECURITY

## Threat Model (summary)
Public website, anonymous visitors, zero user accounts, user-uploaded images processed strictly on-device, public database reads. Main risks: abuse of anonymous feedback endpoint, XSS, secret exposure, privacy of photos.

## Principles
1. Least privilege: the client only has the public anon key; RLS enforces read-only access for reference data and insert-only access for anonymous feedback.
2. Privacy by design: images are processed 100% on-device and never leave the browser. Zero image upload or storage endpoints.
3. Validate on both sides: client for UX and cooldowns, database policies for enforcement.

## Secrets
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist in the frontend (both are public by design).
- The service-role key is never committed, never in Vercel frontend env vars, never shipped to the browser.
- `.env` is gitignored; `.env.example` has placeholders. Enable GitHub secret scanning.

## Supabase
- RLS enabled on every table (see `BACKEND_SCHEMA.md`).
- `species`, `species_look_alikes`, `model_versions` are read-only to clients.
- `feedback` is insert-only (anonymous, no user_id column); comment length limited to 500 chars with client rate-limiting.
- No storage buckets, no user accounts, and no profile tables exist.

## Uploads
- Allow-list: `image/jpeg`, `image/png`, `image/webp`; max 10 MB client-side for classification; verify by decoding (not just by extension).
- In-memory decoding: photos are decoded directly into HTMLImageElement/ImageBitmap for the Web Worker; no photo bytes are ever sent to Supabase or any external server.
- Never render user filenames as HTML.

## Web Security
- React escapes by default; never use `dangerouslySetInnerHTML` (species text is plain text or sanitized Markdown with DOMPurify).
- Security headers in `vercel.json`:
  - `Content-Security-Policy`: `default-src 'self'; img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org; media-src 'self' blob: https://d8j0ntlcm91z4.cloudfront.net; connect-src 'self' https://*.supabase.co; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com`
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(self)`
- HTTPS only (Vercel default); HSTS enabled.

## Dependencies & Supply Chain
- Lockfiles committed; `npm audit` and `pip-audit` in CI; Dependabot enabled.
- Pin the ONNX Runtime Web version; self-host WASM files from `/public` rather than a CDN.

## Privacy
- Policy page states: on-device inference; zero user tracking; temporary session history stored in `sessionStorage` (capped at 50, cleared when the browser tab closes); feedback stored anonymously without photos or user identifiers.
- No third-party trackers or external analytics.
- Dataset licenses honored; credits file maintained.

## Safety of Content
- Identification disclaimer and "not medical advice" on every relevant screen.
- Toxicity notes shown prominently for poisonous species (e.g., Oleander).

## Incident Basics
Rotate Supabase anon key if exposed; review feedback table for spam/abuse; redeploy.