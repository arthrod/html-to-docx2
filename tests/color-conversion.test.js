import { describe, test, expect } from 'vitest'
import { rgbToHex, hslToHex, hex3ToHex } from '../src/utils/color-conversion'

describe('Color conversion utilities', () => {
  describe('rgbToHex', () => {
    test('converts RGB to hex string', () => {
      // WHAT: Proves rgbToHex correctly converts decimal RGB channels to 6-char hex.
      // WHY: Ensures colors defined as rgb(r, g, b) in HTML are properly mapped to DOCX hex formats without crashing or producing invalid values.
      expect(rgbToHex(255, 0, 0)).toBe('ff0000')
      expect(rgbToHex(0, 255, 0)).toBe('00ff00')
      expect(rgbToHex(0, 0, 255)).toBe('0000ff')
      expect(rgbToHex(255, 255, 255)).toBe('ffffff')
      expect(rgbToHex(0, 0, 0)).toBe('000000')
    })

    test('handles string inputs', () => {
      expect(rgbToHex('255', '128', '0')).toBe('ff8000')
      expect(rgbToHex('15', '15', '15')).toBe('0f0f0f')
    })
  })

  describe('hslToHex', () => {
    test('converts HSL to hex string', () => {
      // WHAT: Proves hslToHex correctly converts Hue, Saturation, Lightness to hex.
      // WHY: Needed to support hsl() colors in HTML and convert them correctly to DOCX hex.
      expect(hslToHex(0, 100, 50)).toBe('ff0000') // Red
      expect(hslToHex(120, 100, 50)).toBe('00ff00') // Green
      expect(hslToHex(240, 100, 50)).toBe('0000ff') // Blue
      expect(hslToHex(0, 0, 100)).toBe('ffffff') // White
      expect(hslToHex(0, 0, 0)).toBe('000000') // Black
      expect(hslToHex(180, 50, 50)).toBe('40bfbf') // Cyan-ish
    })

    test('handles achromatic (saturation = 0)', () => {
      expect(hslToHex(120, 0, 50)).toBe('808080')
      expect(hslToHex(0, 0, 25)).toBe('404040')
    })

    test('handles fractional hue2rgb branch', () => {
      expect(hslToHex(300, 100, 50)).toBe('ff00ff') // Magenta
    })
  })

  describe('hex3ToHex', () => {
    test('expands 3-character hex code to 6-character hex code', () => {
      // WHAT: Proves hex3ToHex duplicates each character to expand short hex codes.
      // WHY: Needed because DOCX requires 6-character hex codes for colors, so #ABC must become #AABBCC.
      expect(hex3ToHex('f', '0', '0')).toBe('ff0000')
      expect(hex3ToHex('a', 'b', 'c')).toBe('aabbcc')
      expect(hex3ToHex('1', '2', '3')).toBe('112233')
    })
  })
})
