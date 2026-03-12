// @ts-check

import {
  convertSVGtoPNG,
  downloadImageToBase64,
  getMimeType,
  guessMimeTypeFromBase64,
  isSVG,
  parseSVGDimensions,
} from '../src/utils/image'

/**
 * @param {number[]} values
 * @returns {string}
 */
const toBase64 = (values) => Buffer.from(Uint8Array.from(values)).toString('base64')

const makeOffscreenCanvas = (options = {}) => {
  const drawImage = vi.fn()
  const context = options.noContext ? null : { drawImage }

  return class FakeOffscreenCanvas {
    getContext() {
      return context
    }

    async convertToBlob() {
      const pngBytes = options.pngBytes ?? [0x89, 0x50, 0x4e, 0x47]
      return new Blob([Uint8Array.from(pngBytes)], { type: 'image/png' })
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'fetch')
  Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
  Reflect.deleteProperty(globalThis, 'createImageBitmap')
})

describe('image node utilities', () => {
  test('detects tiff in both byte orders and unknown types', () => {
    expect(guessMimeTypeFromBase64(toBase64([0x49, 0x49, 0x2a, 0x00]))).toBe('image/tiff')
    expect(guessMimeTypeFromBase64(toBase64([0x4d, 0x4d, 0x00, 0x2a]))).toBe('image/tiff')
    expect(guessMimeTypeFromBase64(toBase64([0x01, 0x02, 0x03, 0x04]))).toBe(false)
  })

  test('detects mime type from path and falls back to base64', () => {
    expect(getMimeType('photo.tiff')).toBe('image/tiff')
    expect(getMimeType('https://cdn.example.com/asset.webp?x=1#hash')).toBe('image/webp')
    expect(getMimeType('untyped-source', toBase64([0x42, 0x4d, 0x00]))).toBe('image/bmp')
    expect(getMimeType('untyped-source')).toBe(false)
  })

  test('identifies svg aliases', () => {
    expect(isSVG('image/svg+xml')).toBe(true)
    expect(isSVG('svg')).toBe(true)
    expect(isSVG('icon.svg')).toBe(true)
    expect(isSVG('image/jpeg')).toBe(false)
  })

  test('parses svg dimensions with unit conversion and viewBox fallback', () => {
    expect(parseSVGDimensions('<svg width="2in" height="25.4mm"></svg>')).toEqual({
      height: 96,
      width: 192,
    })

    expect(parseSVGDimensions('<svg width="300" viewBox="0 0 600 400"></svg>')).toEqual({
      height: 200,
      width: 300,
    })

    expect(parseSVGDimensions('<svg height="90" viewBox="0 0 3 1"></svg>')).toEqual({
      height: 90,
      width: 270,
    })
  })

  test('returns null when svg conversion backends are unavailable', async () => {
    await expect(
      convertSVGtoPNG(toBase64([0x3c, 0x73, 0x76, 0x67]), 16, 16)
    ).resolves.toBeNull()
  })

  test('converts svg via canvas when browser APIs are present', async () => {
    globalThis.OffscreenCanvas = makeOffscreenCanvas({ pngBytes: [0x10, 0x20, 0x30] })
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: async () => new Blob([Uint8Array.from([0x3c, 0x73, 0x76, 0x67])]),
      ok: true,
      status: 200,
      statusText: 'OK',
    })
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({})

    await expect(convertSVGtoPNG(toBase64([0x3c, 0x73, 0x76, 0x67]), 12, 12)).resolves.toBe(
      toBase64([0x10, 0x20, 0x30])
    )
  })

  test('returns null when canvas context is unavailable', async () => {
    globalThis.OffscreenCanvas = makeOffscreenCanvas({ noContext: true })
    await expect(
      convertSVGtoPNG(toBase64([0x3c, 0x73, 0x76, 0x67]), 12, 12)
    ).resolves.toBeNull()
  })

  test('returns null when canvas bitmap decode fails', async () => {
    globalThis.OffscreenCanvas = makeOffscreenCanvas()
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: async () => new Blob([Uint8Array.from([0x3c, 0x73, 0x76, 0x67])]),
      ok: true,
      status: 200,
      statusText: 'OK',
    })
    globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error('decode failed'))

    await expect(
      convertSVGtoPNG(toBase64([0x3c, 0x73, 0x76, 0x67]), 12, 12)
    ).resolves.toBeNull()
  })

  test('downloads image payloads and base64-encodes them', async () => {
    const blob = new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], {
      type: 'application/octet-stream',
    })

    const fetchMock = vi.fn().mockResolvedValue({
      blob: async () => blob,
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    globalThis.fetch = fetchMock

    await expect(downloadImageToBase64('https://example.com/x.png', 100)).resolves.toBe(
      toBase64([0x89, 0x50, 0x4e, 0x47])
    )
  })

  test('normalizes timeout and message-based failures', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce({
        message: 'custom-fetch-error',
        name: 'FetchFailure',
        toString: () => 'fetch-failure',
      })

    globalThis.fetch = fetchMock

    await expect(downloadImageToBase64('https://example.com/timeout', 10)).rejects.toThrow(
      'Request timeout after 10ms'
    )
    await expect(downloadImageToBase64('https://example.com/failure')).rejects.toThrow(
      'custom-fetch-error'
    )
  })

  test('encodes binary data as base64 using btoa', async () => {
    const expectedBase64 = Buffer.from(Uint8Array.from([0x11, 0x22, 0x33])).toString(
      'base64'
    )
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: async () =>
        new Blob([Uint8Array.from([0x11, 0x22, 0x33])], {
          type: 'application/octet-stream',
        }),
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    await expect(downloadImageToBase64('https://example.com/base64-test')).resolves.toBe(
      expectedBase64
    )
  })
})
