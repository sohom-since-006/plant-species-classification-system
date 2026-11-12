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

  return {
    plugins: [react()],
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

