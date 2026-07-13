/**
 * Unit tests for unit conversion utilities.
 * Tests conversion between various units used in DOCX:
 * - Pixels to TWIP (twentieths of a point)
 * - Points to TWIP
 * - Centimeters to TWIP
 * - Inches to TWIP
 * - Pixels to EMU (English Metric Units)
 * - Points to HIP (half points)
 */

import {
  cmRegex,
  cmToTWIP,
  HIPToTWIP,
  inchRegex,
  EIPToPixel,
  EIPToPoint,
  EMUToPixel,
  EMUToTWIP,
  HIPToPixel,
  HIPToPoint,
  inchToPoint,
  inchToTWIP,
  cmToInch,
  percentageRegex,
  pixelRegex,
  pixelToEIP,
  pixelToEMU,
  pixelToHIP,
  pixelToPoint,
  pixelToTWIP,
  pointRegex,
  pointToEIP,
  pointToHIP,
  pointToPixel,
  pointToTWIP,
  TWIPToEMU,
  TWIPToHIP,
  TWIPToPixel,
  TWIPToPoint,
} from './unit-conversion'

describe('unit conversion', () => {
  describe('regex patterns', () => {
    it('pixelRegex should match pixel values', () => {
      expect(pixelRegex.test('10px')).toBe(true)
      expect(pixelRegex.test('100.5px')).toBe(true)
      expect(pixelRegex.test('10pt')).toBe(false)
    })

    it('pointRegex should match point values', () => {
      expect(pointRegex.test('12pt')).toBe(true)
      expect(pointRegex.test('11.5pt')).toBe(true)
      expect(pointRegex.test('12px')).toBe(false)
    })

    it('cmRegex should match centimeter values', () => {
      expect(cmRegex.test('2.54cm')).toBe(true)
      expect(cmRegex.test('10cm')).toBe(true)
      expect(cmRegex.test('10px')).toBe(false)
    })

    it('inchRegex should match inch values', () => {
      expect(inchRegex.test('1in')).toBe(true)
      expect(inchRegex.test('0.5in')).toBe(true)
      expect(inchRegex.test('1px')).toBe(false)
    })

    it('percentageRegex should match percentage values', () => {
      expect(percentageRegex.test('50%')).toBe(true)
      expect(percentageRegex.test('100%')).toBe(true)
      expect(percentageRegex.test('50px')).toBe(false)
    })
  })

  describe('pixel conversions', () => {
    it('pixelToPoint should convert pixels to points', () => {
      // 96px -> 72pt
      expect(pixelToPoint(96)).toBe(72)
    })

    it('pixelToTWIP should convert pixels to TWIP', () => {
      // 1 pixel = 15 TWIP (at 96 DPI)
      expect(pixelToTWIP(1)).toBe(15)
      expect(pixelToTWIP(10)).toBe(150)
      expect(pixelToTWIP(96)).toBe(1440) // 1 inch = 1440 TWIP
    })

    it('pixelToEMU should convert pixels to EMU', () => {
      // 1 pixel = 9525 EMU (at 96 DPI)
      expect(pixelToEMU(1)).toBe(9525)
      expect(pixelToEMU(10)).toBe(95_250)
    })

    it('pixelToHIP should convert pixels to half points', () => {
      // Calculated via EMU and TWIP conversion chain (rounded)
      expect(pixelToHIP(1)).toBe(2)
      expect(pixelToHIP(10)).toBe(15)
    })

    it('pixelToEIP should convert pixels to eighths of a point', () => {
      // Calculated via point conversion chain (rounded)
      expect(pixelToEIP(1)).toBe(8)
      expect(pixelToEIP(10)).toBe(64)
    })
  })

  describe('point conversions', () => {
    it('pointToPixel should convert points to pixels', () => {
      // 72pt -> 96px
      expect(pointToPixel(72)).toBe(96)
    })

    it('pointToTWIP should convert points to TWIP', () => {
      // 1 point = 20 TWIP
      expect(pointToTWIP(1)).toBe(20)
      expect(pointToTWIP(12)).toBe(240)
      expect(pointToTWIP(72)).toBe(1440) // 72 points = 1 inch
    })

    it('pointToHIP should convert points to half points', () => {
      // 1 point = 2 half points
      expect(pointToHIP(1)).toBe(2)
      expect(pointToHIP(11)).toBe(22)
    })

    it('pointToEIP should convert points to eighths of a point', () => {
      // 1 point = 8 eighths of a point
      expect(pointToEIP(1)).toBe(8)
      expect(pointToEIP(2)).toBe(16)
    })
  })

  describe('centimeter conversions', () => {
    it('cmToInch should convert centimeters to inches', () => {
      expect(cmToInch(2.54)).toBeCloseTo(1, 4)
    })

    it('cmToTWIP should convert centimeters to TWIP', () => {
      // 1 cm = 566.929 TWIP (approximately)
      const result = cmToTWIP(2.54)
      // 2.54 cm = 1 inch = 1440 TWIP
      expect(Math.round(result)).toBe(1440)
    })
  })

  describe('inch conversions', () => {
    it('inchToPoint should convert inches to points', () => {
      expect(inchToPoint(1)).toBe(72)
    })

    it('inchToTWIP should convert inches to TWIP', () => {
      // 1 inch = 1440 TWIP
      expect(inchToTWIP(1)).toBe(1440)
      expect(inchToTWIP(0.5)).toBe(720)
      expect(inchToTWIP(2)).toBe(2880)
    })
  })

  describe('TWIP conversions', () => {
    it('TWIPToEMU should convert TWIP to EMU', () => {
      // 1 TWIP = 635 EMU
      expect(TWIPToEMU(1)).toBe(635)
      expect(TWIPToEMU(1440)).toBe(914_400) // 1 inch in EMU
    })

    it('TWIPToPoint should convert TWIP to points', () => {
      expect(TWIPToPoint(1440)).toBe(72)
    })

    it('TWIPToHIP should convert TWIP to half points', () => {
      expect(TWIPToHIP(1440)).toBe(144)
    })

    it('TWIPToPixel should convert TWIP to pixels', () => {
      expect(TWIPToPixel(1440)).toBe(96)
    })
  })

  describe('HIP conversions', () => {
    it('HIPToTWIP should convert half points to TWIP', () => {
      // 1 half point = 10 TWIP
      expect(HIPToTWIP(1)).toBe(10)
      expect(HIPToTWIP(22)).toBe(220) // 11pt = 22 half points = 220 TWIP
    })

    it('HIPToPoint should convert half points to points', () => {
      expect(HIPToPoint(144)).toBe(72)
    })

    it('HIPToPixel should convert half points to pixels', () => {
      expect(HIPToPixel(144)).toBe(96)
    })
  })

  describe('EMU conversions', () => {
    it('EMUToPixel should convert EMU to pixels', () => {
      expect(EMUToPixel(914_400)).toBe(96)
    })

    it('EMUToTWIP should convert EMU to TWIP', () => {
      expect(EMUToTWIP(914_400)).toBe(1440)
    })
  })

  describe('EIP conversions', () => {
    it('EIPToPoint should convert eighths of a point to points', () => {
      expect(EIPToPoint(576)).toBe(72)
    })

    it('EIPToPixel should convert eighths of a point to pixels', () => {
      expect(EIPToPixel(576)).toBe(96)
    })
  })
})
