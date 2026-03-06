/* biome-ignore-all lint/complexity/useOptionalChain: legacy code */
/* biome-ignore-all lint/style/useForOf: legacy code */
/* biome-ignore-all lint/nursery/useMaxParams: legacy code */
import { fragment, type XMLBuilder } from '../utils/xmlbuilder2'

import { isVNode, isVText, VNode } from '../vdom/index'
import createHTMLToVDOM from './html-parser'

type XMLBuilderType = XMLBuilder

import { defaultDocumentOptions, imageType, internalRelationship } from '../constants'
import namespaces from '../namespaces'
import { getImageDimensions } from '../utils/image-dimensions'
import { downloadAndCacheImage } from '../utils/image-to-base64'
import { sanitizeSVGVNode, validateSVGString } from '../utils/svg-sanitizer'
import { vNodeHasChildren } from '../utils/vnode'
// FIXME: remove the cyclic dependency
import * as xmlBuilder from './xml-builder'

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
  [key: string]: unknown
}

type VTextType = {
  text: string
  [key: string]: unknown
}

type VTree = VNodeType | VTextType | (VNodeType | VTextType)[]

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

// Types for DocxDocumentInstance
type MediaFileResponse = {
  fileContent: string
  fileNameWithExtension: string
  id: number
  isSVG?: boolean
}

type DocxDocumentInstance = {
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
  imageProcessing?: typeof defaultDocumentOptions.imageProcessing
  relationshipFilename: string
  _imageCache?: Map<string, string | null>
  _retryStats?: {
    finalFailures: number
    successAfterRetry: number
    totalAttempts: number
  }
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

// Regex for parsing numeric values from margin-left
const MARGIN_NUMBER_REGEX = /(\d+)/

// Inline elements that should be grouped into a single paragraph
const INLINE_ELEMENTS = [
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
]

// Check if a vNode is an inline element
const isInlineElement = (node: VNodeType | VTextType): boolean =>
  isVText(node) ||
  (isVNode(node) && INLINE_ELEMENTS.includes((node as VNodeType).tagName || ''))

// Elements that need special handling and should not be wrapped in inline grouping
const SPECIAL_BLOCK_ELEMENTS = [
  'img',
  'table',
  'figure',
  'ul',
  'ol',
  'blockquote',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'video',
  'audio',
  'iframe',
]

// Recursively check if a vNode contains any special block elements
const containsSpecialElements = (node: VNodeType | VTextType): boolean => {
  if (!isVNode(node)) return false
  const vNode = node as VNodeType
  if (SPECIAL_BLOCK_ELEMENTS.includes(vNode.tagName || '')) return true
  if (vNodeHasChildren(vNode)) {
    return (vNode.children || []).some((child) => containsSpecialElements(child))
  }
  return false
}

const serializeVNodeToSVG = (node: VNodeType | VTextType, isRoot = false): string => {
  if ((node as VTextType).text) {
    return (node as VTextType).text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  const vNode = node as VNodeType
  if (!vNode.tagName) {
    return ''
  }

  const attributes = vNode.properties?.attributes || {}
  const style = vNode.properties?.style || {}
  let svg = `<${vNode.tagName}`

  if (isRoot && vNode.tagName === 'svg' && !attributes.xmlns) {
    svg += ' xmlns="http://www.w3.org/2000/svg"'
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value) {
      const escapedValue = String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      svg += ` ${key}="${escapedValue}"`
    }
  })

  if (Object.keys(style).length > 0) {
    const styleString = Object.entries(style)
      .map(([key, value]) => `${key}:${value}`)
      .join(';')
    svg += ` style="${styleString}"`
  }

  const children = vNode.children || []
  if (children.length === 0) {
    svg += ' />'
    return svg
  }

  svg += '>'
  children.forEach((child) => {
    svg += serializeVNodeToSVG(child as VNodeType | VTextType, false)
  })
  svg += `</${vNode.tagName}>`

  return svg
}

const convertHTML = createHTMLToVDOM()

