import { describe, it, expect } from 'vitest'
import { getMimeType, guessMimeTypeFromBase64, isSVG } from './image'

describe('Image Utilities', () => {
  describe('getMimeType', () => {
    it('should extract mime type from standard file extensions', () => {
      expect(getMimeType('test.png')).toBe('image/png')
      expect(getMimeType('photo.jpg')).toBe('image/jpeg')
      expect(getMimeType('photo.jpeg')).toBe('image/jpeg')
      expect(getMimeType('animation.gif')).toBe('image/gif')
      expect(getMimeType('vector.svg')).toBe('image/svg+xml')
      expect(getMimeType('image.webp')).toBe('image/webp')
      expect(getMimeType('image.bmp')).toBe('image/bmp')
      expect(getMimeType('image.tif')).toBe('image/tiff')
      expect(getMimeType('image.tiff')).toBe('image/tiff')
    })

    it('should be case insensitive', () => {
      expect(getMimeType('TEST.PNG')).toBe('image/png')
      expect(getMimeType('photo.JPG')).toBe('image/jpeg')
    })

    it('should extract mime type from full URLs', () => {
      expect(getMimeType('https://example.com/images/test.png')).toBe('image/png')
      expect(getMimeType('http://example.com/photo.jpeg?v=123')).toBe('image/jpeg')
      expect(getMimeType('https://example.com/image.svg#hash')).toBe('image/svg+xml')
    })

    it('should fallback to base64 magic bytes if extension fails', () => {
      // JPEG magic bytes: FF D8 FF
      expect(getMimeType('unknown', '/9j/4AAQSkZJRgABAQEASABIAAD/')).toBe('image/jpeg')
      // PNG magic bytes: 89 50 4E 47
      expect(getMimeType('unknown', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')).toBe('image/png')
      // GIF magic bytes: 47 49 46
      expect(getMimeType('unknown', 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAA')).toBe(
        'image/gif'
      )
    })

    it('should return false if neither extension nor base64 matches', () => {
      expect(getMimeType('unknown.txt')).toBe(false)
      expect(getMimeType('unknown.txt', 'invalid_base64_data_that_doesnt_match')).toBe(
        false
      )
      expect(getMimeType('')).toBe(false)
      expect(getMimeType('https://example.com/')).toBe(false)
    })
  })

  describe('isSVG', () => {
    it('should identify SVG from mime types', () => {
      expect(isSVG('image/svg+xml')).toBe(true)
      expect(isSVG('image/svg')).toBe(true)
    })

    it('should identify SVG from extensions', () => {
      expect(isSVG('.svg')).toBe(true)
      expect(isSVG('svg')).toBe(true)
      expect(isSVG('test.svg')).toBe(true)
      expect(isSVG('path/to/test.svg')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isSVG('IMAGE/SVG+XML')).toBe(true)
      expect(isSVG('.SVG')).toBe(true)
      expect(isSVG('TEST.SVG')).toBe(true)
    })

    it('should return false for non-SVG inputs', () => {
      expect(isSVG('image/png')).toBe(false)
      expect(isSVG('.png')).toBe(false)
      expect(isSVG('png')).toBe(false)
      expect(isSVG('image.jpg')).toBe(false)
    })

    it('should handle falsy values safely', () => {
      expect(isSVG('')).toBe(false)
      expect(isSVG(null)).toBe(false)
      expect(isSVG(undefined)).toBe(false)
    })
  })

  describe('guessMimeTypeFromBase64', () => {
    it('should correctly guess JPEG', () => {
      // JPEG magic bytes: FF D8 FF
      expect(guessMimeTypeFromBase64('/9j/4AAQSkZJRgABAQEASABIAAD/')).toBe('image/jpeg')
    })

    it('should correctly guess PNG', () => {
      // PNG magic bytes: 89 50 4E 47
      expect(guessMimeTypeFromBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')).toBe('image/png')
    })

    it('should correctly guess GIF', () => {
      // GIF magic bytes: 47 49 46
      expect(guessMimeTypeFromBase64('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAA')).toBe(
        'image/gif'
      )
    })

    it('should correctly guess BMP', () => {
      // BMP magic bytes: 42 4D (BM)
      expect(
        guessMimeTypeFromBase64('Qk1GAAAAAAAAADYAAAAoAAAAAQAAAAEAAAABACAAAAAAAQAA')
      ).toBe('image/bmp')
    })

    it('should correctly guess TIFF (little-endian)', () => {
      // TIFF little-endian magic bytes: 49 49 2A 00 (II*\0)
      expect(
        guessMimeTypeFromBase64(
          'SUkqAAgAAAASAP4ABAABAAAAAAAAAAABBAABAAAAAQAAAAIBAwADAAAAcv'
        )
      ).toBe('image/tiff')
    })

    it('should correctly guess TIFF (big-endian)', () => {
      // TIFF big-endian magic bytes: 4D 4D 00 2A (MM\0*)
      expect(
        guessMimeTypeFromBase64(
          'TU0AKgAAAAgABwEAAAMAAAABAAEAAAEBAAMAAAABAAEAAAECAAMAAAAEAAAAYg'
        )
      ).toBe('image/tiff')
    })

    it('should return false for unrecognized magic bytes', () => {
      // Random bytes or text that do not match image signatures
      expect(guessMimeTypeFromBase64('SGVsbG8gV29ybGQh')).toBe(false) // "Hello World!"
      expect(guessMimeTypeFromBase64('')).toBe(false)
      expect(guessMimeTypeFromBase64('ABCD')).toBe(false)
    })
  })
})
