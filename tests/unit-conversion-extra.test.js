// @ts-check

import { HIPToPixel, pointToPixel } from '../src/utils/unit-conversion'

describe('unit conversion extra coverage', () => {
  test('HIPToPixel converts half-points to pixels', () => {
    expect(HIPToPixel(15)).toBe(10)
    expect(HIPToPixel(2)).toBe(1)
  })

  test('pointToPixel converts points to pixels', () => {
    expect(pointToPixel(12)).toBe(16)
    expect(pointToPixel(24)).toBe(32)
  })
})
