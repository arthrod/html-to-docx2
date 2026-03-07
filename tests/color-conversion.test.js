// @ts-check

import {
  hex3Regex,
  hex3ToHex,
  hexRegex,
  hslRegex,
  hslToHex,
  rgbRegex,
  rgbToHex,
} from '../src/utils/color-conversion'

describe('color conversion utilities', () => {
  test('regex patterns match expected formats', () => {
    expect(rgbRegex.test('rgb(255, 0, 0)')).toBe(true)
    expect(hslRegex.test('hsl(120, 50%, 50%)')).toBe(true)
    expect(hexRegex.test('#FF0000')).toBe(true)
    expect(hex3Regex.test('#abc')).toBe(true)

    expect(rgbRegex.test('#FF0000')).toBe(false)
    expect(hslRegex.test('rgb(255, 0, 0)')).toBe(false)
  })

  test('converts rgb channels to hex', () => {
    expect(rgbToHex(0, 0, 0)).toBe('000000')
    expect(rgbToHex(255, 255, 255)).toBe('ffffff')
    expect(rgbToHex(128, 64, 32)).toBe('804020')
    expect(rgbToHex('255', '128', '0')).toBe('ff8000')
  })

  test('converts hsl colors including achromatic branch', () => {
    expect(hslToHex(0, 100, 50).toLowerCase()).toBe('ff0000')
    expect(hslToHex(120, 100, 50).toLowerCase()).toBe('00ff00')
    expect(hslToHex(240, 100, 50).toLowerCase()).toBe('0000ff')
    expect(hslToHex(0, 0, 0).toLowerCase()).toBe('000000')
    expect(hslToHex(0, 0, 100).toLowerCase()).toBe('ffffff')

    const gray = hslToHex(0, 0, 50).toLowerCase()
    expect(gray).toMatch(/^[78][0-9a-f][78][0-9a-f][78][0-9a-f]$/)
  })

  test('expands 3-digit hex channels', () => {
    expect(hex3ToHex('F', '0', '0')).toBe('FF0000')
    expect(hex3ToHex('0', 'F', '0')).toBe('00FF00')
    expect(hex3ToHex('0', '0', 'F')).toBe('0000FF')
    expect(hex3ToHex('a', 'b', 'c')).toBe('aabbcc')
  })
})
