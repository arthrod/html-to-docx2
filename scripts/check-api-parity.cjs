// @ts-check
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { createTwoFilesPatch } = require('diff')

const ROOT_DIR = path.resolve(__dirname, '..')
const API_DIR = path.join(ROOT_DIR, 'api-surface')
const BROWSER_ROLLUP = path.join(API_DIR, 'browser.rollup.d.ts')
const NODE_ROLLUP = path.join(API_DIR, 'node.rollup.d.ts')

/**
 * @param {string} filePath
 * @returns {string}
 */
function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`)
  }

  return fs.readFileSync(filePath, 'utf8')
}

/**
 * @param {string} content
 * @returns {string}
 */
function normalize(content) {
  return (
    content
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+$/gm, '')
      .trim() + '\n'
  )
}

/**
 * Strip known, intentional browser-vs-node type differences so parity checks
 * still catch unexpected API drift.
 *
 * @param {string} content
 * @returns {string}
 */
function stripKnownPlatformTypeDiffs(content) {
  return (
    content
      // Return-type divergence in platform entrypoints.
      .replace(/Promise<\s*Blob\s*>/g, 'Promise<__DOCX_RESULT__>')
      .replace(/Promise<\s*Buffer\s*\|\s*Uint8Array\s*>/g, 'Promise<__DOCX_RESULT__>')
      // Platform result aliases and references.
      .replace(/\bBrowserDocxResult\b/g, '__DOCX_RESULT__')
      .replace(/\bNodeDocxResult\b/g, '__DOCX_RESULT__')
      .replace(/\bHtmlToDocxResult\b/g, '__DOCX_RESULT__')
      // Remove the now-normalized alias declaration lines.
      .replace(/^(?:export\s+)?declare\s+type\s+__DOCX_RESULT__\s*=\s*[^;]+;\n?/gm, '')
      .replace(/\n{3,}/g, '\n\n')
  )
}

function main() {
  const browserRollup = stripKnownPlatformTypeDiffs(
    normalize(readRequiredFile(BROWSER_ROLLUP))
  )
  const nodeRollup = stripKnownPlatformTypeDiffs(normalize(readRequiredFile(NODE_ROLLUP)))

  if (browserRollup === nodeRollup) {
    console.log(
      'API parity check passed: browser and node rollups match after expected platform type diffs.'
    )
    return
  }

  const patch = createTwoFilesPatch(
    'browser.rollup.d.ts',
    'node.rollup.d.ts',
    browserRollup,
    nodeRollup,
    'browser',
    'node',
    { context: 3 }
  )

  console.error('API parity check failed: browser and node rollups differ.')
  console.error(patch)
  process.exit(1)
}

main()
