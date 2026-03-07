// @ts-check

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { VNode, VText } from '../src/vdom/index'

const buildParagraphMock = vi.fn()
const buildTableMock = vi.fn()
const sanitizeSVGVNodeMock = vi.fn()
const validateSVGStringMock = vi.fn()
const getImageDimensionsMock = vi.fn()

vi.mock('../src/helpers/xml-builder', () => ({
  buildParagraph: buildParagraphMock,
  buildTable: buildTableMock,
}))

vi.mock('../src/utils/svg-sanitizer', () => ({
  sanitizeSVGVNode: sanitizeSVGVNodeMock,
  validateSVGString: validateSVGStringMock,
}))

vi.mock('../src/utils/image-dimensions', () => ({
  getImageDimensions: getImageDimensionsMock,
}))

const { convertVTreeToXML } = await import('../src/helpers/render-document-file')

/**
 * @typedef {{
 *   imports: unknown[]
 *   xmlFragment: { import: (value: unknown) => void }
 * }} XmlCollector
 */

/** @returns {XmlCollector} */
function createXmlCollector() {
  /** @type {unknown[]} */
  const imports = []
  return {
    imports,
    xmlFragment: {
      import: (value) => {
        imports.push(value)
      },
    },
  }
}

/**
 * @typedef {{
 *   availableDocumentSpace: number
 *   relationshipFilename: string
 *   tableRowCantSplit: boolean
 *   imageProcessing: {
 *     svgSanitization: boolean
 *     verboseLogging: boolean
 *   }
 *   createDocumentRelationships: (filename: string, type: string, target: string, targetMode?: string) => number
 *   createMediaFile: (base64Uri: string) => Promise<{
 *     fileNameWithExtension: string
 *     fileContent: string
 *     id: number
 *   }>
 *   createNumbering: (type: 'ol' | 'ul', properties?: Record<string, string | number | boolean>) => number
 *   zip: {
 *     folder: (name: string) => {
 *       folder: (name: string) => {
 *         file: (name: string, content: Uint8Array, options?: { createFolders: boolean }) => void
 *       }
 *     }
 *   }
 * }} RenderDoc
 */

/** @returns {{ doc: RenderDoc collectWrites: () => string[] }} */
function createDoc() {
  /** @type {string[]} */
  const writes = []
  const doc = {
    availableDocumentSpace: 720,
    relationshipFilename: 'document.xml.rels',
    tableRowCantSplit: false,
    imageProcessing: {
      svgSanitization: true,
      verboseLogging: true,
    },
    createDocumentRelationships: () => 9,
    createMediaFile: async () => ({
      fileNameWithExtension: 'mock-image.png',
      fileContent:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBg0nJ0yQAAAAASUVORK5CYII=',
      id: 4,
    }),
    createNumbering: (() => {
      let id = 100
      return () => {
        id += 1
        return id
      }
    })(),
    zip: {
      folder: () => ({
        folder: () => ({
          file: (name) => {
            writes.push(name)
          },
        }),
      }),
    },
  }

  return { doc, collectWrites: () => writes }
}

describe('render-document-file convertVTreeToXML branch coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    buildParagraphMock.mockReset()
    buildTableMock.mockReset()
    sanitizeSVGVNodeMock.mockReset()
    validateSVGStringMock.mockReset()
    getImageDimensionsMock.mockReset()

    buildParagraphMock.mockResolvedValue({ type: 'paragraph-fragment' })
    buildTableMock.mockResolvedValue({ type: 'table-fragment' })
    sanitizeSVGVNodeMock.mockImplementation((node) => node)
    validateSVGStringMock.mockReturnValue({ valid: true, warnings: [] })
    getImageDimensionsMock.mockReturnValue({ height: 40, width: 80 })
  })

  test('returns empty string for null vTree and handles line breaks', async () => {
    const { doc } = createDoc()
    const { xmlFragment, imports } = createXmlCollector()

    const nullResult = await convertVTreeToXML(doc, null, xmlFragment)
    expect(nullResult).toBe('')

    await convertVTreeToXML(doc, new VNode('br'), xmlFragment)

    expect(buildParagraphMock).toHaveBeenCalledWith(null, {})
    expect(imports.length).toBeGreaterThanOrEqual(1)
  })

  test('handles paragraph/list splitting with indent-level tracking', async () => {
    const { doc } = createDoc()
    const { xmlFragment } = createXmlCollector()

    const paragraph = new VNode(
      'p',
      {
        style: {
          'margin-left': '48px',
        },
      },
      [
        new VText('Lead text'),
        new VNode('ul', {}, [new VNode('li', {}, [new VText('Nested')])]),
      ]
    )

    await convertVTreeToXML(doc, paragraph, xmlFragment)

    const numberingCalls = buildParagraphMock.mock.calls
      .map((call) => call[1])
      .filter((value) => value && typeof value === 'object' && 'numbering' in value)

    expect(buildParagraphMock).toHaveBeenCalled()
    expect(numberingCalls.length).toBeGreaterThan(0)
    expect(numberingCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ numbering: expect.objectContaining({ levelId: 1 }) }),
      ])
    )
  })

  test('handles figure children (table, image, caption, nested caption)', async () => {
    const { doc, collectWrites } = createDoc()
    const { xmlFragment, imports } = createXmlCollector()

    const figure = new VNode('figure', {}, [
      new VNode('table', {}, [new VNode('tr')]),
      new VNode('img', { src: 'data:image/png;base64,AAAA' }),
      new VNode('figcaption', {}, [new VText('Figure caption')]),
      new VNode('div', {}, [
        new VNode('img', { src: 'data:image/png;base64,BBBB' }),
        new VNode('figcaption', {}, [new VText('Nested caption')]),
      ]),
    ])

    await convertVTreeToXML(doc, figure, xmlFragment)

    expect(buildTableMock).toHaveBeenCalledTimes(1)
    expect(buildParagraphMock).toHaveBeenCalled()
    expect(collectWrites().length).toBeGreaterThanOrEqual(2)
    expect(imports.length).toBeGreaterThanOrEqual(4)
  })

  test('handles OMML parse failure and SVG validation warnings', async () => {
    const { doc } = createDoc()
    const { xmlFragment } = createXmlCollector()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Force the SVG sanitizer to drop one node, then pass one through.
    sanitizeSVGVNodeMock.mockReturnValueOnce(null).mockImplementation((node) => node)
    validateSVGStringMock.mockReturnValue({ valid: false, warnings: ['unsafe tag'] })

    await convertVTreeToXML(
      doc,
      new VNode('div', { attributes: { 'data-equation-omml': '<m:oMath' } }),
      xmlFragment
    )

    await convertVTreeToXML(
      doc,
      new VNode('svg', {
        attributes: {
          title: 'Inline SVG',
          viewBox: '0 0 10 10',
        },
      }),
      xmlFragment
    )

    await convertVTreeToXML(
      doc,
      new VNode('svg', {
        attributes: {
          title: 'Validated SVG',
          viewBox: '0 0 10 10',
        },
      }),
      xmlFragment
    )

    expect(warnSpy).toHaveBeenCalled()
    expect(validateSVGStringMock).toHaveBeenCalled()
  })
})
