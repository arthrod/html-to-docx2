/**
 * 🧪 WHAT: This test verifies the regex patterns and unit conversion functions in src/utils/unit-conversion.ts
 * 🎯 WHY: These utilities form the foundation of CSS unit parsing to OOXML formats (TWIP, HIP, EMU). Bugs here would cause silent mis-renderings of dimensions globally (images, margins, line-heights).
 */
import { describe, test, expect } from 'vitest'
import {
  pixelRegex,
  percentageRegex,
  pointRegex,
  cmRegex,
  inchRegex,
  pixelToEMU,
  EMUToPixel,
  TWIPToEMU,
  EMUToTWIP,
  pointToTWIP,
  TWIPToPoint,
  pointToHIP,
  HIPToPoint,
  HIPToTWIP,
  TWIPToHIP,
  pixelToTWIP,
  TWIPToPixel,
  pixelToHIP,
  HIPToPixel,
  inchToPoint,
  inchToTWIP,
  cmToInch,
  cmToTWIP,
  pixelToPoint,
  pointToPixel,
  EIPToPoint,
  pointToEIP,
  pixelToEIP,
  EIPToPixel,
} from '../src/utils/unit-conversion'

describe('Unit Conversion utilities', () => {
  describe('regexes', () => {
    test('pixelRegex should match pixels', () => {
      expect(pixelRegex.test('10px')).toBe(true)
      expect(pixelRegex.test('10.5px')).toBe(true)
      expect(pixelRegex.test('10pt')).toBe(false)
    })

    test('percentageRegex should match percentages', () => {
      expect(percentageRegex.test('100%')).toBe(true)
      expect(percentageRegex.test('50.5%')).toBe(true)
      expect(percentageRegex.test('100px')).toBe(false)
    })

    test('pointRegex should match points', () => {
      expect(pointRegex.test('12pt')).toBe(true)
      expect(pointRegex.test('12.5pt')).toBe(true)
      expect(pointRegex.test('12px')).toBe(false)
    })

    test('cmRegex should match centimeters', () => {
      expect(cmRegex.test('10cm')).toBe(true)
      expect(cmRegex.test('10.5cm')).toBe(true)
      expect(cmRegex.test('10in')).toBe(false)
    })

    test('inchRegex should match inches', () => {
      expect(inchRegex.test('1in')).toBe(true)
      expect(inchRegex.test('1.5in')).toBe(true)
      expect(inchRegex.test('1cm')).toBe(false)
    })
  })

  describe('conversion functions', () => {
    test('should correctly convert between units', () => {
      // test the main conversion paths
      expect(pixelToEMU(10)).toBe(95250)
      expect(EMUToPixel(95250)).toBe(10)

      expect(TWIPToEMU(10)).toBe(6350)
      expect(EMUToTWIP(6350)).toBe(10)

      expect(pointToTWIP(10)).toBe(200)
      expect(TWIPToPoint(200)).toBe(10)

      expect(pointToHIP(10)).toBe(20)
      expect(HIPToPoint(20)).toBe(10)

      expect(HIPToTWIP(10)).toBe(100)
      expect(TWIPToHIP(100)).toBe(10)

      expect(pixelToTWIP(10)).toBe(150)
      expect(TWIPToPixel(150)).toBe(10)

      expect(pixelToHIP(10)).toBe(15)
      expect(HIPToPixel(15)).toBe(10)

      expect(inchToPoint(1)).toBe(72)
      expect(inchToTWIP(1)).toBe(1440)

      expect(cmToInch(2.54)).toBeCloseTo(1, 4)
      expect(cmToTWIP(2.54)).toBeCloseTo(1440, 0)

      expect(pixelToPoint(96)).toBe(72)
      expect(pointToPixel(72)).toBe(96)

      expect(EIPToPoint(80)).toBe(10)
      expect(pointToEIP(10)).toBe(80)

      expect(pixelToEIP(96)).toBe(576)
      expect(EIPToPixel(576)).toBe(96)
    })
  })
})
