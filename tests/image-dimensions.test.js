import { getImageDimensions } from '../src/utils/image-dimensions'

/**
 * WHAT: These tests verify that the `getImageDimensions` utility correctly parses binary image
 * buffers (Uint8Array or ArrayBuffer) to extract dimensions (width/height) and format type.
 *
 * WHY: This matters because extracting image dimensions natively from bytes avoids heavy dependencies
 * (like the `image-size` module or canvas APIs) and ensures that we can accurately calculate layout
 * sizes for embedded DOCX images strictly using synchronous byte checks, which keeps the conversion
 * robust and fast across both Node and browser environments.
 */
describe('getImageDimensions', () => {
  it('should parse PNG dimensions correctly', () => {
    const buffer = new Uint8Array(24)
    buffer[0] = 0x89
    buffer[1] = 0x50
    buffer[2] = 0x4e
    buffer[3] = 0x47
    buffer[18] = 0x03
    buffer[19] = 0x20 // 800
    buffer[22] = 0x02
    buffer[23] = 0x58 // 600

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'png' })
  })

  it('should parse JPEG dimensions correctly (SOF0)', () => {
    const buffer = new Uint8Array(20)
    buffer[0] = 0xff
    buffer[1] = 0xd8
    buffer[2] = 0xff

    // SOF0 marker: FF C0
    buffer[2] = 0xff
    buffer[3] = 0xc0
    buffer[7] = 0x02
    buffer[8] = 0x58 // 600
    buffer[9] = 0x03
    buffer[10] = 0x20 // 800

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'jpg' })
  })

  it('should parse GIF dimensions correctly', () => {
    const buffer = new Uint8Array(10)
    buffer[0] = 0x47
    buffer[1] = 0x49
    buffer[2] = 0x46
    buffer[3] = 0x38
    buffer[6] = 0x20
    buffer[7] = 0x03 // 800
    buffer[8] = 0x58
    buffer[9] = 0x02 // 600

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'gif' })
  })

  it('should parse BMP dimensions correctly', () => {
    const buffer = new Uint8Array(26)
    buffer[0] = 0x42
    buffer[1] = 0x4d
    buffer[18] = 0x20
    buffer[19] = 0x03
    buffer[20] = 0x00
    buffer[21] = 0x00
    buffer[22] = 0x58
    buffer[23] = 0x02
    buffer[24] = 0x00
    buffer[25] = 0x00

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'bmp' })
  })

  it('should return default unknown format fallback', () => {
    const buffer = new Uint8Array(10)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 100, height: 100, type: 'unknown' })
  })

  it('should skip to next marker in JPEG', () => {
    const buffer = new Uint8Array(30)
    buffer[0] = 0xff
    buffer[1] = 0xd8
    buffer[2] = 0xff

    // Some random marker
    buffer[2] = 0xff
    buffer[3] = 0xe0
    buffer[4] = 0x00
    buffer[5] = 0x10

    // SOF0 marker
    buffer[20] = 0xff
    buffer[21] = 0xc0
    buffer[25] = 0x02
    buffer[26] = 0x58 // 600
    buffer[27] = 0x03
    buffer[28] = 0x20 // 800

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'jpg' })
  })

  it('should handle malformed JPEG fallback', () => {
    const buffer = new Uint8Array(30)
    buffer[0] = 0xff
    buffer[1] = 0xd8
    buffer[2] = 0xff

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
  })

  it('should parse WebP VP8 dimensions correctly', () => {
    const buffer = new Uint8Array(30)
    buffer[0] = 0x52
    buffer[1] = 0x49
    buffer[2] = 0x46
    buffer[3] = 0x46 // RIFF
    buffer[8] = 0x57
    buffer[9] = 0x45
    buffer[10] = 0x42
    buffer[11] = 0x50 // WEBP
    buffer[12] = 0x56
    buffer[13] = 0x50
    buffer[14] = 0x38 // VP8
    buffer[15] = 0x20

    buffer[26] = 0x20
    buffer[27] = 0x03 // 800
    buffer[28] = 0x58
    buffer[29] = 0x02 // 600

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'webp' })
  })

  it('should parse WebP VP8L dimensions correctly', () => {
    const buffer = new Uint8Array(30)
    buffer[0] = 0x52
    buffer[1] = 0x49
    buffer[2] = 0x46
    buffer[3] = 0x46 // RIFF
    buffer[8] = 0x57
    buffer[9] = 0x45
    buffer[10] = 0x42
    buffer[11] = 0x50 // WEBP
    buffer[12] = 0x56
    buffer[13] = 0x50
    buffer[14] = 0x38 // VP8
    buffer[15] = 0x4c // L

    // bits = (width - 1) | ((height - 1) << 14)
    // width = 800 -> 799
    // height = 600 -> 599
    const bits = 799 | (599 << 14)

    buffer[21] = bits & 0xff
    buffer[22] = (bits >> 8) & 0xff
    buffer[23] = (bits >> 16) & 0xff
    buffer[24] = (bits >> 24) & 0xff

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'webp' })
  })

  it('should fallback for unknown WebP format', () => {
    const buffer = new Uint8Array(30)
    buffer[0] = 0x52
    buffer[1] = 0x49
    buffer[2] = 0x46
    buffer[3] = 0x46 // RIFF
    buffer[8] = 0x57
    buffer[9] = 0x45
    buffer[10] = 0x42
    buffer[11] = 0x50 // WEBP

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
  })

  it('should accept ArrayBuffer input', () => {
    const buffer = new ArrayBuffer(10)
    const view = new Uint8Array(buffer)
    view[0] = 0x47
    view[1] = 0x49
    view[2] = 0x46
    view[3] = 0x38
    view[6] = 0x20
    view[7] = 0x03 // 800
    view[8] = 0x58
    view[9] = 0x02 // 600

    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'gif' })
  })
})
