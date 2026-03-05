/**
 * OOXML Schema Validation Tests
 *
 * These tests generate DOCX files and validate them against the OOXML XSD schemas
 * using the Python validator at .claude/skills/docx/scripts/office/validate.py
 *
 * Validates: XML well-formedness, namespace declarations, unique IDs, file references,
 * content types, XSD schema compliance, whitespace preservation, deletion/insertion
 * element correctness, relationship IDs, paraId/durableId constraints, comment markers.
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import HTMLtoDOCX from '../index.ts'
import {
  buildSuggestionStartToken,
  buildSuggestionEndToken,
  buildCommentStartToken,
  buildCommentEndToken,
} from '../src/tracking'
import { SVG_BASE64 } from './fixtures/index.js'

const VALIDATOR_PATH = join(process.cwd(), '.claude/skills/docx/scripts/office/validate.py')
const validatorAvailable = existsSync(VALIDATOR_PATH)

// Check Python deps
let pythonAvailable = false
try {
  execSync('python3 -c "import lxml; import defusedxml"', { stdio: 'pipe' })
  pythonAvailable = true
} catch {
  pythonAvailable = false
}

const canValidate = validatorAvailable && pythonAvailable

/**
 * Run the OOXML schema validator on a DOCX buffer.
 * Returns { passed: boolean, output: string }
 */
function validateDOCX(docxBuffer, filename) {
  const filePath = join(process.cwd(), filename)
  writeFileSync(filePath, Buffer.from(docxBuffer))

  try {
    const output = execSync(`python3 "${VALIDATOR_PATH}" "${filePath}" -v`, {
      encoding: 'utf-8',
      timeout: 30000,
    })
    return { passed: true, output }
  } catch (err) {
    return { passed: false, output: err.stdout || err.stderr || String(err) }
  } finally {
    try {
      unlinkSync(filePath)
    } catch {}
  }
}

describe.skipIf(!canValidate)('OOXML Schema Validation', () => {
  test('tracked changes DOCX passes OOXML validation', async () => {
    const insStart = buildSuggestionStartToken(
      { id: 'ins-v', author: 'Alice', date: '2025-01-15T10:00:00Z' },
      'insert'
    )
    const insEnd = buildSuggestionEndToken('ins-v', 'insert')
    const delStart = buildSuggestionStartToken(
      { id: 'del-v', author: 'Bob', date: '2025-01-15T11:00:00Z' },
      'remove'
    )
    const delEnd = buildSuggestionEndToken('del-v', 'remove')

    const html = `
      <h1>Tracked Changes</h1>
      <p>This has ${insStart}inserted${insEnd} text.</p>
      <p>This has ${delStart}deleted${delEnd} text.</p>
      <p>Normal paragraph.</p>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Tracked Changes Validation' })
    const result = validateDOCX(docx, '_test-tracked-changes.docx')

    expect(result.passed).toBe(true)
    expect(result.output).toContain('All validations PASSED')
  })

  test('comments DOCX passes OOXML validation', async () => {
    const cmtStart = buildCommentStartToken({
      id: 'cmt-v',
      authorName: 'Alice',
      authorInitials: 'A',
      date: '2025-01-15T12:00:00Z',
      text: 'Review this',
    })
    const cmtEnd = buildCommentEndToken('cmt-v')

    const html = `
      <h1>Comments Document</h1>
      <p>Here is ${cmtStart}commented content${cmtEnd} in the doc.</p>
      <p>Normal paragraph.</p>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Comments Validation' })
    const result = validateDOCX(docx, '_test-comments.docx')

    expect(result.passed).toBe(true)
    expect(result.output).toContain('All validations PASSED')
  })

  test('threaded comments DOCX passes OOXML validation', async () => {
    const cmtStart = buildCommentStartToken({
      id: 'cmt-thread-v',
      authorName: 'Alice',
      authorInitials: 'A',
      date: '2025-02-01T11:00:00Z',
      text: 'What do you think?',
      replies: [
        {
          id: 'r1',
          authorName: 'Bob',
          authorInitials: 'B',
          date: '2025-02-01T11:30:00Z',
          text: 'Looks good!',
        },
        {
          id: 'r2',
          authorName: 'Alice',
          authorInitials: 'A',
          date: '2025-02-01T12:00:00Z',
          text: 'Great, keeping it.',
        },
      ],
    })
    const cmtEnd = buildCommentEndToken('cmt-thread-v')

    const html = `
      <h1>Threaded Comments</h1>
      <p>The ${cmtStart}architecture${cmtEnd} was approved.</p>
      <p>Normal paragraph.</p>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Threaded Comments Validation' })
    const result = validateDOCX(docx, '_test-threaded-comments.docx')

    expect(result.passed).toBe(true)
    expect(result.output).toContain('All validations PASSED')
  })

  test('native SVG DOCX passes OOXML validation', async () => {
    const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`

    const html = `
      <h1>SVG Native</h1>
      <p>Here is an SVG:</p>
      <img src="${svgDataUrl}" width="100" height="100" />
      <p>End.</p>
    `
    const docx = await HTMLtoDOCX(html, null, {
      title: 'SVG Native Validation',
      imageProcessing: { svgHandling: 'native' },
    })
    const result = validateDOCX(docx, '_test-svg-native.docx')

    expect(result.passed).toBe(true)
    expect(result.output).toContain('All validations PASSED')
  })

  test('SVG convert mode DOCX passes OOXML validation', async () => {
    const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`

    const html = `
      <h1>SVG Convert</h1>
      <p>Here is an SVG (converted):</p>
      <img src="${svgDataUrl}" width="100" height="100" />
      <p>End.</p>
    `
    const docx = await HTMLtoDOCX(html, null, {
      title: 'SVG Convert Validation',
      imageProcessing: { svgHandling: 'convert' },
    })
    const result = validateDOCX(docx, '_test-svg-convert.docx')

    expect(result.passed).toBe(true)
    expect(result.output).toContain('All validations PASSED')
  })

  test('plain document (no tracking/comments) passes OOXML validation', async () => {
    const html = `
      <h1>Plain Document</h1>
      <p>This is a simple paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
      <ul><li>Item one</li><li>Item two</li></ul>
      <p>End of document.</p>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Plain Validation' })
    const result = validateDOCX(docx, '_test-plain.docx')

    expect(result.passed).toBe(true)
    expect(result.output).toContain('All validations PASSED')
  })
})
