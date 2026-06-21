import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getImageDimensions } from '../src/utils/image-dimensions'

/**
 * WHAT: These tests verify that the `getImageDimensions` utility correctly parses binary image
 * data (PNG, JPEG, GIF, WebP, BMP) and returns their pixel dimensions.
 *
 * WHY: Image dimension extraction is critical for correctly sizing images in DOCX output.
 * Incorrect dimensions would cause layout failures, stretched images, or missing images
 * in the generated documents.
 *
 * HOW: We construct minimal valid binary headers for each image format and verify that
 * `getImageDimensions` returns the expected width/height.
 */

// Minimal valid PNG (32x32) - 8-byte signature + IHDR chunk (25 bytes) = 33 bytes total
function createMinimalPNG(width = 32, height = 32) {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk: 4 bytes length (13), 4 bytes 'IHDR', 4+4 width/height (big-endian),
  // 1 byte bit depth, 1 byte color type, 1 byte compression, 1 byte filter, 1 byte interlace
  const ihdrData = new Uint8Array(25)
  const dv = new DataView(ihdrData.buffer)
  dv.setUint32(0, 13, false) // chunk length
  dv.setUint32(4, 0x49484452, false) // 'IHDR'
  dv.setUint32(8, width, false) // width (big-endian)
  dv.setUint32(12, height, false) // height (big-endian)
  dv.setUint8(16, 8) // bit depth
  dv.setUint8(17, 2) // color type (RGB)
  dv.setUint8(18, 0) // compression
  dv.setUint8(19, 0) // filter
  dv.setUint8(20, 0) // interlace

  // CRC (dummy)
  dv.setUint32(21, 0x12345678, false)

  const result = new Uint8Array(signature.length + ihdrData.length)
  result.set(signature)
  result.set(ihdrData, signature.length)
  return result
}

// Minimal valid JPEG (64x64) using SOF0 marker
function createMinimalJPEG(width = 64, height = 64) {
  const sof0Data = new Uint8Array(19)
  const dv = new DataView(sof0Data.buffer)

  // SOI marker
  dv.setUint16(0, 0xffd8, false)
  // APP0 (JFIF)
  dv.setUint16(2, 0xffe0, false)
  dv.setUint16(4, 16, false) // length
  dv.setUint32(6, 0x4a464946, false) // 'JFIF\0'
  dv.setUint8(10, 0) // version major
  dv.setUint8(11, 1) // version minor
  dv.setUint8(12, 0) // units
  dv.setUint16(13, 1, false) // X density
  dv.setUint16(15, 1, false) // Y density
  dv.setUint8(17, 0) // thumbnail width
  dv.setUint8(18, 0) // thumbnail height

  // SOF0 marker
  const sof0 = new Uint8Array(15)
  const sof0Dv = new DataView(sof0.buffer)
  sof0Dv.setUint16(0, 0xffc0, false) // SOF0
  sof0Dv.setUint16(2, 11, false) // length (8 + components*3)
  sof0Dv.setUint8(4, 8) // precision
  sof0Dv.setUint16(5, height, false) // height
  sof0Dv.setUint16(7, width, false) // width
  sof0Dv.setUint8(9, 3) // number of components
  sof0Dv.setUint8(10, 0) // component ID
  sof0Dv.setUint8(11, 0x11) // sampling
  sof0Dv.setUint8(12, 0) // quantization table
  sof0Dv.setUint8(13, 1) // component ID
  sof0Dv.setUint8(14, 0x11) // sampling

  // EOI marker
  const eoi = new Uint8Array([0xff, 0xd9])

  const result = new Uint8Array(sof0Data.length + sof0.length + eoi.length)
  result.set(sof0Data)
  result.set(sof0, sof0Data.length)
  result.set(eoi, sof0Data.length + sof0.length)
  return result
}

// Minimal valid GIF (16x16)
function createMinimalGIF(width = 16, height = 16) {
  const data = new Uint8Array(26)
  const dv = new DataView(data.buffer)

  // Header
  dv.setUint32(0, 0x47494638, false) // 'GIF8'
  dv.setUint16(4, 0x3961, false) // '9a'

  // Logical screen descriptor
  dv.setUint16(6, width, true) // width (little-endian for GIF)
  dv.setUint16(8, height, true) // height
  dv.setUint8(10, 0) // packed fields
  dv.setUint8(11, 0) // background color
  dv.setUint8(12, 0) // pixel aspect ratio

  // Trailer (for minimal valid file)
  dv.setUint8(13, 0x3b) // ';'

  return data.slice(0, 14)
}

