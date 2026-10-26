import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerDir = resolve(root, 'dist-worker');
const outDir = resolve(root, 'dist-offline');

rmSync(workerDir, { recursive: true, force: true });
await build({
  root,
  configFile: false,
  define: { __MA_WORKER_SOURCE__: JSON.stringify('') },
  build: {
    outDir: workerDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'src/importers/worker.ts'),
      output: { format: 'iife', entryFileNames: 'worker.js', inlineDynamicImports: true },
    },
  },
});

const workerSource = readFileSync(resolve(workerDir, 'worker.js'), 'utf8');
const embedded = JSON.stringify(workerSource).replace(/</g, '\\u003c');
await build({
  root,
  configFile: false,
  plugins: [react(), viteSingleFile({ useRecommendedBuildConfig: true })],
  define: { __MA_WORKER_SOURCE__: embedded },
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});

const htmlPath = resolve(outDir, 'index.html');
const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data:; font-src data:; worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'">`;
let html = readFileSync(htmlPath, 'utf8');
if (!html.includes('Content-Security-Policy')) html = html.replace('<head>', `<head>${csp}`);
writeFileSync(htmlPath, html);
console.log(`offline html ${html.length} bytes`);