// Per-document cache helpers exposed for tests and advanced consumers.
export const clearImageCache = (docxDocumentInstance?: DocxDocumentInstance): number => {
  if (!docxDocumentInstance || !docxDocumentInstance._imageCache) {
    return 0
  }

  const cacheSize = docxDocumentInstance._imageCache.size
  docxDocumentInstance._imageCache.clear()
  docxDocumentInstance._retryStats = {
    totalAttempts: 0,
    successAfterRetry: 0,
    finalFailures: 0,
  }

  return cacheSize
}

export const getImageCacheStats = (docxDocumentInstance?: DocxDocumentInstance) => {
  if (!docxDocumentInstance || !docxDocumentInstance._imageCache) {
    return {
      size: 0,
      urls: [],
      successCount: 0,
      failureCount: 0,
      retryStats: { totalAttempts: 0, successAfterRetry: 0, finalFailures: 0 },
    }
  }

  const cacheValues = Array.from(docxDocumentInstance._imageCache.values())
  let successCount = 0
  let failureCount = 0

  cacheValues.forEach((value) => {
    if (value === 'FAILED' || value === null) {
      failureCount += 1
    } else {
      successCount += 1
    }
  })

  return {
    size: docxDocumentInstance._imageCache.size,
    urls: Array.from(docxDocumentInstance._imageCache.keys()),
    successCount,
    failureCount,
    retryStats: docxDocumentInstance._retryStats || {
      totalAttempts: 0,
      successAfterRetry: 0,
      finalFailures: 0,
    },
  }
}

export const buildImage = async (
  docxDocumentInstance: DocxDocumentInstance,
  vNode: VNodeType,
  maximumWidth: number | null = null
): Promise<XMLBuilderType | null> => {
  let response: MediaFileResponse | null = null
  let base64Uri: string | null = null
  try {
    const imageSource = vNode.properties?.src

    // Skip WebP images - Word doesn't support WebP format
    if (
      imageSource &&
      (imageSource.includes('.webp') || imageSource.includes('image/webp'))
    ) {
      return null
    }

    if (imageSource?.startsWith('http://') || imageSource?.startsWith('https://')) {
      base64Uri = await downloadAndCacheImage(
        docxDocumentInstance,
        imageSource,
        docxDocumentInstance.imageProcessing
      )
    } else if (imageSource) {
      base64Uri = decodeURIComponent(imageSource)
    }
    if (base64Uri) {
      response = await docxDocumentInstance.createMediaFile(base64Uri)
    }
  } catch (_error) {
    // NOOP
  }
  if (response) {
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

    const imageBuffer = base64ToUint8Array(response.fileContent)
    const imageProperties = getImageDimensions(imageBuffer)

    const imageFragment = await xmlBuilder.buildParagraph(
      vNode,
      {
        type: 'picture',
        inlineOrAnchored: true,
        relationshipId: documentRelsId,
        ...response,
        description: vNode.properties?.alt,
        maximumWidth: maximumWidth || docxDocumentInstance.availableDocumentSpace,
        originalWidth: imageProperties.width,
        originalHeight: imageProperties.height,
      },
      docxDocumentInstance
    )

    return imageFragment
  }
  return null
}

type VNodeObject = {
  level: number
  node: VNodeType | VTextType
  numberingId: number
  type: string
}

const getLastAccumulatorItem = <T>(items: T[]): T | undefined => items[items.length - 1]