// Minimal valid WebP (24x24) - VP8L format
function createMinimalWebP(width = 24, height = 24) {
  const data = new Uint8Array(40)
  const dv = new DataView(data.buffer)

  // RIFF header
  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 32, true) // file size - 8 (little-endian)
  dv.setUint32(8, 0x57454250, false) // 'WEBP'

  // VP8L chunk
  dv.setUint32(12, 0x5650384c, false) // 'VP8L'
  dv.setUint32(16, 10, true) // chunk size

  // VP8L signature byte
  dv.setUint8(20, 0x2f) // signature

  // VP8L image data: 14 bits for width-1, 14 bits for height-1, little-endian
  const imageBits = BigInt((width - 1) | ((height - 1) << 14))
  dv.setUint32(21, Number(imageBits & 0xffffffffn), true)

  return data.slice(0, 25)
}

// Minimal valid JPEG with specific SOF marker
function createJPEG(width = 64, height = 64, marker = 0xc0) {
  const sofData = new Uint8Array(20)
  const dv = new DataView(sofData.buffer)

  dv.setUint16(0, 0xffd8, false) // SOI
  dv.setUint16(2, 0xffe0, false) // APP0
  dv.setUint16(4, 16, false) // length
  dv.setUint32(6, 0x4a464946, false) // 'JFIF\0'
  dv.setUint8(10, 0) // version major
  dv.setUint8(11, 1) // version minor
  dv.setUint8(12, 0) // units
  dv.setUint16(13, 1, false) // X density
  dv.setUint16(15, 1, false) // Y density
  dv.setUint8(17, 0) // thumbnail width
  dv.setUint8(18, 0) // thumbnail height
  // 20 bytes total for SOI + APP0

  const sof = new Uint8Array(15)
  const sofDv = new DataView(sof.buffer)
  sofDv.setUint8(0, 0xff)
  sofDv.setUint8(1, marker)
  sofDv.setUint16(2, 11, false) // length
  sofDv.setUint8(4, 8) // precision
  sofDv.setUint16(5, height, false) // height
  sofDv.setUint16(7, width, false) // width
  sofDv.setUint8(9, 3) // components

  const eoi = new Uint8Array([0xff, 0xd9])

  const result = new Uint8Array(sofData.length + sof.length + eoi.length)
  result.set(sofData)
  result.set(sof, sofData.length)
  result.set(eoi, sofData.length + sof.length)
  return result
}

// Minimal valid WebP VP8 (lossy)
function createWebPVP8(width = 24, height = 24) {
  const data = new Uint8Array(40)
  const dv = new DataView(data.buffer)

  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 32, true) // file size - 8
  dv.setUint32(8, 0x57454250, false) // 'WEBP'
  dv.setUint32(12, 0x56503820, false) // 'VP8 ' (space at end)
  dv.setUint8(15, 0x20) // VP8 internal space identifier

  dv.setUint16(26, width, true) // width
  dv.setUint16(28, height, true) // height

  return data.slice(0, 30)
}

// Minimal valid BMP (48x48) with BITMAPINFOHEADER (40 bytes)
function createMinimalBMP(width = 48, height = 48) {
  const data = new Uint8Array(54)
  const dv = new DataView(data.buffer)

  // BMP header
  dv.setUint16(0, 0x4d42, true) // 'BM'
  dv.setUint32(2, 54, true) // file size
  dv.setUint32(6, 0, true) // reserved
  dv.setUint32(10, 54, true) // pixel data offset

  // DIB header (BITMAPINFOHEADER)
  dv.setUint32(14, 40, true) // header size
  dv.setUint32(18, width, true) // width (32-bit signed)
  dv.setUint32(22, height, true) // height (32-bit signed)
  dv.setUint16(26, 1, true) // planes
  dv.setUint16(28, 24, true) // bit count

  return data.slice(0, 54)
}

