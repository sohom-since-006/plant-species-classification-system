# SECURITY

## Threat Model (summary)
Public website, anonymous users, optional accounts, user-uploaded images, public database reads. Main risks: abuse of uploads/storage, data leaks via misconfigured RLS, XSS, secret exposure, privacy of photos.

## Principles
1. Least privilege: the client only has the anon key; RLS enforces everything.
2. Privacy by default: images are processed on-device and never uploaded unless the user opts in.
3. Validate on both sides: client for UX, database/storage policies for enforcement.

## Secrets
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist in the frontend (both are public by design).
- The service-role key is never committed, never in Vercel frontend env vars, never shipped to the browser.
- `.env` is gitignored; `.env.example` has placeholders. Enable GitHub secret scanning.

## Supabase
- RLS enabled on every table (see `BACKEND_SCHEMA.md`). Test policies with a second test user.
- `species`, `species_look_alikes`, `model_versions` are read-only to clients.
- `feedback` is insert-only; comment length limited to 500 chars; add a Postgres rate-limit or captcha (Turnstile/hCaptcha) if abused.
- Storage bucket `uploads` is private, path-scoped to `auth.uid()`, 5 MB max, MIME allow-list.
- Auth: email confirmation on, strong password minimum, Google OAuth with exact redirect URLs.

## Uploads
- Allow-list: `image/jpeg`, `image/png`, `image/webp`; max 10 MB; verify by decoding (not just by extension).
- Re-encode via canvas before any storage upload: strips EXIF/GPS metadata and any embedded payload; downscale to max 1024 px.
- Never render user filenames as HTML.

## Web Security
- React escapes by default; never use `dangerouslySetInnerHTML` (species text is plain text or sanitized Markdown with DOMPurify).
- Security headers in `vercel.json`:
  - `Content-Security-Policy`: `default-src 'self'; img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org; media-src 'self' blob: https://d8j0ntlcm91z4.cloudfront.net; connect-src 'self' https://*.supabase.co; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com`
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(self)`
- HTTPS only (Vercel default); HSTS enabled.
- Adjust the CSP when you change video hosts or add analytics.

## Dependencies & Supply Chain
- Lockfiles committed; `npm audit` and `pip-audit` in CI; Dependabot enabled.
- Pin the ONNX Runtime Web version; self-host WASM files from `/public` rather than a CDN.

## Privacy
- Policy page states: on-device inference; optional history; feedback stored without images; deletion available (delete history and account).
- No third-party trackers. If analytics are added, use a privacy-friendly one with no images or personal data.
- Dataset licenses honored; credits file maintained.

## Safety of Content
- Identification disclaimer and "not medical advice" on every relevant screen.
- Toxicity notes shown prominently for poisonous species (e.g., Oleander).

## Incident Basics
Rotate Supabase keys if exposed; revoke OAuth credentials; check `auth.users` and storage for anomalies; redeploy.