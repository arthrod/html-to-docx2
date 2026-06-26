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
  cmToInch,
  cmToTWIP,
  EIPToPixel,
  EIPToPoint,
  EMUToPixel,
  EMUToTWIP,
  HIPToPixel,
  HIPToPoint,
  HIPToTWIP,
  inchRegex,
  inchToPoint,
  inchToTWIP,
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

    it('pixelToPoint should convert pixels to points', () => {
      // Proves pixel to point conversion via HIP. Ensures 96 pixels correctly yields 72 points (standard web conversion).
      expect(pixelToPoint(96)).toBe(72)
    })
  })

  describe('point conversions', () => {
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

    it('pointToPixel should convert points to pixels', () => {
      // Proves points map correctly to pixels (72 points = 96 pixels) for screen rendering measurements.
      expect(pointToPixel(72)).toBe(96)
    })
  })

  describe('centimeter conversions', () => {
    it('cmToTWIP should convert centimeters to TWIP', () => {
      // 1 cm = 566.929 TWIP (approximately)
      const result = cmToTWIP(2.54)
      // 2.54 cm = 1 inch = 1440 TWIP
      expect(Math.round(result)).toBe(1440)
    })

    it('cmToInch should convert centimeters to inches', () => {
      // Proves the specific conversion factor logic ensures 2.54cm equates exactly to 1 inch for formatting sizes.
      expect(cmToInch(2.54)).toBeCloseTo(1, 5)
    })
  })

  describe('inch conversions', () => {
    it('inchToTWIP should convert inches to TWIP', () => {
      // 1 inch = 1440 TWIP
      expect(inchToTWIP(1)).toBe(1440)
      expect(inchToTWIP(0.5)).toBe(720)
      expect(inchToTWIP(2)).toBe(2880)
    })

    it('inchToPoint should convert inches to points', () => {
      // Proves correct scaling of inches to points, necessary for absolute positioning of text (1 inch = 72 points).
      expect(inchToPoint(1)).toBe(72)
    })
  })

  describe('TWIP conversions', () => {
    it('TWIPToEMU should convert TWIP to EMU', () => {
      // 1 TWIP = 635 EMU
      expect(TWIPToEMU(1)).toBe(635)
      expect(TWIPToEMU(1440)).toBe(914_400) // 1 inch in EMU
    })

    it('TWIPToPoint should convert TWIP to points', () => {
      // Proves accurate TWIP division mapping (20 TWIP = 1 pt) used to calculate text sizes in Word rendering logic.
      expect(TWIPToPoint(20)).toBe(1)
    })

    it('TWIPToPixel should convert TWIP to pixels', () => {
      // Proves correct derivation of pixel values from TWIPs, allowing correct image scaling matching inch sizes.
      expect(TWIPToPixel(1440)).toBe(96)
    })

    it('TWIPToHIP should convert TWIP to half points', () => {
      // Proves 10 TWIP equals 1 half point.
      expect(TWIPToHIP(10)).toBe(1)
    })
  })

  describe('EMU conversions', () => {
    it('EMUToPixel should convert EMU to pixels', () => {
      // Proves English Metric Units (the standard in Word XML for images) correctly translates back to browser pixels.
      expect(EMUToPixel(9525)).toBe(1)
    })

    it('EMUToTWIP should convert EMU to TWIP', () => {
      // Proves the specific translation mapping from document standard EMU to layout format TWIPs is accurate.
      expect(EMUToTWIP(635)).toBe(1)
    })
  })

  describe('EIP conversions', () => {
    it('EIPToPoint should convert EIP to points', () => {
      // Proves eighths of a point successfully scales back to standard points correctly.
      expect(EIPToPoint(8)).toBe(1)
    })

    it('EIPToPixel should convert EIP to pixels', () => {
      // Proves full traversal from EIP to pixels resolves securely via intermediate points mapping.
      expect(EIPToPixel(8)).toBe(1)
    })
  })

  describe('HIP conversions', () => {
    it('HIPToTWIP should convert half points to TWIP', () => {
      // 1 half point = 10 TWIP
      expect(HIPToTWIP(1)).toBe(10)
      expect(HIPToTWIP(22)).toBe(220) // 11pt = 22 half points = 220 TWIP
    })

    it('HIPToPoint should convert half points to points', () => {
      // Proves exactly two half points evaluate properly into one full point without precision loss.
      expect(HIPToPoint(2)).toBe(1)
    })

    it('HIPToPixel should convert half points to pixels', () => {
      // Proves accurate derived representation of HIPs mapping effectively into browser pixel counts for rendering equivalents.
      expect(HIPToPixel(15)).toBe(10)
    })
  })
})
