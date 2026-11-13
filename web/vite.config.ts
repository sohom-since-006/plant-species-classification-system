import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Hard safety gate: mock ML mode is strictly forbidden in production builds
  if (command === 'build' && env.VITE_MOCK_ML === 'true') {
    throw new Error(
      'FATAL: Production build aborted because VITE_MOCK_ML=true. Mock mode must never ship in production.',
    );
  }

  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org; media-src 'self' blob: https://d8j0ntlcm91z4.cloudfront.net; connect-src 'self' https://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self';",
  };

  return {
    plugins: [
      react(),
      {
        name: 'security-headers',
        configureServer(server) {
          server.middlewares.use((_req, res, next) => {
            Object.entries(securityHeaders).forEach(([k, v]) => res.setHeader(k, v));
            next();
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use((_req, res, next) => {
            Object.entries(securityHeaders).forEach(([k, v]) => res.setHeader(k, v));
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    worker: {
      format: 'es',
    },
  };
});

