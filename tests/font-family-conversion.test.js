// @ts-check

import { fontFamilyToTableObject } from '../src/utils/font-family-conversion'

describe('fontFamilyToTableObject', () => {
  test('returns fallback font when input is empty', () => {
    expect(fontFamilyToTableObject(undefined, 'Calibri')).toEqual({
      fontName: 'Calibri',
      genericFontName: 'Calibri',
    })
  })

  test('strips wrapping quotes and preserves first/last family', () => {
    expect(fontFamilyToTableObject('"Times New Roman", serif', 'Calibri')).toEqual({
      fontName: 'Times New Roman',
      genericFontName: 'serif',
    })
  })

  test('keeps unquoted family names unchanged', () => {
    expect(fontFamilyToTableObject("'Inter', sans-serif", 'Calibri')).toEqual({
      fontName: 'Inter',
      genericFontName: 'sans-serif',
    })
  })
})
