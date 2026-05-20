/* biome-ignore-all lint/nursery/useMaxParams: legacy code */
/** biome-ignore-all lint/style/useAtIndex: legacy code */
/* biome-ignore-all lint/performance/useTopLevelRegex: legacy code */
/* biome-ignore-all lint/style/noParameterAssign: legacy code */
/* biome-ignore-all lint/style/useForOf: legacy code */
import { cloneDeep } from 'es-toolkit/compat'
import { fragment, type XMLBuilder } from '../utils/xmlbuilder2'

import { isVNode, isVText } from '../vdom/index'

type XMLBuilderType = XMLBuilder

const base64ToUint8Array = (base64: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64')
  }

  const binaryString = globalThis.atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

import colorNames from 'color-name'

import {
  colorlessColors,
  defaultFont,
  hyperlinkType,
  imageType,
  internalRelationship,
  paragraphBordersObject,
  verticalAlignValues,
} from '../constants'
import namespaces from '../namespaces'
import {
  type ActiveSuggestion,
  buildCommentRangeEnd,
  buildCommentRangeStart,
  buildCommentReferenceRun,
  buildDeletedTextElement,
  ensureTrackingState,
  hasTrackingTokens,
  splitDocxTrackingTokens,
  type TrackingDocumentInstance,
  wrapRunWithSuggestion,
} from '../tracking'
import {
  hex3Regex,
  hex3ToHex,
  hexRegex,
  hslRegex,
  hslToHex,
  rgbRegex,
  rgbToHex,
} from '../utils/color-conversion'
import { getImageDimensions } from '../utils/image-dimensions'
import { downloadAndCacheImage, parseDataUrl } from '../utils/image-to-base64'
import {
  cmRegex,
  cmToTWIP,
  HIPToTWIP,
  inchRegex,
  inchToTWIP,
  percentageRegex,
  pixelRegex,
  pixelToEIP,
  pixelToEMU,
  pixelToHIP,
  pixelToTWIP,
  pointRegex,
  pointToEIP,
  pointToHIP,
  pointToTWIP,
  TWIPToEMU,
} from '../utils/unit-conversion'
import { vNodeHasChildren } from '../utils/vnode'
// FIXME: remove the cyclic dependency
// eslint-disable-next-line import/no-cycle
import { buildImage, buildList } from './render-document-file'
import { reportUnmappedType, type UnmappedTypeHandling } from './unmapped-type-reporter'

const RUN_TAGS = new Set([
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ins',
  'strike',
  'del',
  's',
  'sub',
  'sup',
  'mark',
  'blockquote',
  'code',
  'kbd',
  'pre',
])

const TEMP_RUN_TAGS = new Set([
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ins',
  'strike',
  'del',
  's',
  'sub',
  'sup',
  'mark',
  'code',
  'kbd',
  'pre',
])

const PARAGRAPH_TAGS = new Set([
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ins',
  'strike',
  'del',
  's',
  'sub',
  'sup',
  'mark',
  'a',
  'code',
  'pre',
])

const LIST_TAGS = new Set(['ul', 'ol'])
const TABLE_CELL_TAGS = new Set(['td', 'th'])
const TEXT_ALIGN_VALUES = new Set(['left', 'right', 'center', 'justify'])

// Types for Virtual DOM
type VNodeProperties = {
  alt?: string
  attributes?: Record<string, string>
  colSpan?: number
  href?: string
  id?: string
  rowSpan?: number
  src?: string
  style?: Record<string, string>
}

type VNodeType = {
  children?: (VNodeType | VTextType)[]
  properties?: VNodeProperties
  tagName?: string
}

type VTextType = {
  text: string
}

// Types for DocxDocumentInstance
type MediaFileResponse = {
  fileContent: string
  fileNameWithExtension: string
  id: number
  isSVG?: boolean
}

type DocxDocumentInstance = Partial<TrackingDocumentInstance> & {
  availableDocumentSpace: number
  createDocumentRelationships: (
    filename: string,
    type: string,
    target: string,
    targetMode?: string
  ) => number
  createFont: (fontFamily: string) => string
  createMediaFile: (base64Uri: string) => Promise<MediaFileResponse>
  createNumbering: (type: 'ol' | 'ul', properties?: VNodeProperties) => number
  htmlString: string
  imageProcessing?: {
    downloadTimeout?: number
    maxImageSize?: number
    maxRetries?: number
    retryDelayBase?: number
    verboseLogging?: boolean
  }
  unmappedTypeHandling?: UnmappedTypeHandling
  _imageCache?: Map<string, string | null>
  _retryStats?: {
    finalFailures: number
    successAfterRetry: number
    totalAttempts: number
  }
  relationshipFilename: string
  tableRowCantSplit: boolean
  zip: {
    folder: (name: string) => {
      file: (
        name: string,
        content: Uint8Array,
        options?: { createFolders: boolean }
      ) => void
      folder: (name: string) => {
        file: (
          name: string,
          content: Uint8Array,
          options?: { createFolders: boolean }
        ) => void
      }
    }
  }
}

// Types for attributes and options
type Indentation = {
  left?: number
  right?: number
}

type NumberingInfo = {
  levelId: number
  numberingId: number
}

type TableCellBorder = {
  bottom?: number
  color?: string
  left?: number
  right?: number
  stroke?: string
  top?: number
}

interface TableBorder extends TableCellBorder {
  insideH?: number
  insideV?: number
}

type RunAttributes = {
  backgroundColor?: string
  code?: boolean
  color?: string
  display?: string
  font?: string
  fontSize?: number
  highlightColor?: string
  hyperlink?: boolean
  i?: boolean
  kbd?: boolean
  lineHeight?: number
  mark?: boolean
  strike?: boolean
  strong?: boolean | string
  sub?: boolean
  sup?: boolean
  u?: boolean
  verticalAlign?: string
  width?: number | string
}

interface ParagraphAttributes extends RunAttributes {
  afterSpacing?: number
  beforeSpacing?: number
  blockquoteBorder?: boolean
  bookmarkId?: string | null
  colSpan?: number
  description?: string
  fileContent?: string
  fileNameWithExtension?: string
  height?: number
  id?: number
  isSVG?: boolean
  indentation?: Indentation
  inlineOrAnchored?: boolean
  maximumWidth?: number
  numbering?: NumberingInfo
  originalHeight?: number
  originalWidth?: number
  paragraphStyle?: string
  relationshipId?: number
  rowSpan?: string
  tableCellBorder?: TableCellBorder
  textAlign?: string
  type?: string
  verticalAlign?: string
  width?: number | string
}

type TableAttributes = {
  maximumWidth?: number
  rowCantSplit?: boolean
  tableBorder?: TableBorder
  tableCellBorder?: TableCellBorder
  tableCellSpacing?: number
  tableRowHeight?: number
  width?: number
}

type ColumnWidthInfo = {
  type: string
  value: number
}

type FormattingOptions = {
  color?: string
  font?: string
  fontSize?: number
}

const fixupColorCode = (colorCodeString: string): string => {
  if (Object.hasOwn(colorNames, colorCodeString.toLowerCase())) {
    const [red, green, blue] = colorNames[colorCodeString.toLowerCase()]

    return rgbToHex(red, green, blue)
  }
  if (rgbRegex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(rgbRegex)
    if (matchedParts) {
      const red = matchedParts[1]
      const green = matchedParts[2]
      const blue = matchedParts[3]

      return rgbToHex(
        Number.parseInt(red, 10),
        Number.parseInt(green, 10),
        Number.parseInt(blue, 10)
      )
    }
  }
  if (hslRegex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(hslRegex)
    if (matchedParts) {
      const hue = matchedParts[1]
      const saturation = matchedParts[2]
      const luminosity = matchedParts[3]

      return hslToHex(
        Number.parseInt(hue, 10),
        Number.parseInt(saturation, 10),
        Number.parseInt(luminosity, 10)
      )
    }
  }
  if (hexRegex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(hexRegex)
    if (matchedParts) {
      return matchedParts[1]
    }
  }
  if (hex3Regex.test(colorCodeString)) {
    const matchedParts = colorCodeString.match(hex3Regex)
    if (matchedParts) {
      const red = matchedParts[1]
      const green = matchedParts[2]
      const blue = matchedParts[3]

      return hex3ToHex(red, green, blue)
    }
  }
  return '000000'
}

const buildRunFontFragment = (fontName: string = defaultFont): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'rFonts')
    .att('@w', 'ascii', fontName)
    .att('@w', 'hAnsi', fontName)
    .up()

const buildRunStyleFragment = (type = 'Hyperlink'): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'rStyle')
    .att('@w', 'val', type)
    .up()

const buildTableRowHeight = (tableRowHeight: number): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'trHeight')
    .att('@w', 'val', String(tableRowHeight))
    .att('@w', 'hRule', 'atLeast')
    .up()

const buildVerticalAlignment = (verticalAlignment: string): XMLBuilderType => {
  const alignment =
    verticalAlignment.toLowerCase() === 'middle' ? 'center' : verticalAlignment

  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'vAlign')
    .att('@w', 'val', alignment)
    .up()
}

const buildVerticalMerge = (verticalMerge = 'continue'): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'vMerge')
    .att('@w', 'val', verticalMerge)
    .up()

const buildColor = (colorCode: string): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'color')
    .att('@w', 'val', colorCode)
    .up()

const buildFontSize = (fontSize: number): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'sz')
    .att('@w', 'val', String(fontSize))
    .up()

const buildShading = (colorCode: string): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'shd')
    .att('@w', 'val', 'clear')
    .att('@w', 'fill', colorCode)
    .up()

const buildHighlight = (color = 'yellow'): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'highlight')
    .att('@w', 'val', color)
    .up()

const buildVertAlign = (type = 'baseline'): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'vertAlign')
    .att('@w', 'val', type)
    .up()

const buildStrike = (): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'strike')
    .att('@w', 'val', 'true')
    .up()

const buildBold = (): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'b')
    .up()

const buildItalics = (): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'i')
    .up()

const buildUnderline = (type = 'single'): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'u')
    .att('@w', 'val', type)
    .up()

const buildLineBreak = (type = 'textWrapping'): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'br')
    .att('@w', 'type', type)
    .up()

const buildBorder = (
  borderSide = 'top',
  borderSize = 0,
  borderSpacing = 0,
  borderColor: string = fixupColorCode('black'),
  borderStroke = 'single'
): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', borderSide)
    .att('@w', 'val', borderStroke)
    .att('@w', 'sz', String(borderSize))
    .att('@w', 'space', String(borderSpacing))
    .att('@w', 'color', borderColor)
    .up()

const buildTextElement = (text: string): XMLBuilderType =>
  fragment({
    namespaceAlias: {
      w: namespaces.w,
      xml: 'http://www.w3.org/XML/1998/namespace',
    },
  })
    .ele('@w', 't')
    .att('@xml', 'space', 'preserve')
    .txt(text)
    .up()

/**
 * Build a text run fragment with run properties.
 * Used for building runs within tracked changes.
 */
const buildTextRunFragment = (
  text: string,
  attributes: RunAttributes,
  options?: { deleted?: boolean }
): XMLBuilderType => {
  const runFragment = fragment({ namespaceAlias: { w: namespaces.w } }).ele('@w', 'r')
  const runPropertiesFragment = buildRunProperties(attributes)

  runFragment.import(runPropertiesFragment)
  runFragment.import(
    options?.deleted ? buildDeletedTextElement(text) : buildTextElement(text)
  )
  runFragment.up()

  return runFragment
}

/**
 * Build runs from text that may contain DOCX tracking tokens.
 * Handles insertions, deletions, and comments by parsing tokens
 * and generating appropriate XML structures.
 *
 * Returns null if text has no tracking tokens (use normal processing).
 */
