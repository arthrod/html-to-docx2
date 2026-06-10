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
  // We just need a valid SOI followed by a SOF0 marker
  // SOI: FF D8 FF (image-dimensions checks this sequence exactly, so FF D8 FF E0 or something)
  // Let's create an array
  const data = new Uint8Array([
    0xFF, 0xD8, 0xFF, 0xE0, // SOI and APP0
    0x00, 0x10, // Length
    0x4A, 0x46, 0x49, 0x46, 0x00, // JFIF string
    0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // more APP0
    0xFF, 0xC0, // SOF0 marker
    0x00, 0x11, // Length (17 bytes)
    0x08, // precision
    (height >> 8) & 0xFF, height & 0xFF, // height
    (width >> 8) & 0xFF, width & 0xFF, // width
    0x03, // components
    0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01 // component details
  ]);
  return data;
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

// Minimal valid BMP (48x48)
function createMinimalBMP(width = 48, height = 48) {
  const data = new Uint8Array(26)
  const dv = new DataView(data.buffer)

  // BMP header
  dv.setUint16(0, 0x4D42, true) // 'BM'
  dv.setUint32(2, 26, true) // file size
  dv.setUint32(6, 0, true) // reserved
  dv.setUint32(10, 26, true) // pixel data offset

  // DIB header (BITMAPCOREHEADER)
  dv.setUint32(14, 12, true) // header size
  dv.setUint32(18, width, true) // width (32-bit for BITMAPINFOHEADER which is standard)
  dv.setUint32(22, height, true) // height
  // Actually getImageDimensions parses BMP assuming BITMAPINFOHEADER (offset 18 width, 22 height, both 32-bit, little endian)
  // Our code says:
  // width: uint8[18] | (uint8[19] << 8) | (uint8[20] << 16) | (uint8[21] << 24)
  // height: uint8[22] | (uint8[23] << 8) | (uint8[24] << 16) | (uint8[25] << 24)
  // We need to use setUint32 to write this properly instead of setUint16

  return data.slice(0, 26)
}


// Minimal valid WebP (24x24) - VP8 format
function createMinimalWebP_VP8(width = 24, height = 24) {
  const data = new Uint8Array(40)
  data[0] = 0x52; data[1] = 0x49; data[2] = 0x46; data[3] = 0x46
  data[8] = 0x57; data[9] = 0x45; data[10] = 0x42; data[11] = 0x50
  data[12] = 0x56; data[13] = 0x50; data[14] = 0x38; data[15] = 0x20

  data[26] = width & 0xFF; data[27] = (width >> 8) & 0xFF
  data[28] = height & 0xFF; data[29] = (height >> 8) & 0xFF
  return data
}

function createMalformedWebP() {
  const data = new Uint8Array(40)
  data[0] = 0x52; data[1] = 0x49; data[2] = 0x46; data[3] = 0x46
  data[8] = 0x57; data[9] = 0x45; data[10] = 0x42; data[11] = 0x50
  data[12] = 0x56; data[13] = 0x50; data[14] = 0x38; data[15] = 0x58
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
    it('should parse JPEG dimensions (64x64)', () => {
      const result = getImageDimensions(createMinimalJPEG(64, 64))
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    it('should return fallback for malformed JPEG', () => {
      // JPEG with no valid SOFn markers
      const malformed = new Uint8Array([0xFF, 0xD8, 0xFF, 0x00, 0x00, 0x00])
      const result = getImageDimensions(malformed)
      expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
    })

    it('should parse BMP dimensions (48x48)', () => {
      const result = getImageDimensions(createMinimalBMP(48, 48))
      expect(result).toEqual({ width: 48, height: 48, type: 'bmp' })
    })

    it('should parse WebP VP8 dimensions (24x24)', () => {
      const result = getImageDimensions(createMinimalWebP_VP8(24, 24))
      expect(result).toEqual({ width: 24, height: 24, type: 'webp' })
    })

    it('should return fallback for malformed WebP', () => {
      const result = getImageDimensions(createMalformedWebP())
      expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
    })

  })
})
