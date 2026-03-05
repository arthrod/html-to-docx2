/**
 * HTML to DOCX converter
 *
 * This module provides tools for converting HTML to DOCX format.
 */

// Main converter function (default export)
export { default as HTMLtoDOCX, default } from './html-to-docx'

// Re-export types for backwards compatibility
export type { DocumentMargins } from './schemas'

// Re-export tracking utilities
export * from './tracking'

// Re-export constants
export * from './constants'

// Re-export namespaces
export { default as namespaces } from './namespaces'
export type { OoxmlNamespaces } from './namespaces'

// ============================================================================
// Type definitions (matching index.d.ts namespace types)
// ============================================================================

export type Margins = {
  bottom?: number
  footer?: number
  gutter?: number
  header?: number
  left?: number
  right?: number
  top?: number
}

export type PageSize = {
  height?: number
  width?: number
}

export type Row = {
  cantSplit?: boolean
}

export type BorderOptions = {
  color?: string
  size?: number
}

export type TableOptions = {
  borderOptions?: BorderOptions
  row?: Row
}

export type TableBorderOptions = BorderOptions

export type LineNumberOptions = {
  countBy?: number
  distance?: number
  restart?: 'continuous' | 'newPage' | 'newSection'
  start?: number
}

export type HeadingSpacing = {
  after?: number
  before?: number
  line?: number
  lineRule?: 'atLeast' | 'auto' | 'exact'
}

export type HeadingStyleOptions = {
  bold?: boolean
  color?: string
  font?: string
  fontSize?: number
  italic?: boolean
  spacing?: HeadingSpacing
  underline?: boolean
}

export type HeadingOptions = {
  heading1?: HeadingStyleOptions
  heading2?: HeadingStyleOptions
  heading3?: HeadingStyleOptions
  heading4?: HeadingStyleOptions
  heading5?: HeadingStyleOptions
  heading6?: HeadingStyleOptions
}

export type ImageProcessing = {
  downloadTimeout?: number
  maxCacheEntries?: number
  maxCacheSize?: number
  maxImageSize?: number
  maxRetries?: number
  maxTimeout?: number
  minImageSize?: number
  minTimeout?: number
  retryDelayBase?: number
  suppressSharpWarning?: boolean
  svgHandling?: 'convert' | 'native'
  svgSanitization?: boolean
  verboseLogging?: boolean
}

export type NumberingOptions = {
  defaultOrderedListStyleType?: string
}

/** Tighter version of NumberingOptions using the actual DocxListStyleType union */
export type { DocxListStyleType, ListStyle, ListStyleDefaults } from './utils/list'

export type DocumentOptions = {
  complexScriptFontSize?: number | string
  createdAt?: Date
  creator?: string
  decodeUnicode?: boolean
  defaultLang?: string
  description?: string
  direction?: 'ltr' | 'rtl'
  font?: string
  fontSize?: number | string
  footer?: boolean
  footerType?: 'default' | 'even' | 'first'
  header?: boolean
  headerType?: 'default' | 'even' | 'first'
  heading?: HeadingOptions
  imageProcessing?: ImageProcessing
  keywords?: string[]
  lastModifiedBy?: string
  lineNumber?: boolean | LineNumberOptions
  lineNumberOptions?: LineNumberOptions
  margins?: Margins
  modifiedAt?: Date
  numbering?: NumberingOptions
  orientation?: 'landscape' | 'portrait'
  pageNumber?: boolean
  pageSize?: PageSize
  revision?: number
  skipFirstHeaderFooter?: boolean
  subject?: string
  table?: TableOptions
  title?: string
}

// ============================================================================
// Utility types
// ============================================================================

export type { ImageDimensions } from './utils/image-dimensions'
export type { VNode } from './utils/vnode'

// ============================================================================
// Internal document types (for advanced consumers / DocxDocument subclassing)
// Note: Margins, PageSize, LineNumberOptions, TableOptions, NumberingOptions
// are intentionally NOT re-exported from docx-document to avoid conflicts
// with the looser public-API versions defined above.
// ============================================================================

export type {
  DocxDocumentProperties,
  FileRelationship,
  FontTableObject,
  FooterObject,
  FooterResult,
  HeaderObject,
  HeaderResult,
  MediaFileInfo,
  NumberingObject,
  NumberingProperties,
  RelationshipObject,
  RelationshipXMLOutput,
  StyleObject,
  VTree,
} from './docx-document'