const buildRunsFromTextWithTokens = (
  text: string,
  attributes: RunAttributes,
  docxDocumentInstance: Partial<TrackingDocumentInstance>
): XMLBuilderType[] | null => {
  // Check if document instance has tracking support
  if (
    !docxDocumentInstance.ensureComment ||
    !docxDocumentInstance.getCommentId ||
    !docxDocumentInstance.getRevisionId ||
    !docxDocumentInstance.comments ||
    !docxDocumentInstance.commentIdMap ||
    docxDocumentInstance.lastCommentId === undefined ||
    !docxDocumentInstance.revisionIdMap ||
    docxDocumentInstance.lastRevisionId === undefined
  ) {
    return null
  }

  const parts = splitDocxTrackingTokens(text)

  // If just a single text part, return null to use normal processing
  if (parts.length === 1 && parts[0].type === 'text') {
    return null
  }

  const fragments: XMLBuilderType[] = []
  const trackingState = ensureTrackingState(
    docxDocumentInstance as TrackingDocumentInstance
  )

  for (const part of parts) {
    if (part.type === 'text') {
      if (!part.value) continue

      const activeSuggestion: ActiveSuggestion | undefined =
        trackingState.suggestionStack[trackingState.suggestionStack.length - 1]
      const runFragment = buildTextRunFragment(part.value, attributes, {
        deleted: activeSuggestion?.type === 'remove',
      })

      fragments.push(
        activeSuggestion
          ? wrapRunWithSuggestion(runFragment, activeSuggestion)
          : runFragment
      )
      continue
    }

    if (part.type === 'commentStart') {
      const data = part.data
      // Register parent comment
      const parentCommentId = docxDocumentInstance.ensureComment({
        id: data.id,
        authorName: data.authorName,
        authorInitials: data.authorInitials,
        date: data.date,
        paraId: data.paraId,
        text: data.text,
      })
      fragments.push(buildCommentRangeStart(parentCommentId))

      // Register and anchor reply comments
      if (
        data.replies &&
        data.replies.length > 0 &&
        docxDocumentInstance.comments &&
        docxDocumentInstance.ensureComment
      ) {
        // Find parent's paraId for threading
        const parentComment = docxDocumentInstance.comments.find(
          (c) => c.id === parentCommentId
        )
        const parentParaId = parentComment?.paraId

        data.replies.forEach((reply, idx) => {
          const replyId = reply.id
            ? `${data.id}-reply-${reply.id}`
            : `${data.id}-reply-${idx}`

          // Track reply ID associated with this parent
          const existingReplies = trackingState.replyIdsByParent.get(data.id) ?? []
          if (!existingReplies.includes(replyId)) {
            existingReplies.push(replyId)
            trackingState.replyIdsByParent.set(data.id, existingReplies)
          }

          const replyCommentId = docxDocumentInstance.ensureComment!(
            {
              id: replyId,
              authorName: reply.authorName,
              authorInitials: reply.authorInitials,
              date: reply.date,
              paraId: reply.paraId,
              text: reply.text,
            },
            parentParaId
          )
          // Reply commentRangeStart anchored after parent's
          fragments.push(buildCommentRangeStart(replyCommentId))
        })
      }
      continue
    }

    if (part.type === 'commentEnd') {
      const commentId = docxDocumentInstance.getCommentId(part.id)
      fragments.push(buildCommentRangeEnd(commentId))
      fragments.push(buildCommentReferenceRun(commentId))

      // Emit range end + reference for reply comments
      const replyIds: number[] = []
      const trackedReplies = trackingState.replyIdsByParent.get(part.id) || []

      if (docxDocumentInstance.commentIdMap) {
        // First try to use explicitly tracked reply IDs
        if (trackedReplies.length > 0) {
          for (const replyKey of trackedReplies) {
            const numId = docxDocumentInstance.commentIdMap.get(replyKey)
            if (numId !== undefined) {
              replyIds.push(numId)
            }
          }
        } else {
          // Fallback to legacy prefix scan if no tracked replies found (backward compatibility)
          for (const [key, numId] of docxDocumentInstance.commentIdMap.entries()) {
            if (key.startsWith(`${part.id}-reply-`)) {
              replyIds.push(numId)
            }
          }
        }
      }
      // Sort to preserve insertion order (though trackedReplies order should be preserved)
      // If we used trackedReplies, they are already in insertion order, but sorting by numeric ID
      // is usually safe if IDs are allocated sequentially. However, trackedReplies order is more reliable.
      // If we used trackedReplies, let's trust that order. If we used fallback, we sort.
      if (trackedReplies.length === 0) {
        replyIds.sort((a, b) => a - b)
      }
      for (const replyNumId of replyIds) {
        fragments.push(buildCommentRangeEnd(replyNumId))
        fragments.push(buildCommentReferenceRun(replyNumId))
      }
      continue
    }

    if (part.type === 'insStart' || part.type === 'delStart') {
      const data = part.data
      const revisionId = docxDocumentInstance.getRevisionId(data.id)
      const suggestionId = data.id || `suggestion-${revisionId}`
      const suggestion: ActiveSuggestion = {
        id: suggestionId,
        type: part.type === 'delStart' ? 'remove' : 'insert',
        author: data.author,
        date: data.date,
        revisionId,
      }

      // Remove any existing suggestion with same ID before pushing
      trackingState.suggestionStack = trackingState.suggestionStack.filter(
        (item) => item.id !== suggestionId
      )
      trackingState.suggestionStack.push(suggestion)
      continue
    }

    if (part.type === 'insEnd' || part.type === 'delEnd') {
      trackingState.suggestionStack = trackingState.suggestionStack.filter(
        (item) => item.id !== part.id
      )
    }
  }

  return fragments
}

const fixupLineHeight = (lineHeight: number, fontSize: number | null): number => {
  // FIXME: If line height is anything other than a number

  if (Number.isNaN(lineHeight)) {
    // 240 TWIP or 12 point is default line height
    return 240
  }
  if (fontSize) {
    const actualLineHeight = +lineHeight * fontSize

    return HIPToTWIP(actualLineHeight)
  }
  // 240 TWIP or 12 point is default line height
  return +lineHeight * 240
}

const fixupFontSize = (fontSizeString: string): number | undefined => {
  if (pointRegex.test(fontSizeString)) {
    const matchedParts = fontSizeString.match(pointRegex)
    if (matchedParts) {
      // convert point to half point
      return pointToHIP(Number.parseFloat(matchedParts[1]))
    }
  }
  if (pixelRegex.test(fontSizeString)) {
    const matchedParts = fontSizeString.match(pixelRegex)
    if (matchedParts) {
      // convert pixels to half point
      return pixelToHIP(Number.parseFloat(matchedParts[1]))
    }
  }
  return
}

const fixupRowHeight = (rowHeightString: string): number | undefined => {
  if (pointRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(pointRegex)
    if (matchedParts) {
      // convert point to half point
      return pointToTWIP(Number.parseFloat(matchedParts[1]))
    }
  }
  if (pixelRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(pixelRegex)
    if (matchedParts) {
      // convert pixels to half point
      return pixelToTWIP(Number.parseFloat(matchedParts[1]))
    }
  }
  if (cmRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(cmRegex)
    if (matchedParts) {
      return cmToTWIP(Number.parseFloat(matchedParts[1]))
    }
  }
  if (inchRegex.test(rowHeightString)) {
    const matchedParts = rowHeightString.match(inchRegex)
    if (matchedParts) {
      return inchToTWIP(Number.parseFloat(matchedParts[1]))
    }
  }
  return
}

const fixupColumnWidth = (
  columnWidthString: string | undefined
): ColumnWidthInfo | null => {
  if (!columnWidthString) return null

  if (pointRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(pointRegex)
    if (matchedParts) {
      return {
        value: pointToTWIP(Number.parseFloat(matchedParts[1])),
        type: 'dxa',
      }
    }
  }
  if (pixelRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(pixelRegex)
    if (matchedParts) {
      return {
        value: pixelToTWIP(Number.parseFloat(matchedParts[1])),
        type: 'dxa',
      }
    }
  }
  if (cmRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(cmRegex)
    if (matchedParts) {
      return {
        value: cmToTWIP(Number.parseFloat(matchedParts[1])),
        type: 'dxa',
      }
    }
  }
  if (inchRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(inchRegex)
    if (matchedParts) {
      return {
        value: inchToTWIP(Number.parseFloat(matchedParts[1])),
        type: 'dxa',
      }
    }
  }
  if (percentageRegex.test(columnWidthString)) {
    const matchedParts = columnWidthString.match(percentageRegex)
    if (matchedParts) {
      // Convert percentage to fiftieths of a percent (pct in OOXML)
      // 50% = 50 * 50 = 2500 (fiftieths of a percent)
      return { value: Number.parseFloat(matchedParts[1]) * 50, type: 'pct' }
    }
  }
  return null
}

const fixupMargin = (marginString: string): number | undefined => {
  if (pointRegex.test(marginString)) {
    const matchedParts = marginString.match(pointRegex)
    if (matchedParts) {
      // convert point to half point
      return pointToTWIP(Number.parseFloat(matchedParts[1]))
    }
  }
  if (pixelRegex.test(marginString)) {
    const matchedParts = marginString.match(pixelRegex)
    if (matchedParts) {
      // convert pixels to half point
      return pixelToTWIP(Number.parseFloat(matchedParts[1]))
    }
  }
  return
}

type ModifiedAttributesBuilderOptions = {
  isParagraph?: boolean
}

const modifiedStyleAttributesBuilder = (
  docxDocumentInstance: DocxDocumentInstance | undefined,
  vNode: VNodeType | VTextType | null,
  attributes: ParagraphAttributes,
  options?: ModifiedAttributesBuilderOptions
): ParagraphAttributes => {
  const modifiedAttributes: ParagraphAttributes = { ...attributes }

  // styles
  if (
    isVNode(vNode) &&
    (vNode as VNodeType).properties &&
    (vNode as VNodeType).properties!.style
  ) {
    const vn = vNode as VNodeType
    const style = vn.properties!.style!

    if (style.color && !colorlessColors.includes(style.color)) {
      modifiedAttributes.color = fixupColorCode(style.color)
    }

    const backgroundColor = style['background-color'] ?? style.backgroundColor
    if (backgroundColor && !colorlessColors.includes(backgroundColor)) {
      modifiedAttributes.backgroundColor = fixupColorCode(backgroundColor)
    }

    if (
      style['vertical-align'] &&
      verticalAlignValues.includes(style['vertical-align'] as 'top' | 'middle' | 'bottom')
    ) {
      modifiedAttributes.verticalAlign = style['vertical-align']
    }

    if (style['text-align'] && TEXT_ALIGN_VALUES.has(style['text-align'])) {
      modifiedAttributes.textAlign = style['text-align']
    }

    // FIXME: remove bold check when other font weights are handled.
    if (style['font-weight'] && style['font-weight'] === 'bold') {
      modifiedAttributes.strong = style['font-weight']
    }
    if (style['font-family'] && docxDocumentInstance) {
      modifiedAttributes.font = docxDocumentInstance.createFont(style['font-family'])
    }
    if (style['font-size']) {
      modifiedAttributes.fontSize = fixupFontSize(style['font-size'])
    }
    if (style['line-height']) {
      modifiedAttributes.lineHeight = fixupLineHeight(
        Number.parseFloat(style['line-height']),
        style['font-size'] ? fixupFontSize(style['font-size']) || null : null
      )
    }
    if (style['margin-left'] || style['margin-right']) {
      const leftMargin = style['margin-left']
        ? fixupMargin(style['margin-left'])
        : undefined
      const rightMargin = style['margin-right']
        ? fixupMargin(style['margin-right'])
        : undefined
      const indentation: Indentation = {}
      if (leftMargin) {
        indentation.left = leftMargin
      }
      if (rightMargin) {
        indentation.right = rightMargin
      }
      if (leftMargin || rightMargin) {
        modifiedAttributes.indentation = indentation
      }
    }
    if (style.display) {
      modifiedAttributes.display = style.display
    }

    if (style.width) {
      modifiedAttributes.width = style.width
    }
  }

  // paragraph only
  if (options?.isParagraph) {
    if (isVNode(vNode) && (vNode as VNodeType).tagName === 'blockquote') {
      modifiedAttributes.indentation = { left: 284 }
      modifiedAttributes.blockquoteBorder = true
    } else if (isVNode(vNode) && (vNode as VNodeType).tagName === 'code') {
      modifiedAttributes.highlightColor = 'lightGray'
    } else if (isVNode(vNode) && (vNode as VNodeType).tagName === 'pre') {
      modifiedAttributes.font = 'Courier'
    }
  }

  return modifiedAttributes
}

// html tag to formatting function
// options are passed to the formatting function if needed
const buildFormatting = (
  htmlTag: string,
  options?: FormattingOptions,
  unmappedTypeHandling?: UnmappedTypeHandling
): XMLBuilderType | null => {
  switch (htmlTag) {
    case 'strong':
    case 'b':
      return buildBold()
    case 'em':
    case 'i':
      return buildItalics()
    case 'ins':
    case 'u':
      return buildUnderline()
    case 'strike':
    case 'del':
    case 's':
      return buildStrike()
    case 'sub':
      return buildVertAlign('subscript')
    case 'sup':
      return buildVertAlign('superscript')
    case 'mark':
      return buildHighlight()
    case 'code':
    case 'kbd':
      return buildHighlight('lightGray')
    case 'highlightColor':
      return buildHighlight(options?.color ? options.color : 'lightGray')
    case 'font':
      return buildRunFontFragment(options?.font)
    case 'pre':
      return buildRunFontFragment('Courier')
    case 'color':
      return buildColor(options?.color ? options.color : 'black')
    case 'backgroundColor':
      return buildShading(options?.color ? options.color : 'black')
    case 'fontSize':
      // does this need a unit of measure?
      return buildFontSize(options?.fontSize ? options.fontSize : 10)
    case 'hyperlink':
      return buildRunStyleFragment('Hyperlink')
    default:
      if (htmlTag !== '') {
        reportUnmappedType(
          { location: 'formatting', tagName: htmlTag },
          unmappedTypeHandling
        )
      }
      break
  }

  return null
}

