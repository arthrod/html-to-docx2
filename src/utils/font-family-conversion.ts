export const removeSimpleOrDoubleQuotes = /^["'](.*)["']$/

export type FontTableObject = {
  fontName: string
  genericFontName: string
}

export const fontFamilyToTableObject = (
  fontFamilyString: string | null | undefined,
  fallbackFont: string
): FontTableObject => {
  const removeWrappingQuotes = (fontName: string): string => {
    const match = fontName.match(removeSimpleOrDoubleQuotes)
    return match ? match[1] : fontName
  }

  const fontFamilyElements = fontFamilyString
    ? fontFamilyString.split(',').map((fontName) => {
        const trimmedFontName = fontName.trim()
        return removeWrappingQuotes(trimmedFontName)
      })
    : [fallbackFont]

  return {
    fontName: fontFamilyElements[0],
    genericFontName:
      fontFamilyElements[fontFamilyElements.length - 1] || fontFamilyElements[0],
  }
}
