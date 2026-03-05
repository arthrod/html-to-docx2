import { decode } from 'html-entities'
import { minify } from 'html-minifier-terser'
/* biome-ignore-all lint: legacy code */
import JSZip from 'jszip'
import { create } from 'xmlbuilder2'

import {
  commentsExtendedRelationshipType,
  commentsExtensibleRelationshipType,
  commentsIdsRelationshipType,
  commentsType,
  defaultDocumentOptions,
  defaultHTMLString,
  documentFileName,
  footerFileName,
  footerType,
  headerFileName,
  headerType,
  internalRelationship,
  peopleRelationshipType,
  relsFolderName,
  themeFileName,
  themeFolder,
  themeType,
  wordFolder,
} from './constants'
import DocxDocument from './docx-document'
import { renderDocumentFile } from './helpers'
import createHTMLToVDOM from './helpers/html-parser'
import type { DocumentOptions, Margins, PageSize } from './index'
import { relsXML } from './schemas'
import {
  cmRegex,
  cmToTWIP,
  inchRegex,
  inchToTWIP,
  pixelRegex,
  pixelToTWIP,
  pointRegex,
  pointToHIP,
} from './utils/unit-conversion'

interface VTree {
  children?: VTree[]
  properties?: Record<string, unknown>
  tagName?: string
  text?: string
}

interface NormalizedDocumentOptions {
  complexScriptFontSize?: number | null
  createdAt?: Date
  creator?: string
  decodeUnicode?: boolean
  defaultLang?: string
  description?: string
  direction?: 'ltr' | 'rtl'
  font?: string
  fontSize?: number | null
  footer?: boolean
  footerType?: 'default' | 'even' | 'first'
  header?: boolean
  headerType?: 'default' | 'even' | 'first'
  heading?: DocumentOptions['heading']
  imageProcessing?: DocumentOptions['imageProcessing']
  keywords?: string[]
  lastModifiedBy?: string
  lineNumber?: boolean | LineNumberOptions
  lineNumberOptions?: LineNumberOptions
  margins?: NormalizedMargins | null
  modifiedAt?: Date
  numbering?: NumberingOptions
  orientation?: 'landscape' | 'portrait'
  pageNumber?: boolean
  pageSize?: NormalizedPageSize | null
  revision?: number
  skipFirstHeaderFooter?: boolean
  subject?: string
  table?: TableOptions
  title?: string
}

interface LineNumberOptions {
  countBy?: number
  restart?: 'continuous' | 'newPage' | 'newSection'
  start?: number
}

interface NumberingOptions {
  defaultOrderedListStyleType?: string
}

interface TableOptions {
  row?: {
    cantSplit?: boolean
  }
}

interface NormalizedMargins {
  bottom?: number
  footer?: number
  gutter?: number
  header?: number
  left?: number
  right?: number
  top?: number
}

interface NormalizedPageSize {
  height?: number
  width?: number
}

const convertHTML = createHTMLToVDOM()

const mergeOptions = <T extends object>(options: T, patch: Partial<T>): T => ({
  ...options,
  ...patch,
})

const fixupFontSize = (fontSize: number | string | undefined): number | null => {
  let normalizedFontSize: number | null

  if (typeof fontSize === 'string' && pointRegex.test(fontSize)) {
    const matchedParts = fontSize.match(pointRegex)

    if (matchedParts) {
      normalizedFontSize = pointToHIP(Number.parseFloat(matchedParts[1]))
    } else {
      normalizedFontSize = null
    }
  } else if (fontSize !== undefined) {
    // assuming it is already in HIP
    normalizedFontSize =
      typeof fontSize === 'number' ? fontSize : Number.parseInt(fontSize, 10)
  } else {
    normalizedFontSize = null
  }

  return normalizedFontSize
}

const normalizeUnits = (
  dimensioningObject: Margins | PageSize | null | undefined,
  defaultDimensionsProperty: NormalizedMargins | NormalizedPageSize
): NormalizedMargins | NormalizedPageSize | null => {
  let normalizedUnitResult: Record<string, number> = {}

  if (typeof dimensioningObject === 'object' && dimensioningObject !== null) {
    Object.keys(dimensioningObject).forEach((key) => {
      const value = (dimensioningObject as Record<string, number | string | undefined>)[key]
      const defaultValue = (defaultDimensionsProperty as Record<string, number>)[key]

      if (typeof value === 'string' && pixelRegex.test(value)) {
        const matchedParts = value.match(pixelRegex)

        if (matchedParts) {
          normalizedUnitResult[key] = pixelToTWIP(Number.parseFloat(matchedParts[1]))
        }
      } else if (typeof value === 'string' && cmRegex.test(value)) {
        const matchedParts = value.match(cmRegex)

        if (matchedParts) {
          normalizedUnitResult[key] = cmToTWIP(Number.parseFloat(matchedParts[1]))
        }
      } else if (typeof value === 'string' && inchRegex.test(value)) {
        const matchedParts = value.match(inchRegex)

        if (matchedParts) {
          normalizedUnitResult[key] = inchToTWIP(Number.parseFloat(matchedParts[1]))
        }
      } else if (value !== undefined && value !== null && value !== 0 && value !== '0') {
        normalizedUnitResult[key] =
          typeof value === 'number' ? value : Number.parseInt(value, 10)
      } else {
        // incase value is something like 0
        normalizedUnitResult[key] = defaultValue
      }
    })
  } else {
    // eslint-disable-next-line no-param-reassign
    return null
  }

  return normalizedUnitResult as NormalizedMargins | NormalizedPageSize
}

