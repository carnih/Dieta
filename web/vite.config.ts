import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// La cartella OneDrive reale contiene "&", che rompe i tool Node: si lavora tramite
// una junction su path pulito (vedi web/README o CLAUDE.md). Con preserveSymlinks i
// moduli restano sul path della junction, quindi l'alias DEVE risolvere allo stesso
// path (process.cwd() = junction) — come in NewWorth.
export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': resolve(process.cwd(), 'src'),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
});
