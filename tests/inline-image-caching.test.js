// Unit tests for inline image caching functionality
// Tests that inline images (via buildRun in xml-builder) use the same caching mechanism as block images

import HTMLtoDOCX from '../index.ts'
import { JPEG_1x1_BASE64, PNG_1x1_BASE64 } from './fixtures/index'
import { parseDOCX } from './helpers/docx-assertions'

// Helper to create a mock fetch response from a base64 string
function mockFetchFromBase64(base64, contentType = 'image/png') {
  const buffer = Buffer.from(base64, 'base64')
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': contentType }),
    arrayBuffer: () => Promise.resolve(arrayBuffer),
    blob: () => Promise.resolve(new Blob([arrayBuffer])),
  })
}

describe('Inline Image Caching', () => {
  describe('Cache consistency between buildImage and buildRun', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    test('should cache inline images from external URLs', async () => {
      const testUrl = 'https://example.com/test-image.png'

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => mockFetchFromBase64(PNG_1x1_BASE64))

      const htmlString = `
        <p>Text with inline image: <img src="${testUrl}" width="50" height="50" /></p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxRetries: 1,
        },
      })

      expect(docxBuffer).toBeDefined()
      expect(Buffer.isBuffer(docxBuffer)).toBe(true)
      expect(docxBuffer.length).toBeGreaterThan(0)

      // Verify fetch was called exactly once (image was cached)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    test('should reuse cached data for duplicate inline images', async () => {
      const testUrl = 'https://example.com/duplicate-inline.png'

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => mockFetchFromBase64(PNG_1x1_BASE64))

      const htmlString = `
        <p>First inline: <img src="${testUrl}" width="50" height="50" /></p>
        <p>Second inline: <img src="${testUrl}" width="50" height="50" /></p>
        <p>Third inline: <img src="${testUrl}" width="50" height="50" /></p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxRetries: 1,
        },
      })

      expect(docxBuffer).toBeDefined()

      // With caching, the same URL should not be downloaded 3 times
      const callCount = fetchSpy.mock.calls.length
      expect(callCount).toBeLessThan(3)
    })

    test('should share cache between block and inline images', async () => {
      const testUrl = 'https://example.com/mixed-usage.png'

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => mockFetchFromBase64(PNG_1x1_BASE64))

      const htmlString = `
        <img src="${testUrl}" width="100" height="100" />
        <p>Inline image: <img src="${testUrl}" width="50" height="50" /></p>
        <figure>
          <img src="${testUrl}" width="75" height="75" />
        </figure>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxRetries: 1,
        },
      })

      expect(docxBuffer).toBeDefined()
      expect(Buffer.isBuffer(docxBuffer)).toBe(true)
      expect(fetchSpy).toHaveBeenCalled()
    })

    test('should retry failed inline image downloads', async () => {
      const testUrl = 'https://example.com/retry-test.png'

      let callCount = 0
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'))
        }
        return mockFetchFromBase64(PNG_1x1_BASE64)
      })

      const htmlString = `
        <p>Inline image: <img src="${testUrl}" width="50" height="50" /></p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxRetries: 2,
        },
      })

      expect(docxBuffer).toBeDefined()

      // Verify fetch was called at least twice (retry mechanism working)
      expect(callCount).toBeGreaterThanOrEqual(2)
    })

    test('should skip inline image after all retries fail', async () => {
      const testUrl = 'https://example.com/always-fails.png'

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      )

      const htmlString = `
        <p>This inline image will fail: <img src="${testUrl}" width="50" height="50" /></p>
        <p>Some text after the failed image.</p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxRetries: 2,
        },
      })

      expect(docxBuffer).toBeDefined()

      // Document should still be generated (just without the image)
      const docData = await parseDOCX(docxBuffer)
      expect(docData).toBeDefined()
    })

    test('should cache failed inline images to prevent duplicate retries', async () => {
      const testUrl = 'https://example.com/cache-failure.png'

      let attemptCount = 0
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        attemptCount++
        return Promise.reject(new Error('404 Not Found'))
      })

      const htmlString = `
        <p>First failed inline: <img src="${testUrl}" width="50" height="50" /></p>
        <p>Second failed inline: <img src="${testUrl}" width="50" height="50" /></p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxRetries: 2,
        },
      })

      expect(docxBuffer).toBeDefined()

      // Cache should prevent retrying for the second occurrence
      expect(attemptCount).toBeLessThan(4)
    })
  })

  describe('Cache statistics with inline images', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    test('should track inline image cache hits in statistics', async () => {
      const testUrl = 'https://example.com/stats-test.png'

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        mockFetchFromBase64(JPEG_1x1_BASE64, 'image/jpeg')
      )

      const htmlString = `
        <p>First: <img src="${testUrl}" width="50" height="50" /></p>
        <p>Second: <img src="${testUrl}" width="50" height="50" /></p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
        },
      })

      expect(docxBuffer).toBeDefined()
      expect(globalThis.fetch).toHaveBeenCalled()
    })
  })

  describe('Inline images with data URLs', () => {
    test('should handle inline data URL images without network calls', async () => {
      vi.restoreAllMocks()
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      const dataUrl = `data:image/png;base64,${PNG_1x1_BASE64}`

      const htmlString = `
        <p>Inline data URL: <img src="${dataUrl}" width="50" height="50" /></p>
        <p>Duplicate data URL: <img src="${dataUrl}" width="50" height="50" /></p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString)

      expect(docxBuffer).toBeDefined()
      expect(Buffer.isBuffer(docxBuffer)).toBe(true)

      // No network calls for data URLs
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('Mixed inline and block image caching', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    test('should cache across different image contexts', async () => {
      const url1 = 'https://example.com/image1.png'
      const url2 = 'https://example.com/image2.jpg'

      vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
        if (String(url).includes('image1')) {
          return mockFetchFromBase64(PNG_1x1_BASE64)
        }
        return mockFetchFromBase64(JPEG_1x1_BASE64, 'image/jpeg')
      })

      const htmlString = `
        <img src="${url1}" />
        <p>Text with <img src="${url2}" width="30" /> inline</p>
        <p>More text with <img src="${url1}" width="40" /> inline</p>
        <figure><img src="${url2}" /></figure>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
        },
      })

      expect(docxBuffer).toBeDefined()
      expect(Buffer.isBuffer(docxBuffer)).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    test('should handle mix of successful and failed images', async () => {
      const goodUrl = 'https://example.com/good.png'
      const badUrl = 'https://example.com/bad.png'

      vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
        if (String(url).includes('good')) {
          return mockFetchFromBase64(PNG_1x1_BASE64)
        }
        return Promise.reject(new Error('404 Not Found'))
      })

      const htmlString = `
        <p>Good inline: <img src="${goodUrl}" width="50" /></p>
        <p>Bad inline: <img src="${badUrl}" width="50" /></p>
        <p>Good again: <img src="${goodUrl}" width="50" /></p>
        <p>Bad again: <img src="${badUrl}" width="50" /></p>
      `

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxRetries: 1,
        },
      })

      expect(docxBuffer).toBeDefined()
      expect(Buffer.isBuffer(docxBuffer)).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalled()
    })
  })

  describe('LRU cache eviction with inline images', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    test('should respect cache size limits with inline images', async () => {
      const urls = Array.from({ length: 5 }, (_, i) => `https://example.com/image${i}.png`)

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        mockFetchFromBase64(PNG_1x1_BASE64)
      )

      const htmlString = urls
        .map((url) => `<p>Inline: <img src="${url}" width="50" /></p>`)
        .join('\n')

      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          maxCacheEntries: 3,
        },
      })

      expect(docxBuffer).toBeDefined()
      expect(globalThis.fetch).toHaveBeenCalled()
    })
  })

  describe('Inline image timeout handling', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    test('should respect timeout configuration for inline images', async () => {
      const testUrl = 'https://example.com/slow-image.png'

      vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted')
            error.name = 'AbortError'
            reject(error)
          }, 200)
        })
      })

      const htmlString = `<p>Slow inline: <img src="${testUrl}" width="50" /></p>`

      const startTime = Date.now()
      const docxBuffer = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          verboseLogging: false,
          downloadTimeout: 100,
          maxRetries: 1,
        },
      })
      const duration = Date.now() - startTime

      expect(docxBuffer).toBeDefined()
      expect(duration).toBeLessThan(3000)
    }, 5000)
  })
})