export const buildList = async (
  vNode: VNodeType,
  docxDocumentInstance: DocxDocumentInstance,
  xmlFragment: XMLBuilderType,
  existingNumberingId: number | null = null,
  baseIndentLevel = 0
): Promise<void[]> => {
  const listElements: void[] = []

  let vNodeObjects: VNodeObject[] = [
    {
      node: vNode,
      level: baseIndentLevel,
      type: vNode.tagName || '',
      numberingId:
        existingNumberingId ||
        docxDocumentInstance.createNumbering(
          (vNode.tagName || 'ul') as 'ol' | 'ul',
          vNode.properties
        ),
    },
  ]
  while (vNodeObjects.length) {
    const tempVNodeObject = vNodeObjects.shift()!

    if (
      isVText(tempVNodeObject.node) ||
      (isVNode(tempVNodeObject.node) &&
        !['ul', 'ol', 'li'].includes((tempVNodeObject.node as VNodeType).tagName || ''))
    ) {
      const paragraphFragment = await xmlBuilder.buildParagraph(
        tempVNodeObject.node,
        {
          numbering: {
            levelId: tempVNodeObject.level,
            numberingId: tempVNodeObject.numberingId,
          },
        },
        docxDocumentInstance
      )

      xmlFragment.import(paragraphFragment)
    }

    const tempNode = tempVNodeObject.node as VNodeType
    if (
      tempNode.children &&
      tempNode.children.length &&
      ['ul', 'ol', 'li'].includes(tempNode.tagName || '')
    ) {
      const tempVNodeObjects = tempNode.children.reduce<VNodeObject[]>(
        (accumulator, childVNode) => {
          const childNode = childVNode as VNodeType
          if (['ul', 'ol'].includes(childNode.tagName || '')) {
            accumulator.push({
              node: childVNode,
              level: tempVNodeObject.level + 1,
              type: childNode.tagName || '',
              numberingId: docxDocumentInstance.createNumbering(
                (childNode.tagName || 'ul') as 'ol' | 'ul',
                childNode.properties
              ),
            })
          } else if (
            accumulator.length > 0 &&
            isVNode(accumulator[accumulator.length - 1].node) &&
            (
              (accumulator[accumulator.length - 1].node as VNodeType).tagName || ''
            ).toLowerCase() === 'p' &&
            // Don't append <li> elements to paragraphs - they need separate processing
            (childNode.tagName || '').toLowerCase() !== 'li'
          ) {
            const lastNode = accumulator[accumulator.length - 1].node as VNodeType
            if (lastNode.children) {
              lastNode.children.push(childVNode)
            }
          } else {
            const paragraphVNode = new VNode(
              'p',
              null,
              isVText(childVNode)
                ? [childVNode]
                : isVNode(childVNode)
                  ? (childNode.tagName || '').toLowerCase() === 'li'
                    ? [...(childNode.children || [])]
                    : [childVNode]
                  : []
            )
            accumulator.push({
              node: isVNode(childVNode)
                ? (childNode.tagName || '').toLowerCase() === 'li'
                  ? childVNode
                  : (childNode.tagName || '').toLowerCase() !== 'p'
                    ? paragraphVNode
                    : childVNode
                : paragraphVNode,
              level: tempVNodeObject.level,
              type: tempVNodeObject.type,
              numberingId: tempVNodeObject.numberingId,
            })
          }

          return accumulator
        },
        []
      )
      vNodeObjects = tempVNodeObjects.concat(vNodeObjects)
    }
  }

  return listElements
}

type ContentGroup = {
  children?: (VNodeType | VTextType)[]
  node?: VNodeType | VTextType
  type: 'block' | 'inline'
}