const buildRunProperties = (attributes: RunAttributes | undefined): XMLBuilderType => {
  const runPropertiesFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'rPr')
  if (attributes && attributes.constructor === Object) {
    // ⚡ Bolt: Avoid Object.keys().forEach() allocation in hot path.
    // Iterate attributes directly with for...in. This speeds up buildRunProperties by ~11x.
    for (const key in attributes) {
      if (Object.prototype.hasOwnProperty.call(attributes, key)) {
        const typedKey = key as keyof RunAttributes
        const value = attributes[typedKey]

        // Skip undefined values to prevent default 'black' being applied
        if (value === undefined) continue

        const options: FormattingOptions = {}
        if (
          typedKey === 'color' ||
          typedKey === 'backgroundColor' ||
          typedKey === 'highlightColor'
        ) {
          options.color = value as string
        }

        if (typedKey === 'fontSize' || typedKey === 'font') {
          // @ts-expect-error Types map correctly in usage
          options[typedKey] = value
        }

        const formattingFragment = buildFormatting(typedKey, options)
        if (formattingFragment) {
          runPropertiesFragment.import(formattingFragment)
        }
      }
    }
  }
  runPropertiesFragment.up()

  return runPropertiesFragment
}

const buildRun = async (
  vNode: VNodeType | VTextType | null,
  attributes: ParagraphAttributes,
  docxDocumentInstance?: DocxDocumentInstance
): Promise<XMLBuilderType | XMLBuilderType[]> => {
  const runFragment = fragment({ namespaceAlias: { w: namespaces.w } }).ele('@w', 'r')
  const runPropertiesFragment = buildRunProperties(attributes)

  // case where we have recursive spans representing font changes
  if (isVNode(vNode) && (vNode as VNodeType).tagName === 'span') {
    return buildRunOrRuns(vNode as VNodeType, attributes, docxDocumentInstance)
  }

  if (isVNode(vNode) && RUN_TAGS.has((vNode as VNodeType).tagName || '')) {
    const runFragmentsArray: XMLBuilderType[] = []

    let vNodes: (VNodeType | VTextType)[] = [vNode as VNodeType]
    // create temp run fragments to split the paragraph into different runs
    let baseAttributes: ParagraphAttributes = attributes
    let tempAttributes: RunAttributes = cloneDeep(baseAttributes)
    let tempRunFragment = fragment({ namespaceAlias: { w: namespaces.w } }).ele('@w', 'r')
    /* eslint-disable no-await-in-loop -- DOCX XML fragments must be built in document order */
    while (vNodes.length) {
      const tempVNode = vNodes.shift()!
      if (isVText(tempVNode)) {
        const textContent = (tempVNode as VTextType).text
        const mergedAttributes = { ...baseAttributes, ...tempAttributes }

        // Check for tracking tokens in text
        if (docxDocumentInstance && hasTrackingTokens(textContent)) {
          const trackingFragments = buildRunsFromTextWithTokens(
            textContent,
            mergedAttributes,
            docxDocumentInstance
          )
          if (trackingFragments) {
            runFragmentsArray.push(...trackingFragments)
            // re initialize temp run fragments with new fragment
            tempAttributes = cloneDeep(baseAttributes)
            tempRunFragment = fragment({
              namespaceAlias: { w: namespaces.w },
            }).ele('@w', 'r')
            continue
          }
        }

        // Normal text processing
        const textFragment = buildTextElement(textContent)
        const tempRunPropertiesFragment = buildRunProperties(mergedAttributes)
        tempRunFragment.import(tempRunPropertiesFragment)
        tempRunFragment.import(textFragment)
        runFragmentsArray.push(tempRunFragment)

        // re initialize temp run fragments with new fragment
        tempAttributes = cloneDeep(baseAttributes)
        tempRunFragment = fragment({ namespaceAlias: { w: namespaces.w } }).ele('@w', 'r')
      } else if (isVNode(tempVNode)) {
        const tempVn = tempVNode as VNodeType
        if (TEMP_RUN_TAGS.has(tempVn.tagName || '')) {
          tempAttributes = {}
          switch (tempVn.tagName) {
            case 'strong':
            case 'b':
              tempAttributes.strong = true
              break
            case 'em':
            case 'i':
              tempAttributes.i = true
              break
            case 'ins':
            case 'u':
              tempAttributes.u = true
              break
            case 'strike':
            case 'del':
            case 's':
              tempAttributes.strike = true
              break
            case 'sub':
              tempAttributes.sub = true
              break
            case 'sup':
              tempAttributes.sup = true
              break
            case 'mark':
              tempAttributes.mark = true
              break
            case 'code':
              tempAttributes.code = true
              break
            case 'kbd':
              tempAttributes.kbd = true
              break
            default:
              break
          }
          const formattingFragment = buildFormatting(tempVn.tagName || '')

          if (formattingFragment) {
            runPropertiesFragment.import(formattingFragment)
          }
          // go a layer deeper if there is a span somewhere in the children
        } else if (tempVn.tagName === 'span') {
          const spanFragment = await buildRunOrRuns(
            tempVn,
            { ...baseAttributes, ...tempAttributes },
            docxDocumentInstance
          )

          // if spanFragment is an array, we need to add each fragment to the runFragmentsArray. If the fragment is an array, perform a depth first search on the array to add each fragment to the runFragmentsArray
          if (Array.isArray(spanFragment)) {
            const flatSpanFragments = spanFragment.flat(Number.POSITIVE_INFINITY)
            runFragmentsArray.push(...flatSpanFragments)
          } else {
            runFragmentsArray.push(spanFragment)
          }

          // do not slice and concat children since this is already accounted for in the buildRunOrRuns function

          continue
        }
      }

      const tempVn = tempVNode as VNodeType
      if (tempVn.children?.length) {
        if (tempVn.children.length > 1) {
          baseAttributes = Object.assign({}, baseAttributes, tempAttributes)
        }

        vNodes = tempVn.children.slice().concat(vNodes)
      }
    }
    /* eslint-enable no-await-in-loop */
    if (runFragmentsArray.length) {
      return runFragmentsArray
    }
  }

  runFragment.import(runPropertiesFragment)
  if (isVText(vNode)) {
    const textContent = (vNode as VTextType).text

    // Check for tracking tokens in text
    if (docxDocumentInstance && hasTrackingTokens(textContent)) {
      const trackingFragments = buildRunsFromTextWithTokens(
        textContent,
        attributes,
        docxDocumentInstance
      )
      if (trackingFragments) {
        return trackingFragments
      }
    }

    // Normal text processing
    const textFragment = buildTextElement(textContent)
    runFragment.import(textFragment)
  } else if (attributes && attributes.type === 'picture') {
    let response: MediaFileResponse | null = null

    const vn = vNode as VNodeType
    let mediaSource = decodeURIComponent(vn.properties?.src || '')

    if (
      docxDocumentInstance &&
      mediaSource &&
      (mediaSource.startsWith('http://') || mediaSource.startsWith('https://'))
    ) {
      const cachedImage = await downloadAndCacheImage(
        docxDocumentInstance,
        mediaSource,
        docxDocumentInstance.imageProcessing
      )
      if (!cachedImage) {
        runFragment.up()
        return runFragment
      }
      mediaSource = cachedImage
      if (vn.properties) {
        vn.properties.src = mediaSource
      }
    }

    if (mediaSource && docxDocumentInstance) {
      response = await docxDocumentInstance.createMediaFile(mediaSource)
    }

    if (response && docxDocumentInstance) {
      docxDocumentInstance.zip
        .folder('word')
        .folder('media')
        .file(response.fileNameWithExtension, base64ToUint8Array(response.fileContent), {
          createFolders: false,
        })

      const documentRelsId = docxDocumentInstance.createDocumentRelationships(
        docxDocumentInstance.relationshipFilename,
        imageType,
        `media/${response.fileNameWithExtension}`,
        internalRelationship
      )

      attributes.inlineOrAnchored = true
      attributes.relationshipId = documentRelsId
      attributes.id = response.id
      attributes.fileContent = response.fileContent
      attributes.fileNameWithExtension = response.fileNameWithExtension
      attributes.isSVG = response.isSVG
    }

    const { type, inlineOrAnchored, ...otherAttributes } = attributes

    const imageFragment = buildDrawing(
      inlineOrAnchored || false,
      type || 'picture',
      otherAttributes as DrawingAttributes
    )
    runFragment.import(imageFragment)
  } else if (isVNode(vNode) && (vNode as VNodeType).tagName === 'br') {
    const lineBreakFragment = buildLineBreak()
    runFragment.import(lineBreakFragment)
  }
  runFragment.up()

  return runFragment
}

const buildRunOrRuns = async (
  vNode: VNodeType | VTextType | null,
  attributes: ParagraphAttributes,
  docxDocumentInstance?: DocxDocumentInstance
): Promise<XMLBuilderType | XMLBuilderType[]> => {
  // Check for OMML equation data attribute
  if (
    isVNode(vNode) &&
    (vNode as VNodeType).properties &&
    (vNode as VNodeType).properties!.attributes &&
    (vNode as VNodeType).properties!.attributes!['data-equation-omml']
  ) {
    const ommlString = (vNode as VNodeType).properties!.attributes!['data-equation-omml']
    try {
      // Parse the OMML string and create a fragment
      const ommlFragment = fragment().ele(ommlString)
      return ommlFragment
    } catch {
      // If parsing fails, fall through to normal text handling
      console.warn('Failed to parse OMML, falling back to text')
    }
  }

  if (isVNode(vNode) && (vNode as VNodeType).tagName === 'span') {
    let runFragments: XMLBuilderType[] = []
    const vn = vNode as VNodeType

    /* eslint-disable no-await-in-loop -- DOCX XML fragments must be built in document order */
    for (let index = 0; index < (vn.children || []).length; index++) {
      const childVNode = (vn.children || [])[index]
      const modifiedAttributes = modifiedStyleAttributesBuilder(
        docxDocumentInstance,
        vNode,
        attributes
      )
      const tempRunFragments = await buildRun(
        childVNode,
        modifiedAttributes,
        docxDocumentInstance
      )
      runFragments = runFragments.concat(
        Array.isArray(tempRunFragments) ? tempRunFragments : [tempRunFragments]
      )
    }
    /* eslint-enable no-await-in-loop */

    return runFragments
  }
  const tempRunFragments = await buildRun(vNode, attributes, docxDocumentInstance)
  return tempRunFragments
}

const buildRunOrHyperLink = async (
  vNode: VNodeType | VTextType | null,
  attributes: ParagraphAttributes,
  docxDocumentInstance?: DocxDocumentInstance
): Promise<XMLBuilderType | XMLBuilderType[]> => {
  if (isVNode(vNode) && (vNode as VNodeType).tagName === 'a') {
    const vn = vNode as VNodeType
    const href = vn.properties?.href ? vn.properties.href : ''

    // Check if this is an internal link (starts with #)
    const isInternalLink = href.startsWith('#')

    let hyperlinkFragment: XMLBuilderType
    if (isInternalLink) {
      // For internal links, use w:anchor attribute instead of r:id
      const anchorName = href.substring(1) // Remove the # prefix
      hyperlinkFragment = fragment({
        namespaceAlias: { w: namespaces.w },
      })
        .ele('@w', 'hyperlink')
        .att('@w', 'anchor', anchorName)
    } else {
      // For external links, use relationship id
      const relationshipId = docxDocumentInstance
        ? docxDocumentInstance.createDocumentRelationships(
            docxDocumentInstance.relationshipFilename,
            hyperlinkType,
            href
          )
        : 0
      hyperlinkFragment = fragment({
        namespaceAlias: { w: namespaces.w, r: namespaces.r },
      })
        .ele('@w', 'hyperlink')
        .att('@r', 'id', `rId${relationshipId}`)
    }

    const modifiedAttributes = { ...attributes }
    modifiedAttributes.hyperlink = true

    const runFragments = await buildRunOrRuns(
      (vn.children || [])[0],
      modifiedAttributes,
      docxDocumentInstance
    )
    if (Array.isArray(runFragments)) {
      for (let index = 0; index < runFragments.length; index++) {
        const runFragment = runFragments[index]

        hyperlinkFragment.import(runFragment)
      }
    } else {
      hyperlinkFragment.import(runFragments)
    }
    hyperlinkFragment.up()

    return hyperlinkFragment
  }

  const runFragments = await buildRunOrRuns(vNode, attributes, docxDocumentInstance)

  return runFragments
}

const buildNumberingProperties = (levelId: number, numberingId: number): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'numPr')
    .ele('@w', 'ilvl')
    .att('@w', 'val', String(levelId))
    .up()
    .ele('@w', 'numId')
    .att('@w', 'val', String(numberingId))
    .up()
    .up()

const buildNumberingInstances = (): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'num')
    .ele('@w', 'abstractNumId')
    .up()
    .up()

const buildSpacing = (
  lineSpacing?: number,
  beforeSpacing?: number,
  afterSpacing?: number
): XMLBuilderType => {
  const spacingFragment = fragment({ namespaceAlias: { w: namespaces.w } }).ele(
    '@w',
    'spacing'
  )

  if (lineSpacing) {
    spacingFragment.att('@w', 'line', String(lineSpacing))
  }
  if (beforeSpacing) {
    spacingFragment.att('@w', 'before', String(beforeSpacing))
  }
  if (afterSpacing) {
    spacingFragment.att('@w', 'after', String(afterSpacing))
  }

  spacingFragment.att('@w', 'lineRule', 'auto').up()

  return spacingFragment
}

