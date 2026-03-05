import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import cleaner from 'rollup-plugin-cleaner'
import builtins from 'rollup-plugin-node-builtins'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import { terser } from 'rollup-plugin-terser'

import meta from './package.json' with { type: 'json' }

const isProduction = process.env.NODE_ENV === 'production'
const browserOnly = process.env.BUILD_TARGET === 'browser'

const banner = `// ${meta.homepage} v${meta.version} Copyright ${new Date().getFullYear()} ${meta.author}`

// Node.js / Library build configuration (ESM and UMD)
const libraryConfig = {
  input: 'index.ts',
  external: [
    'color-name',
    'jszip',
    'xmlbuilder2',
    'html-entities',
    'lru-cache',
    'htmlparser2',
    'sharp',
  ],
  plugins: [
    resolve({
      extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
      preferBuiltins: false,
    }),
    json(),
    typescript({
      tsconfig: './tsconfig.build.json',
      exclude: ['**/*.spec.ts'],
    }),
    commonjs(),
    builtins(),
    terser({}),
    cleaner({
      targets: ['./dist/'],
    }),
  ],
  output: [
    {
      file: 'dist/html-to-docx.esm.js',
      format: 'es',
      sourcemap: !isProduction,
      banner,
    },
    {
      file: 'dist/html-to-docx.umd.js',
      format: 'umd',
      name: 'HTMLToDOCX',
      sourcemap: !isProduction,
      globals: {
        htmlparser2: 'htmlparser2',
        jszip: 'JSZip',
        xmlbuilder2: 'xmlbuilder2',
        'html-entities': 'htmlEntities',
      },
      banner,
    },
  ],
}

// Standalone browser build configuration (all dependencies bundled)
const browserConfig = {
  input: 'index.ts',
  // Only exclude sharp (Node.js native module, not supported in browser)
  external: ['sharp'],
  plugins: [
    // Only clean when building browser-only (cleaner already runs in libraryConfig for full builds)
    ...(browserOnly ? [cleaner({ targets: ['./dist/'] })] : []),
    resolve({
      browser: true,
      preferBuiltins: false,
      extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
    }),
    json(),
    typescript({
      tsconfig: './tsconfig.build.json',
      exclude: ['**/*.spec.ts'],
    }),
    commonjs(),
    nodePolyfills(),
    terser({
      mangle: isProduction,
      compress: isProduction,
    }),
  ],
  output: [
    {
      file: 'dist/html-to-docx.browser.js',
      format: 'iife',
      name: 'HTMLToDOCX',
      sourcemap: !isProduction,
      banner,
    },
    {
      file: 'dist/html-to-docx.browser.esm.js',
      format: 'es',
      sourcemap: !isProduction,
      banner,
    },
  ],
}

export default browserOnly ? [browserConfig] : [libraryConfig, browserConfig]
