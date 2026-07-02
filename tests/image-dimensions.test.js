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
  // SOI (2) + APP0 (18) + SOF0 (15) + EOI (2) = 37 bytes
  const data = new Uint8Array(37)
  const dv = new DataView(data.buffer)

  // SOI marker
  dv.setUint8(0, 0xff)
  dv.setUint8(1, 0xd8)

  // APP0 (JFIF)
  dv.setUint8(2, 0xff)
  dv.setUint8(3, 0xe0)
  dv.setUint16(4, 16, false) // length
  dv.setUint32(6, 0x4a464946, false) // 'JFIF'
  dv.setUint8(10, 0) // '\0'
  dv.setUint8(11, 1) // version major
  dv.setUint8(12, 1) // version minor
  dv.setUint8(13, 0) // units
  dv.setUint16(14, 1, false) // X density
  dv.setUint16(16, 1, false) // Y density
  dv.setUint8(18, 0) // thumbnail width
  dv.setUint8(19, 0) // thumbnail height

  // SOF0 marker
  dv.setUint8(20, 0xff)
  dv.setUint8(21, 0xc0)
  dv.setUint16(22, 11, false) // length
  dv.setUint8(24, 8) // precision
  dv.setUint16(25, height, false) // height
  dv.setUint16(27, width, false) // width
  dv.setUint8(29, 3) // number of components
  dv.setUint8(30, 0) // component ID
  dv.setUint8(31, 0x11) // sampling
  dv.setUint8(32, 0) // quantization table
  dv.setUint8(33, 1) // component ID
  dv.setUint8(34, 0x11) // sampling

  // EOI marker
  dv.setUint8(35, 0xff)
  dv.setUint8(36, 0xd9)

  return data
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

// Minimal valid BMP (48x48) - BITMAPINFOHEADER (40 bytes)
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
  dv.setUint32(30, 0, true) // compression
  dv.setUint32(34, 0, true) // image size
  dv.setUint32(38, 0, true) // X pixels per meter
  dv.setUint32(42, 0, true) // Y pixels per meter
  dv.setUint32(46, 0, true) // total colors
  dv.setUint32(50, 0, true) // important colors

  return data
}

// Minimal valid WebP (24x24) - VP8 format (lossy)
function createMinimalWebPLossy(width = 24, height = 24) {
  const data = new Uint8Array(40)
  const dv = new DataView(data.buffer)

  // RIFF header
  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 32, true) // file size - 8
  dv.setUint32(8, 0x57454250, false) // 'WEBP'

  // VP8 chunk
  dv.setUint32(12, 0x56503820, false) // 'VP8 '
  dv.setUint32(16, 10, true) // chunk size

  // Frame tag: uncompressed (1 byte), profile (1 byte), show_frame (1 byte), 1st part size (19 bits)
  dv.setUint8(20, 0) // key frame (0)
  dv.setUint8(21, 0)
  dv.setUint8(22, 0)
  // Sync code: 0x9d, 0x01, 0x2a
  dv.setUint8(23, 0x9d)
  dv.setUint8(24, 0x01)
  dv.setUint8(25, 0x2a)

  // Width and height (14 bits each)
  dv.setUint16(26, width, true)
  dv.setUint16(28, height, true)

  return data.slice(0, 30)
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

    it('should parse WebP lossy dimensions (24x24)', () => {
      const result = getImageDimensions(createMinimalWebPLossy(24, 24))
      expect(result).toEqual({ width: 24, height: 24, type: 'webp' })
    })

    it('should parse JPEG dimensions (64x64)', () => {
      const result = getImageDimensions(createMinimalJPEG(64, 64))
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    it('should parse BMP dimensions (48x48)', () => {
      const result = getImageDimensions(createMinimalBMP(48, 48))
      expect(result).toEqual({ width: 48, height: 48, type: 'bmp' })
    })

    it('should fallback to 100x100 for malformed JPEG', () => {
      const result = getImageDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))
      expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
    })

    it('should skip unknown markers in JPEG and find dimensions', () => {
      // Create a JPEG with an APP1 marker before SOF0
      const sof0Jpeg = createMinimalJPEG(64, 64)
      const data = new Uint8Array(sof0Jpeg.length + 10)

      // Copy SOI and APP0 (20 bytes)
      data.set(sof0Jpeg.slice(0, 20))

      // Add APP1 marker (length 8, total 10 bytes including marker)
      data[20] = 0xff
      data[21] = 0xe1 // APP1
      data[22] = 0x00
      data[23] = 0x08 // Length 8 (includes length bytes)
      data[24] = 0x00
      data[25] = 0x00
      data[26] = 0x00
      data[27] = 0x00
      data[28] = 0x00
      data[29] = 0x00

      // Copy the rest (SOF0 and EOI)
      data.set(sof0Jpeg.slice(20), 30)

      const result = getImageDimensions(data)
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    it('should skip non-marker bytes between JPEG segments', () => {
      // Valid JPEG header but with some extra padding bytes between APP0 and SOF0
      const sof0Jpeg = createMinimalJPEG(64, 64)
      const data = new Uint8Array(sof0Jpeg.length + 2)

      // Copy SOI and APP0 (20 bytes)
      data.set(sof0Jpeg.slice(0, 20))

      // Insert padding bytes that don't start with 0xff
      data[20] = 0x00
      data[21] = 0x00

      // Copy the rest
      data.set(sof0Jpeg.slice(20), 22)

      const result = getImageDimensions(data)
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    it('should fallback to 100x100 for malformed WebP', () => {
      // Valid RIFF and WEBP, but unknown format
      const data = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x55, 0x4e,
        0x4b, 0x4e,
      ])
      const result = getImageDimensions(data)
      expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
    })

    it('should handle Buffer (Node.js) input', () => {
      const pngBuffer = Buffer.from(createMinimalPNG(32, 32))
      const result = getImageDimensions(pngBuffer)
      expect(result).toEqual({ width: 32, height: 32, type: 'png' })
    })
  })
})