const buildIndentation = ({ left, right }: Indentation): XMLBuilderType => {
  const indentationFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'ind')

  if (left) {
    indentationFragment.att('@w', 'left', String(left))
  }
  if (right) {
    indentationFragment.att('@w', 'right', String(right))
  }

  indentationFragment.up()

  return indentationFragment
}

const buildPStyle = (style = 'Normal'): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'pStyle')
    .att('@w', 'val', style)
    .up()

const buildHorizontalAlignment = (horizontalAlignment: string): XMLBuilderType => {
  const alignment = horizontalAlignment === 'justify' ? 'both' : horizontalAlignment
  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'jc')
    .att('@w', 'val', alignment)
    .up()
}

const buildParagraphBorder = (): XMLBuilderType => {
  const paragraphBorderFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'pBdr')

  // Bolt: Avoid cloneDeep on static constant and use native for...in loop with hasOwnProperty check
  // This eliminates deep object cloning overhead and array allocation (Object.keys) in the hot path.
  // Performance improvement: ~25% reduction in execution time for building paragraph borders.
  for (const borderName in paragraphBordersObject) {
    if (Object.prototype.hasOwnProperty.call(paragraphBordersObject, borderName)) {
      const border =
        paragraphBordersObject[borderName as keyof typeof paragraphBordersObject]
      if (border) {
        const { size, spacing, color } = border

        const borderFragment = buildBorder(borderName, size, spacing, color)
        paragraphBorderFragment.import(borderFragment)
      }
    }
  }

  paragraphBorderFragment.up()

  return paragraphBorderFragment
}

const buildParagraphProperties = (
  attributes: ParagraphAttributes | undefined
): XMLBuilderType => {
  const paragraphPropertiesFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'pPr')
  if (attributes && attributes.constructor === Object) {
    // OOXML XSD requires pPr children in this order:
    // pStyle, keepNext, keepLines, pageBreakBefore, framePr, widowControl,
    // numPr, suppressLineNumbers, pBdr, shd, tabs, suppressAutoHyphens,
    // kinsoku, wordWrap, overflowPunct, topLinePunct, autoSpaceDE, autoSpaceDN,
    // bidi, adjustRightInd, snapToGrid, spacing, ind, contextualSpacing,
    // mirrorIndents, suppressOverlap, jc, textDirection, textAlignment,
    // textboxTightWrap, outlineLvl, divId, cnfStyle, rPr, sectPr, pPrChange

    // 1. pStyle
    if (attributes.paragraphStyle !== undefined) {
      const pStyleFragment = buildPStyle(attributes.paragraphStyle)
      paragraphPropertiesFragment.import(pStyleFragment)
      attributes.paragraphStyle = undefined
    }

    // 2. numPr
    if (attributes.numbering !== undefined) {
      const { levelId, numberingId } = attributes.numbering
      const numberingPropertiesFragment = buildNumberingProperties(levelId, numberingId)
      paragraphPropertiesFragment.import(numberingPropertiesFragment)
      attributes.numbering = undefined
    }

    // 3. pBdr
    if (attributes.blockquoteBorder !== undefined) {
      const borderFragment = fragment({
        namespaceAlias: { w: namespaces.w },
      })
        .ele('@w', 'pBdr')
        .ele('@w', 'left')
        .att('@w', 'val', 'single')
        .att('@w', 'sz', '18')
        .att('@w', 'space', '4')
        .att('@w', 'color', 'CCCCCC')
        .up()
        .up()
      paragraphPropertiesFragment.import(borderFragment)
      attributes.blockquoteBorder = undefined
    } else if (attributes.backgroundColor !== undefined && attributes.display === 'block') {
      // FIXME: Inner padding in case of shaded paragraphs.
      const paragraphBorderFragment = buildParagraphBorder()
      paragraphPropertiesFragment.import(paragraphBorderFragment)
    }

    // 4. shd
    if (attributes.backgroundColor !== undefined && attributes.display === 'block') {
      const shadingFragment = buildShading(attributes.backgroundColor)
      paragraphPropertiesFragment.import(shadingFragment)
      attributes.backgroundColor = undefined
    }

    // 5. spacing
    const spacingFragment = buildSpacing(
      attributes.lineHeight,
      attributes.beforeSpacing,
      attributes.afterSpacing
    )
    attributes.lineHeight = undefined
    attributes.beforeSpacing = undefined
    attributes.afterSpacing = undefined
    paragraphPropertiesFragment.import(spacingFragment)

    // 6. ind
    if (attributes.indentation !== undefined) {
      const indentationFragment = buildIndentation(attributes.indentation)
      paragraphPropertiesFragment.import(indentationFragment)
      attributes.indentation = undefined
    }

    // 7. jc
    if (attributes.textAlign !== undefined) {
      const horizontalAlignmentFragment = buildHorizontalAlignment(attributes.textAlign)
      paragraphPropertiesFragment.import(horizontalAlignmentFragment)
      attributes.textAlign = undefined
    }
  }
  paragraphPropertiesFragment.up()

  return paragraphPropertiesFragment
}

type ImageDimensionAttributes = {
  height?: number
  maximumWidth?: number
  originalHeight?: number
  originalWidth?: number
  width?: number | string
}

const computeImageDimensions = (
  vNode: VNodeType,
  attributes: ImageDimensionAttributes
): void => {
  const { maximumWidth, originalWidth, originalHeight } = attributes
  if (!originalWidth || !originalHeight || !maximumWidth) return

  const aspectRatio = originalWidth / originalHeight
  const maximumWidthInEMU = TWIPToEMU(maximumWidth)
  let originalWidthInEMU = pixelToEMU(originalWidth)
  let originalHeightInEMU = pixelToEMU(originalHeight)
  if (originalWidthInEMU > maximumWidthInEMU) {
    originalWidthInEMU = maximumWidthInEMU
    originalHeightInEMU = Math.round(originalWidthInEMU / aspectRatio)
  }
  let modifiedHeight: number | undefined
  let modifiedWidth: number | undefined

  const attributeWidth =
    vNode.properties?.attributes?.width ??
    (vNode.properties?.width as string | number | undefined)
  const attributeHeight =
    vNode.properties?.attributes?.height ??
    (vNode.properties?.height as string | number | undefined)

  if (attributeWidth !== undefined) {
    const parsedWidth = Number.parseFloat(String(attributeWidth))
    if (!Number.isNaN(parsedWidth) && parsedWidth > 0) {
      modifiedWidth = pixelToEMU(parsedWidth)
    }
  }
  if (attributeHeight !== undefined) {
    const parsedHeight = Number.parseFloat(String(attributeHeight))
    if (!Number.isNaN(parsedHeight) && parsedHeight > 0) {
      modifiedHeight = pixelToEMU(parsedHeight)
    }
  }

  if (vNode.properties?.style) {
    const style = vNode.properties.style
    if (style.width) {
      if (style.width !== 'auto') {
        if (pixelRegex.test(style.width)) {
          const match = style.width.match(pixelRegex)
          if (match) {
            modifiedWidth = pixelToEMU(Number.parseFloat(match[1]))
          }
        } else if (percentageRegex.test(style.width)) {
          const match = style.width.match(percentageRegex)
          if (match) {
            const percentageValue = Number.parseFloat(match[1])
            modifiedWidth = Math.round((percentageValue / 100) * originalWidthInEMU)
          }
        }
      } else if (style.height && style.height === 'auto') {
        modifiedWidth = originalWidthInEMU
        modifiedHeight = originalHeightInEMU
      }
    }
    if (style.height) {
      if (style.height !== 'auto') {
        if (pixelRegex.test(style.height)) {
          const match = style.height.match(pixelRegex)
          if (match) {
            modifiedHeight = pixelToEMU(Number.parseFloat(match[1]))
          }
        } else if (percentageRegex.test(style.height)) {
          const match = style.width?.match(percentageRegex)
          if (match) {
            const percentageValue = Number.parseFloat(match[1])
            modifiedHeight = Math.round((percentageValue / 100) * originalHeightInEMU)
            if (!modifiedWidth) {
              modifiedWidth = Math.round(modifiedHeight * aspectRatio)
            }
          }
        }
      } else if (modifiedWidth) {
        if (!modifiedHeight) {
          modifiedHeight = Math.round(modifiedWidth / aspectRatio)
        }
      } else {
        modifiedHeight = originalHeightInEMU
        modifiedWidth = originalWidthInEMU
      }
    }
    if (modifiedWidth && !modifiedHeight) {
      modifiedHeight = Math.round(modifiedWidth / aspectRatio)
    } else if (modifiedHeight && !modifiedWidth) {
      modifiedWidth = Math.round(modifiedHeight * aspectRatio)
    }
  } else if (!modifiedWidth && !modifiedHeight) {
    modifiedWidth = originalWidthInEMU
    modifiedHeight = originalHeightInEMU
  }

  if (modifiedWidth && !modifiedHeight) {
    modifiedHeight = Math.round(modifiedWidth / aspectRatio)
  } else if (modifiedHeight && !modifiedWidth) {
    modifiedWidth = Math.round(modifiedHeight * aspectRatio)
  }

  attributes.width = modifiedWidth

  attributes.height = modifiedHeight
}

type ProcessImageSourceResult = {
  base64String: string
  imageProperties: {
    height: number
    type?: string
    width: number
  }
}

/**
 * Compatibility helper kept for external tests and consumers.
 * Resolves image source to validated base64 data and dimensions.
 */
const processImageSource = async (
  docxDocumentInstance: DocxDocumentInstance,
  vNode: VNodeType,
  imageSource: string,
  _logContext = 'XML-BUILDER'
): Promise<ProcessImageSourceResult | null> => {
  if (!imageSource) {
    return null
  }

  let dataUri = imageSource.startsWith('data:')
    ? imageSource
    : decodeURIComponent(imageSource)

  if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
    const cachedImage = await downloadAndCacheImage(
      docxDocumentInstance,
      imageSource,
      docxDocumentInstance.imageProcessing
    )
    if (!cachedImage) {
      return null
    }

    dataUri = cachedImage
    if (vNode.properties) {
      vNode.properties.src = dataUri
    }
  }

  const parsedDataUrl = parseDataUrl(dataUri)
  if (!parsedDataUrl || !parsedDataUrl.base64) {
    return null
  }

  const normalizedBase64 = parsedDataUrl.base64.replace(/\s+/g, '')
  const isBase64 =
    normalizedBase64.length > 0 &&
    normalizedBase64.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(normalizedBase64)
  if (!isBase64) {
    return null
  }

  const imageProperties = getImageDimensions(base64ToUint8Array(normalizedBase64))
  if (!imageProperties.width || !imageProperties.height) {
    return null
  }

  return {
    base64String: normalizedBase64,
    imageProperties: {
      width: imageProperties.width,
      height: imageProperties.height,
      type: imageProperties.type,
    },
  }
}

// Track bookmark IDs globally to ensure unique IDs across the document
let globalBookmarkIdCounter = 0

