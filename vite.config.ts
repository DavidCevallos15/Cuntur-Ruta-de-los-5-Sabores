import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Build ESM minificado de Phaser (el entry por defecto no hace tree-shaking útil).
const phaserEsm = fileURLToPath(new URL('./node_modules/phaser/dist/phaser.esm.min.js', import.meta.url));

export default defineConfig({
  base: './',
  resolve: { alias: { phaser: phaserEsm } },
  build: { target: 'es2020', chunkSizeWarningLimit: 2000, assetsInlineLimit: 0 },
  server: { host: true, port: 5173 },
});
