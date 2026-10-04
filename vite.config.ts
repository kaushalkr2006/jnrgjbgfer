import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the build works at any sub-path (e.g. GitHub Pages /<repo>/) or a custom domain.
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    // three + react-three-fiber land in the lazily imported Scene chunk automatically,
    // so the DOM experience never waits on the 3D runtime.
    chunkSizeWarningLimit: 1100,
  },
});
