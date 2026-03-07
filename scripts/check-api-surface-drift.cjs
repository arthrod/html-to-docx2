// @ts-check
/* eslint-disable no-console */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const API_SURFACE_DIR = path.resolve(__dirname, '..', 'api-surface')
/** @type {readonly ['browser.rollup.d.ts', 'node.rollup.d.ts']} */
const EXPECTED_FILES = ['browser.rollup.d.ts', 'node.rollup.d.ts']

/**
 * Execute a git command and return trimmed stdout.
 * @param {string} command
 * @returns {string}
 */
function getGitOutput(command) {
  return execSync(command, { encoding: 'utf8' }).trim()
}

/**
 * Pre-commit check: warn if api-surface/ files have uncommitted changes
 * after regeneration, or if source changed but api-surface wasn't updated.
 */
function main() {
  // Check if api-surface files exist at all
  const missing = EXPECTED_FILES.filter(
    (f) => !fs.existsSync(path.join(API_SURFACE_DIR, f))
  )
  if (missing.length > 0) {
    console.warn('\x1b[33m⚠  API surface files missing:\x1b[0m')
    console.warn(`   ${missing.join('\n   ')}`)
    console.warn('   Run \x1b[36mbun run api:check\x1b[0m to generate them.')
    process.exit(1)
  }

  // Check if api-surface files have unstaged changes (developer forgot to stage)
  const unstaged = getGitOutput('git diff --name-only -- api-surface/')

  if (unstaged) {
    console.warn('\x1b[33m⚠  API surface files have unstaged changes:\x1b[0m')
    console.warn(`   ${unstaged.split('\n').join('\n   ')}`)
    console.warn('   Run \x1b[36mbun run api:check\x1b[0m and stage the updated files.')
    process.exit(1)
  }

  // Check if api-surface files are staged (intentional change)
  const staged = getGitOutput('git diff --cached --name-only -- api-surface/')

  if (staged) {
    console.warn('\x1b[33m⚠  API surface changed in this commit:\x1b[0m')
    console.warn(`   ${staged.split('\n').join('\n   ')}`)
    console.warn('   Please verify this is intentional.\n')

    // Show the actual drift so the developer can review inline
    const diff = getGitOutput(
      'git diff --cached --unified=2 --color=always -- api-surface/'
    ).trim()

    if (diff) {
      console.warn('\x1b[33m   ── API surface drift ──\x1b[0m\n')
      console.warn(diff)
      console.warn('')
    }

    // Non-blocking: exit 0 so the commit proceeds
  }
}

main()
