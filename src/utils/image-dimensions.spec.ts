import { describe, expect, it } from 'vitest'
import { getImageDimensions } from './image-dimensions'

describe('getImageDimensions coverage gaps', () => {
  it('should parse valid JPEG with SOF0 marker and handle segment skipping', () => {
    // 🧪 What: Tests JPEG parsing skipping an APP0 segment and reading dimensions from SOF0
    // 🎯 Why: Covers lines 30-36, 38-44, 46-48 where JPEG segments are iterated
    const jpegValid = new Uint8Array(20)
    jpegValid[0] = 0xff
    jpegValid[1] = 0xd8
    jpegValid[2] = 0xff // Required header

    // APP0 marker at offset 2
    jpegValid[2] = 0xff
    jpegValid[3] = 0xe0
    jpegValid[4] = 0x00
    jpegValid[5] = 0x04 // Length 4 (includes length bytes)

    // SOF0 marker at offset 8 (2 + 2 + 4)
    jpegValid[8] = 0xff
    jpegValid[9] = 0xc0

    // Height 300 (0x012c) at offset 13, 14 (8 + 5, 8 + 6)
    jpegValid[13] = 0x01
    jpegValid[14] = 0x2c

    // Width 400 (0x0190) at offset 15, 16 (8 + 7, 8 + 8)
    jpegValid[15] = 0x01
    jpegValid[16] = 0x90

    const result = getImageDimensions(jpegValid)
    expect(result).toEqual({ width: 400, height: 300, type: 'jpg' })
  })

  it('should skip non-0xFF bytes in JPEG parsing', () => {
    // 🧪 What: Tests JPEG parsing skipping random bytes until next 0xFF
    // 🎯 Why: Covers the `if (uint8[offset] !== 0xff) { offset++; continue; }` logic
    const jpegPadding = new Uint8Array(30)
    jpegPadding[0] = 0xff
    jpegPadding[1] = 0xd8
    jpegPadding[2] = 0xff // Valid header prefix

    // APP0 marker at offset 2
    jpegPadding[3] = 0xe0
    jpegPadding[4] = 0x00
    jpegPadding[5] = 0x04 // Length 4 (includes length bytes)
    // Offset jumps to 2 + 2 + 4 = 8

    // Put some random non-0xFF bytes at offsets 8 and 9
    jpegPadding[8] = 0x00
    jpegPadding[9] = 0xab

    // Now put SOF0 marker at offset 10
    jpegPadding[10] = 0xff
    jpegPadding[11] = 0xc0

    // Height 100 (0x0064) at offset 15, 16 (10 + 5, 10 + 6)
    jpegPadding[15] = 0x00
    jpegPadding[16] = 0x64

    // Width 150 (0x0096) at offset 17, 18 (10 + 7, 10 + 8)
    jpegPadding[17] = 0x00
    jpegPadding[18] = 0x96

    const result = getImageDimensions(jpegPadding)
    expect(result).toEqual({ width: 150, height: 100, type: 'jpg' })
  })

  it('should return fallback dimensions for malformed JPEG without SOF markers', () => {
    // 🧪 What: Tests fallback for JPEG files missing SOF0/1/2 markers
    // 🎯 Why: Covers line 50 for malformed JPEG fallback
    const jpegMalformed = new Uint8Array(10)
    jpegMalformed[0] = 0xff
    jpegMalformed[1] = 0xd8
    jpegMalformed[2] = 0xff

    // No valid segments, should hit the end and fallback
    const result = getImageDimensions(jpegMalformed)
    expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
  })

  it('should parse valid BMP using 40-byte BITMAPINFOHEADER', () => {
    // 🧪 What: Tests BMP parsing using a 40-byte BITMAPINFOHEADER (54 bytes total)
    // 🎯 Why: Covers lines 64-68 for BMP format
    const bmp = new Uint8Array(54)
    bmp[0] = 0x42 // 'B'
    bmp[1] = 0x4d // 'M'

    // Width 384 (0x0180) at offset 18-21
    bmp[18] = 0x80
    bmp[19] = 0x01
    bmp[20] = 0x00
    bmp[21] = 0x00

    // Height 352 (0x0160) at offset 22-25
    bmp[22] = 0x60
    bmp[23] = 0x01
    bmp[24] = 0x00
    bmp[25] = 0x00

    const result = getImageDimensions(bmp)
    expect(result).toEqual({ width: 384, height: 352, type: 'bmp' })
  })

  it('should parse valid WebP VP8 (lossy)', () => {
    // 🧪 What: Tests WebP parsing for the VP8 (lossy) subformat
    // 🎯 Why: Covers lines 86-90 for WebP VP8 format
    const webpVP8 = new Uint8Array(40)
    // 'RIFF'
    webpVP8[0] = 0x52
    webpVP8[1] = 0x49
    webpVP8[2] = 0x46
    webpVP8[3] = 0x46

    // 'WEBP'
    webpVP8[8] = 0x57
    webpVP8[9] = 0x45
    webpVP8[10] = 0x42
    webpVP8[11] = 0x50

    // 'VP8 '
    webpVP8[12] = 0x56
    webpVP8[13] = 0x50
    webpVP8[14] = 0x38
    webpVP8[15] = 0x20

    // Width 400 (0x0190) at offset 26, 27
    webpVP8[26] = 0x90
    webpVP8[27] = 0x01

    // Height 300 (0x012c) at offset 28, 29
    webpVP8[28] = 0x2c
    webpVP8[29] = 0x01

    const result = getImageDimensions(webpVP8)
    expect(result).toEqual({ width: 400, height: 300, type: 'webp' })
  })

  it('should return fallback dimensions for unknown WebP subformats', () => {
    // 🧪 What: Tests fallback for WebP files without a recognized VP8/VP8L subformat
    // 🎯 Why: Covers lines 100-101 for WebP fallback
    const webpFallback = new Uint8Array(40)
    // 'RIFF'
    webpFallback[0] = 0x52
    webpFallback[1] = 0x49
    webpFallback[2] = 0x46
    webpFallback[3] = 0x46

    // 'WEBP'
    webpFallback[8] = 0x57
    webpFallback[9] = 0x45
    webpFallback[10] = 0x42
    webpFallback[11] = 0x50

    // 'VP8X' (unsupported by parser natively for dimensions here)
    webpFallback[12] = 0x56
    webpFallback[13] = 0x50
    webpFallback[14] = 0x38
    webpFallback[15] = 0x58

    const result = getImageDimensions(webpFallback)
    expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
  })

  it('should parse valid WebP VP8L (lossless)', () => {
    // 🧪 What: Tests WebP parsing for the VP8L (lossless) subformat
    // 🎯 Why: Covers lines 94-99 for WebP VP8L format
    const webpVP8L = new Uint8Array(40)
    // 'RIFF'
    webpVP8L[0] = 0x52
    webpVP8L[1] = 0x49
    webpVP8L[2] = 0x46
    webpVP8L[3] = 0x46

    // 'WEBP'
    webpVP8L[8] = 0x57
    webpVP8L[9] = 0x45
    webpVP8L[10] = 0x42
    webpVP8L[11] = 0x50

    // 'VP8L'
    webpVP8L[12] = 0x56
    webpVP8L[13] = 0x50
    webpVP8L[14] = 0x38
    webpVP8L[15] = 0x4c

    // 29-bit width (14 bits) and height (14 bits) combined
    // Width = 400 (0x190), Height = 300 (0x12c)
    // bits = (width - 1) | ((height - 1) << 14)
    // bits = (399) | (299 << 14) = 399 | (4898816) = 4899215 (0x4AC18F)
    const bits = 4899215
    webpVP8L[21] = bits & 0xff
    webpVP8L[22] = (bits >> 8) & 0xff
    webpVP8L[23] = (bits >> 16) & 0xff
    webpVP8L[24] = (bits >> 24) & 0xff

    const result = getImageDimensions(webpVP8L)
    expect(result).toEqual({ width: 400, height: 300, type: 'webp' })
  })

  it('should parse valid PNG', () => {
    // 🧪 What: Tests PNG parsing
    // 🎯 Why: Covers lines 21-25 for PNG format
    const png = new Uint8Array(30)
    // PNG Header
    png[0] = 0x89
    png[1] = 0x50
    png[2] = 0x4e
    png[3] = 0x47

    // Width 400 (0x0190) at offset 16-19
    png[16] = 0x00
    png[17] = 0x00
    png[18] = 0x01
    png[19] = 0x90

    // Height 300 (0x012c) at offset 20-23
    png[20] = 0x00
    png[21] = 0x00
    png[22] = 0x01
    png[23] = 0x2c

    const result = getImageDimensions(png)
    expect(result).toEqual({ width: 400, height: 300, type: 'png' })
  })

  it('should parse valid GIF', () => {
    // 🧪 What: Tests GIF parsing
    // 🎯 Why: Covers lines 55-59 for GIF format
    const gif = new Uint8Array(20)
    // GIF8 Header
    gif[0] = 0x47
    gif[1] = 0x49
    gif[2] = 0x46
    gif[3] = 0x38

    // Width 400 (0x0190) at offset 6, 7
    gif[6] = 0x90
    gif[7] = 0x01

    // Height 300 (0x012c) at offset 8, 9
    gif[8] = 0x2c
    gif[9] = 0x01

    const result = getImageDimensions(gif)
    expect(result).toEqual({ width: 400, height: 300, type: 'gif' })
  })
})
