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

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'fetch')
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

    globalThis.fetch = /** @type {typeof fetch} */ (fetchMock)

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

    globalThis.fetch = /** @type {typeof fetch} */ (fetchMock)

    await expect(downloadImageToBase64('https://example.com/timeout', 10)).rejects.toThrow(
      'Request timeout after 10ms'
    )
    await expect(downloadImageToBase64('https://example.com/failure')).rejects.toThrow(
      'custom-fetch-error'
    )
  })
})
