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

function main() {
  const browserRollup = normalize(readRequiredFile(BROWSER_ROLLUP))
  const nodeRollup = normalize(readRequiredFile(NODE_ROLLUP))

  if (browserRollup === nodeRollup) {
    console.log('API parity check passed: browser and node rollups are identical.')
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
