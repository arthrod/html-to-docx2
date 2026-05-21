import { describe, expect, it } from 'vitest'
import { getImageDimensions } from '../src/utils/image-dimensions.ts'

describe('getImageDimensions', () => {
  it('should parse PNG dimensions correctly', () => {
    // 89 50 4E 47 0D 0A 1A 0A
    const buffer = new Uint8Array(24)
    buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    // Set width (bytes 16-19): 800
    buffer[16] = 0
    buffer[17] = 0
    buffer[18] = 0x03
    buffer[19] = 0x20
    // Set height (bytes 20-23): 600
    buffer[20] = 0
    buffer[21] = 0
    buffer[22] = 0x02
    buffer[23] = 0x58

    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 800, height: 600, type: 'png' })
  })

  it('should parse JPEG dimensions correctly', () => {
    // FF D8 FF
    // then marker
    const buffer = new Uint8Array(20)
    buffer.set([0xff, 0xd8, 0xff], 0)

    // offset 3: let's add a random marker that skips
    buffer[3] = 0xe0 // APP0 marker
    buffer[4] = 0
    buffer[5] = 4 // length 4 (offset+2 to offset+3)
    // so next marker is at 3 + 2 + 4 = 9
    buffer[9] = 0xff
    buffer[10] = 0xc0 // SOF0 marker
    // dimension bytes are offset+5, offset+6 for height
    // and offset+7, offset+8 for width
    // offset here is 9
    // height: 600 (0x0258)
    buffer[14] = 0x02
    buffer[15] = 0x58
    // width: 800 (0x0320)
    buffer[16] = 0x03
    buffer[17] = 0x20

    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 800, height: 600, type: 'jpg' })
  })

  it('should handle malformed JPEG gracefully', () => {
    const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0])
    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 100, height: 100, type: 'jpg' })
  })

  it('should parse GIF dimensions correctly', () => {
    // 47 49 46 38 -> GIF8
    const buffer = new Uint8Array(10)
    buffer.set([0x47, 0x49, 0x46, 0x38], 0)
    // width: bytes 6, 7 (little endian)
    buffer[6] = 0x20
    buffer[7] = 0x03 // 800
    // height: bytes 8, 9 (little endian)
    buffer[8] = 0x58
    buffer[9] = 0x02 // 600

    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 800, height: 600, type: 'gif' })
  })

  it('should parse BMP dimensions correctly', () => {
    // 42 4D -> BM
    const buffer = new Uint8Array(26)
    buffer.set([0x42, 0x4d], 0)
    // width: bytes 18-21 (little endian)
    buffer[18] = 0x20
    buffer[19] = 0x03
    buffer[20] = 0
    buffer[21] = 0 // 800
    // height: bytes 22-25 (little endian)
    buffer[22] = 0x58
    buffer[23] = 0x02
    buffer[24] = 0
    buffer[25] = 0 // 600

    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 800, height: 600, type: 'bmp' })
  })

  it('should parse WebP (VP8) dimensions correctly', () => {
    // 52 49 46 46 (RIFF), 57 45 42 50 (WEBP), 56 50 38 (VP8)
    const buffer = new Uint8Array(30)
    buffer.set([0x52, 0x49, 0x46, 0x46], 0)
    buffer.set([0x57, 0x45, 0x42, 0x50], 8)
    buffer.set([0x56, 0x50, 0x38, 0x20], 12) // VP8 and 0x20

    // width: bytes 26, 27
    buffer[26] = 0x20
    buffer[27] = 0x03 // 800
    // height: bytes 28, 29
    buffer[28] = 0x58
    buffer[29] = 0x02 // 600

    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 800, height: 600, type: 'webp' })
  })

  it('should parse WebP (VP8L) dimensions correctly', () => {
    // VP8L (lossless)
    const buffer = new Uint8Array(25)
    buffer.set([0x52, 0x49, 0x46, 0x46], 0)
    buffer.set([0x57, 0x45, 0x42, 0x50], 8)
    buffer.set([0x56, 0x50, 0x38, 0x4c], 12) // VP8L

    // bytes 21-24 hold bits.
    // width is lower 14 bits (bits & 0x3fff) + 1
    // height is next 14 bits ((bits >> 14) & 0x3fff) + 1
    // width = 799 (so + 1 = 800), height = 599 (so + 1 = 600)
    // 799 = 0x31f
    // 599 = 0x257
    // bits = (0x257 << 14) | 0x31f = (0x95c000) | 0x31f = 0x95c31f
    buffer[21] = 0x1f
    buffer[22] = 0xc3
    buffer[23] = 0x95
    buffer[24] = 0x00

    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 800, height: 600, type: 'webp' })
  })

  it('should handle malformed WebP gracefully', () => {
    const buffer = new Uint8Array(20)
    buffer.set([0x52, 0x49, 0x46, 0x46], 0)
    buffer.set([0x57, 0x45, 0x42, 0x50], 8)
    buffer.set([0x56, 0x50, 0x38, 0x58], 12) // VP8X (not handled directly)

    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 100, height: 100, type: 'webp' })
  })

  it('should fallback to unknown type with default dimensions', () => {
    const buffer = new Uint8Array([0x01, 0x02, 0x03, 0x04])
    const dimensions = getImageDimensions(buffer)
    expect(dimensions).toEqual({ width: 100, height: 100, type: 'unknown' })
  })

  it('should handle ArrayBuffer directly', () => {
    const buffer = new Uint8Array([0x01, 0x02, 0x03, 0x04])
    const dimensions = getImageDimensions(buffer.buffer)
    expect(dimensions).toEqual({ width: 100, height: 100, type: 'unknown' })
  })
})
