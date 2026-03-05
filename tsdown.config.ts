import { defineConfig } from 'tsdown'

const YEAR = new Date().getFullYear()

const BANNER = `/**
 * @license GPL-3.0-only
 * docx-roundtrip — Ritápolis, Minas Gerais, Brasil
 * Copyright (c) ${YEAR} Arthur Rodrigues
 * https://github.com/arthrod/docx-roundtrip
 * @preserve
 */`

export default defineConfig({
  entry: ['src/index.ts'],

  // Dual ESM + CJS output.
  format: ['esm', 'cjs'],
  target: 'es2020',

  // DTS generation. With isolatedDeclarations enabled in tsconfig.json,
  // tsdown uses Oxc for .d.ts generation (Rust-native, extremely fast).
  // Without it, falls back to tsc (slower but handles all edge cases).
  // We also enable declaration source maps so consumers can
  // "Go to Definition" into your .ts source, not the .d.ts.
  dts: {
    sourcemap: true,
  },

  clean: true,
  sourcemap: true,

  // GPL-3.0 license banner. The @license and @preserve JSDoc tags tell
  // Rolldown's legalComments engine (default: 'inline') to keep this
  // comment through minification. This is Layer 1 of provenance —
  // survives npm install, bundling, and even basic minification.
  banner: {
    js: BANNER,
  },

  // Rolldown's legalComments defaults to 'inline', which preserves
  // comments matching @license|@preserve|/*!. Explicit for clarity.
  outputOptions: {
    comments: { legal: true },
    exports: 'named',
  },

  // Runtime deps — these live in the consumer's node_modules, not
  // bundled into your output. tsdown auto-externalizes packages listed
  // in dependencies/peerDependencies, but being explicit prevents
  // accidental bundling if someone moves a dep to devDependencies.
  deps: {
    neverBundle: ['mammoth', 'docx', 'html-to-docx'],
    onlyAllowBundle: false,
  },

  // Fail on warnings in CI, pass locally. Catches issues like
  // accidentally bundling a dependency or circular imports.
  failOnWarn: 'ci-only',
})
