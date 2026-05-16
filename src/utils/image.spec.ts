import { getMimeType, isSVG, guessMimeTypeFromBase64 } from './image'

// Example Base64 strings for magic byte testing
const PNG_1x1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='
const JPEG_1x1_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
const GIF_1x1_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const BMP_1x1_BASE64 = 'Qk06AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABABgAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAA////AA=='

describe('Image utilities', () => {
  describe('getMimeType', () => {
    test('should detect JPEG mime type from extension', () => {
      const mimeType = getMimeType('image.jpg')
      expect(mimeType).toBe('image/jpeg')
    })

    test('should detect PNG mime type from extension', () => {
      const mimeType = getMimeType('image.png')
      expect(mimeType).toBe('image/png')
    })

    test('should detect GIF mime type from extension', () => {
      const mimeType = getMimeType('image.gif')
      expect(mimeType).toBe('image/gif')
    })

    test('should detect mime type from URL with extension', () => {
      const mimeType = getMimeType('https://example.com/image.jpeg')
      expect(mimeType).toBe('image/jpeg')
    })

    test('should fallback to base64 detection when extension lookup fails', () => {
      const mimeType = getMimeType('unknown', PNG_1x1_BASE64)
      expect(mimeType).toBe('image/png')
    })

    test('should return false for unrecognized extension and no base64', () => {
      const mimeType = getMimeType('unknown.ext')
      expect(mimeType).toBe(false)
    })

    test('should return false for unrecognized extension and unrecognized base64', () => {
      const mimeType = getMimeType('unknown.ext', 'SGVsbG8gV29ybGQ=') // "Hello World"
      expect(mimeType).toBe(false)
    })
  })

  describe('isSVG', () => {
    test('should detect SVG from image/svg+xml MIME type', () => {
      expect(isSVG('image/svg+xml')).toBe(true)
    })

    test('should detect SVG from image/svg MIME type', () => {
      expect(isSVG('image/svg')).toBe(true)
    })

    test('should detect SVG from .svg extension', () => {
      expect(isSVG('.svg')).toBe(true)
      expect(isSVG('svg')).toBe(true)
    })

    test('should detect SVG from file path', () => {
      expect(isSVG('image.svg')).toBe(true)
      expect(isSVG('/path/to/image.svg')).toBe(true)
    })

    test('should not detect non-SVG formats', () => {
      expect(isSVG('image/png')).toBe(false)
      expect(isSVG('image/jpeg')).toBe(false)
      expect(isSVG('.png')).toBe(false)
      expect(isSVG('png')).toBe(false)
    })

    test('should handle null/undefined gracefully', () => {
      expect(isSVG(null)).toBe(false)
      expect(isSVG(undefined)).toBe(false)
      expect(isSVG('')).toBe(false)
    })

    test('should be case insensitive', () => {
      expect(isSVG('IMAGE/SVG+XML')).toBe(true)
      expect(isSVG('Image/Svg')).toBe(true)
      expect(isSVG('.SVG')).toBe(true)
    })
  })

  describe('guessMimeTypeFromBase64', () => {
    test('should detect JPEG from magic bytes', () => {
      expect(guessMimeTypeFromBase64(JPEG_1x1_BASE64)).toBe('image/jpeg')
    })

    test('should detect PNG from magic bytes', () => {
      expect(guessMimeTypeFromBase64(PNG_1x1_BASE64)).toBe('image/png')
    })

    test('should detect GIF from magic bytes', () => {
      expect(guessMimeTypeFromBase64(GIF_1x1_BASE64)).toBe('image/gif')
    })

    test('should detect BMP from magic bytes', () => {
      expect(guessMimeTypeFromBase64(BMP_1x1_BASE64)).toBe('image/bmp')
    })

    test('should return false for unrecognized magic bytes', () => {
      expect(guessMimeTypeFromBase64('SGVsbG8gV29ybGQ=')).toBe(false)
    })
  })
})
