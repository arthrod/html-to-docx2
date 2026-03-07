// @ts-check

// Threaded DOCX test with track changes and comments
// Generates HTML with tracking tokens, produces DOCX, validates via docx-validator

import HTMLtoDOCX from '../index.ts'
import {
  allocatedIds,
  buildCommentEndToken,
  buildCommentRangeEnd,
  buildCommentRangeStart,
  buildCommentReferenceRun,
  buildCommentStartToken,
  buildDeletedTextElement,
  buildSuggestionEndToken,
  buildSuggestionStartToken,
  buildTextElement,
  ensureTrackingState,
  findDocxTrackingTokens,
  generateHexId,
  hasTrackingTokens,
  resetAllocatedIds,
  splitDocxTrackingTokens,
  wrapRunWithSuggestion,
} from '../src/tracking'
import { parseDOCX } from './helpers/docx-assertions'
/** @typedef {import('../src/tracking').ParsedToken} ParsedToken */
/** @typedef {import('../src/tracking').TrackingDocumentInstance} TrackingDocumentInstance */

// ============================================================================
// Token building and parsing unit tests
// ============================================================================

describe('Tracking token utilities', () => {
  test('buildSuggestionStartToken produces valid insert token', () => {
    const token = buildSuggestionStartToken(
      { id: 'ins-1', author: 'Alice', date: '2025-01-01T00:00:00Z' },
      'insert'
    )
    expect(token).toContain('[[DOCX_INS_START:')
    expect(token).toContain(']]')
  })

  test('buildSuggestionStartToken produces valid delete token', () => {
    const token = buildSuggestionStartToken({ id: 'del-1', author: 'Bob' }, 'remove')
    expect(token).toContain('[[DOCX_DEL_START:')
    expect(token).toContain(']]')
  })

  test('buildSuggestionEndToken for insert', () => {
    const token = buildSuggestionEndToken('ins-1', 'insert')
    expect(token).toContain('[[DOCX_INS_END:')
    expect(token).toContain('ins-1')
  })

  test('buildSuggestionEndToken for remove', () => {
    const token = buildSuggestionEndToken('del-1', 'remove')
    expect(token).toContain('[[DOCX_DEL_END:')
    expect(token).toContain('del-1')
  })

  test('buildCommentStartToken produces valid token', () => {
    const token = buildCommentStartToken({
      id: 'cmt-1',
      authorName: 'Alice',
      authorInitials: 'A',
      text: 'Review this',
      replies: [
        {
          id: 'reply-1',
          authorName: 'Bob',
          authorInitials: 'B',
          text: 'Looks good',
        },
      ],
    })
    expect(token).toContain('[[DOCX_CMT_START:')
    expect(token).toContain(']]')
  })

  test('buildCommentEndToken produces valid token', () => {
    const token = buildCommentEndToken('cmt-1')
    expect(token).toContain('[[DOCX_CMT_END:')
    expect(token).toContain('cmt-1')
  })

  test('splitDocxTrackingTokens parses mixed text and tokens', () => {
    const insStart = buildSuggestionStartToken({ id: 'i1', author: 'A' }, 'insert')
    const insEnd = buildSuggestionEndToken('i1', 'insert')
    const text = `Hello ${insStart}inserted text${insEnd} world`

    const parts = splitDocxTrackingTokens(text)
    expect(parts.length).toBe(5)
    expect(parts[0]).toEqual({ type: 'text', value: 'Hello ' })
    expect(parts[1].type).toBe('insStart')
    expect(parts[2]).toEqual({ type: 'text', value: 'inserted text' })
    expect(parts[3].type).toBe('insEnd')
    expect(parts[4]).toEqual({ type: 'text', value: ' world' })
  })

  test('splitDocxTrackingTokens handles comment tokens', () => {
    const cmtStart = buildCommentStartToken({ id: 'c1', text: 'note' })
    const cmtEnd = buildCommentEndToken('c1')
    const text = `${cmtStart}commented text${cmtEnd}`

    const parts = splitDocxTrackingTokens(text)
    expect(parts.some((/** @type {ParsedToken} */ p) => p.type === 'commentStart')).toBe(
      true
    )
    expect(parts.some((/** @type {ParsedToken} */ p) => p.type === 'commentEnd')).toBe(true)
  })

  test('splitDocxTrackingTokens returns text only for plain string', () => {
    const parts = splitDocxTrackingTokens('no tokens here')
    expect(parts).toEqual([{ type: 'text', value: 'no tokens here' }])
  })

  test('hasTrackingTokens detects tokens', () => {
    const token = buildSuggestionStartToken({ id: 'x' }, 'insert')
    expect(hasTrackingTokens(`text ${token} more`)).toBe(true)
    expect(hasTrackingTokens('no tokens')).toBe(false)
  })

  test('findDocxTrackingTokens collects all tokens', () => {
    const t1 = buildSuggestionStartToken({ id: 'a' }, 'insert')
    const t2 = buildSuggestionEndToken('a', 'insert')
    const t3 = buildCommentStartToken({ id: 'b', text: 'hi' })
    const t4 = buildCommentEndToken('b')
    const text = `${t1}foo${t2} bar ${t3}baz${t4}`

    const tokens = findDocxTrackingTokens(text)
    expect(tokens.length).toBe(4)
  })
})

