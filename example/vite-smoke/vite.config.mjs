import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import consolePipe from 'vite-plugin-console-pipe';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [
    nodePolyfills({
      exclude: ['zlib'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    consolePipe(),
  ],
  resolve: {
    alias: {
      '@turbodocx/html-to-docx': path.resolve(__dirname, '../../dist/html-to-docx.esm.js'),
      sharp: path.resolve(__dirname, './shims/sharp.js'),
      'node:zlib': path.resolve(__dirname, './shims/zlib.js'),
      zlib: path.resolve(__dirname, './shims/zlib.js'),
    },
  },
  optimizeDeps: {
    exclude: ['zlib', 'node:zlib', 'browserify-zlib'],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
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
