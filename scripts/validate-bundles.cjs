#!/usr/bin/env node
/**
 * Post-build validation: ensures browser bundle has no Node-isms
 * and node bundle has no browser-only globals.
 *
 * Exit code 1 on any violation so the build fails.
 */

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const BROWSER_BUNDLE = path.join(ROOT, 'dist/browser/index.js')
const NODE_BUNDLE = path.join(ROOT, 'dist/node/index.js')

/** Patterns that must NOT appear in the browser bundle */
const BROWSER_FORBIDDEN = [
  { pattern: /\bBuffer\.from\b/g, label: 'Buffer.from' },
  { pattern: /\bBuffer\.alloc\b/g, label: 'Buffer.alloc' },
  { pattern: /\bBuffer\.concat\b/g, label: 'Buffer.concat' },
  {
    pattern:
      /\brequire\s*\(\s*['"](?:fs|path|child_process|crypto|os|net|http|https|stream|zlib|worker_threads)['"]\s*\)/g,
    label: 'Node built-in require',
  },
  { pattern: /\bfrom\s+['"]node:/g, label: 'node: protocol import' },
  { pattern: /\bprocess\.env\b/g, label: 'process.env' },
]

/** Patterns that must NOT appear in the node bundle */
const NODE_FORBIDDEN = [
  { pattern: /\bdocument\.createElement\b/g, label: 'document.createElement' },
  { pattern: /\bwindow\.location\b/g, label: 'window.location' },
  { pattern: /\bnavigator\.userAgent\b/g, label: 'navigator.userAgent' },
  { pattern: /\blocalStorage\b/g, label: 'localStorage' },
  { pattern: /\bsessionStorage\b/g, label: 'sessionStorage' },
]

function validate(filePath, forbidden, bundleName) {
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: ${bundleName} bundle not found at ${filePath}`)
    return false
  }

  const code = fs.readFileSync(filePath, 'utf-8')
  const violations = []

  for (const { pattern, label } of forbidden) {
    pattern.lastIndex = 0
    const matches = code.match(pattern)
    if (matches && matches.length > 0) {
      violations.push(
        `  - ${label} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`
      )
    }
  }

  if (violations.length > 0) {
    console.error(`\nERROR: ${bundleName} bundle contains forbidden patterns:`)
    for (const v of violations) {
      console.error(v)
    }
    return false
  }

  console.log(`✓ ${bundleName} bundle clean`)
  return true
}

let ok = true
ok = validate(BROWSER_BUNDLE, BROWSER_FORBIDDEN, 'Browser') && ok
ok = validate(NODE_BUNDLE, NODE_FORBIDDEN, 'Node') && ok

if (!ok) {
  console.error('\nBundle validation FAILED — fix the violations above.')
  process.exit(1)
} else {
  console.log('\nAll bundle validations passed.')
}
