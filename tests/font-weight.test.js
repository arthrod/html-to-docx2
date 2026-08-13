// @ts-check

import { isBoldFontWeight } from '../src/helpers/xml-builder'

describe('isBoldFontWeight', () => {
  test('treats named bold weights as bold', () => {
    expect(isBoldFontWeight('bold')).toBe(true)
    expect(isBoldFontWeight('Bolder')).toBe(true)
    expect(isBoldFontWeight('semibold')).toBe(true)
    expect(isBoldFontWeight('semi-bold')).toBe(true)
  })

  test('treats numeric weights >= 600 as bold', () => {
    expect(isBoldFontWeight('600')).toBe(true)
    expect(isBoldFontWeight('700')).toBe(true)
    expect(isBoldFontWeight('400')).toBe(false)
    expect(isBoldFontWeight('normal')).toBe(false)
  })
})