// ============================================================================
// Hex ID generation
// ============================================================================

describe('Hex ID generation', () => {
  beforeEach(() => {
    resetAllocatedIds()
  })

  test('generateHexId produces 8-char uppercase hex', () => {
    const id = generateHexId()
    expect(id).toMatch(/^[0-9A-F]{8}$/)
  })

  test('generateHexId produces unique IDs', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateHexId())
    }
    expect(ids.size).toBe(100)
  })

  test('resetAllocatedIds clears state', () => {
    generateHexId()
    expect(allocatedIds.size).toBeGreaterThan(0)
    resetAllocatedIds()
    expect(allocatedIds.size).toBe(0)
  })
})

// ============================================================================
// XML fragment builders
// ============================================================================

describe('XML fragment builders', () => {
  test('buildTextElement creates w:t element', () => {
    const frag = buildTextElement('hello')
    const xml = frag.toString()
    expect(xml).toContain('hello')
  })

  test('buildDeletedTextElement creates w:delText element', () => {
    const frag = buildDeletedTextElement('removed')
    const xml = frag.toString()
    expect(xml).toContain('removed')
    expect(xml).toContain('delText')
  })

  test('buildCommentRangeStart creates marker', () => {
    const frag = buildCommentRangeStart(42)
    const xml = frag.toString()
    expect(xml).toContain('commentRangeStart')
    expect(xml).toContain('42')
  })

  test('buildCommentRangeEnd creates marker', () => {
    const frag = buildCommentRangeEnd(42)
    const xml = frag.toString()
    expect(xml).toContain('commentRangeEnd')
    expect(xml).toContain('42')
  })

  test('buildCommentReferenceRun creates reference', () => {
    const frag = buildCommentReferenceRun(7)
    const xml = frag.toString()
    expect(xml).toContain('commentReference')
    expect(xml).toContain('7')
  })

  test('wrapRunWithSuggestion wraps insert', () => {
    const run = buildTextElement('new text')
    const wrapped = wrapRunWithSuggestion(run, {
      id: 'ins-1',
      type: 'insert',
      author: 'Alice',
      date: '2025-01-01T00:00:00Z',
      revisionId: 1,
    })
    const xml = wrapped.toString()
    expect(xml).toContain('ins')
    expect(xml).toContain('Alice')
  })

  test('wrapRunWithSuggestion wraps deletion', () => {
    const run = buildDeletedTextElement('old text')
    const wrapped = wrapRunWithSuggestion(run, {
      id: 'del-1',
      type: 'remove',
      author: 'Bob',
      revisionId: 2,
    })
    const xml = wrapped.toString()
    expect(xml).toContain('del')
    expect(xml).toContain('Bob')
  })
})

// ============================================================================
// Tracking state management
// ============================================================================

describe('Tracking state management', () => {
  test('ensureTrackingState initializes state', () => {
    /** @type {TrackingDocumentInstance} */
    const doc = {
      comments: [],
      commentIdMap: new Map(),
      lastCommentId: 0,
      revisionIdMap: new Map(),
      lastRevisionId: 0,
      ensureComment: () => 0,
      getCommentId: () => 0,
      getRevisionId: () => 0,
    }

    const state = ensureTrackingState(doc)
    expect(state.suggestionStack).toEqual([])
    expect(state.replyIdsByParent).toBeInstanceOf(Map)
  })

  test('ensureTrackingState returns same state on second call', () => {
    /** @type {TrackingDocumentInstance} */
    const doc = {
      comments: [],
      commentIdMap: new Map(),
      lastCommentId: 0,
      revisionIdMap: new Map(),
      lastRevisionId: 0,
      ensureComment: () => 0,
      getCommentId: () => 0,
      getRevisionId: () => 0,
    }

    const state1 = ensureTrackingState(doc)
    state1.suggestionStack.push({
      id: 'test',
      type: 'insert',
      revisionId: 1,
    })
    const state2 = ensureTrackingState(doc)
    expect(state2.suggestionStack.length).toBe(1)
  })
})

