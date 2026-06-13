import { describe, expect, test } from 'vitest'
import { hslToHex, hex3ToHex, rgbToHex } from '../src/utils/color-conversion'

describe('Color Conversion Utilities', () => {
  // WHAT: Verifies that HSL color values are correctly converted to 6-character hex strings.
  // WHY: CSS styles in HTML may use HSL formats, but DOCX requires colors in hex format.
  // If this conversion is mathematically incorrect, documents will render with the wrong colors.
  describe('hslToHex', () => {
    test('converts basic colors correctly', () => {
      // Red
      expect(hslToHex(0, 100, 50)).toBe('ff0000')
      // Green
      expect(hslToHex(120, 100, 50)).toBe('00ff00')
      // Blue
      expect(hslToHex(240, 100, 50)).toBe('0000ff')
    })

    test('handles achromatic colors (grayscale)', () => {
      // Black
      expect(hslToHex(0, 0, 0)).toBe('000000')
      // White
      expect(hslToHex(0, 0, 100)).toBe('ffffff')
      // Gray
      expect(hslToHex(0, 0, 50)).toBe('808080') // Or '7f7f7f' depending on rounding
    })

    test('handles fractional logic in hue2rgb', () => {
      // Different hue values to trigger various branches of hue2rgb
      expect(hslToHex(30, 50, 50)).toBe('bf8040') // 191, 128, 64
      expect(hslToHex(180, 50, 50)).toBe('40bfbf') // 64, 191, 191
      expect(hslToHex(330, 50, 50)).toBe('bf4080') // 191, 64, 128
    })
  })

  // WHAT: Verifies that 3-character hex shorthand strings are correctly expanded.
  // WHY: Users often author HTML with #rgb instead of #rrggbb. DOCX strictly expects #rrggbb.
  describe('hex3ToHex', () => {
    test('expands 3-character hex shorthand to 6-character hex', () => {
      expect(hex3ToHex('f', '0', '0')).toBe('ff0000')
      expect(hex3ToHex('a', 'b', 'c')).toBe('aabbcc')
    })
  })

  // WHAT: Verifies that decimal RGB values are correctly converted to hex.
  // WHY: Validates padding behavior to ensure leading zeros are not dropped.
  describe('rgbToHex', () => {
    test('pads single-digit hex values with a leading zero', () => {
      expect(rgbToHex(0, 5, 15)).toBe('00050f')
    })
  })
})
