/**
 * DOCX Tracked Changes and Comments Export Support
 *
 * This module provides token-based tracking for exporting Plate editor
 * suggestions and comments to Word's tracked changes and comments format.
 *
 * Token Format:
 * - Insertions: [[DOCX_INS_START:{payload}]] ... [[DOCX_INS_END:id]]
 * - Deletions: [[DOCX_DEL_START:{payload}]] ... [[DOCX_DEL_END:id]]
 * - Comments: [[DOCX_CMT_START:{payload}]] ... [[DOCX_CMT_END:id]]
 */
/** biome-ignore-all lint/style/useConsistentTypeDefinitions: legacy code */

import { fragment, type XMLBuilder } from './utils/xmlbuilder2'

import namespaces from './namespaces'

// ============================================================================
// Types
// ============================================================================

/** Payload for insertion/deletion tokens */
export interface SuggestionPayload {
  id: string
  author?: string
  date?: string
}

/** Payload for a single comment reply */
export interface CommentReply {
  id: string
  authorName?: string
  authorInitials?: string
  date?: string
  /** OOXML paraId for round-trip threading fidelity */
  paraId?: string
  text?: string
}

/** Payload for comment tokens */
export interface CommentPayload {
  id: string
  authorName?: string
  authorInitials?: string
  date?: string
  /** OOXML paraId for round-trip threading fidelity */
  paraId?: string
  /** OOXML parentParaId for round-trip threading fidelity */
  parentParaId?: string
  text?: string
  replies?: CommentReply[]
}

type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonObject | JsonPrimitive | JsonValue[]
type JsonObject = { [key: string]: JsonValue | undefined }

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOptionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function parseSuggestionPayload(value: JsonValue): SuggestionPayload | null {
  if (!isJsonObject(value)) {
    return null
  }

  const id = readOptionalString(value.id)
  if (!id) {
    return null
  }

  return {
    id,
    author: readOptionalString(value.author),
    date: readOptionalString(value.date),
  }
}

function parseCommentReply(value: JsonValue): CommentReply | null {
  if (!isJsonObject(value)) {
    return null
  }

  const id = readOptionalString(value.id)
  if (!id) {
    return null
  }

  return {
    id,
    authorName: readOptionalString(value.authorName),
    authorInitials: readOptionalString(value.authorInitials),
    date: readOptionalString(value.date),
    paraId: readOptionalString(value.paraId),
    text: readOptionalString(value.text),
  }
}

function parseCommentReplies(value: JsonValue | undefined): CommentReply[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const replies: CommentReply[] = []
  for (const item of value) {
    const reply = parseCommentReply(item)
    if (!reply) {
      return undefined
    }
    replies.push(reply)
  }
  return replies
}

function parseCommentPayload(value: JsonValue): CommentPayload | null {
  if (!isJsonObject(value)) {
    return null
  }

  const id = readOptionalString(value.id)
  if (!id) {
    return null
  }

  return {
    id,
    authorName: readOptionalString(value.authorName),
    authorInitials: readOptionalString(value.authorInitials),
    date: readOptionalString(value.date),
    paraId: readOptionalString(value.paraId),
    parentParaId: readOptionalString(value.parentParaId),
    text: readOptionalString(value.text),
    replies: parseCommentReplies(value.replies),
  }
}

/** Parsed token from text */
export type ParsedToken =
  | { type: 'text'; value: string }
  | { type: 'insStart'; data: SuggestionPayload }
  | { type: 'insEnd'; id: string }
  | { type: 'delStart'; data: SuggestionPayload }
  | { type: 'delEnd'; id: string }
  | { type: 'commentStart'; data: CommentPayload }
  | { type: 'commentEnd'; id: string }

/** Active suggestion state for nesting */
export interface ActiveSuggestion {
  id: string
  type: 'insert' | 'remove'
  author?: string
  date?: string
  revisionId: number
}

/** Comment stored in the document */
export interface StoredComment {
  id: number
  authorName: string
  authorInitials: string
  date?: string
  text: string
  /** 8-char uppercase hex ID < 0x7FFFFFFF, links comments.xml <-> commentsExtended.xml <-> commentsIds.xml */
  paraId: string
  /** 8-char uppercase hex ID < 0x7FFFFFFF, links commentsIds.xml <-> commentsExtensible.xml */
  durableId: string
  /** paraId of parent comment; present only on replies */
  parentParaId?: string
}

/** Tracking state maintained during document generation */
export interface TrackingState {
  suggestionStack: ActiveSuggestion[]
  replyIdsByParent: Map<string, string[]>
}

