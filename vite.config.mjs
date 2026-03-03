import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import consolePipe from 'vite-plugin-console-pipe';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeRoot = path.resolve(__dirname, 'example/vite-smoke');
const shouldAnalyze = process.env.BUNDLE_ANALYZE === '1';
const analyzerReportName =
  process.env.BUNDLE_ANALYZE_NAME || 'stats-baseline';

// Keep this explicit and minimal. We intentionally avoid the plugin default
// (which injects a very broad Node stdlib set) to control bundle size.
const nodePolyfillsInclude = [
  'assert',
  'buffer',
  'crypto',
  'events',
  'fs',
  'http',
  'https',
  'os',
  'path',
  'process',
  'stream',
  'tty',
  'url',
  'util',
];
// Intentionally not in `include`:
// - `zlib`: mapped to local browser shim via alias
// - `vm`: mapped to local browser shim via alias

export default defineConfig({
  root: smokeRoot,
  plugins: [
    nodePolyfills({
      include: nodePolyfillsInclude,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    shouldAnalyze
      ? analyzer({
          analyzerMode: 'static',
          defaultSizes: 'gzip',
          fileName: analyzerReportName,
          openAnalyzer: false,
          reportTitle: 'Vite Smoke Analyzer (baseline)',
          summary: true,
        })
      : null,
    consolePipe(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@turbodocx/html-to-docx': path.resolve(__dirname, 'dist/html-to-docx.esm.js'),
      sharp: path.resolve(smokeRoot, 'shims/sharp.js'),
      vm: path.resolve(smokeRoot, 'shims/vm.js'),
      'node:vm': path.resolve(smokeRoot, 'shims/vm.js'),
      'node:zlib': path.resolve(smokeRoot, 'shims/zlib.js'),
      zlib: path.resolve(smokeRoot, 'shims/zlib.js'),
    },
  },
  optimizeDeps: {
    exclude: ['zlib', 'node:zlib', 'browserify-zlib'],
  },
  build: {
    outDir: path.resolve(smokeRoot, 'dist'),
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});