const normalizeDocumentOptions = (
  documentOptions: DocumentOptions
): NormalizedDocumentOptions => {
  const result: NormalizedDocumentOptions = {}

  // Copy over non-transformed properties
  if (documentOptions.createdAt !== undefined) result.createdAt = documentOptions.createdAt
  if (documentOptions.creator !== undefined) result.creator = documentOptions.creator
  if (documentOptions.decodeUnicode !== undefined)
    result.decodeUnicode = documentOptions.decodeUnicode
  if (documentOptions.defaultLang !== undefined)
    result.defaultLang = documentOptions.defaultLang
  if (documentOptions.description !== undefined)
    result.description = documentOptions.description
  if (documentOptions.direction !== undefined) result.direction = documentOptions.direction
  if (documentOptions.font !== undefined) result.font = documentOptions.font
  if (documentOptions.footer !== undefined) result.footer = documentOptions.footer
  if (documentOptions.footerType !== undefined)
    result.footerType = documentOptions.footerType
  if (documentOptions.header !== undefined) result.header = documentOptions.header
  if (documentOptions.headerType !== undefined)
    result.headerType = documentOptions.headerType
  if (documentOptions.heading !== undefined) result.heading = documentOptions.heading
  if (documentOptions.imageProcessing !== undefined)
    result.imageProcessing = documentOptions.imageProcessing
  if (documentOptions.keywords !== undefined) result.keywords = documentOptions.keywords
  if (documentOptions.lastModifiedBy !== undefined)
    result.lastModifiedBy = documentOptions.lastModifiedBy
  if (documentOptions.lineNumber !== undefined)
    result.lineNumber = documentOptions.lineNumber
  if (documentOptions.lineNumberOptions !== undefined)
    result.lineNumberOptions = documentOptions.lineNumberOptions
  if (documentOptions.modifiedAt !== undefined)
    result.modifiedAt = documentOptions.modifiedAt
  if (documentOptions.numbering !== undefined) result.numbering = documentOptions.numbering
  if (documentOptions.orientation !== undefined)
    result.orientation = documentOptions.orientation
  if (documentOptions.pageNumber !== undefined)
    result.pageNumber = documentOptions.pageNumber
  if (documentOptions.revision !== undefined) result.revision = documentOptions.revision
  if (documentOptions.skipFirstHeaderFooter !== undefined)
    result.skipFirstHeaderFooter = documentOptions.skipFirstHeaderFooter
  if (documentOptions.subject !== undefined) result.subject = documentOptions.subject
  if (documentOptions.table !== undefined) result.table = documentOptions.table
  if (documentOptions.title !== undefined) result.title = documentOptions.title

  // Transform properties that need unit conversion
  if (documentOptions.pageSize !== undefined) {
    result.pageSize = normalizeUnits(
      documentOptions.pageSize,
      defaultDocumentOptions.pageSize as NormalizedPageSize
    ) as NormalizedPageSize | null
  }
  if (documentOptions.margins !== undefined) {
    result.margins = normalizeUnits(
      documentOptions.margins,
      defaultDocumentOptions.margins as NormalizedMargins
    ) as NormalizedMargins | null
  }

  // Transform font size properties
  if (documentOptions.fontSize !== undefined) {
    result.fontSize = fixupFontSize(documentOptions.fontSize)
  }
  if (documentOptions.complexScriptFontSize !== undefined) {
    result.complexScriptFontSize = fixupFontSize(documentOptions.complexScriptFontSize)
  }

  return result
}

