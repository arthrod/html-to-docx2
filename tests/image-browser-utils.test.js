/**
 * @file
 * Unit tests for browser-only image helpers.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  convertSVGtoPNG,
  downloadImageToBase64,
  getMimeType,
  guessMimeTypeFromBase64,
  isSVG,
  parseSVGDimensions,
} from '../src/utils/image-browser'

const toBase64 = (bytes) => Buffer.from(Uint8Array.from(bytes)).toString('base64')

const makeBlobResponse = (bytes) => {
  const blob = new Blob([Uint8Array.from(bytes)], {
    type: 'application/octet-stream',
  })

  return {
    blob: async () => blob,
    ok: true,
    status: 200,
    statusText: 'OK',
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
  Reflect.deleteProperty(globalThis, 'fetch')
})

describe('image-browser helpers', () => {
  it('detects mime types from base64 magic bytes', () => {
    expect(guessMimeTypeFromBase64(toBase64([0xff, 0xd8, 0xff]))).toBe('image/jpeg')
    expect(guessMimeTypeFromBase64(toBase64([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png')
    expect(guessMimeTypeFromBase64(toBase64([0x47, 0x49, 0x46]))).toBe('image/gif')
    expect(guessMimeTypeFromBase64(toBase64([0x42, 0x4d]))).toBe('image/bmp')
    expect(guessMimeTypeFromBase64(toBase64([0x4d, 0x4d, 0x00, 0x2a]))).toBe('image/tiff')
    expect(guessMimeTypeFromBase64(toBase64([0x00, 0x01, 0x02]))).toBe(false)
  })

  it('prefers extension for mime detection and falls back to base64', () => {
    expect(getMimeType('https://example.com/photo.jpeg')).toBe('image/jpeg')
    expect(getMimeType('/images/icon.svg?cache=1')).toBe('image/svg+xml')
    expect(getMimeType('not-a-url-without-ext', toBase64([0x47, 0x49, 0x46]))).toBe(
      'image/gif'
    )
    expect(getMimeType('not-a-url-without-ext')).toBe(false)
  })

  it('identifies svg identifiers correctly', () => {
    expect(isSVG('image/svg+xml')).toBe(true)
    expect(isSVG('file.svg')).toBe(true)
    expect(isSVG('.svg')).toBe(true)
    expect(isSVG('image/png')).toBe(false)
    expect(isSVG(null)).toBe(false)
  })

  it('extracts svg dimensions from attributes and viewBox fallback', () => {
    expect(parseSVGDimensions('<svg width="120" height="80"></svg>')).toEqual({
      height: 80,
      width: 120,
    })

    expect(parseSVGDimensions('<svg width="10cm" height="1in"></svg>')).toEqual({
      height: 96,
      width: 378,
    })

    expect(parseSVGDimensions('<svg height="150" viewBox="0 0 200 100"></svg>')).toEqual({
      height: 150,
      width: 300,
    })

    expect(parseSVGDimensions('<svg></svg>')).toEqual({
      height: 150,
      width: 300,
    })
  })

  it('returns null for svg->png conversion when canvas API is missing', async () => {
    const result = await convertSVGtoPNG(toBase64([0x3c, 0x73, 0x76, 0x67]), 10, 10)
    expect(result).toBeNull()
  })

  it('downloads binary image data as base64', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeBlobResponse([0x89, 0x50, 0x4e, 0x47]))

    const encoded = await downloadImageToBase64('https://example.com/test.png')

    expect(encoded).toBe(toBase64([0x89, 0x50, 0x4e, 0x47]))
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/test.png', {
      signal: expect.any(AbortSignal),
    })
  })

  it('throws timeout error when request aborts', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'

    globalThis.fetch = vi.fn().mockRejectedValue(abortError)

    await expect(downloadImageToBase64('https://example.com/hang', 1)).rejects.toThrow(
      'Request timeout after 1ms'
    )
  })

  it('throws for empty payloads', async () => {
    const emptyBlob = new Blob([], { type: 'application/octet-stream' })
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: async () => emptyBlob,
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    await expect(downloadImageToBase64('https://example.com/empty')).rejects.toThrow(
      'Empty response data received'
    )
  })

  it('throws for http error responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: async () => new Blob([Uint8Array.from([0x01])]),
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    await expect(downloadImageToBase64('https://example.com/missing')).rejects.toThrow(
      'HTTP 404: Not Found'
    )
  })
})