// ============================================================================
// Full DOCX generation with tracked changes
// ============================================================================

describe('Tracked changes DOCX generation', () => {
  test('should generate DOCX with insertion tracking', async () => {
    const insStart = buildSuggestionStartToken(
      { id: 'ins-1', author: 'Alice', date: '2025-01-15T10:00:00Z' },
      'insert'
    )
    const insEnd = buildSuggestionEndToken('ins-1', 'insert')

    const html = `<p>This is ${insStart}newly inserted${insEnd} text.</p>`
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    expect(parsed.xml).toContain('This is')
    expect(parsed.xml).toContain('text.')
    // Inserted content should appear in the document
    expect(parsed.xml).toContain('newly inserted')
    // Should have w:ins revision mark
    expect(parsed.xml).toMatch(/w:ins/)
    expect(parsed.xml).toContain('Alice')
  })

  test('should generate DOCX with deletion tracking', async () => {
    const delStart = buildSuggestionStartToken(
      { id: 'del-1', author: 'Bob', date: '2025-01-15T11:00:00Z' },
      'remove'
    )
    const delEnd = buildSuggestionEndToken('del-1', 'remove')

    const html = `<p>This is ${delStart}removed${delEnd} text.</p>`
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    expect(parsed.xml).toContain('This is')
    // Should have w:del revision mark
    expect(parsed.xml).toMatch(/w:del/)
    expect(parsed.xml).toContain('Bob')
  })

  test('should generate DOCX with comments', async () => {
    const cmtStart = buildCommentStartToken({
      id: 'cmt-1',
      authorName: 'Alice',
      authorInitials: 'A',
      date: '2025-01-15T12:00:00Z',
      text: 'Please review this section',
    })
    const cmtEnd = buildCommentEndToken('cmt-1')

    const html = `<p>Here is ${cmtStart}commented content${cmtEnd} in the doc.</p>`
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    expect(parsed.xml).toContain('commented content')
    // Should have comment range markers
    expect(parsed.xml).toMatch(/commentRangeStart/)
    expect(parsed.xml).toMatch(/commentRangeEnd/)
    expect(parsed.xml).toMatch(/commentReference/)

    // Should generate comments.xml
    const commentsFile = parsed.zip.file('word/comments.xml')
    expect(commentsFile).not.toBeNull()
    const commentsXml = await commentsFile.async('string')
    expect(commentsXml).toContain('Please review this section')
    expect(commentsXml).toContain('Alice')
  })

  test('should generate DOCX with threaded comments (replies)', async () => {
    const cmtStart = buildCommentStartToken({
      id: 'cmt-thread',
      authorName: 'Alice',
      authorInitials: 'A',
      date: '2025-01-15T09:00:00Z',
      text: 'What do you think about this?',
      replies: [
        {
          id: 'reply-1',
          authorName: 'Bob',
          authorInitials: 'B',
          date: '2025-01-15T10:00:00Z',
          text: 'Looks good to me!',
        },
        {
          id: 'reply-2',
          authorName: 'Charlie',
          authorInitials: 'C',
          date: '2025-01-15T11:00:00Z',
          text: 'I agree with Bob.',
        },
      ],
    })
    const cmtEnd = buildCommentEndToken('cmt-thread')

    const html = `<p>The ${cmtStart}design decision${cmtEnd} was approved.</p>`
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    expect(parsed.xml).toContain('design decision')
    expect(parsed.xml).toMatch(/commentRangeStart/)

    // Should generate comments.xml with thread
    const commentsFile = parsed.zip.file('word/comments.xml')
    expect(commentsFile).not.toBeNull()
    const commentsXml = await commentsFile.async('string')
    expect(commentsXml).toContain('What do you think about this?')
    expect(commentsXml).toContain('Looks good to me!')
    expect(commentsXml).toContain('I agree with Bob.')
    expect(commentsXml).toContain('Alice')
    expect(commentsXml).toContain('Bob')
    expect(commentsXml).toContain('Charlie')

    // commentsExtended.xml should exist for threaded comments
    const commentsExtFile = parsed.zip.file('word/commentsExtended.xml')
    expect(commentsExtFile).not.toBeNull()
  })

  test('should generate DOCX with mixed insertions, deletions, and comments', async () => {
    const insStart = buildSuggestionStartToken({ id: 'ins-mix', author: 'Alice' }, 'insert')
    const insEnd = buildSuggestionEndToken('ins-mix', 'insert')
    const delStart = buildSuggestionStartToken({ id: 'del-mix', author: 'Bob' }, 'remove')
    const delEnd = buildSuggestionEndToken('del-mix', 'remove')
    const cmtStart = buildCommentStartToken({
      id: 'cmt-mix',
      authorName: 'Charlie',
      text: 'Needs work',
    })
    const cmtEnd = buildCommentEndToken('cmt-mix')

    const html = `
      <h1>Document with Track Changes</h1>
      <p>This paragraph has ${insStart}added text${insEnd} from Alice.</p>
      <p>This paragraph has ${delStart}removed text${delEnd} from Bob.</p>
      <p>This paragraph has ${cmtStart}commented text${cmtEnd} from Charlie.</p>
    `
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    // All content should be present
    expect(parsed.xml).toContain('Document with Track Changes')
    expect(parsed.xml).toContain('added text')
    expect(parsed.xml).toContain('removed text')
    expect(parsed.xml).toContain('commented text')

    // Should have both insertion and deletion marks
    expect(parsed.xml).toMatch(/w:ins/)
    expect(parsed.xml).toMatch(/w:del/)

    // Should have comment markers
    expect(parsed.xml).toMatch(/commentRangeStart/)
    expect(parsed.xml).toMatch(/commentReference/)

    // Should have comments.xml
    const commentsFile = parsed.zip.file('word/comments.xml')
    expect(commentsFile).not.toBeNull()
    const commentsXml = await commentsFile.async('string')
    expect(commentsXml).toContain('Needs work')
  })

  test('should handle multiple comments in same document', async () => {
    const cmt1Start = buildCommentStartToken({
      id: 'cmt-a',
      authorName: 'Alice',
      text: 'First comment',
    })
    const cmt1End = buildCommentEndToken('cmt-a')
    const cmt2Start = buildCommentStartToken({
      id: 'cmt-b',
      authorName: 'Bob',
      text: 'Second comment',
    })
    const cmt2End = buildCommentEndToken('cmt-b')

    const html = `
      <p>${cmt1Start}First section${cmt1End} of the document.</p>
      <p>${cmt2Start}Second section${cmt2End} of the document.</p>
    `
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    const commentsFile = parsed.zip.file('word/comments.xml')
    expect(commentsFile).not.toBeNull()
    const commentsXml = await commentsFile.async('string')
    expect(commentsXml).toContain('First comment')
    expect(commentsXml).toContain('Second comment')
  })

  test('should produce valid DOCX structure with all comment-related files', async () => {
    const cmtStart = buildCommentStartToken({
      id: 'cmt-struct',
      authorName: 'Alice',
      text: 'Structural test',
      replies: [{ id: 'r1', authorName: 'Bob', text: 'Reply' }],
    })
    const cmtEnd = buildCommentEndToken('cmt-struct')

    const html = `<p>${cmtStart}Test${cmtEnd}</p>`
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    // Verify all OOXML comment files are present
    expect(parsed.zip.file('word/comments.xml')).not.toBeNull()
    expect(parsed.zip.file('word/commentsExtended.xml')).not.toBeNull()
    expect(parsed.zip.file('word/commentsIds.xml')).not.toBeNull()
    expect(parsed.zip.file('word/commentsExtensible.xml')).not.toBeNull()
    expect(parsed.zip.file('word/people.xml')).not.toBeNull()

    // Verify content types include comment types
    expect(parsed.contentTypes).toContain('comments.xml')
  })

  test('should not generate comment files when no comments exist', async () => {
    const html = '<p>Plain paragraph with no tracking.</p>'
    const docx = await HTMLtoDOCX(html)
    const parsed = await parseDOCX(docx)

    // No comment files when there are no comments
    expect(parsed.zip.file('word/comments.xml')).toBeNull()
    expect(parsed.zip.file('word/commentsExtended.xml')).toBeNull()
  })
})

