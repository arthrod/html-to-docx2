import path from 'node:path'
import { defineConfig } from 'tsdown'

const YEAR = new Date().getFullYear()

const BANNER = `/**
 * @license GPL-3.0-only
 * html-to-docx-with-style — Ritápolis, Minas Gerais, Brasil
 * Copyright (c) ${YEAR} Arthur Rodrigues
 * https://github.com/arthrod/html-to-docx-with-style
 * @preserve
 */`

const NEVER_BUNDLE_DEPS = ['sharp'] as const
const BROWSER_FORMATS = ['esm'] as const
const NODE_FORMATS = ['esm', 'cjs'] as const

const baseConfig = {
  target: 'es2020',
  dts: {
    sourcemap: true,
  },
  sourcemap: true,
  banner: {
    js: BANNER,
  },
  outputOptions: {
    comments: { legal: true },
    exports: 'named',
  },
  deps: {
    neverBundle: NEVER_BUNDLE_DEPS,
    onlyAllowBundle: false,
  },
  failOnWarn: 'ci-only' as const,
}

export default defineConfig([
  {
    ...baseConfig,
    name: 'browser',
    clean: true,
    entry: {
      browser: 'src/browser.ts',
    },
    format: BROWSER_FORMATS,
    platform: 'browser',
    alias: {
      './utils/image': path.resolve('src/utils/image-browser.ts'),
    },
  },
  {
    ...baseConfig,
    name: 'node',
    clean: false,
    entry: {
      index: 'src/node.ts',
      node: 'src/node.ts',
    },
    format: NODE_FORMATS,
    fixedExtension: false,
    platform: 'node',
  },
])
