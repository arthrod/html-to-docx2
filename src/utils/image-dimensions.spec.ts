import { describe, expect, it } from 'vitest'
import { getImageDimensions } from './image-dimensions'

describe('getImageDimensions', () => {
  it('should parse PNG dimensions', () => {
    const buffer = new Uint8Array(24)
    buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    buffer.set([0x00, 0x00, 0x03, 0x20], 16)
    buffer.set([0x00, 0x00, 0x02, 0x58], 20)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'png' })
  })

  it('should parse JPEG dimensions and handle segment skipping', () => {
    const buffer = new Uint8Array(24)
    buffer.set([0xff, 0xd8, 0xff], 0)
    buffer.set([0xe0, 0x00, 0x04, 0x00, 0x00], 3)
    buffer.set([0xff, 0xc0], 8)
    buffer.set([0x02, 0x58], 13)
    buffer.set([0x03, 0x20], 15)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'jpg' })
  })

  it('should skip non-marker bytes in JPEG', () => {
    const buffer = new Uint8Array(24)
    buffer.set([0xff, 0xd8, 0xff], 0)
    buffer.set([0xe0, 0x00, 0x04, 0x00, 0x00], 3)
    buffer.set([0x00, 0x00, 0xff, 0xc0], 8)
    buffer.set([0x02, 0x58], 15)
    buffer.set([0x03, 0x20], 17)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'jpg' })
  })

  it('should fallback for malformed JPEG missing SOF', () => {
    const buffer = new Uint8Array(10)
    buffer.set([0xff, 0xd8, 0xff], 0)
    buffer.set([0xe0, 0x00, 0x04, 0x00, 0x00], 3)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 100, height: 100, type: 'jpg' })
  })

  it('should parse GIF dimensions', () => {
    const buffer = new Uint8Array(10)
    buffer.set([0x47, 0x49, 0x46, 0x38], 0)
    buffer.set([0x20, 0x03], 6)
    buffer.set([0x58, 0x02], 8)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'gif' })
  })

  it('should parse BMP dimensions', () => {
    const buffer = new Uint8Array(54)
    buffer.set([0x42, 0x4d], 0)
    buffer.set([0x20, 0x03, 0x00, 0x00], 18)
    buffer.set([0x58, 0x02, 0x00, 0x00], 22)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'bmp' })
  })

  it('should parse WebP (VP8) dimensions', () => {
    const buffer = new Uint8Array(30)
    buffer.set([0x52, 0x49, 0x46, 0x46], 0)
    buffer.set([0x57, 0x45, 0x42, 0x50], 8)
    buffer.set([0x56, 0x50, 0x38, 0x20], 12)
    buffer.set([0x20, 0x03], 26)
    buffer.set([0x58, 0x02], 28)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'webp' })
  })

  it('should parse WebP (VP8L) dimensions', () => {
    const buffer = new Uint8Array(25)
    buffer.set([0x52, 0x49, 0x46, 0x46], 0)
    buffer.set([0x57, 0x45, 0x42, 0x50], 8)
    buffer.set([0x56, 0x50, 0x38, 0x4c], 12)
    buffer.set([0x1f, 0xc3, 0x95, 0x00], 21)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 800, height: 600, type: 'webp' })
  })

  it('should fallback for malformed WebP missing VP8/VP8L chunk', () => {
    const buffer = new Uint8Array(16)
    buffer.set([0x52, 0x49, 0x46, 0x46], 0)
    buffer.set([0x57, 0x45, 0x42, 0x50], 8)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 100, height: 100, type: 'webp' })
  })

  it('should fallback for unknown type', () => {
    const buffer = new Uint8Array(10)
    const result = getImageDimensions(buffer)
    expect(result).toEqual({ width: 100, height: 100, type: 'unknown' })
  })
})