/** Interface for document instance with tracking support */
export interface TrackingDocumentInstance {
  _trackingState?: TrackingState
  comments: StoredComment[]
  commentIdMap: Map<string, number>
  lastCommentId: number
  revisionIdMap: Map<string, number>
  lastRevisionId: number
  ensureComment: (data: Partial<CommentPayload>, parentParaId?: string) => number
  getCommentId: (id: string) => number
  getRevisionId: (id?: string) => number
}

// ============================================================================
// Hex ID Generation (OOXML spec: 8-char uppercase hex < 0x7FFFFFFF)
// ============================================================================

/** Document-wide set of allocated hex IDs to ensure uniqueness (per R12). */
export const allocatedIds = new Set<string>()

/** Reset allocated IDs between documents. */
export function resetAllocatedIds(): void {
  allocatedIds.clear()
}

/** Buffer for secure random number generation */
const randomBuffer = new Uint32Array(1)

/** Generate a unique 8-char uppercase hex ID < 0x7FFFFFFF per OOXML spec. */
export function generateHexId(): string {
  let id: string = ''

  do {
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(randomBuffer)
      const val = randomBuffer[0] & 0x7f_ff_ff_ff
      // Valid range: [1, 0x7FFFFFFE]
      if (val > 0 && val < 0x7f_ff_ff_ff) {
        id = val.toString(16).toUpperCase().padStart(8, '0')
      }
    } else {
      const val = Math.floor(Math.random() * 0x7f_ff_ff_fe) + 1
      id = val.toString(16).toUpperCase().padStart(8, '0')
    }
  } while (!id || allocatedIds.has(id))

  allocatedIds.add(id)

  return id
}

// ============================================================================
// Token Constants
// ============================================================================

export const DOCX_INSERTION_START_TOKEN_PREFIX = '[[DOCX_INS_START:'
export const DOCX_INSERTION_END_TOKEN_PREFIX = '[[DOCX_INS_END:'
export const DOCX_INSERTION_TOKEN_SUFFIX = ']]'

export const DOCX_DELETION_START_TOKEN_PREFIX = '[[DOCX_DEL_START:'
export const DOCX_DELETION_END_TOKEN_PREFIX = '[[DOCX_DEL_END:'
export const DOCX_DELETION_TOKEN_SUFFIX = ']]'

export const DOCX_COMMENT_START_TOKEN_PREFIX = '[[DOCX_CMT_START:'
export const DOCX_COMMENT_END_TOKEN_PREFIX = '[[DOCX_CMT_END:'
export const DOCX_COMMENT_TOKEN_SUFFIX = ']]'

/** Regex to match all DOCX tracking tokens */
const DOCX_TOKEN_REGEX = /\[\[DOCX_(INS|DEL|CMT)_(START|END):(.+?)\]\]/g
const DOCX_TOKEN_REGEX_NON_GLOBAL = /\[\[DOCX_(INS|DEL|CMT)_(START|END):(.+?)\]\]/

// ============================================================================
// Token Parsing
// ============================================================================

/**
 * Parse a single DOCX token into a structured object.
 */
function parseDocxToken(
  kind: string,
  position: string,
  rawPayload: string
): ParsedToken | null {
  try {
    const decoded = decodeURIComponent(rawPayload)

    if (position === 'END') {
      if (!decoded) return null

      if (kind === 'CMT') {
        return { type: 'commentEnd', id: decoded }
      }
      if (kind === 'DEL') {
        return { type: 'delEnd', id: decoded }
      }
      return { type: 'insEnd', id: decoded }
    }

    const data = JSON.parse(decoded) as JsonValue

    if (kind === 'CMT') {
      const payload = parseCommentPayload(data)
      return payload ? { type: 'commentStart', data: payload } : null
    }
    if (kind === 'DEL') {
      const payload = parseSuggestionPayload(data)
      return payload ? { type: 'delStart', data: payload } : null
    }
    const payload = parseSuggestionPayload(data)
    return payload ? { type: 'insStart', data: payload } : null
  } catch {
    return null
  }
}

/**
 * Split text into an array of text segments and parsed tokens.
 */
