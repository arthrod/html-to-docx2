// @ts-check

// Unit tests for utility modules with low coverage
// Targets: url.ts, list.ts, font-family-conversion.ts, image-to-base64.ts

import { isValidUrl, isPrivateOrLocalHost } from '../src/utils/url'
import ListStyleBuilder from '../src/utils/list'
import {
  fontFamilyToTableObject,
  removeSimpleOrDoubleQuotes,
} from '../src/utils/font-family-conversion'
import {
  guessMimeTypeFromBytes,
  parseDataUrl,
  imageToBase64,
} from '../src/utils/image-to-base64'

describe('URL utilities', () => {
  test('should reject private or local hosts', () => {
    expect(isPrivateOrLocalHost('127.0.0.1')).toBe(true)
    expect(isPrivateOrLocalHost('localhost')).toBe(true)
    expect(isPrivateOrLocalHost('0x7f000001')).toBe(true)
    expect(isPrivateOrLocalHost('017700000001')).toBe(true)
    expect(isPrivateOrLocalHost('2130706433')).toBe(true)
    expect(isPrivateOrLocalHost('169.254.169.254')).toBe(true)
    expect(isPrivateOrLocalHost('192.168.1.1')).toBe(true)
    expect(isPrivateOrLocalHost('10.0.0.1')).toBe(true)
    expect(isPrivateOrLocalHost('google.com')).toBe(false)
  })

  test('should reject IPv6 and IPv4-mapped local hosts', () => {
    expect(isPrivateOrLocalHost('[::1]')).toBe(true)
    expect(isPrivateOrLocalHost('[::]')).toBe(true)
    expect(isPrivateOrLocalHost('[fe80::1]')).toBe(true)
    expect(isPrivateOrLocalHost('[fc00::1]')).toBe(true)
    expect(isPrivateOrLocalHost('[fd00::1]')).toBe(true)
    expect(isPrivateOrLocalHost('[::ffff:127.0.0.1]')).toBe(true)
    expect(isPrivateOrLocalHost('[::FFFF:127.0.0.1]')).toBe(true)
    expect(isPrivateOrLocalHost('[::ffff:192.168.1.1]')).toBe(true)
    expect(isPrivateOrLocalHost('[::ffff:8.8.8.8]')).toBe(false)
  })

  test('should validate http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('https://example.com/path?query=1')).toBe(true)
  })

  test('should reject non-http URLs', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false)
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
    expect(isValidUrl('data:text/html,test')).toBe(false)
  })

  test('should reject invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl(null)).toBe(false)
    expect(isValidUrl(undefined)).toBe(false)
  })
})

describe('ListStyleBuilder', () => {
  const builder = new ListStyleBuilder()
  const customBuilder = new ListStyleBuilder({ defaultOrderedListStyleType: 'lowerLetter' })

  describe('getListStyleType', () => {
    test('should return correct DOCX list styles', () => {
      expect(builder.getListStyleType('upper-roman')).toBe('upperRoman')
      expect(builder.getListStyleType('lower-roman')).toBe('lowerRoman')
      expect(builder.getListStyleType('upper-alpha')).toBe('upperLetter')
      expect(builder.getListStyleType('upper-alpha-bracket-end')).toBe('upperLetter')
      expect(builder.getListStyleType('lower-alpha')).toBe('lowerLetter')
      expect(builder.getListStyleType('lower-alpha-bracket-end')).toBe('lowerLetter')
      expect(builder.getListStyleType('decimal')).toBe('decimal')
      expect(builder.getListStyleType('decimal-bracket')).toBe('decimal')
    })

    test('should use default for unknown types', () => {
      expect(builder.getListStyleType(undefined)).toBe('decimal')
      expect(builder.getListStyleType('disc')).toBe('decimal')
    })

    test('should use custom default', () => {
      expect(customBuilder.getListStyleType(undefined)).toBe('lowerLetter')
    })
  })

  describe('getListPrefixSuffix', () => {
    test('should return dot suffix for roman/alpha styles', () => {
      expect(builder.getListPrefixSuffix({ 'list-style-type': 'upper-roman' }, 0)).toBe(
        '%1.'
      )
      expect(builder.getListPrefixSuffix({ 'list-style-type': 'lower-alpha' }, 1)).toBe(
        '%2.'
      )
    })

    test('should return bracket-end suffix', () => {
      expect(
        builder.getListPrefixSuffix({ 'list-style-type': 'decimal-bracket-end' }, 0)
      ).toBe('%1)')
      expect(
        builder.getListPrefixSuffix({ 'list-style-type': 'upper-alpha-bracket-end' }, 0)
      ).toBe('%1)')
      expect(
        builder.getListPrefixSuffix({ 'list-style-type': 'lower-alpha-bracket-end' }, 0)
      ).toBe('%1)')
    })

    test('should return bracket wrapper', () => {
      expect(builder.getListPrefixSuffix({ 'list-style-type': 'decimal-bracket' }, 0)).toBe(
        '(%1)'
      )
    })

    test('should handle null/undefined style', () => {
      expect(builder.getListPrefixSuffix(null, 0)).toBe('%1.')
      expect(builder.getListPrefixSuffix(undefined, 0)).toBe('%1.')
    })

    test('should handle different levels', () => {
      expect(builder.getListPrefixSuffix(null, 2)).toBe('%3.')
    })
  })

  describe('getUnorderedListPrefixSuffix', () => {
    test('should return correct bullet types', () => {
      expect(
        ListStyleBuilder.getUnorderedListPrefixSuffix({ 'list-style-type': 'circle' })
      ).toBe('o')
      // square and disc return special Unicode bullet characters
      const square = ListStyleBuilder.getUnorderedListPrefixSuffix({
        'list-style-type': 'square',
      })
      expect(square.length).toBe(1)
      const disc = ListStyleBuilder.getUnorderedListPrefixSuffix({
        'list-style-type': 'disc',
      })
      expect(disc.length).toBe(1)
    })

    test('should handle null/undefined', () => {
      // Returns default bullet char (not empty string)
      const nullResult = ListStyleBuilder.getUnorderedListPrefixSuffix(null)
      expect(nullResult.length).toBe(1)
      const undefResult = ListStyleBuilder.getUnorderedListPrefixSuffix(undefined)
      expect(undefResult.length).toBe(1)
    })
  })
})