describe('Image Dimensions', () => {
  describe('getImageDimensions', () => {
    it('should return default dimensions for empty buffer', () => {
      const result = getImageDimensions(new Uint8Array(0))
      expect(result).toEqual({ width: 100, height: 100, type: 'unknown' })
    })

    it('should return default dimensions for unknown format', () => {
      const unknown = new Uint8Array([0x00, 0x01, 0x02, 0x03])
      const result = getImageDimensions(unknown)
      expect(result).toEqual({ width: 100, height: 100, type: 'unknown' })
    })

    it('should parse PNG dimensions (32x32)', () => {
      const result = getImageDimensions(createMinimalPNG(32, 32))
      expect(result).toEqual({ width: 32, height: 32, type: 'png' })
    })

    it('should parse PNG dimensions (100x200)', () => {
      const result = getImageDimensions(createMinimalPNG(100, 200))
      expect(result).toEqual({ width: 100, height: 200, type: 'png' })
    })

    it('should parse PNG from ArrayBuffer', () => {
      const buffer = createMinimalPNG(32, 32).buffer
      expect(getImageDimensions(buffer)).toEqual({ width: 32, height: 32, type: 'png' })
    })

    it('should parse GIF dimensions (16x16)', () => {
      const result = getImageDimensions(createMinimalGIF(16, 16))
      expect(result).toEqual({ width: 16, height: 16, type: 'gif' })
    })

    it('should parse WebP dimensions (24x24)', () => {
      const result = getImageDimensions(createMinimalWebP(24, 24))
      expect(result).toEqual({ width: 24, height: 24, type: 'webp' })
    })

    it('should handle Buffer (Node.js) input', () => {
      const pngBuffer = Buffer.from(createMinimalPNG(32, 32))
      const result = getImageDimensions(pngBuffer)
      expect(result).toEqual({ width: 32, height: 32, type: 'png' })
    })

    it('should parse JPEG dimensions from SOF0 marker (0xC0)', () => {
      const result = getImageDimensions(createJPEG(100, 200, 0xc0))
      expect(result).toEqual({ width: 100, height: 200, type: 'jpg' })
    })

    it('should parse JPEG dimensions from SOF1 marker (0xC1)', () => {
      const result = getImageDimensions(createJPEG(150, 250, 0xc1))
      expect(result).toEqual({ width: 150, height: 250, type: 'jpg' })
    })

    it('should parse JPEG dimensions from SOF2 marker (0xC2)', () => {
      const result = getImageDimensions(createJPEG(300, 400, 0xc2))
      expect(result).toEqual({ width: 300, height: 400, type: 'jpg' })
    })

    it('should parse WebP VP8 (lossy) dimensions', () => {
      const result = getImageDimensions(createWebPVP8(24, 24))
      expect(result).toEqual({ width: 24, height: 24, type: 'webp' })
    })

    it('should parse BMP dimensions (48x48) with BITMAPINFOHEADER', () => {
      const result = getImageDimensions(createMinimalBMP(48, 48))
      expect(result).toEqual({ width: 48, height: 48, type: 'bmp' })
    })

    it('should return fallback for malformed JPEG', () => {
      const malformedJPEG = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00])
      const result = getImageDimensions(malformedJPEG)
      expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
    })

    it('should skip non-marker bytes in JPEG', () => {
      // Create a JPEG with some padding/garbage before a valid marker
      const jpeg = createJPEG(100, 100, 0xc0)
      const padded = new Uint8Array(jpeg.length + 2)
      padded.set(jpeg.slice(0, 3)) // SOI + 0xFF
      padded[3] = 0x00 // Non 0xFF after the initial 0xFF 0xD8 0xFF
      padded[4] = 0x00 // Non 0xFF
      padded.set(jpeg.slice(3), 5)
      const result = getImageDimensions(padded)
      expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
    })

    it('should return fallback for malformed WebP', () => {
      const malformedWebP = new Uint8Array([
        0x52,
        0x49,
        0x46,
        0x46, // 'RIFF'
        0x00,
        0x00,
        0x00,
        0x00, // size
        0x57,
        0x45,
        0x42,
        0x50, // 'WEBP'
        0x56,
        0x50,
        0x38,
        0x58, // 'VP8X' (not handled)
      ])
      const result = getImageDimensions(malformedWebP)
      expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
    })
  })
})