async function findXMLEquivalent(
  docxDocumentInstance: DocxDocumentInstance,
  vNode: VNodeType,
  xmlFragment: XMLBuilderType
): Promise<void> {
  // Check if this element contains list children (for paragraphs that wrap lists)
  const hasListChildren =
    vNodeHasChildren(vNode) &&
    (vNode.children || []).some(
      (child) => isVNode(child) && ['ul', 'ol'].includes((child as VNodeType).tagName || '')
    )

  // Reset list tracking for non-list elements to break consecutive list sequences
  // But don't reset for container elements that might wrap lists
  // Also don't reset for paragraphs that contain lists (Plate's list rendering pattern)
  const containerElements = [
    'ol',
    'ul',
    'html',
    'body',
    'div',
    'section',
    'article',
    'main',
  ]
  if (!containerElements.includes(vNode.tagName || '') && !hasListChildren) {
    resetListTracking()
  }

  if (
    vNode.tagName === 'div' &&
    (vNode.properties?.attributes?.class === 'page-break' ||
      (vNode.properties?.style && vNode.properties.style['page-break-after']))
  ) {
    const paragraphFragment = fragment({ namespaceAlias: { w: namespaces.w } })
      .ele('@w', 'p')
      .ele('@w', 'r')
      .ele('@w', 'br')
      .att('@w', 'type', 'page')
      .up()
      .up()
      .up()

    xmlFragment.import(paragraphFragment)
    return
  }

  // Handle block equation with OMML
  if (
    vNode.tagName === 'div' &&
    vNode.properties &&
    vNode.properties.attributes &&
    vNode.properties.attributes['data-equation-omml']
  ) {
    const ommlString = vNode.properties.attributes['data-equation-omml']
    try {
      // Create a paragraph containing the OMML
      const paragraphFragment = fragment({
        namespaceAlias: { w: namespaces.w },
      })
        .ele('@w', 'p')
        .ele('@w', 'pPr')
        .ele('@w', 'jc')
        .att('@w', 'val', 'center')
        .up()
        .up()
      // Parse and import the OMML
      const ommlFragment = fragment().ele(ommlString)
      paragraphFragment.first().import(ommlFragment)
      paragraphFragment.first().up()

      xmlFragment.import(paragraphFragment)
      return
    } catch {
      console.warn('Failed to parse OMML for block equation')
    }
  }

  // Handle div elements - check if they contain only inline children
  // Skip divs that contain special elements that need their own processing
  if (vNode.tagName === 'div' && vNodeHasChildren(vNode)) {
    // Check recursively if div contains any special elements that need dedicated handling
    const hasSpecialChildren = (vNode.children || []).some((child) =>
      containsSpecialElements(child)
    )

    // If div has special children, let default processing handle it
    if (hasSpecialChildren) {
      // Fall through to default processing at end of function
    } else {
      const allInline = (vNode.children || []).every((child) => isInlineElement(child))

      if (allInline && (vNode.children || []).length > 0) {
        // Wrap all inline children in a single paragraph
        const paragraphVNode = new VNode('p', vNode.properties, vNode.children)
        const paragraphFragment = await xmlBuilder.buildParagraph(
          paragraphVNode,
          {},
          docxDocumentInstance
        )
        xmlFragment.import(paragraphFragment)
        return
      }

      // Handle mixed content: group consecutive inline elements into paragraphs
      const groups: ContentGroup[] = []
      let currentInlineGroup: (VNodeType | VTextType)[] = []

      for (const child of vNode.children || []) {
        if (isInlineElement(child)) {
          currentInlineGroup.push(child)
        } else {
          // Flush current inline group as a paragraph
          if (currentInlineGroup.length > 0) {
            groups.push({ type: 'inline', children: currentInlineGroup })
            currentInlineGroup = []
          }
          // Add block element
          groups.push({ type: 'block', node: child })
        }
      }
      // Flush remaining inline group
      if (currentInlineGroup.length > 0) {
        groups.push({ type: 'inline', children: currentInlineGroup })
      }

      // Process groups
      for (const group of groups) {
        if (group.type === 'inline' && group.children) {
          const paragraphVNode = new VNode('p', null, group.children)
          const paragraphFragment = await xmlBuilder.buildParagraph(
            paragraphVNode,
            {},
            docxDocumentInstance
          )
          xmlFragment.import(paragraphFragment)
        } else if (group.node) {
          await convertVTreeToXML(docxDocumentInstance, group.node, xmlFragment)
        }
      }
      return
    }
  }

  switch (vNode.tagName) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      // Check if the heading has a bookmark anchor (an <a> or <span> with id but no href)
      let bookmarkId: string | null = null
      let headingVNode: VNodeType = vNode
      if (vNodeHasChildren(vNode) && (vNode.children || []).length > 0) {
        const firstChild = (vNode.children || [])[0] as VNodeType
        // Check both properties.id and properties.attributes.id for the bookmark anchor
        const anchorId = firstChild.properties?.id || firstChild.properties?.attributes?.id
        const hasHref =
          firstChild.properties?.href || firstChild.properties?.attributes?.href

        if (
          isVNode(firstChild) &&
          (firstChild.tagName === 'a' || firstChild.tagName === 'span') &&
          anchorId &&
          !hasHref
        ) {
          bookmarkId = anchorId
          // Create a modified vNode without the bookmark anchor
          headingVNode = new VNode(
            vNode.tagName,
            vNode.properties,
            (vNode.children || []).slice(1)
          )
        }
      }

      const headingFragment = await xmlBuilder.buildParagraph(
        headingVNode,
        {
          paragraphStyle: `Heading${vNode.tagName[1]}`,
          bookmarkId,
        },
        docxDocumentInstance
      )
      xmlFragment.import(headingFragment)
      return
    }
    case 'hr': {
      // Create horizontal rule as a paragraph with bottom border
      const hrFragment = fragment({ namespaceAlias: { w: namespaces.w } })
        .ele('@w', 'p')
        .ele('@w', 'pPr')
        .ele('@w', 'pBdr')
        .ele('@w', 'bottom')
        .att('@w', 'val', 'single')
        .att('@w', 'sz', '6')
        .att('@w', 'space', '1')
        .att('@w', 'color', 'auto')
        .up()
        .up()
        .up()
        .up()
      xmlFragment.import(hrFragment)
      return
    }
    case 'span':
    case 'strong':
    case 'b':
    case 'em':
    case 'i':
    case 'u':
    case 'ins':
    case 'strike':
    case 'del':
    case 's':
    case 'sub':
    case 'sup':
    case 'mark':
    case 'p': {
      // Check if paragraph contains list children (ul/ol)
      // If so, process them separately as lists
      if (vNodeHasChildren(vNode)) {
        const listChildren = (vNode.children || []).filter(
          (child) =>
            isVNode(child) && ['ul', 'ol'].includes((child as VNodeType).tagName || '')
        )
        if (listChildren.length > 0) {
          // Process non-list children as paragraph content first
          const nonListChildren = (vNode.children || []).filter(
            (child) =>
              !isVNode(child) || !['ul', 'ol'].includes((child as VNodeType).tagName || '')
          )
          if (nonListChildren.length > 0) {
            const modifiedVNode = new VNode(
              vNode.tagName,
              vNode.properties,
              nonListChildren
            )
            const paragraphFragment = await xmlBuilder.buildParagraph(
              modifiedVNode,
              {},
              docxDocumentInstance
            )
            xmlFragment.import(paragraphFragment)
          }
          // Process list children separately with tracking
          // Get indent level from parent paragraph
          const indentLevel = getIndentLevel(vNode)

          for (const listChild of listChildren) {
            const listNode = listChild as VNodeType
            // Get existing numbering ID for this type+level, if any
            const { lastListNumberingId: existingId } = getListTracking(
              listNode.tagName || '',
              indentLevel
            )

            let numberingId: number
            if (existingId !== null) {
              // Reuse existing numbering for this type+level
              numberingId = existingId
            } else {
              // Create new numbering for this type+level
              numberingId = docxDocumentInstance.createNumbering(
                (listNode.tagName || 'ul') as 'ol' | 'ul',
                listNode.properties
              )
            }

            setListTracking(listNode.tagName || '', numberingId, indentLevel)
            await buildList(
              listNode,
              docxDocumentInstance,
              xmlFragment,
              numberingId,
              indentLevel
            )
          }
          return
        }
      }
      const paragraphFragment = await xmlBuilder.buildParagraph(
        vNode,
        {},
        docxDocumentInstance
      )
      xmlFragment.import(paragraphFragment)
      return
    }
    case 'a':
    case 'blockquote':
    case 'code':
    case 'pre': {
      const paragraphFragment = await xmlBuilder.buildParagraph(
        vNode,
        {},
        docxDocumentInstance
      )
      xmlFragment.import(paragraphFragment)
      return
    }
    case 'figure':
      if (vNodeHasChildren(vNode)) {
        // Helper to find and process img elements recursively
        const processImageInNode = async (node: VNodeType | VTextType): Promise<void> => {
          if (!isVNode(node)) return
          const vn = node as VNodeType
          if (vn.tagName === 'img') {
            const imageFragment = await buildImage(docxDocumentInstance, vn)
            if (imageFragment) {
              xmlFragment.import(imageFragment)
            }
            return
          }
          if (vNodeHasChildren(vn)) {
            for (const child of vn.children || []) {
              await processImageInNode(child)
            }
          }
        }

        for (let index = 0; index < (vNode.children || []).length; index++) {
          const childVNode = (vNode.children || [])[index] as VNodeType
          if (childVNode.tagName === 'table') {
            const tableFragment = await xmlBuilder.buildTable(
              childVNode,
              {
                maximumWidth: docxDocumentInstance.availableDocumentSpace,
                rowCantSplit: docxDocumentInstance.tableRowCantSplit,
              },
              docxDocumentInstance
            )
            xmlFragment.import(tableFragment)
            // Adding empty paragraph for space after table
            const emptyParagraphFragment = await xmlBuilder.buildParagraph(null, {})
            xmlFragment.import(emptyParagraphFragment)
          } else if (childVNode.tagName === 'img') {
            const imageFragment = await buildImage(docxDocumentInstance, childVNode)
            if (imageFragment) {
              xmlFragment.import(imageFragment)
            }
          } else if (childVNode.tagName === 'figcaption') {
            // Handle image caption
            const captionFragment = await xmlBuilder.buildParagraph(
              childVNode,
              {},
              docxDocumentInstance
            )
            xmlFragment.import(captionFragment)
          } else if (childVNode.tagName === 'div') {
            // Look for img and figcaption inside div (static component pattern)
            await processImageInNode(childVNode)
            // Also check for figcaption in the div
            if (vNodeHasChildren(childVNode)) {
              for (const divChild of childVNode.children || []) {
                if (isVNode(divChild) && (divChild as VNodeType).tagName === 'figcaption') {
                  const captionFragment = await xmlBuilder.buildParagraph(
                    divChild,
                    {},
                    docxDocumentInstance
                  )
                  xmlFragment.import(captionFragment)
                }
              }
            }
          }
        }
      }
      return
    case 'table': {
      const tableFragment = await xmlBuilder.buildTable(
        vNode,
        {
          maximumWidth: docxDocumentInstance.availableDocumentSpace,
          rowCantSplit: docxDocumentInstance.tableRowCantSplit,
        },
        docxDocumentInstance
      )
      xmlFragment.import(tableFragment)
      // Adding empty paragraph for space after table
      const emptyParagraphFragment = await xmlBuilder.buildParagraph(null, {})
      xmlFragment.import(emptyParagraphFragment)
      return
    }
    case 'ol':
    case 'ul': {
      // Get indent level from the list element
      const indentLevel = getIndentLevel(vNode)

      // Get existing numbering ID for this type+level, if any
      const { lastListNumberingId: existingId } = getListTracking(
        vNode.tagName,
        indentLevel
      )

      let numberingId: number
      if (existingId !== null) {
        // Reuse existing numbering for this type+level
        numberingId = existingId
      } else {
        // Create a new numbering ID for a new list sequence
        numberingId = docxDocumentInstance.createNumbering(
          vNode.tagName as 'ol' | 'ul',
          vNode.properties
        )
      }

      // Update tracking with indent level
      setListTracking(vNode.tagName, numberingId, indentLevel)

      await buildList(vNode, docxDocumentInstance, xmlFragment, numberingId, indentLevel)
      return
    }
    case 'img': {
      const imageFragment = await buildImage(docxDocumentInstance, vNode)
      if (imageFragment) {
        xmlFragment.import(imageFragment)
      }
      return
    }
    case 'svg': {
      const svgSanitization =
        docxDocumentInstance.imageProcessing?.svgSanitization ??
        defaultDocumentOptions.imageProcessing.svgSanitization
      const verboseLogging =
        docxDocumentInstance.imageProcessing?.verboseLogging ??
        defaultDocumentOptions.imageProcessing.verboseLogging

      const sanitizedVNode = svgSanitization
        ? sanitizeSVGVNode(vNode, { enabled: true, verboseLogging })
        : vNode

      if (!sanitizedVNode) {
        return
      }

      const svgString = serializeVNodeToSVG(sanitizedVNode as VNodeType, true)
      if (!svgString.trim()) {
        return
      }

      if (svgSanitization && verboseLogging) {
        const validation = validateSVGString(svgString)
        if (!validation.valid) {
          // eslint-disable-next-line no-console
          console.warn('[SVG] Validation warnings:', validation.warnings)
        }
      }

      const base64SVG =
        typeof Buffer !== 'undefined'
          ? Buffer.from(svgString, 'utf-8').toString('base64')
          : globalThis.btoa(svgString)
      const imageVNode = {
        tagName: 'img',
        properties: {
          alt: vNode.properties?.attributes?.title || 'SVG image',
          src: `data:image/svg+xml;base64,${base64SVG}`,
        },
      } as VNodeType
      const imageFragment = await buildImage(docxDocumentInstance, imageVNode)
      if (imageFragment) {
        xmlFragment.import(imageFragment)
      }
      return
    }
    case 'br': {
      const linebreakFragment = await xmlBuilder.buildParagraph(null, {})
      xmlFragment.import(linebreakFragment)
      return
    }
    case 'head':
      return
  }
  if (vNodeHasChildren(vNode)) {
    for (let index = 0; index < (vNode.children || []).length; index++) {
      const childVNode = (vNode.children || [])[index]

      await convertVTreeToXML(docxDocumentInstance, childVNode, xmlFragment)
    }
  }
}