describe('Font family conversion', () => {
  test('should parse single font name', () => {
    const result = fontFamilyToTableObject('Arial', 'Times New Roman')
    expect(result.fontName).toBe('Arial')
    expect(result.genericFontName).toBe('Arial')
  })

  test('should parse font list with generic fallback', () => {
    const result = fontFamilyToTableObject(
      'Helvetica, Arial, sans-serif',
      'Times New Roman'
    )
    expect(result.fontName).toBe('Helvetica')
    expect(result.genericFontName).toBe('sans-serif')
  })

  test('should handle quoted font names', () => {
    const result = fontFamilyToTableObject('"Times New Roman", serif', 'Arial')
    expect(result.fontName).toBe('Times New Roman')
    expect(result.genericFontName).toBe('serif')
  })

  test('should handle single-quoted font names', () => {
    const result = fontFamilyToTableObject("'Courier New', monospace", 'Arial')
    expect(result.fontName).toBe('Courier New')
    expect(result.genericFontName).toBe('monospace')
  })

  test('should use fallback when null/undefined', () => {
    const result = fontFamilyToTableObject(null, 'Times New Roman')
    expect(result.fontName).toBe('Times New Roman')
  })

  test('should use fallback when empty', () => {
    const result = fontFamilyToTableObject(undefined, 'Arial')
    expect(result.fontName).toBe('Arial')
  })

  test('removeSimpleOrDoubleQuotes regex should match', () => {
    expect(removeSimpleOrDoubleQuotes.test('"Arial"')).toBe(true)
    expect(removeSimpleOrDoubleQuotes.test("'Arial'")).toBe(true)
    expect(removeSimpleOrDoubleQuotes.test('Arial')).toBe(false)
  })
})

describe('Image to base64 utilities', () => {
  describe('guessMimeTypeFromBytes', () => {
    test('should detect JPEG', () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
      expect(guessMimeTypeFromBytes(bytes)).toBe('image/jpeg')
    })

    test('should detect PNG', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      expect(guessMimeTypeFromBytes(bytes)).toBe('image/png')
    })

    test('should detect GIF', () => {
      const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38])
      expect(guessMimeTypeFromBytes(bytes)).toBe('image/gif')
    })

    test('should detect WebP', () => {
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ])
      expect(guessMimeTypeFromBytes(bytes)).toBe('image/webp')
    })

    test('should detect BMP', () => {
      const bytes = new Uint8Array([0x42, 0x4d, 0x00, 0x00])
      expect(guessMimeTypeFromBytes(bytes)).toBe('image/bmp')
    })

    test('should detect SVG from text', () => {
      const svgText = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
      const bytes = new TextEncoder().encode(svgText)
      expect(guessMimeTypeFromBytes(bytes)).toBe('image/svg+xml')
    })

    test('should default to JPEG for unknown', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03])
      expect(guessMimeTypeFromBytes(bytes)).toBe('image/jpeg')
    })
  })

  describe('parseDataUrl', () => {
    test('should parse valid data URLs', () => {
      const result = parseDataUrl('data:image/png;base64,iVBORw0KGgo=')
      expect(result).toEqual({ mimeType: 'image/png', base64: 'iVBORw0KGgo=' })
    })

    test('should handle SVG+XML MIME type', () => {
      const result = parseDataUrl('data:image/svg+xml;base64,PHN2Zz4=')
      expect(result).toEqual({ mimeType: 'image/svg+xml', base64: 'PHN2Zz4=' })
    })

    test('should return null for non-data URLs', () => {
      expect(parseDataUrl('https://example.com/image.png')).toBeNull()
      expect(parseDataUrl('')).toBeNull()
    })
  })

  describe('imageToBase64', () => {
    test('should reject non-http protocols', async () => {
      await expect(imageToBase64('ftp://example.com/image.png')).rejects.toThrow(
        'Invalid URL'
      )
    })

    test('should reject data: URLs', async () => {
      await expect(imageToBase64('data:image/png;base64,abc')).rejects.toThrow(
        'Invalid URL'
      )
    })
  })
})
