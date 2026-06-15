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
  const soiData = new Uint8Array(2)
  const dv1 = new DataView(soiData.buffer)
  dv1.setUint16(0, 0xFFD8, false)

  const segment = new Uint8Array([
    0xFF, 0xC0,
    0x00, 0x0B, // length 11
    0x08, // precision
    (height >> 8) & 0xFF, height & 0xFF, // height
    (width >> 8) & 0xFF, width & 0xFF, // width
    0x01, 0x01, 0x11, 0x00 // dummy component
  ])

  const eoi = new Uint8Array([0xFF, 0xD9])

  const result = new Uint8Array(soiData.length + segment.length + eoi.length)
  result.set(soiData)
  result.set(segment, soiData.length)
  result.set(eoi, soiData.length + segment.length)
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
  dv.setUint8(13, 0x3B) // ';'

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
  dv.setUint32(12, 0x5650384C, false) // 'VP8L'
  dv.setUint32(16, 10, true) // chunk size

  // VP8L signature byte
  dv.setUint8(20, 0x2F) // signature

  // VP8L image data: 14 bits for width-1, 14 bits for height-1, little-endian
  const imageBits = BigInt((width - 1) | ((height - 1) << 14))
  dv.setUint32(21, Number(imageBits & 0xFFFFFFFFn), true)

  return data.slice(0, 25)
}

// Minimal valid BMP (48x48) - using BITMAPINFOHEADER (40 bytes) which the parser expects
function createMinimalBMP(width = 48, height = 48) {
  const headerSize = 54 // 14 (BMP header) + 40 (BITMAPINFOHEADER)
  const data = new Uint8Array(headerSize)
  const dv = new DataView(data.buffer)

  // BMP header (14 bytes)
  dv.setUint8(0, 0x42) // 'B'
  dv.setUint8(1, 0x4D) // 'M'
  dv.setUint32(2, headerSize, true) // file size
  dv.setUint32(6, 0, true) // reserved
  dv.setUint32(10, headerSize, true) // pixel data offset

  // DIB header (BITMAPINFOHEADER - 40 bytes)
  dv.setUint32(14, 40, true) // header size (40)
  dv.setUint32(18, width, true) // width (32-bit for BITMAPINFOHEADER)
  dv.setUint32(22, height, true) // height (32-bit for BITMAPINFOHEADER)
  dv.setUint16(26, 1, true) // planes
  dv.setUint16(28, 24, true) // bit count
  dv.setUint32(30, 0, true) // compression
  dv.setUint32(34, 0, true) // image size
  dv.setUint32(38, 0, true) // x pixels per meter
  dv.setUint32(42, 0, true) // y pixels per meter
  dv.setUint32(46, 0, true) // colors used
  dv.setUint32(50, 0, true) // important colors

  return data
}

function createMalformedJPEG() {
  // Invalid JPEG missing SOF0, starts with SOI and immediately EOI or something else
  return new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0xFF, 0xD9])
}

function createJPEGWithPadding() {
  // Valid JPEG but has some non-0xFF padding before the marker
  // The parser jumps segments. We create an APP0 segment, then add padding, then SOF0.
  const app0 = new Uint8Array(20)
  app0[0] = 0xFF; app0[1] = 0xD8; // SOI
  app0[2] = 0xFF; app0[3] = 0xE0; // APP0 marker
  app0[4] = 0x00; app0[5] = 0x10; // length 16

  const padding = new Uint8Array([0x00, 0x00])

  const segment = new Uint8Array([
    0xFF, 0xC0,
    0x00, 0x0B, // length 11
    0x08, // precision
    0x00, 0x40, // height 64
    0x00, 0x40, // width 64
    0x01, 0x01, 0x11, 0x00 // dummy component
  ])

  const eoi = new Uint8Array([0xFF, 0xD9])

  const result = new Uint8Array(app0.length + padding.length + segment.length + eoi.length)
  result.set(app0)
  result.set(padding, app0.length)
  result.set(segment, app0.length + padding.length)
  result.set(eoi, app0.length + padding.length + segment.length)
  return result
}

function createMinimalWebP_VP8(width = 30, height = 30) {
  const data = new Uint8Array(40)
  const dv = new DataView(data.buffer)

  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 32, true) // file size - 8
  dv.setUint32(8, 0x57454250, false) // 'WEBP'

  dv.setUint32(12, 0x56503820, false) // 'VP8 '
  dv.setUint32(16, 10, true) // chunk size

  dv.setUint8(23, 0x9D)
  dv.setUint8(24, 0x01)
  dv.setUint8(25, 0x2A)

  dv.setUint16(26, width, true)
  dv.setUint16(28, height, true)

  return data
}

function createMalformedWebP() {
  const data = new Uint8Array(40)
  const dv = new DataView(data.buffer)

  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 32, true) // file size - 8
  dv.setUint32(8, 0x57454250, false) // 'WEBP'

  dv.setUint32(12, 0x56503858, false) // 'VP8X' (not fully implemented in tests)
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

    /**
     * WHY: Validates JPEG dimension extraction when the SOF0 marker is preceded by other markers (like APP0).
     */
    it('should parse JPEG dimensions (64x64)', () => {
      const result = getImageDimensions(createMinimalJPEG(64, 64))
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    /**
     * WHY: Ensures the parser correctly returns fallback values when encountering a JPEG header missing dimensions.
     */
    it('should return fallback for malformed JPEG', () => {
      const result = getImageDimensions(createMalformedJPEG())
      expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
    })

    /**
     * WHY: Validates the parser correctly skips over non-0xFF padding bytes that can legitimately precede markers in JPEG files.
     */
    it('should handle JPEG with padding bytes before markers', () => {
      const result = getImageDimensions(createJPEGWithPadding())
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    /**
     * WHY: Validates WebP dimension extraction specifically for the lossy VP8 format variant.
     */
    it('should parse WebP VP8 format dimensions (30x30)', () => {
      const result = getImageDimensions(createMinimalWebP_VP8(30, 30))
      expect(result).toEqual({ width: 30, height: 30, type: 'webp' })
    })

    /**
     * WHY: Ensures the parser returns fallback values when given an unsupported/malformed WebP variant (like VP8X).
     */
    it('should return fallback for malformed WebP', () => {
      const result = getImageDimensions(createMalformedWebP())
      expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
    })

    /**
     * WHY: Validates correct parsing of BMP 40-byte header (BITMAPINFOHEADER) width and height fields.
     */
    it('should parse BMP dimensions (48x48)', () => {
      const result = getImageDimensions(createMinimalBMP(48, 48))
      expect(result).toEqual({ width: 48, height: 48, type: 'bmp' })
    })
  })
})