// Track consecutive lists to share numbering IDs
// Use a map to track numbering per indent level: { 'ol_0': id, 'ol_1': id, ... }
const listNumberingByLevel = new Map<string, number>()
let _lastListType: string | null = null
let _lastIndentLevel = 0

// Helper to extract indent level from vNode or parent paragraph
function getIndentLevel(
  vNode: VNodeType | null,
  parentVNode: VNodeType | null = null
): number {
  // Check margin-left style which indicates indent level
  const marginLeft =
    vNode?.properties?.style?.['margin-left'] ||
    parentVNode?.properties?.style?.['margin-left']

  if (marginLeft) {
    // Parse margin-left value (e.g., "24px", "48px")
    const match = marginLeft.match(MARGIN_NUMBER_REGEX)
    if (match) {
      const px = Number.parseInt(match[1], 10)
      // Assuming 24px per indent level in Plate
      // Subtract 1 because Plate uses indent=1 for first level, but Word uses level=0
      const plateIndent = Math.round(px / 24)
      return Math.max(0, plateIndent - 1)
    }
  }

  return 0
}

export async function convertVTreeToXML(
  docxDocumentInstance: DocxDocumentInstance,
  vTree: VTree | null,
  xmlFragment: XMLBuilderType
): Promise<XMLBuilderType | string> {
  if (!vTree) {
    return ''
  }
  if (Array.isArray(vTree) && vTree.length) {
    for (let index = 0; index < vTree.length; index++) {
      const vNode = vTree[index]
      await convertVTreeToXML(docxDocumentInstance, vNode, xmlFragment)
    }
  } else if (isVNode(vTree)) {
    await findXMLEquivalent(docxDocumentInstance, vTree as VNodeType, xmlFragment)
  } else if (isVText(vTree)) {
    const text = (vTree as VTextType).text
    if (!text || !text.trim()) {
      return xmlFragment
    }
    const paragraphFragment = await xmlBuilder.buildParagraph(
      vTree as VTextType,
      {},
      docxDocumentInstance
    )
    xmlFragment.import(paragraphFragment)
  }
  return xmlFragment
}