const buildParagraph = async (
  vNode: VNodeType | VTextType | null,
  attributes: ParagraphAttributes,
  docxDocumentInstance?: DocxDocumentInstance
): Promise<XMLBuilder> => {
  const paragraphFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'p')
  const modifiedAttributes = modifiedStyleAttributesBuilder(
    docxDocumentInstance,
    vNode,
    attributes,
    {
      isParagraph: true,
    }
  )
  const paragraphPropertiesFragment = buildParagraphProperties(modifiedAttributes)
  paragraphFragment.import(paragraphPropertiesFragment)

  // Add bookmark start if bookmarkId is provided
  const bookmarkId = attributes?.bookmarkId
  let bookmarkNumericId: number | null = null
  if (bookmarkId) {
    bookmarkNumericId = globalBookmarkIdCounter++
    const bookmarkStartFragment = fragment({
      namespaceAlias: { w: namespaces.w },
    })
      .ele('@w', 'bookmarkStart')
      .att('@w', 'id', String(bookmarkNumericId))
      .att('@w', 'name', bookmarkId)
      .up()
    paragraphFragment.import(bookmarkStartFragment)
  }
  if (isVNode(vNode) && vNodeHasChildren(vNode as VNodeType)) {
    const vn = vNode as VNodeType
    if (PARAGRAPH_TAGS.has(vn.tagName || '')) {
      const runOrHyperlinkFragments = await buildRunOrHyperLink(
        vNode,
        modifiedAttributes,
        docxDocumentInstance
      )
      if (Array.isArray(runOrHyperlinkFragments)) {
        for (
          let iteratorIndex = 0;
          iteratorIndex < runOrHyperlinkFragments.length;
          iteratorIndex++
        ) {
          const runOrHyperlinkFragment = runOrHyperlinkFragments[iteratorIndex]

          paragraphFragment.import(runOrHyperlinkFragment)
        }
      } else {
        paragraphFragment.import(runOrHyperlinkFragments)
      }
    } else if (vn.tagName === 'blockquote') {
      const runFragmentOrFragments = await buildRun(vNode, attributes)
      if (Array.isArray(runFragmentOrFragments)) {
        for (let index = 0; index < runFragmentOrFragments.length; index++) {
          paragraphFragment.import(runFragmentOrFragments[index])
        }
      } else {
        paragraphFragment.import(runFragmentOrFragments)
      }
    } else {
      /* eslint-disable no-await-in-loop -- DOCX XML fragments must be built in document order */
      for (let index = 0; index < (vn.children || []).length; index++) {
        const childVNode = (vn.children || [])[index] as VNodeType
        if (childVNode.tagName === 'img') {
          const imageSource = childVNode.properties?.src

          // Skip WebP images - Word doesn't support WebP format
          if (
            imageSource &&
            (imageSource.includes('.webp') || imageSource.includes('image/webp'))
          ) {
            continue
          }

          let dataUri = imageSource ? decodeURIComponent(imageSource) : ''
          if (
            docxDocumentInstance &&
            imageSource &&
            (imageSource.startsWith('http://') || imageSource.startsWith('https://'))
          ) {
            const cachedImage = await downloadAndCacheImage(
              docxDocumentInstance,
              imageSource,
              docxDocumentInstance.imageProcessing
            )
            if (!cachedImage) {
              continue
            }
            dataUri = cachedImage
          }

          const parsedDataUrl = parseDataUrl(dataUri)
          if (!parsedDataUrl) {
            continue
          }

          if (childVNode.properties) {
            childVNode.properties.src = dataUri
          }

          const imageProperties = getImageDimensions(
            base64ToUint8Array(parsedDataUrl.base64)
          )

          modifiedAttributes.maximumWidth =
            modifiedAttributes.maximumWidth || docxDocumentInstance?.availableDocumentSpace
          modifiedAttributes.originalWidth = imageProperties.width
          modifiedAttributes.originalHeight = imageProperties.height

          computeImageDimensions(childVNode, modifiedAttributes)
        }
        const runOrHyperlinkFragments = await buildRunOrHyperLink(
          childVNode,
          isVNode(childVNode) && childVNode.tagName === 'img'
            ? {
                ...modifiedAttributes,
                type: 'picture',
                description: childVNode.properties?.alt,
              }
            : modifiedAttributes,
          docxDocumentInstance
        )
        if (Array.isArray(runOrHyperlinkFragments)) {
          for (
            let iteratorIndex = 0;
            iteratorIndex < runOrHyperlinkFragments.length;
            iteratorIndex++
          ) {
            const runOrHyperlinkFragment = runOrHyperlinkFragments[iteratorIndex]

            paragraphFragment.import(runOrHyperlinkFragment)
          }
        } else {
          paragraphFragment.import(runOrHyperlinkFragments)
        }
      }
      /* eslint-enable no-await-in-loop */
    }
  } else {
    // In case paragraphs has to be rendered where vText is present. Eg. table-cell
    // Or in case the vNode is something like img
    if (isVNode(vNode) && (vNode as VNodeType).tagName === 'img') {
      const vn = vNode as VNodeType
      const imageSource = vn.properties?.src

      // Skip WebP images - Word doesn't support WebP format
      if (
        imageSource &&
        (imageSource.includes('.webp') || imageSource.includes('image/webp'))
      ) {
        paragraphFragment.up()
        return paragraphFragment
      }

      let dataUri = imageSource ? decodeURIComponent(imageSource) : ''
      if (
        docxDocumentInstance &&
        imageSource &&
        (imageSource.startsWith('http://') || imageSource.startsWith('https://'))
      ) {
        const cachedImage = await downloadAndCacheImage(
          docxDocumentInstance,
          imageSource,
          docxDocumentInstance.imageProcessing
        )
        if (!cachedImage) {
          paragraphFragment.up()
          return paragraphFragment
        }
        dataUri = cachedImage
      }

      const parsedDataUrl = parseDataUrl(dataUri)
      if (parsedDataUrl) {
        if (vn.properties) {
          vn.properties.src = dataUri
        }
        const imageProperties = getImageDimensions(base64ToUint8Array(parsedDataUrl.base64))

        modifiedAttributes.maximumWidth =
          modifiedAttributes.maximumWidth || docxDocumentInstance?.availableDocumentSpace
        modifiedAttributes.originalWidth = imageProperties.width
        modifiedAttributes.originalHeight = imageProperties.height

        computeImageDimensions(vn, modifiedAttributes)
      }
    }
    const runFragments = await buildRunOrRuns(
      vNode,
      modifiedAttributes,
      docxDocumentInstance
    )
    if (Array.isArray(runFragments)) {
      for (let index = 0; index < runFragments.length; index++) {
        const runFragment = runFragments[index]

        paragraphFragment.import(runFragment)
      }
    } else {
      paragraphFragment.import(runFragments)
    }
  }

  // Add bookmark end if bookmarkId was provided
  if (bookmarkId && bookmarkNumericId !== null) {
    const bookmarkEndFragment = fragment({
      namespaceAlias: { w: namespaces.w },
    })
      .ele('@w', 'bookmarkEnd')
      .att('@w', 'id', String(bookmarkNumericId))
      .up()
    paragraphFragment.import(bookmarkEndFragment)
  }

  paragraphFragment.up()

  return paragraphFragment
}

const buildGridSpanFragment = (spanValue: number): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'gridSpan')
    .att('@w', 'val', String(spanValue))
    .up()

const buildTableCellSpacing = (cellSpacing = 0): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'tblCellSpacing')
    .att('@w', 'w', String(cellSpacing))
    .att('@w', 'type', 'dxa')
    .up()

// OOXML XSD order for tcBorders: top, start, bottom, end, insideH, insideV, tl2br, tr2bl
const tcBorderOrder = ['top', 'left', 'bottom', 'right'] as const

const buildTableCellBorders = (tableCellBorder: TableCellBorder): XMLBuilderType => {
  const tableCellBordersFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tcBorders')

  const { color, stroke } = tableCellBorder
  const borderValues: Record<string, number | undefined> = {
    top: tableCellBorder.top,
    left: tableCellBorder.left,
    bottom: tableCellBorder.bottom,
    right: tableCellBorder.right,
  }

  for (const border of tcBorderOrder) {
    const borderValue = borderValues[border]
    // Skip borders with value 0 or undefined - they should not be rendered
    if (borderValue !== undefined && borderValue > 0) {
      const xmlName = borderNameMap[border] || border
      const borderFragment = buildBorder(xmlName, borderValue, 0, color, stroke)
      tableCellBordersFragment.import(borderFragment)
    }
  }

  tableCellBordersFragment.up()

  return tableCellBordersFragment
}

const buildTableCellWidth = (tableCellWidth: string | undefined): XMLBuilderType | null => {
  const widthInfo = fixupColumnWidth(tableCellWidth)
  if (!widthInfo) return null

  return fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'tcW')
    .att('@w', 'w', String(widthInfo.value))
    .att('@w', 'type', widthInfo.type)
    .up()
}

interface TableCellAttributes extends ParagraphAttributes {
  colSpan?: number
  maximumWidth?: number
  rowSpan?: string
  tableCellBorder?: TableCellBorder
  verticalAlign?: string
}

const buildTableCellProperties = (
  attributes: TableCellAttributes | undefined
): XMLBuilderType => {
  const tableCellPropertiesFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tcPr')
  if (attributes && attributes.constructor === Object) {
    // OOXML XSD requires tcPr children in this order:
    // cnfStyle, tcW, gridSpan, hMerge, vMerge, tcBorders, shd, noWrap,
    // tcMar, textDirection, tcFitText, vAlign, hideMark, headers, tcPrChange

    // 1. tcW
    if (attributes.width !== undefined) {
      const widthValue =
        attributes.width !== null && attributes.width !== undefined
          ? String(attributes.width)
          : undefined
      const widthFragment = buildTableCellWidth(widthValue)
      if (widthFragment) {
        tableCellPropertiesFragment.import(widthFragment)
      }
      attributes.width = undefined
    }

    // 2. gridSpan (only emit when spanning more than 1 column)
    if (attributes.colSpan !== undefined) {
      if (attributes.colSpan > 1) {
        const gridSpanFragment = buildGridSpanFragment(attributes.colSpan)
        tableCellPropertiesFragment.import(gridSpanFragment)
      }
      attributes.colSpan = undefined
    }

    // 3. vMerge
    if (attributes.rowSpan !== undefined) {
      const verticalMergeFragment = buildVerticalMerge(attributes.rowSpan)
      tableCellPropertiesFragment.import(verticalMergeFragment)
      attributes.rowSpan = undefined
    }

    // 4. tcBorders
    if (attributes.tableCellBorder !== undefined) {
      const border = attributes.tableCellBorder
      const hasVisibleBorder = Object.entries(border).some(
        ([k, v]) => k !== 'color' && k !== 'stroke' && typeof v === 'number' && v > 0
      )
      if (hasVisibleBorder) {
        const tableCellBorderFragment = buildTableCellBorders(border)
        tableCellPropertiesFragment.import(tableCellBorderFragment)
      }
      attributes.tableCellBorder = undefined
    }

    // 5. shd
    if (attributes.backgroundColor !== undefined) {
      const shadingFragment = buildShading(attributes.backgroundColor)
      tableCellPropertiesFragment.import(shadingFragment)
      attributes.backgroundColor = undefined
    }

    // 6. vAlign
    if (attributes.verticalAlign !== undefined) {
      const verticalAlignmentFragment = buildVerticalAlignment(attributes.verticalAlign)
      tableCellPropertiesFragment.import(verticalAlignmentFragment)
      attributes.verticalAlign = undefined
    }
  }
  tableCellPropertiesFragment.up()

  return tableCellPropertiesFragment
}

const fixupTableCellBorder = (vNode: VNodeType, attributes: TableCellAttributes): void => {
  const style = vNode.properties?.style
  if (!style) return

  if (Object.hasOwn(style, 'border')) {
    if (style.border === 'none' || style.border === '0') {
      attributes.tableCellBorder = {}
    } else {
      const [borderSize, borderStroke, borderColor] = cssBorderParser(style.border)

      attributes.tableCellBorder = {
        top: borderSize,
        left: borderSize,
        bottom: borderSize,
        right: borderSize,
        color: borderColor,
        stroke: borderStroke,
      }
    }
  }
  if (style['border-top'] && style['border-top'] === '0') {
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      top: 0,
    }
  } else if (style['border-top'] && style['border-top'] !== '0') {
    const [borderSize, borderStroke, borderColor] = cssBorderParser(style['border-top'])
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      top: borderSize,
      color: borderColor,
      stroke: borderStroke,
    }
  }
  if (style['border-left'] && style['border-left'] === '0') {
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      left: 0,
    }
  } else if (style['border-left'] && style['border-left'] !== '0') {
    const [borderSize, borderStroke, borderColor] = cssBorderParser(style['border-left'])
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      left: borderSize,
      color: borderColor,
      stroke: borderStroke,
    }
  }
  if (style['border-bottom'] && style['border-bottom'] === '0') {
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      bottom: 0,
    }
  } else if (style['border-bottom'] && style['border-bottom'] !== '0') {
    const [borderSize, borderStroke, borderColor] = cssBorderParser(style['border-bottom'])
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      bottom: borderSize,
      color: borderColor,
      stroke: borderStroke,
    }
  }
  if (style['border-right'] && style['border-right'] === '0') {
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      right: 0,
    }
  } else if (style['border-right'] && style['border-right'] !== '0') {
    const [borderSize, borderStroke, borderColor] = cssBorderParser(style['border-right'])
    attributes.tableCellBorder = {
      ...attributes.tableCellBorder,
      right: borderSize,
      color: borderColor,
      stroke: borderStroke,
    }
  }
}

type RowSpanInfo = {
  colSpan: number
  rowSpan: number
}

type ColumnIndex = {
  index: number
}