// Ref: https://en.wikipedia.org/wiki/Office_Open_XML_file_formats
// http://officeopenxml.com/anatomyofOOXML.php
async function addFilesToContainer(
  zip: JSZip,
  htmlString: string | null,
  suppliedDocumentOptions: DocumentOptions,
  headerHTMLString?: string | null,
  footerHTMLString?: string | null
): Promise<JSZip> {
  const normalizedDocumentOptions = normalizeDocumentOptions(suppliedDocumentOptions)
  const documentOptions = {
    ...defaultDocumentOptions,
    ...normalizedDocumentOptions,
  }

  let headerHTML = headerHTMLString
  let contentHTML = htmlString
  let footerHTML = footerHTMLString

  if (documentOptions.header && !headerHTML) {
    // eslint-disable-next-line no-param-reassign
    headerHTML = defaultHTMLString
  }
  if (documentOptions.footer && !footerHTML) {
    // eslint-disable-next-line no-param-reassign
    footerHTML = defaultHTMLString
  }
  if (documentOptions.decodeUnicode) {
    headerHTML = decode(headerHTML as string) // eslint-disable-line no-param-reassign
    contentHTML = decode(contentHTML as string) // eslint-disable-line no-param-reassign
    footerHTML = decode(footerHTML as string) // eslint-disable-line no-param-reassign
  }

  // @ts-expect-error - complex type mismatch between normalized options and DocxDocumentProperties
  const docxDocument = new DocxDocument({
    zip,
    htmlString: contentHTML,
    ...documentOptions,
  })
  // Conversion to Word XML happens here
  // @ts-expect-error - DocxDocument implements DocxDocumentInstance with slight variations
  docxDocument.documentXML = await renderDocumentFile(docxDocument)

  // Create comments relationship if there are comments (populated by renderDocumentFile)
  if (docxDocument.comments.length > 0) {
    docxDocument.createDocumentRelationships(
      documentFileName,
      commentsType,
      'comments.xml',
      internalRelationship
    )
  }

  zip.folder(relsFolderName)!.file(
    '.rels',
    create({ encoding: 'UTF-8', standalone: true }, relsXML).toString({
      prettyPrint: true,
    }),
    { createFolders: false }
  )

  zip.folder('docProps')!.file('core.xml', docxDocument.generateCoreXML(), {
    createFolders: false,
  })

  if (docxDocument.header && headerHTML) {
    const vTree = convertHTML(headerHTML) as VTree

    docxDocument.relationshipFilename = headerFileName
    const { headerId, headerXML } = await docxDocument.generateHeaderXML(vTree)
    docxDocument.relationshipFilename = documentFileName
    const fileNameWithExt = `${headerType}${headerId}.xml`

    const relationshipId = docxDocument.createDocumentRelationships(
      docxDocument.relationshipFilename,
      headerType,
      fileNameWithExt,
      internalRelationship
    )

    zip
      .folder(wordFolder)!
      .file(fileNameWithExt, headerXML.toString({ prettyPrint: true }), {
        createFolders: false,
      })

    docxDocument.headerObjects.push({
      headerId,
      relationshipId,
      type: docxDocument.headerType,
    })
  }
  if (docxDocument.footer && footerHTML) {
    const vTree = convertHTML(footerHTML) as VTree

    docxDocument.relationshipFilename = footerFileName
    const { footerId, footerXML } = await docxDocument.generateFooterXML(vTree)
    docxDocument.relationshipFilename = documentFileName
    const fileNameWithExt = `${footerType}${footerId}.xml`

    const relationshipId = docxDocument.createDocumentRelationships(
      docxDocument.relationshipFilename,
      footerType,
      fileNameWithExt,
      internalRelationship
    )

    zip
      .folder(wordFolder)!
      .file(fileNameWithExt, footerXML.toString({ prettyPrint: true }), {
        createFolders: false,
      })

    docxDocument.footerObjects.push({
      footerId,
      relationshipId,
      type: docxDocument.footerType,
    })
  }

  const themeFileNameWithExt = `${themeFileName}.xml`
  docxDocument.createDocumentRelationships(
    docxDocument.relationshipFilename,
    themeType,
    `${themeFolder}/${themeFileNameWithExt}`,
    internalRelationship
  )
  zip
    .folder(wordFolder)!
    .folder(themeFolder)!
    .file(themeFileNameWithExt, docxDocument.generateThemeXML(), {
      createFolders: false,
    })

  zip
    .folder(wordFolder)!
    .file('document.xml', docxDocument.generateDocumentXML(), {
      createFolders: false,
    })
    .file('fontTable.xml', docxDocument.generateFontTableXML(), {
      createFolders: false,
    })
    .file('styles.xml', docxDocument.generateStylesXML(), {
      createFolders: false,
    })
    .file('numbering.xml', docxDocument.generateNumberingXML(), {
      createFolders: false,
    })
    .file('settings.xml', docxDocument.generateSettingsXML(), {
      createFolders: false,
    })
    .file('webSettings.xml', docxDocument.generateWebSettingsXML(), {
      createFolders: false,
    })

  // Add comment-related XML files if there are comments
  if (docxDocument.comments.length > 0) {
    zip
      .folder(wordFolder)!
      .file('comments.xml', docxDocument.generateCommentsXML(), {
        createFolders: false,
      })
      .file('commentsExtended.xml', docxDocument.generateCommentsExtendedXML(), {
        createFolders: false,
      })
      .file('commentsIds.xml', docxDocument.generateCommentsIdsXML(), {
        createFolders: false,
      })
      .file('commentsExtensible.xml', docxDocument.generateCommentsExtensibleXML(), {
        createFolders: false,
      })
      .file('people.xml', docxDocument.generatePeopleXML(), {
        createFolders: false,
      })

    // Add relationships for the 4 new comment-related files
    docxDocument.createDocumentRelationships(
      documentFileName,
      commentsExtendedRelationshipType,
      'commentsExtended.xml',
      internalRelationship
    )
    docxDocument.createDocumentRelationships(
      documentFileName,
      commentsIdsRelationshipType,
      'commentsIds.xml',
      internalRelationship
    )
    docxDocument.createDocumentRelationships(
      documentFileName,
      commentsExtensibleRelationshipType,
      'commentsExtensible.xml',
      internalRelationship
    )
    docxDocument.createDocumentRelationships(
      documentFileName,
      peopleRelationshipType,
      'people.xml',
      internalRelationship
    )
  }

  const relationshipXMLs = docxDocument.generateRelsXML()

  if (relationshipXMLs && Array.isArray(relationshipXMLs)) {
    relationshipXMLs.forEach(({ fileName, xmlString }) => {
      zip
        .folder(wordFolder)!
        .folder(relsFolderName)!
        .file(`${fileName}.xml.rels`, xmlString, {
          createFolders: false,
        })
    })
  }

  zip.file('[Content_Types].xml', docxDocument.generateContentTypesXML(), {
    createFolders: false,
  })

  return zip
}