export function splitDocxTrackingTokens(text: string): ParsedToken[] {
  const parts: ParsedToken[] = []
  let lastIndex = 0
  DOCX_TOKEN_REGEX.lastIndex = 0
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = DOCX_TOKEN_REGEX.exec(text)) !== null) {
    // Add text before this token
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    // Parse the token
    const token = parseDocxToken(match[1], match[2], match[3])
    if (token) {
      parts.push(token)
    } else {
      // If parsing fails, treat as text
      parts.push({ type: 'text', value: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts
}

/**
 * Check if text contains any DOCX tracking tokens.
 */
export function hasTrackingTokens(text: string): boolean {
  return DOCX_TOKEN_REGEX_NON_GLOBAL.test(text)
}

/**
 * Collect all tracking token strings from text.
 */
export function findDocxTrackingTokens(text: string): string[] {
  const tokens: string[] = []
  DOCX_TOKEN_REGEX.lastIndex = 0
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = DOCX_TOKEN_REGEX.exec(text)) !== null) {
    tokens.push(match[0])
  }

  return tokens
}

// ============================================================================
// Tracking State Management
// ============================================================================

/**
 * Ensure tracking state is initialized on the document instance.
 */
export function ensureTrackingState(
  docxDocumentInstance: TrackingDocumentInstance
): TrackingState {
  if (!docxDocumentInstance._trackingState) {
    docxDocumentInstance._trackingState = {
      suggestionStack: [],
      replyIdsByParent: new Map(),
    }
  }
  return docxDocumentInstance._trackingState
}

// ============================================================================
// XML Fragment Builders
// ============================================================================

/**
 * Build a text element for normal text.
 */
export function buildTextElement(text: string): XMLBuilder {
  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 't')
    .att('@xml', 'space', 'preserve')
    .txt(text)
    .up()
}

/**
 * Build a deleted text element (w:delText) for deletions.
 */
export function buildDeletedTextElement(text: string): XMLBuilder {
  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'delText')
    .att('@xml', 'space', 'preserve')
    .txt(text)
    .up()
}

/**
 * Build a comment range start marker.
 */
export function buildCommentRangeStart(id: number): XMLBuilder {
  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'commentRangeStart')
    .att('@w', 'id', String(id))
    .up()
}

/**
 * Build a comment range end marker.
 */
export function buildCommentRangeEnd(id: number): XMLBuilder {
  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'commentRangeEnd')
    .att('@w', 'id', String(id))
    .up()
}

/**
 * Build a comment reference run (appears after commentRangeEnd).
 */
export function buildCommentReferenceRun(id: number): XMLBuilder {
  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'r')
    .ele('@w', 'commentReference')
    .att('@w', 'id', String(id))
    .up()
    .up()
}

/**
 * Wrap a run fragment with a suggestion (w:ins or w:del).
 */
export function wrapRunWithSuggestion(
  runFragment: XMLBuilder,
  suggestion: ActiveSuggestion
): XMLBuilder {
  const tagName = suggestion.type === 'remove' ? 'del' : 'ins'
  const wrapper = fragment({ namespaceAlias: { w: namespaces.w } }).ele('@w', tagName)

  wrapper.att('@w', 'id', String(suggestion.revisionId))
  if (suggestion.author) {
    wrapper.att('@w', 'author', suggestion.author)
  }
  if (suggestion.date) {
    wrapper.att('@w', 'date', suggestion.date)
  }

  wrapper.import(runFragment)
  wrapper.up()

  return wrapper
}

// ============================================================================
// Token Building (for export from Plate)
// ============================================================================

/**
 * Build a suggestion start token string.
 */
export function buildSuggestionStartToken(
  payload: SuggestionPayload,
  type: 'insert' | 'remove'
): string {
  const encoded = encodeURIComponent(JSON.stringify(payload))
  const prefix =
    type === 'remove' ? DOCX_DELETION_START_TOKEN_PREFIX : DOCX_INSERTION_START_TOKEN_PREFIX
  const suffix =
    type === 'remove' ? DOCX_DELETION_TOKEN_SUFFIX : DOCX_INSERTION_TOKEN_SUFFIX
  return `${prefix}${encoded}${suffix}`
}

/**
 * Build a suggestion end token string.
 */
export function buildSuggestionEndToken(id: string, type: 'insert' | 'remove'): string {
  const encodedId = encodeURIComponent(id)
  const prefix =
    type === 'remove' ? DOCX_DELETION_END_TOKEN_PREFIX : DOCX_INSERTION_END_TOKEN_PREFIX
  const suffix =
    type === 'remove' ? DOCX_DELETION_TOKEN_SUFFIX : DOCX_INSERTION_TOKEN_SUFFIX
  return `${prefix}${encodedId}${suffix}`
}

/**
 * Build a comment start token string.
 */
export function buildCommentStartToken(payload: CommentPayload): string {
  const encoded = encodeURIComponent(JSON.stringify(payload))
  return `${DOCX_COMMENT_START_TOKEN_PREFIX}${encoded}${DOCX_COMMENT_TOKEN_SUFFIX}`
}

/**
 * Build a comment end token string.
 */
export function buildCommentEndToken(id: string): string {
  const encodedId = encodeURIComponent(id)
  return `${DOCX_COMMENT_END_TOKEN_PREFIX}${encodedId}${DOCX_COMMENT_TOKEN_SUFFIX}`
}
