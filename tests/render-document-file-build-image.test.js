// @ts-check

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { buildImage } from '../src/helpers/render-document-file'
import * as imageDimensions from '../src/utils/image-dimensions'
import * as imageToBase64 from '../src/utils/image-to-base64'
import * as xmlBuilder from '../src/helpers/xml-builder'

/**
 * @typedef {{
 *   createDocumentRelationships: (filename: string, type: string, target: string, targetMode?: string) => number
 *   createMediaFile: (base64Uri: string) => Promise<{ fileNameWithExtension: string fileContent: string id: number isSVG?: boolean }>
 *   availableDocumentSpace: number
 *   relationshipFilename: string
 *   imageProcessing?: Record<string, string | number | boolean>
 *   zip: {
 *     folder: (name: string) => {
 *       folder: (name: string) => {
 *         file: (name: string, content: Uint8Array, options?: { createFolders: boolean }) => void
 *       }
 *     }
 *   }
 * }} BuildImageDoc
 */

/** @returns {{ files: Array<{ name: string content: Uint8Array }> doc: BuildImageDoc }} */
function createDoc() {
  /** @type {Array<{ name: string content: Uint8Array }>} */
  const files = []

  /** @type {BuildImageDoc} */
  const doc = {
    availableDocumentSpace: 640,
    relationshipFilename: 'document.xml.rels',
    createDocumentRelationships: () => 77,
    createMediaFile: async () => ({
      fileNameWithExtension: 'image.png',
      fileContent: 'iVBORw0KGgo=',
      id: 3,
    }),
    zip: {
      folder: () => ({
        folder: () => ({
          file: (name, content) => {
            files.push({ name, content })
          },
        }),
      }),
    },
  }

  return { files, doc }
}

describe('render-document-file buildImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('skips webp sources before media processing', async () => {
    const { doc, files } = createDoc()
    const createMediaFileSpy = vi.spyOn(doc, 'createMediaFile')

    const result = await buildImage(doc, {
      properties: { src: 'https://example.com/photo.webp' },
      tagName: 'img',
    })

    expect(result).toBeNull()
    expect(createMediaFileSpy).not.toHaveBeenCalled()
    expect(files).toHaveLength(0)
  })

  test('builds paragraph for remote image with downloaded base64', async () => {
    const { doc, files } = createDoc()
    const paragraphResult =
      /** @type {import('../src/utils/xmlbuilder2').XMLBuilder} */ ({})

    const downloadSpy = vi
      .spyOn(imageToBase64, 'downloadAndCacheImage')
      .mockResolvedValue('data:image/png;base64,iVBORw0KGgo=')
    const dimensionsSpy = vi
      .spyOn(imageDimensions, 'getImageDimensions')
      .mockReturnValue({ height: 20, width: 10 })
    const paragraphSpy = vi
      .spyOn(xmlBuilder, 'buildParagraph')
      .mockResolvedValue(paragraphResult)

    const result = await buildImage(doc, {
      properties: { alt: 'logo', src: 'https://example.com/image.png' },
      tagName: 'img',
    })

    expect(downloadSpy).toHaveBeenCalledWith(
      doc,
      'https://example.com/image.png',
      undefined
    )
    expect(dimensionsSpy).toHaveBeenCalled()
    expect(paragraphSpy).toHaveBeenCalledTimes(1)
    expect(paragraphSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tagName: 'img' }),
      expect.objectContaining({
        description: 'logo',
        maximumWidth: doc.availableDocumentSpace,
        relationshipId: 77,
      }),
      doc
    )
    expect(files).toHaveLength(1)
    expect(result).toBe(paragraphResult)
  })

  test('returns null when media creation throws', async () => {
    const { doc } = createDoc()
    vi.spyOn(doc, 'createMediaFile').mockRejectedValue(new Error('decode failed'))

    const result = await buildImage(doc, {
      properties: { src: 'data:image/png;base64,iVBORw0KGgo=' },
      tagName: 'img',
    })

    expect(result).toBeNull()
  })
})
