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
  const sof0Data = new Uint8Array(20)
  const dv = new DataView(sof0Data.buffer)

  // SOI marker
  dv.setUint16(0, 0xffd8, false)
  dv.setUint8(2, 0xff) // Maintain FF D8 FF signature

  // APP0 (JFIF)
  dv.setUint16(2, 0xffe0, false)
  // Length includes the 2 length bytes themselves (2 + 14 = 16).
  // Total APP0 segment is 2 + 16 = 18 bytes.
  // Next marker should be at offset 20.
  dv.setUint16(4, 16, false) // length
  dv.setUint32(6, 0x4a464946, false) // 'JFIF'
  dv.setUint16(10, 0x0001, false) // '\0', version major
  dv.setUint8(12, 1) // version minor
  dv.setUint8(13, 0) // units
  dv.setUint16(14, 1, false) // X density
  dv.setUint16(16, 1, false) // Y density
  dv.setUint8(18, 0) // thumbnail width
  dv.setUint8(19, 0) // thumbnail height

  // SOF0 marker (starts at 20)
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

// Minimal valid BMP (48x48) using BITMAPINFOHEADER (size 40)
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
  dv.setUint32(18, width, true) // width
  dv.setUint32(22, height, true) // height
  dv.setUint16(26, 1, true) // planes
  dv.setUint16(28, 24, true) // bit count
  dv.setUint32(30, 0, true) // compression
  dv.setUint32(34, 0, true) // image size

  return data.slice(0, 54)
}

// Minimal VP8 (Lossy) WebP
function createVP8WebP(width = 24, height = 24) {
  const data = new Uint8Array(40)
  const dv = new DataView(data.buffer)

  // RIFF header
  dv.setUint32(0, 0x52494646, false) // 'RIFF'
  dv.setUint32(4, 32, true) // file size - 8
  dv.setUint32(8, 0x57454250, false) // 'WEBP'

  // VP8 chunk
  dv.setUint32(12, 0x56503820, false) // 'VP8 '
  dv.setUint32(16, 14, true) // chunk size

  // VP8 Frame header
  // Note: the parsing just requires specific bit offsets.
  // We mock a VP8 frame header.
  dv.setUint8(20, 0) // keyframe (0 is keyframe)
  dv.setUint8(21, 0)
  dv.setUint8(22, 0)
  dv.setUint8(23, 0x9d) // sync code
  dv.setUint8(24, 0x01) // sync code
  dv.setUint8(25, 0x2a) // sync code

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

    it('should parse WebP VP8L dimensions (24x24)', () => {
      const result = getImageDimensions(createMinimalWebP(24, 24))
      expect(result).toEqual({ width: 24, height: 24, type: 'webp' })
    })

    it('should parse WebP VP8 (Lossy) dimensions (50x60)', () => {
      const result = getImageDimensions(createVP8WebP(50, 60))
      expect(result).toEqual({ width: 50, height: 60, type: 'webp' })
    })

    it('should parse JPEG dimensions (64x64)', () => {
      const result = getImageDimensions(createMinimalJPEG(64, 64))
      expect(result).toEqual({ width: 64, height: 64, type: 'jpg' })
    })

    it('should parse BMP dimensions (48x48)', () => {
      const result = getImageDimensions(createMinimalBMP(48, 48))
      expect(result).toEqual({ width: 48, height: 48, type: 'bmp' })
    })

    it('should fallback for malformed WebP missing VP8/VP8L chunks', () => {
      const data = new Uint8Array(16)
      const dv = new DataView(data.buffer)
      dv.setUint32(0, 0x52494646, false) // 'RIFF'
      dv.setUint32(8, 0x57454250, false) // 'WEBP'
      dv.setUint32(12, 0x41424344, false) // 'ABCD' (not VP8/VP8L)

      const result = getImageDimensions(data)
      expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
    })

    it('should fallback for malformed JPEG ending early', () => {
      const data = new Uint8Array(10)
      const dv = new DataView(data.buffer)
      dv.setUint16(0, 0xffd8, false)
      dv.setUint8(2, 0xff) // valid start, but string is short
      dv.setUint8(3, 0xe0) // APP0
      dv.setUint16(4, 50, false) // large length skipping past EOF

      const result = getImageDimensions(data)
      expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
    })

    it('should skip non-marker bytes in JPEG until next marker', () => {
      // Build a JPEG with APP0, then some padding bytes, then SOF0
      const sof0Data = new Uint8Array(25) // padded by 5 bytes
      const dv = new DataView(sof0Data.buffer)

      dv.setUint16(0, 0xffd8, false)
      dv.setUint16(2, 0xffe0, false)
      dv.setUint16(4, 16, false) // APP0 length 16

      // padding bytes from index 20 to 24 (5 bytes)
      dv.setUint8(20, 0x00)
      dv.setUint8(21, 0x11)
      dv.setUint8(22, 0x22)
      dv.setUint8(23, 0x33)
      dv.setUint8(24, 0x44)

      // SOF0 marker at offset 25
      const sof0 = new Uint8Array(15)
      const sof0Dv = new DataView(sof0.buffer)
      sof0Dv.setUint16(0, 0xffc0, false) // SOF0
      sof0Dv.setUint16(2, 11, false)
      sof0Dv.setUint8(4, 8)
      sof0Dv.setUint16(5, 120, false) // height
      sof0Dv.setUint16(7, 150, false) // width

      const resultArr = new Uint8Array(sof0Data.length + sof0.length)
      resultArr.set(sof0Data)
      resultArr.set(sof0, sof0Data.length)

      const result = getImageDimensions(resultArr)
      expect(result).toEqual({ width: 150, height: 120, type: 'jpg' })
    })

    it('should handle Buffer (Node.js) input', () => {
      const pngBuffer = Buffer.from(createMinimalPNG(32, 32))
      const result = getImageDimensions(pngBuffer)
      expect(result).toEqual({ width: 32, height: 32, type: 'png' })
    })
  })
})