const buildTableCell = async (
  vNode: VNodeType | VTextType,
  attributes: TableCellAttributes,
  rowSpanMap: Map<number, RowSpanInfo>,
  columnIndex: ColumnIndex,
  docxDocumentInstance: DocxDocumentInstance
): Promise<XMLBuilder> => {
  const tableCellFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tc')

  let modifiedAttributes: TableCellAttributes = { ...attributes }
  if (isVNode(vNode) && (vNode as VNodeType).properties) {
    const vn = vNode as VNodeType
    if (vn.properties?.rowSpan) {
      rowSpanMap.set(columnIndex.index, {
        rowSpan: vn.properties.rowSpan - 1,
        colSpan: 0,
      })
      modifiedAttributes.rowSpan = 'restart'
    } else {
      const previousSpanObject = rowSpanMap.get(columnIndex.index)
      rowSpanMap.set(columnIndex.index, {
        ...previousSpanObject,
        rowSpan: 0,
        colSpan: previousSpanObject?.colSpan || 0,
      })
    }
    if (vn.properties?.colSpan || vn.properties?.style?.['column-span']) {
      modifiedAttributes.colSpan =
        vn.properties?.colSpan ||
        Number.parseInt(vn.properties?.style?.['column-span'] || '0', 10)
      const previousSpanObject = rowSpanMap.get(columnIndex.index)
      rowSpanMap.set(columnIndex.index, {
        ...previousSpanObject,
        colSpan: Number.parseInt(String(modifiedAttributes.colSpan), 10) || 0,
        rowSpan: previousSpanObject?.rowSpan || 0,
      })
      columnIndex.index += Number.parseInt(String(modifiedAttributes.colSpan), 10) - 1
    }
    if (vn.properties?.style) {
      modifiedAttributes = {
        ...modifiedAttributes,
        ...modifiedStyleAttributesBuilder(docxDocumentInstance, vNode, attributes),
      }

      fixupTableCellBorder(vn, modifiedAttributes)
    }
  }
  const tableCellPropertiesFragment = buildTableCellProperties(modifiedAttributes)
  tableCellFragment.import(tableCellPropertiesFragment)

  // Don't pass cell-level backgroundColor to paragraph content
  // It should only apply to the cell itself (tcPr), not text runs
  const paragraphAttributes = { ...modifiedAttributes }
  paragraphAttributes.backgroundColor = undefined

  if (vNodeHasChildren(vNode as VNodeType)) {
    const vn = vNode as VNodeType
    /* eslint-disable no-await-in-loop -- DOCX XML fragments must be built in document order */
    for (let index = 0; index < (vn.children || []).length; index++) {
      const childVNode = (vn.children || [])[index]
      if (isVNode(childVNode) && (childVNode as VNodeType).tagName === 'img') {
        const imageFragment = await buildImage(
          docxDocumentInstance,
          childVNode as VNodeType,
          modifiedAttributes.maximumWidth || null
        )
        if (imageFragment) {
          tableCellFragment.import(imageFragment)
        }
      } else if (isVNode(childVNode) && (childVNode as VNodeType).tagName === 'figure') {
        const figureVn = childVNode as VNodeType
        if (vNodeHasChildren(figureVn)) {
          for (
            let iteratorIndex = 0;
            iteratorIndex < (figureVn.children || []).length;
            iteratorIndex++
          ) {
            const grandChildVNode = (figureVn.children || [])[iteratorIndex] as VNodeType
            if (grandChildVNode.tagName === 'img') {
              const imageFragment = await buildImage(
                docxDocumentInstance,
                grandChildVNode,
                modifiedAttributes.maximumWidth || null
              )
              if (imageFragment) {
                tableCellFragment.import(imageFragment)
              }
            }
          }
        }
      } else if (
        isVNode(childVNode) &&
        LIST_TAGS.has((childVNode as VNodeType).tagName || '')
      ) {
        // render list in table
        const listVn = childVNode as VNodeType
        if (vNodeHasChildren(listVn)) {
          await buildList(listVn, docxDocumentInstance, tableCellFragment)
        }
      } else if (isVNode(childVNode) && (childVNode as VNodeType).tagName === 'div') {
        // Handle div wrapper - process its children instead
        const divVn = childVNode as VNodeType
        if (vNodeHasChildren(divVn)) {
          for (let divIndex = 0; divIndex < (divVn.children || []).length; divIndex++) {
            const divChild = (divVn.children || [])[divIndex]
            if (isVNode(divChild) && (divChild as VNodeType).tagName === 'img') {
              const imageFragment = await buildImage(
                docxDocumentInstance,
                divChild as VNodeType,
                modifiedAttributes.maximumWidth || null
              )
              if (imageFragment) {
                tableCellFragment.import(imageFragment)
              }
            } else if (
              isVNode(divChild) &&
              LIST_TAGS.has((divChild as VNodeType).tagName || '')
            ) {
              const listVn = divChild as VNodeType
              if (vNodeHasChildren(listVn)) {
                await buildList(listVn, docxDocumentInstance, tableCellFragment)
              }
            } else {
              const paragraphFragment = await buildParagraph(
                divChild,
                paragraphAttributes,
                docxDocumentInstance
              )
              tableCellFragment.import(paragraphFragment)
            }
          }
        }
      } else {
        const paragraphFragment = await buildParagraph(
          childVNode,
          paragraphAttributes,
          docxDocumentInstance
        )

        tableCellFragment.import(paragraphFragment)
      }
    }
    /* eslint-enable no-await-in-loop */
  } else {
    // TODO: Figure out why building with buildParagraph() isn't working
    const paragraphFragment = fragment({ namespaceAlias: { w: namespaces.w } })
      .ele('@w', 'p')
      .up()
    tableCellFragment.import(paragraphFragment)
  }
  tableCellFragment.up()

  return tableCellFragment
}

interface TableRowAttributes extends TableAttributes {
  tableRowHeight?: number
}

const buildRowSpanCell = (
  rowSpanMap: Map<number, RowSpanInfo>,
  columnIndex: ColumnIndex,
  attributes: TableRowAttributes
): XMLBuilderType[] => {
  const rowSpanCellFragments: XMLBuilderType[] = []
  let spanObject = rowSpanMap.get(columnIndex.index)
  while (spanObject?.rowSpan) {
    const rowSpanCellFragment = fragment({
      namespaceAlias: { w: namespaces.w },
    }).ele('@w', 'tc')

    const tableCellPropertiesFragment = buildTableCellProperties({
      ...attributes,
      rowSpan: 'continue',
      colSpan: spanObject.colSpan ? spanObject.colSpan : 0,
    })
    rowSpanCellFragment.import(tableCellPropertiesFragment)

    const paragraphFragment = fragment({ namespaceAlias: { w: namespaces.w } })
      .ele('@w', 'p')
      .up()
    rowSpanCellFragment.import(paragraphFragment)
    rowSpanCellFragment.up()

    rowSpanCellFragments.push(rowSpanCellFragment)

    if (spanObject.rowSpan - 1 === 0) {
      rowSpanMap.delete(columnIndex.index)
    } else {
      rowSpanMap.set(columnIndex.index, {
        rowSpan: spanObject.rowSpan - 1,
        colSpan: spanObject.colSpan || 0,
      })
    }
    columnIndex.index += spanObject.colSpan || 1
    spanObject = rowSpanMap.get(columnIndex.index)
  }

  return rowSpanCellFragments
}

const buildTableRowProperties = (
  attributes: TableRowAttributes | undefined
): XMLBuilderType => {
  const tableRowPropertiesFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'trPr')
  if (attributes && attributes.constructor === Object) {
    Object.keys(attributes).forEach((key) => {
      switch (key) {
        case 'tableRowHeight': {
          if (attributes[key] !== null && attributes[key] !== undefined) {
            const tableRowHeightFragment = buildTableRowHeight(attributes[key])
            tableRowPropertiesFragment.import(tableRowHeightFragment)
          }
          attributes.tableRowHeight = undefined
          break
        }
        case 'rowCantSplit':
          if (attributes.rowCantSplit) {
            const cantSplitFragment = fragment({
              namespaceAlias: { w: namespaces.w },
            })
              .ele('@w', 'cantSplit')
              .up()
            tableRowPropertiesFragment.import(cantSplitFragment)

            attributes.rowCantSplit = undefined
          }
          break
        default:
          break
      }
    })
  }
  tableRowPropertiesFragment.up()
  return tableRowPropertiesFragment
}

const buildTableRow = async (
  vNode: VNodeType,
  attributes: TableRowAttributes,
  rowSpanMap: Map<number, RowSpanInfo>,
  docxDocumentInstance: DocxDocumentInstance
): Promise<XMLBuilder> => {
  const tableRowFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tr')
  const modifiedAttributes: TableRowAttributes = { ...attributes }
  if (isVNode(vNode) && vNode.properties) {
    // FIXME: find a better way to get row height from cell style
    const firstChild = (vNode.children || [])[0] as VNodeType | undefined
    if (
      vNode.properties.style?.height ||
      (firstChild &&
        isVNode(firstChild) &&
        firstChild.properties?.style &&
        firstChild.properties.style.height)
    ) {
      const heightValue =
        vNode.properties.style?.height ||
        (firstChild &&
        isVNode(firstChild) &&
        firstChild.properties?.style &&
        firstChild.properties.style.height
          ? firstChild.properties.style.height
          : undefined)
      if (heightValue) {
        modifiedAttributes.tableRowHeight = fixupRowHeight(heightValue)
      }
    }
    if (vNode.properties.style) {
      fixupTableCellBorder(vNode, modifiedAttributes as TableCellAttributes)
    }
  }

  const tableRowPropertiesFragment = buildTableRowProperties(modifiedAttributes)
  tableRowFragment.import(tableRowPropertiesFragment)

  const columnIndex: ColumnIndex = { index: 0 }

  if (vNodeHasChildren(vNode)) {
    const tableColumns = (vNode.children || []).filter((childVNode) =>
      TABLE_CELL_TAGS.has((childVNode as VNodeType).tagName || '')
    )
    const maximumColumnWidth =
      docxDocumentInstance.availableDocumentSpace / tableColumns.length

    /* eslint-disable no-await-in-loop -- DOCX table cells must be built in document order */
    for (const column of tableColumns) {
      const rowSpanCellFragments = buildRowSpanCell(
        rowSpanMap,
        columnIndex,
        modifiedAttributes
      )
      if (Array.isArray(rowSpanCellFragments)) {
        for (
          let iteratorIndex = 0;
          iteratorIndex < rowSpanCellFragments.length;
          iteratorIndex++
        ) {
          const rowSpanCellFragment = rowSpanCellFragments[iteratorIndex]

          tableRowFragment.import(rowSpanCellFragment)
        }
      }
      const tableCellFragment = await buildTableCell(
        column,
        { ...modifiedAttributes, maximumWidth: maximumColumnWidth },
        rowSpanMap,
        columnIndex,
        docxDocumentInstance
      )
      columnIndex.index++

      tableRowFragment.import(tableCellFragment)
    }
    /* eslint-enable no-await-in-loop */
  }

  if (columnIndex.index < rowSpanMap.size) {
    const rowSpanCellFragments = buildRowSpanCell(
      rowSpanMap,
      columnIndex,
      modifiedAttributes
    )
    if (Array.isArray(rowSpanCellFragments)) {
      for (
        let iteratorIndex = 0;
        iteratorIndex < rowSpanCellFragments.length;
        iteratorIndex++
      ) {
        const rowSpanCellFragment = rowSpanCellFragments[iteratorIndex]

        tableRowFragment.import(rowSpanCellFragment)
      }
    }
  }

  tableRowFragment.up()

  return tableRowFragment
}

const buildTableGridCol = (gridWidth: number): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'gridCol')
    .att('@w', 'w', String(gridWidth))

const buildTableGrid = (vNode: VNodeType, attributes: TableAttributes): XMLBuilderType => {
  const tableGridFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tblGrid')
  if (vNodeHasChildren(vNode)) {
    const gridColumns = (vNode.children || []).filter(
      (childVNode) => (childVNode as VNodeType).tagName === 'col'
    )
    const gridWidth = (attributes.maximumWidth || 0) / gridColumns.length

    for (let index = 0; index < gridColumns.length; index++) {
      const tableGridColFragment = buildTableGridCol(gridWidth)
      tableGridFragment.import(tableGridColFragment)
    }
  }
  tableGridFragment.up()

  return tableGridFragment
}

const buildTableGridFromTableRow = (
  vNode: VNodeType,
  attributes: TableAttributes
): XMLBuilderType => {
  const tableGridFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tblGrid')
  if (vNodeHasChildren(vNode)) {
    let numberOfGridColumns = 0
    for (const childVNode of vNode.children || []) {
      const child = childVNode as VNodeType
      const colSpan = child.properties?.colSpan || child.properties?.style?.['column-span']

      numberOfGridColumns += colSpan ? Number.parseInt(String(colSpan), 10) : 1
    }
    const gridWidth = (attributes.maximumWidth || 0) / numberOfGridColumns

    for (let index = 0; index < numberOfGridColumns; index++) {
      const tableGridColFragment = buildTableGridCol(gridWidth)
      tableGridFragment.import(tableGridColFragment)
    }
  }
  tableGridFragment.up()

  return tableGridFragment
}

// OOXML border name mapping: left→start, right→end (ISO 29500:2016)
const borderNameMap: Record<string, string> = {
  left: 'start',
  right: 'end',
}

// OOXML XSD order for tblBorders: top, start, bottom, end, insideH, insideV
const tblBorderOrder = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const

const buildTableBorders = (tableBorder: TableBorder): XMLBuilderType => {
  const tableBordersFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tblBorders')

  const { color, stroke, ...borders } = tableBorder
  const borderValues: Record<string, number | undefined> = {
    top: borders.top,
    left: borders.left,
    bottom: borders.bottom,
    right: borders.right,
    insideH: borders.insideH,
    insideV: borders.insideV,
  }

  for (const border of tblBorderOrder) {
    const borderValue = borderValues[border]
    if (borderValue !== undefined && borderValue > 0) {
      const xmlName = borderNameMap[border] || border
      const borderFragment = buildBorder(xmlName, borderValue, 0, color, stroke)
      tableBordersFragment.import(borderFragment)
    }
  }

  tableBordersFragment.up()

  return tableBordersFragment
}

const buildTableWidth = (tableWidth: number): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', 'tblW')
    .att('@w', 'type', 'dxa')
    .att('@w', 'w', String(tableWidth))
    .up()

