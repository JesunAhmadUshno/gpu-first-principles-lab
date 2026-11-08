import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The site reads the repo's markdown (STUDY-MAP.md, PREREGISTRATION.md, units/, README.md, REPORT.md) at build time,
// so every count and threshold on the page is parsed, never typed.
export default defineConfig({
  base: '/gpu-first-principles-lab/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