// ============================================================================
// Generate and write an actual threaded DOCX file
// ============================================================================

describe('Generate threaded DOCX file', () => {
  test('should produce a complete threaded DOCX document', async () => {
    // Build a realistic document with headings, paragraphs, tracked changes, and threaded comments
    const insStart = buildSuggestionStartToken(
      { id: 'ins-final', author: 'Alice Smith', date: '2025-02-01T09:30:00Z' },
      'insert'
    )
    const insEnd = buildSuggestionEndToken('ins-final', 'insert')
    const delStart = buildSuggestionStartToken(
      { id: 'del-final', author: 'Bob Jones', date: '2025-02-01T10:15:00Z' },
      'remove'
    )
    const delEnd = buildSuggestionEndToken('del-final', 'remove')
    const threadStart = buildCommentStartToken({
      id: 'thread-1',
      authorName: 'Alice Smith',
      authorInitials: 'AS',
      date: '2025-02-01T11:00:00Z',
      text: 'Should we use a different approach here?',
      replies: [
        {
          id: 'thread-1-reply-1',
          authorName: 'Bob Jones',
          authorInitials: 'BJ',
          date: '2025-02-01T11:30:00Z',
          text: 'I think the current approach is fine.',
        },
        {
          id: 'thread-1-reply-2',
          authorName: 'Alice Smith',
          authorInitials: 'AS',
          date: '2025-02-01T12:00:00Z',
          text: 'OK, let us keep it then.',
        },
      ],
    })
    const threadEnd = buildCommentEndToken('thread-1')

    const html = `
      <h1>Project Proposal</h1>
      <h2>1. Introduction</h2>
      <p>This document outlines the ${insStart}revised${insEnd} project proposal for Q1 2025.</p>
      <p>The ${delStart}original${delEnd} timeline has been updated to reflect new requirements.</p>

      <h2>2. Technical Approach</h2>
      <p>We will use a ${threadStart}microservices architecture${threadEnd} with the following components:</p>
      <ul>
        <li>API Gateway</li>
        <li>Authentication Service</li>
        <li>Data Processing Pipeline</li>
      </ul>

      <h2>3. Timeline</h2>
      <table>
        <thead>
          <tr><th>Phase</th><th>Duration</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Design</td><td>2 weeks</td><td>Complete</td></tr>
          <tr><td>Development</td><td>8 weeks</td><td>In Progress</td></tr>
          <tr><td>Testing</td><td>3 weeks</td><td>Pending</td></tr>
        </tbody>
      </table>
    `

    const docx = await HTMLtoDOCX(html, null, {
      title: 'Project Proposal',
      creator: 'Alice Smith',
      description: 'Q1 2025 Project Proposal with tracked changes',
    })

    const parsed = await parseDOCX(docx)

    // Verify document structure
    expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(5)
    expect(parsed.xml).toContain('Project Proposal')
    expect(parsed.xml).toContain('Introduction')
    expect(parsed.xml).toContain('Technical Approach')

    // Verify tracked insertion
    expect(parsed.xml).toMatch(/w:ins/)
    expect(parsed.xml).toContain('Alice Smith')
    expect(parsed.xml).toContain('revised')

    // Verify tracked deletion
    expect(parsed.xml).toMatch(/w:del/)
    expect(parsed.xml).toContain('Bob Jones')

    // Verify comments with thread
    expect(parsed.xml).toMatch(/commentRangeStart/)
    const commentsFile = parsed.zip.file('word/comments.xml')
    expect(commentsFile).not.toBeNull()
    const commentsXml = await commentsFile.async('string')
    expect(commentsXml).toContain('Should we use a different approach here?')
    expect(commentsXml).toContain('I think the current approach is fine.')
    expect(commentsXml).toContain('OK, let us keep it then.')

    // Verify table
    expect(parsed.xml).toMatch(/w:tbl/)
    expect(parsed.xml).toContain('Design')
    expect(parsed.xml).toContain('Development')

    // Verify list items
    expect(parsed.xml).toContain('API Gateway')
    expect(parsed.xml).toContain('Authentication Service')

    // Verify all OOXML comment support files
    expect(parsed.zip.file('word/commentsExtended.xml')).not.toBeNull()
    expect(parsed.zip.file('word/commentsIds.xml')).not.toBeNull()
    expect(parsed.zip.file('word/people.xml')).not.toBeNull()

    // Verify numbering.xml exists (for the list)
    expect(parsed.numberingXml).not.toBeNull()
    expect(parsed.numberingXml).toBeDefined()
  })
})