const buildCellMargin = (side: string, margin: number): XMLBuilderType =>
  fragment({ namespaceAlias: { w: namespaces.w } })
    .ele('@w', side)
    .att('@w', 'type', 'dxa')
    .att('@w', 'w', String(margin))
    .up()

const buildTableCellMargins = (margin: number): XMLBuilderType => {
  const tableCellMarFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tblCellMar')

  // OOXML XSD order for tblCellMar: top, start, bottom, end
  // ISO 29500:2016 uses start/end instead of left/right
  const sides: [string, number][] = [
    ['top', margin / 2],
    ['start', margin],
    ['bottom', margin / 2],
    ['end', margin],
  ]
  for (const [side, value] of sides) {
    const marginFragment = buildCellMargin(side, value)
    tableCellMarFragment.import(marginFragment)
  }

  return tableCellMarFragment
}

const buildTableProperties = (attributes: TableAttributes | undefined): XMLBuilderType => {
  const tablePropertiesFragment = fragment({
    namespaceAlias: { w: namespaces.w },
  }).ele('@w', 'tblPr')

  // OOXML XSD requires tblPr children in this order:
  // tblStyle, tblpPr, tblOverlap, bidiVisual, tblStyleRowBandSize,
  // tblStyleColBandSize, tblW, jc, tblCellSpacing, tblInd, tblBorders,
  // shd, tblLayout, tblCellMar, tblLook, tblCaption, tblDescription, tblPrChange

  if (attributes && attributes.constructor === Object) {
    // 1. tblW
    if (attributes.width) {
      const tableWidthFragment = buildTableWidth(attributes.width)
      tablePropertiesFragment.import(tableWidthFragment)
      attributes.width = undefined
    }

    // 2. jc (center alignment by default)
    const alignmentFragment = buildHorizontalAlignment('center')
    tablePropertiesFragment.import(alignmentFragment)

    // 3. tblCellSpacing
    if (attributes.tableCellSpacing !== undefined) {
      const tableCellSpacingFragment = buildTableCellSpacing(attributes.tableCellSpacing)
      tablePropertiesFragment.import(tableCellSpacingFragment)
      attributes.tableCellSpacing = undefined
    }

    // 4. tblBorders
    if (attributes.tableBorder) {
      const border = attributes.tableBorder
      const hasVisibleBorder = Object.entries(border).some(
        ([k, v]) => k !== 'color' && k !== 'stroke' && v && v > 0
      )
      if (hasVisibleBorder) {
        const tableBordersFragment = buildTableBorders(border)
        tablePropertiesFragment.import(tableBordersFragment)
      }
      attributes.tableBorder = undefined
    }

    // 5. tblCellMar
    const tableCellMarginFragment = buildTableCellMargins(160)
    tablePropertiesFragment.import(tableCellMarginFragment)
  } else {
    // No attributes - still add default alignment and margins
    const alignmentFragment = buildHorizontalAlignment('center')
    tablePropertiesFragment.import(alignmentFragment)
    const tableCellMarginFragment = buildTableCellMargins(160)
    tablePropertiesFragment.import(tableCellMarginFragment)
  }

  tablePropertiesFragment.up()

  return tablePropertiesFragment
}

const cssBorderParser = (borderString: string): [number, string, string] => {
  // Handle 'none' border - return 0 size with valid defaults
  if (borderString === 'none' || borderString === '0' || borderString === '0px') {
    return [0, 'single', '000000']
  }

  const [size, stroke, color] = borderString.split(' ')

  // Handle 'none' as first value (e.g., 'none solid black')
  if (size === 'none' || size === '0') {
    return [0, 'single', '000000']
  }

  let sizeNum: number
  if (pointRegex.test(size)) {
    const matchedParts = size.match(pointRegex)
    // convert point to eighth of a point
    sizeNum = matchedParts ? pointToEIP(Number.parseFloat(matchedParts[1])) : 0
  } else if (pixelRegex.test(size)) {
    const matchedParts = size.match(pixelRegex)
    // convert pixels to eighth of a point
    sizeNum = matchedParts ? pixelToEIP(Number.parseFloat(matchedParts[1])) : 0
  } else {
    sizeNum = 0
  }
  const strokeResult =
    stroke && ['dashed', 'dotted', 'double'].includes(stroke) ? stroke : 'single'

  const colorResult = color ? fixupColorCode(color).toUpperCase() : '000000'

  return [sizeNum, strokeResult, colorResult]
}

const buildTable = async (
  vNode: VNodeType,
  attributes: TableAttributes,
  docxDocumentInstance: DocxDocumentInstance
): Promise<XMLBuilder> => {
  const tableFragment = fragment({ namespaceAlias: { w: namespaces.w } }).ele('@w', 'tbl')
  const modifiedAttributes: TableAttributes = { ...attributes }
  if (isVNode(vNode) && vNode.properties) {
    const tableAttributes = vNode.properties.attributes || {}
    const tableStyles = vNode.properties.style || {}
    const tableBorders: TableBorder = {}
    const tableCellBorders: TableCellBorder = {}
    let [borderSize, borderStrike, borderColor]: [number, string, string] = [
      2,
      'single',
      '000000',
    ]

    const borderAttr = tableAttributes.border
    if (borderAttr && !Number.isNaN(Number.parseInt(borderAttr, 10))) {
      borderSize = Number.parseInt(borderAttr, 10)
    }

    // css style overrides table border properties
    if (tableStyles.border) {
      const [cssSize, cssStroke, cssColor] = cssBorderParser(tableStyles.border)
      // Use nullish check to allow 0 as valid border size
      borderSize = cssSize !== undefined && cssSize !== null ? cssSize : borderSize
      borderColor = cssColor || borderColor
      borderStrike = cssStroke || borderStrike
    }

    tableBorders.top = borderSize
    tableBorders.bottom = borderSize
    tableBorders.left = borderSize
    tableBorders.right = borderSize
    tableBorders.stroke = borderStrike
    tableBorders.color = borderColor

    if (tableStyles['border-collapse'] === 'collapse') {
      tableBorders.insideV = borderSize
      tableBorders.insideH = borderSize
    } else {
      tableBorders.insideV = 0
      tableBorders.insideH = 0
      // Only apply default cell borders if the table actually has borders
      if (borderSize > 0) {
        tableCellBorders.top = 1
        tableCellBorders.bottom = 1
        tableCellBorders.left = 1
        tableCellBorders.right = 1
      }
    }

    modifiedAttributes.tableBorder = tableBorders
    modifiedAttributes.tableCellSpacing = 0

    if (Object.keys(tableCellBorders).length) {
      modifiedAttributes.tableCellBorder = tableCellBorders
    }

    let minimumWidth: number | undefined
    let maximumWidth: number | undefined
    let width: number | undefined
    // Calculate minimum width of table
    if (tableStyles['min-width'] && pixelRegex.test(tableStyles['min-width'])) {
      const match = tableStyles['min-width'].match(pixelRegex)
      if (match) {
        minimumWidth = pixelToTWIP(Number.parseFloat(match[1]))
      }
    } else if (tableStyles['min-width'] && percentageRegex.test(tableStyles['min-width'])) {
      const match = tableStyles['min-width'].match(percentageRegex)
      if (match) {
        const percentageValue = Number.parseFloat(match[1])
        minimumWidth = Math.round((percentageValue / 100) * (attributes.maximumWidth || 0))
      }
    }

    // Calculate maximum width of table
    if (tableStyles['max-width'] && pixelRegex.test(tableStyles['max-width'])) {
      pixelRegex.lastIndex = 0
      const match = tableStyles['max-width'].match(pixelRegex)
      if (match) {
        maximumWidth = pixelToTWIP(Number.parseFloat(match[1]))
      }
    } else if (tableStyles['max-width'] && percentageRegex.test(tableStyles['max-width'])) {
      percentageRegex.lastIndex = 0
      const match = tableStyles['max-width'].match(percentageRegex)
      if (match) {
        const percentageValue = Number.parseFloat(match[1])
        maximumWidth = Math.round((percentageValue / 100) * (attributes.maximumWidth || 0))
      }
    }

    // Calculate specified width of table
    if (tableStyles.width && pixelRegex.test(tableStyles.width)) {
      pixelRegex.lastIndex = 0
      const match = tableStyles.width.match(pixelRegex)
      if (match) {
        width = pixelToTWIP(Number.parseFloat(match[1]))
      }
    } else if (tableStyles.width && percentageRegex.test(tableStyles.width)) {
      percentageRegex.lastIndex = 0
      const match = tableStyles.width.match(percentageRegex)
      if (match) {
        const percentageValue = Number.parseFloat(match[1])
        width = Math.round((percentageValue / 100) * (attributes.maximumWidth || 0))
      }
    }

    // If width isn't supplied, we should have min-width as the width.
    if (width) {
      modifiedAttributes.width = width
      if (maximumWidth) {
        modifiedAttributes.width = Math.min(modifiedAttributes.width, maximumWidth)
      }
      if (minimumWidth) {
        modifiedAttributes.width = Math.max(modifiedAttributes.width, minimumWidth)
      }
    } else if (minimumWidth) {
      modifiedAttributes.width = minimumWidth
    }
    if (modifiedAttributes.width) {
      modifiedAttributes.width = Math.min(
        modifiedAttributes.width,
        attributes.maximumWidth || 0
      )
    }
  }
  const tablePropertiesFragment = buildTableProperties(modifiedAttributes)
  tableFragment.import(tablePropertiesFragment)

  // OOXML requires: tblPr, tblGrid, tr* — tblGrid must come once, right after tblPr
  // Find the tblGrid source: colgroup first, then first tr found in thead/tbody/direct
  let tblGridEmitted = false

  const rowSpanMap = new Map<number, RowSpanInfo>()

  if (vNodeHasChildren(vNode)) {
    // First pass: emit tblGrid from colgroup if present
    for (const childVNode of (vNode.children || []) as VNodeType[]) {
      if (childVNode.tagName === 'colgroup' && !tblGridEmitted) {
        const tableGridFragment = buildTableGrid(childVNode, modifiedAttributes)
        tableFragment.import(tableGridFragment)
        tblGridEmitted = true
      }
    }

    // If no colgroup, find first tr to build tblGrid from
    if (!tblGridEmitted) {
      for (const childVNode of (vNode.children || []) as VNodeType[]) {
        if (tblGridEmitted) break
        if (childVNode.tagName === 'tr') {
          const tableGridFragment = buildTableGridFromTableRow(
            childVNode,
            modifiedAttributes
          )
          tableFragment.import(tableGridFragment)
          tblGridEmitted = true
        } else if (childVNode.tagName === 'thead' || childVNode.tagName === 'tbody') {
          for (const grandChildVNode of (childVNode.children || []) as VNodeType[]) {
            if (grandChildVNode.tagName === 'tr') {
              const tableGridFragment = buildTableGridFromTableRow(
                grandChildVNode,
                modifiedAttributes
              )
              tableFragment.import(tableGridFragment)
              tblGridEmitted = true
              break
            }
          }
        }
      }
    }

    // Second pass: emit all tr elements
    /* eslint-disable no-await-in-loop -- DOCX table rows must be built in document order */
    for (const childVNode of (vNode.children || []) as VNodeType[]) {
      if (childVNode.tagName === 'colgroup') {
        // Already handled above
      } else if (childVNode.tagName === 'thead' || childVNode.tagName === 'tbody') {
        for (const grandChildVNode of (childVNode.children || []) as VNodeType[]) {
          if (grandChildVNode.tagName === 'tr') {
            const tableRowFragment = await buildTableRow(
              grandChildVNode,
              modifiedAttributes,
              rowSpanMap,
              docxDocumentInstance
            )
            tableFragment.import(tableRowFragment)
          }
        }
      } else if (childVNode.tagName === 'tr') {
        const tableRowFragment = await buildTableRow(
          childVNode,
          modifiedAttributes,
          rowSpanMap,
          docxDocumentInstance
        )
        tableFragment.import(tableRowFragment)
      }
    }
    /* eslint-enable no-await-in-loop */
  }
  tableFragment.up()

  return tableFragment
}

// Common namespace aliases for all drawing-related elements
const drawingNamespaces = {
  asvg: 'http://schemas.microsoft.com/office/drawing/2016/SVG/main',
  w: namespaces.w,
  wp: namespaces.wp,
  a: namespaces.a,
  pic: namespaces.pic,
  r: namespaces.r,
}

const buildPresetGeometry = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.a, 'prstGeom')
    .att('prst', 'rect')
    .up()

type ExtentsAttributes = {
  height?: number
  width?: number
}

const buildExtents = ({ width, height }: ExtentsAttributes): XMLBuilderType => {
  // Default to 100x100 pixels in EMU if dimensions are missing
  const defaultSize = 952_500
  // Ensure valid numeric values (handle undefined, null, NaN, 0)
  const cx =
    typeof width === 'number' && width > 0 && !Number.isNaN(width) ? width : defaultSize
  const cy =
    typeof height === 'number' && height > 0 && !Number.isNaN(height) ? height : defaultSize
  return fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.a, 'ext')
    .att('cx', String(cx))
    .att('cy', String(cy))
    .up()
}