type GenerateDocumentOptions = DocumentOptions & {
  preprocessing?: {
    skipHTMLMinify?: boolean
  }
}

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const resolveRuntime = (): any => {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof self !== 'undefined') return self
  if (typeof window !== 'undefined') return window
  if (typeof global !== 'undefined') return global
  return {}
}

const isNodeRuntime = (runtime: any): boolean =>
  Boolean(
    runtime && runtime.process && runtime.process.versions && runtime.process.versions.node
  )

const minifyHTMLString = async (
  htmlString: string | null | undefined
): Promise<string | null> => {
  try {
    if (typeof htmlString === 'string' || htmlString instanceof String) {
      return await minify(htmlString as string, {
        collapseWhitespace: true,
        removeComments: true,
      })
    }

    throw new Error('invalid html string')
  } catch {
    return null
  }
}

async function generateContainer(
  htmlString: string,
  headerHTMLString?: string | null,
  documentOptions: GenerateDocumentOptions = {},
  footerHTMLString?: string | null
) {
  const zip = new JSZip()
  const shouldSkipMinify = Boolean(documentOptions.preprocessing?.skipHTMLMinify)

  let contentHTML = htmlString
  let headerHTML = headerHTMLString
  let footerHTML = footerHTMLString

  if (htmlString && !shouldSkipMinify) {
    contentHTML = await minifyHTMLString(contentHTML)
  }
  if (headerHTMLString && !shouldSkipMinify) {
    headerHTML = await minifyHTMLString(headerHTML)
  }
  if (footerHTMLString && !shouldSkipMinify) {
    footerHTML = await minifyHTMLString(footerHTML)
  }

  await addFilesToContainer(
    zip,
    contentHTML,
    documentOptions as DocumentOptions,
    headerHTML,
    footerHTML
  )

  const buffer = await zip.generateAsync({ type: 'arraybuffer' })

  const runtime = resolveRuntime()
  const hasBuffer = Boolean(runtime?.Buffer && typeof runtime.Buffer.from === 'function')
  const hasBlob = typeof runtime?.Blob === 'function'

  if (isNodeRuntime(runtime) && hasBuffer) {
    return runtime.Buffer.from(new Uint8Array(buffer))
  }
  if (hasBlob) {
    return new runtime.Blob([buffer], {
      type: DOCX_MIME_TYPE,
    })
  }
  if (hasBuffer) {
    return runtime.Buffer.from(new Uint8Array(buffer))
  }

  throw new Error(
    'Add blob support using a polyfill eg https://github.com/bjornstar/blob-polyfill'
  )
}

export { addFilesToContainer }
export default generateContainer