export function resetListTracking(): void {
  listNumberingByLevel.clear()
  _lastListType = null
  _lastIndentLevel = 0
}

export function getListTracking(
  listType: string,
  indentLevel = 0
): { lastListNumberingId: number | null } {
  const key = `${listType}_${indentLevel}`
  return {
    lastListNumberingId: listNumberingByLevel.get(key) || null,
  }
}

export function setListTracking(type: string, numberingId: number, indentLevel = 0): void {
  _lastListType = type
  _lastIndentLevel = indentLevel
  const key = `${type}_${indentLevel}`
  listNumberingByLevel.set(key, numberingId)
}

async function renderDocumentFile(
  docxDocumentInstance: DocxDocumentInstance
): Promise<XMLBuilderType> {
  // Reset list tracking at the start of each document render
  resetListTracking()

  if (!docxDocumentInstance._imageCache) {
    docxDocumentInstance._imageCache = new Map()
  }
  if (!docxDocumentInstance._retryStats) {
    docxDocumentInstance._retryStats = {
      finalFailures: 0,
      successAfterRetry: 0,
      totalAttempts: 0,
    }
  }

  const vTree = convertHTML(docxDocumentInstance.htmlString)

  const xmlFragment = fragment({ namespaceAlias: { w: namespaces.w } })

  const populatedXmlFragment = await convertVTreeToXML(
    docxDocumentInstance,
    vTree,
    xmlFragment
  )

  return populatedXmlFragment as XMLBuilderType
}

export default renderDocumentFile