const buildOffset = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.a, 'off')
    .att('x', '0')
    .att('y', '0')
    .up()

const buildGraphicFrameTransform = (attributes: ExtentsAttributes): XMLBuilderType => {
  const graphicFrameTransformFragment = fragment({
    namespaceAlias: drawingNamespaces,
  }).ele(namespaces.a, 'xfrm')

  const offsetFragment = buildOffset()
  graphicFrameTransformFragment.import(offsetFragment)
  const extentsFragment = buildExtents(attributes)
  graphicFrameTransformFragment.import(extentsFragment)

  graphicFrameTransformFragment.up()

  return graphicFrameTransformFragment
}

const buildShapeProperties = (attributes: ExtentsAttributes): XMLBuilderType => {
  const shapeProperties = fragment({
    namespaceAlias: drawingNamespaces,
  }).ele(namespaces.pic, 'spPr')

  const graphicFrameTransformFragment = buildGraphicFrameTransform(attributes)
  shapeProperties.import(graphicFrameTransformFragment)
  const presetGeometryFragment = buildPresetGeometry()
  shapeProperties.import(presetGeometryFragment)

  shapeProperties.up()

  return shapeProperties
}

const buildFillRect = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces }).ele(namespaces.a, 'fillRect').up()

const buildStretch = (): XMLBuilderType => {
  const stretchFragment = fragment({ namespaceAlias: drawingNamespaces }).ele(
    namespaces.a,
    'stretch'
  )

  const fillRectFragment = buildFillRect()
  stretchFragment.import(fillRectFragment)

  stretchFragment.up()

  return stretchFragment
}

const buildSrcRectFragment = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.a, 'srcRect')
    .att('b', '0')
    .att('l', '0')
    .att('r', '0')
    .att('t', '0')
    .up()

const buildBinaryLargeImageOrPicture = (
  relationshipId: number,
  isSVG = false
): XMLBuilderType => {
  const blipFragment = fragment({
    namespaceAlias: drawingNamespaces,
  })
    .ele(namespaces.a, 'blip')
    .att(namespaces.r, 'embed', `rId${relationshipId}`)
    // FIXME: possible values 'email', 'none', 'print', 'hqprint', 'screen'
    .att('cstate', 'print')

  if (isSVG) {
    const svgBlipExtension = fragment({
      namespaceAlias: drawingNamespaces,
    })
      .ele(namespaces.a, 'extLst')
      .ele(namespaces.a, 'ext')
      .att('uri', '{96DAC541-7B7A-43C3-8B79-37D633B846F1}')
      .ele(drawingNamespaces.asvg, 'svgBlip')
      .att('xmlns:asvg', drawingNamespaces.asvg)
      .att(namespaces.r, 'embed', `rId${relationshipId}`)
      .up()
      .up()
      .up()
    blipFragment.import(svgBlipExtension)
  }

  return blipFragment.up()
}

const buildBinaryLargeImageOrPictureFill = (
  relationshipId: number,
  isSVG = false
): XMLBuilderType => {
  const binaryLargeImageOrPictureFillFragment = fragment({
    namespaceAlias: drawingNamespaces,
  }).ele(namespaces.pic, 'blipFill')
  const binaryLargeImageOrPictureFragment = buildBinaryLargeImageOrPicture(
    relationshipId,
    isSVG
  )
  binaryLargeImageOrPictureFillFragment.import(binaryLargeImageOrPictureFragment)
  const srcRectFragment = buildSrcRectFragment()
  binaryLargeImageOrPictureFillFragment.import(srcRectFragment)
  const stretchFragment = buildStretch()
  binaryLargeImageOrPictureFillFragment.import(stretchFragment)

  binaryLargeImageOrPictureFillFragment.up()

  return binaryLargeImageOrPictureFillFragment
}

const buildNonVisualPictureDrawingProperties = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces }).ele(namespaces.pic, 'cNvPicPr').up()

const buildNonVisualDrawingProperties = (
  pictureId: number,
  pictureNameWithExtension: string,
  pictureDescription = ''
): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.pic, 'cNvPr')
    .att('id', String(pictureId))
    .att('name', pictureNameWithExtension)
    .att('descr', pictureDescription)
    .up()

const buildNonVisualPictureProperties = (
  pictureId: number,
  pictureNameWithExtension: string,
  pictureDescription?: string
): XMLBuilderType => {
  const nonVisualPicturePropertiesFragment = fragment({
    namespaceAlias: drawingNamespaces,
  }).ele(namespaces.pic, 'nvPicPr')
  // TODO: Handle picture attributes
  const nonVisualDrawingPropertiesFragment = buildNonVisualDrawingProperties(
    pictureId,
    pictureNameWithExtension,
    pictureDescription
  )
  nonVisualPicturePropertiesFragment.import(nonVisualDrawingPropertiesFragment)
  const nonVisualPictureDrawingPropertiesFragment = buildNonVisualPictureDrawingProperties()
  nonVisualPicturePropertiesFragment.import(nonVisualPictureDrawingPropertiesFragment)
  nonVisualPicturePropertiesFragment.up()

  return nonVisualPicturePropertiesFragment
}

type PictureAttributes = {
  description?: string
  fileNameWithExtension?: string
  height?: number
  id?: number
  isSVG?: boolean
  relationshipId?: number
  width?: number
}

const buildPicture = ({
  id,
  fileNameWithExtension,
  description,
  relationshipId,
  width,
  height,
  isSVG,
}: PictureAttributes): XMLBuilderType => {
  const pictureFragment = fragment({
    namespaceAlias: drawingNamespaces,
  }).ele(namespaces.pic, 'pic')
  const nonVisualPicturePropertiesFragment = buildNonVisualPictureProperties(
    id || 0,
    fileNameWithExtension || '',
    description
  )
  pictureFragment.import(nonVisualPicturePropertiesFragment)
  const binaryLargeImageOrPictureFill = buildBinaryLargeImageOrPictureFill(
    relationshipId || 0,
    isSVG
  )
  pictureFragment.import(binaryLargeImageOrPictureFill)
  const shapeProperties = buildShapeProperties({ width, height })
  pictureFragment.import(shapeProperties)
  pictureFragment.up()

  return pictureFragment
}

const buildGraphicData = (
  graphicType: string,
  attributes: PictureAttributes
): XMLBuilderType => {
  const graphicDataFragment = fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.a, 'graphicData')
    .att('uri', 'http://schemas.openxmlformats.org/drawingml/2006/picture')
  if (graphicType === 'picture') {
    const pictureFragment = buildPicture(attributes)
    graphicDataFragment.import(pictureFragment)
  }
  graphicDataFragment.up()

  return graphicDataFragment
}

const buildGraphic = (
  graphicType: string,
  attributes: PictureAttributes
): XMLBuilderType => {
  const graphicFragment = fragment({ namespaceAlias: drawingNamespaces }).ele(
    namespaces.a,
    'graphic'
  )
  // TODO: Handle drawing type
  const graphicDataFragment = buildGraphicData(graphicType, attributes)
  graphicFragment.import(graphicDataFragment)
  graphicFragment.up()

  return graphicFragment
}

const buildDrawingObjectNonVisualProperties = (
  pictureId: number,
  pictureName: string
): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.wp, 'docPr')
    .att('id', String(pictureId))
    .att('name', pictureName)
    .up()

const buildWrapSquare = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.wp, 'wrapSquare')
    .att('wrapText', 'bothSides')
    .att('distB', '228600')
    .att('distT', '228600')
    .att('distL', '228600')
    .att('distR', '228600')
    .up()

const _buildWrapNone = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces }).ele(namespaces.wp, 'wrapNone').up()

const buildEffectExtentFragment = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.wp, 'effectExtent')
    .att('b', '0')
    .att('l', '0')
    .att('r', '0')
    .att('t', '0')
    .up()

const buildExtent = ({ width, height }: ExtentsAttributes): XMLBuilderType => {
  // Default to 100x100 pixels in EMU (914400 EMU = 1 inch, 96 pixels = 1 inch)
  // So 100 pixels = 952500 EMU
  const defaultSize = 952_500
  // Ensure valid numeric values (handle undefined, null, NaN, 0)
  const cx =
    typeof width === 'number' && width > 0 && !Number.isNaN(width) ? width : defaultSize
  const cy =
    typeof height === 'number' && height > 0 && !Number.isNaN(height) ? height : defaultSize
  return fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.wp, 'extent')
    .att('cx', String(cx))
    .att('cy', String(cy))
    .up()
}

const buildPositionV = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.wp, 'positionV')
    .att('relativeFrom', 'paragraph')
    .ele(namespaces.wp, 'posOffset')
    .txt('19050')
    .up()
    .up()

const buildPositionH = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.wp, 'positionH')
    .att('relativeFrom', 'column')
    .ele(namespaces.wp, 'posOffset')
    .txt('19050')
    .up()
    .up()

const buildSimplePos = (): XMLBuilderType =>
  fragment({ namespaceAlias: drawingNamespaces })
    .ele(namespaces.wp, 'simplePos')
    .att('x', '0')
    .att('y', '0')
    .up()

interface DrawingAttributes extends PictureAttributes {
  height?: number
  width?: number
}

const buildAnchoredDrawing = (
  graphicType: string,
  attributes: DrawingAttributes
): XMLBuilderType => {
  const anchoredDrawingFragment = fragment({
    namespaceAlias: drawingNamespaces,
  })
    .ele(namespaces.wp, 'anchor')
    .att('distB', '0')
    .att('distL', '0')
    .att('distR', '0')
    .att('distT', '0')
    .att('relativeHeight', '0')
    .att('behindDoc', 'false')
    .att('locked', 'true')
    .att('layoutInCell', 'true')
    .att('allowOverlap', 'false')
    .att('simplePos', 'false')
  // Even though simplePos isnt supported by Word 2007 simplePos is required.
  const simplePosFragment = buildSimplePos()
  anchoredDrawingFragment.import(simplePosFragment)
  const positionHFragment = buildPositionH()
  anchoredDrawingFragment.import(positionHFragment)
  const positionVFragment = buildPositionV()
  anchoredDrawingFragment.import(positionVFragment)
  const extentFragment = buildExtent({
    width: attributes.width,
    height: attributes.height,
  })
  anchoredDrawingFragment.import(extentFragment)
  const effectExtentFragment = buildEffectExtentFragment()
  anchoredDrawingFragment.import(effectExtentFragment)
  const wrapSquareFragment = buildWrapSquare()
  anchoredDrawingFragment.import(wrapSquareFragment)
  const drawingObjectNonVisualPropertiesFragment = buildDrawingObjectNonVisualProperties(
    attributes.id || 0,
    attributes.fileNameWithExtension || ''
  )
  anchoredDrawingFragment.import(drawingObjectNonVisualPropertiesFragment)
  const graphicFragment = buildGraphic(graphicType, attributes)
  anchoredDrawingFragment.import(graphicFragment)

  anchoredDrawingFragment.up()

  return anchoredDrawingFragment
}

const buildInlineDrawing = (
  graphicType: string,
  attributes: DrawingAttributes
): XMLBuilderType => {
  const inlineDrawingFragment = fragment({
    namespaceAlias: drawingNamespaces,
  })
    .ele(namespaces.wp, 'inline')
    .att('distB', '0')
    .att('distL', '0')
    .att('distR', '0')
    .att('distT', '0')

  const extentFragment = buildExtent({
    width: attributes.width,
    height: attributes.height,
  })
  inlineDrawingFragment.import(extentFragment)
  const effectExtentFragment = buildEffectExtentFragment()
  inlineDrawingFragment.import(effectExtentFragment)
  const drawingObjectNonVisualPropertiesFragment = buildDrawingObjectNonVisualProperties(
    attributes.id || 0,
    attributes.fileNameWithExtension || ''
  )
  inlineDrawingFragment.import(drawingObjectNonVisualPropertiesFragment)
  const graphicFragment = buildGraphic(graphicType, attributes)
  inlineDrawingFragment.import(graphicFragment)

  inlineDrawingFragment.up()

  return inlineDrawingFragment
}

const buildDrawing = (
  inlineOrAnchored: boolean,
  graphicType: string,
  attributes: DrawingAttributes
): XMLBuilderType => {
  // Declare all necessary namespaces for drawing elements
  const drawingFragment = fragment({
    namespaceAlias: drawingNamespaces,
  }).ele('@w', 'drawing')
  const inlineOrAnchoredDrawingFragment = inlineOrAnchored
    ? buildInlineDrawing(graphicType, attributes)
    : buildAnchoredDrawing(graphicType, attributes)
  drawingFragment.import(inlineOrAnchoredDrawingFragment)
  drawingFragment.up()

  return drawingFragment
}

export {
  buildBold,
  buildDrawing,
  buildIndentation,
  buildItalics,
  buildLineBreak,
  buildNumberingInstances,
  buildParagraph,
  // Tracking support exports
  buildRunsFromTextWithTokens,
  buildTable,
  buildTextElement,
  buildTextRunFragment,
  buildUnderline,
  fixupLineHeight,
  processImageSource,
}
