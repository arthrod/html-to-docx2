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

// Minimal valid JPEG (64x64) using SOF0 marker
function createMinimalJPEG(width = 64, height = 64) {
  const result = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0, // SOI + APP0
    0x00,
    0x10, // APP0 length
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00, // 'JFIF\0'
    0x01,
    0x01,
    0x00,
    0x00,
    0x01,
    0x00,
    0x01,
    0x00,
    0x00, // APP0 data
    0xff,
    0xc0, // SOF0
    0x00,
    0x11, // length
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff, // height
    (width >> 8) & 0xff,
    width & 0xff, // width
    0x03, // components
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01, // component data
    0xff,
    0xd9, // EOI
  ])
  return result
}

// Minimal valid BMP (48x48)
function createMinimalBMP(width = 48, height = 48) {
  const data = new Uint8Array(54)
  const dv = new DataView(data.buffer)

  // BMP header
  dv.setUint8(0, 0x42) // 'B'
  dv.setUint8(1, 0x4d) // 'M'
  dv.setUint32(2, 54, true) // file size
  dv.setUint32(6, 0, true) // reserved
  dv.setUint32(10, 54, true) // pixel data offset

  // DIB header (BITMAPINFOHEADER)
  dv.setUint32(14, 40, true) // header size
  dv.setUint32(18, width, true) // width
  dv.setUint32(22, height, true) // height
  dv.setUint16(26, 1, true) // planes
  dv.setUint16(28, 24, true) // bit count

  return data.slice(0, 54)
}

// Minimal JPEG with SOF1
function createMinimalJPEG_SOF1(width = 64, height = 64) {
  const result = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc1, // SOI + SOF1
    0x00,
    0x0b, // length
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff, // height
    (width >> 8) & 0xff,
    width & 0xff, // width
    0x03,
    0x00,
    0x11,
    0x00,
    0x01,
    0x11, // components
  ])
  return result
}

// Minimal JPEG with SOF2
function createMinimalJPEG_SOF2(width = 64, height = 64) {
  const result = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc2, // SOI + SOF2
    0x00,
    0x0b, // length
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff, // height
    (width >> 8) & 0xff,
    width & 0xff, // width
    0x03,
    0x00,
    0x11,
    0x00,
    0x01,
    0x11, // components
  ])
  return result
}

// Malformed WebP
function createMalformedWebP() {
  const data = new Uint8Array(20)
  const dv = new DataView(data.buffer)

  // RIFF header
  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 12, true) // file size - 8 (little-endian)
  dv.setUint32(8, 0x57454250, false) // 'WEBP'
  // VP8X or something unsupported
  dv.setUint32(12, 0x56503858, false) // 'VP8X'

  return data
}

// Malformed JPEG
function createMalformedJPEG() {
  const result = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0, // SOI + APP0
    0x00,
    0x10,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    // EOI
    0xff,
    0xd9,
  ])
  return result
}

// JPEG with padding bytes between segments
function createJPEGPadded(width = 48, height = 48) {
  const result = new Uint8Array([
    0xff,
    0xd8,
    0xff, // SOI + start of APP0
    0xe0, // APP0 marker
    0x00,
    0x04, // length
    0x00,
    0x00, // app0 extra data (length includes 2-byte length itself)
    // padding bytes:
    0x00,
    0x00,
    0x00,
    // SOF0:
    0xff,
    0xc0,
    0x00,
    0x11, // length
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff, // height
    (width >> 8) & 0xff,
    width & 0xff, // width
    0x03, // components
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01, // component data
    0xff,
    0xd9, // EOI
  ])
  return result
}

// WebP VP8 (Lossy)
function createMinimalWebPLossy(width = 30, height = 30) {
  const data = new Uint8Array(30)
  const dv = new DataView(data.buffer)

  // RIFF header
  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 22, true) // file size - 8 (little-endian)
  dv.setUint32(8, 0x57454250, false) // 'WEBP'

  // VP8 chunk
  dv.setUint32(12, 0x56503820, false) // 'VP8 ' (0x20 is space)
  dv.setUint32(16, 10, true) // chunk size

  // VP8 frame header starts here.
  // Bytes 23-25 are the sync code 9D 01 2A
  dv.setUint8(23, 0x9d)
  dv.setUint8(24, 0x01)
  dv.setUint8(25, 0x2a)

  // width in bytes 26, 27
  dv.setUint16(26, width, true)
  // height in bytes 28, 29
  dv.setUint16(28, height, true)

  return data
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

    it('should parse BMP dimensions (48x48)', () => {
      const result = getImageDimensions(createMinimalBMP(48, 48))
      expect(result).toEqual({ width: 48, height: 48, type: 'bmp' })
    })

    it('should parse JPEG dimensions (SOF0)', () => {
      const result = getImageDimensions(createMinimalJPEG(64, 64))
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    it('should parse JPEG dimensions (SOF1)', () => {
      const result = getImageDimensions(createMinimalJPEG_SOF1(30, 30))
      expect(result).toEqual({ width: 30, height: 30, type: 'jpg' })
    })

    it('should parse JPEG dimensions (SOF2)', () => {
      const result = getImageDimensions(createMinimalJPEG_SOF2(40, 40))
      expect(result).toEqual({ width: 40, height: 40, type: 'jpg' })
    })

    it('should parse JPEG with padding bytes between segments', () => {
      const result = getImageDimensions(createJPEGPadded(48, 48))
      expect(result).toEqual({ width: 48, height: 48, type: 'jpg' })
    })

    it('should fallback for malformed JPEG', () => {
      const result = getImageDimensions(createMalformedJPEG())
      expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
    })

    it('should parse WebP Lossy dimensions (VP8)', () => {
      const result = getImageDimensions(createMinimalWebPLossy(30, 30))
      expect(result).toEqual({ width: 30, height: 30, type: 'webp' })
    })

    it('should fallback for malformed WebP', () => {
      const result = getImageDimensions(createMalformedWebP())
      expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
    })
  })
})
