import {
  defaultFont,
  defaultFontSize,
  defaultHeadingOptions,
  defaultLang,
  type HeadingOptions,
  type HeadingStyleOptions,
} from '../constants'
import namespaces from '../namespaces'

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const generateHeadingStyleXML = (
  headingId: string,
  heading: HeadingStyleOptions
): string => {
  const headingNumber = Number.parseInt(headingId.replace('Heading', ''), 10)

  const fontXml =
    heading.font && heading.font !== defaultFont
      ? `<w:rFonts w:ascii="${escapeXml(
          heading.font
        )}" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorBidi" />`
      : ''

  const fontSizeXml =
    heading.fontSize !== undefined &&
    heading.fontSize !== defaultFontSize &&
    heading.fontSize > 0
      ? `<w:sz w:val="${heading.fontSize}" /><w:szCs w:val="${heading.fontSize}" />`
      : ''

  const boldXml = heading.bold ? '<w:b />' : ''

  const keepLinesXml = heading.keepLines ? '<w:keepLines />' : ''
  const keepNextXml = heading.keepNext ? '<w:keepNext />' : ''

  let spacingAfterXml = ''
  let spacingXml = ''
  if (heading.spacing) {
    const spacingBeforeXml =
      heading.spacing.before !== undefined ? `w:before="${heading.spacing.before}"` : ''
    spacingAfterXml =
      heading.spacing.after !== undefined ? `w:after="${heading.spacing.after}"` : ''
    spacingXml =
      spacingBeforeXml || spacingAfterXml
        ? `<w:spacing ${spacingBeforeXml} ${spacingAfterXml} />`
        : ''
  }

  const validOutlineLevel = Math.max(0, Math.min(5, heading.outlineLevel || 0))
  const outlineXml = `<w:outlineLvl w:val="${validOutlineLevel}" />`

  const additionalPropsXml =
    headingNumber >= 3 ? '<w:semiHidden /><w:unhideWhenUsed />' : ''
  const unhideWhenUsedXml = headingNumber === 2 ? '<w:unhideWhenUsed />' : ''

  return `
		<w:style w:type="paragraph" w:styleId="${headingId}">
		  <w:name w:val="heading ${headingNumber}" />
		  <w:basedOn w:val="Normal" />
		  <w:next w:val="Normal" />
		  <w:uiPriority w:val="9" />
		  ${unhideWhenUsedXml}
		  ${additionalPropsXml}
		  <w:qFormat />
		  <w:pPr>
			${keepNextXml}
			${keepLinesXml}
			${spacingXml}
			${outlineXml}
		  </w:pPr>
		  <w:rPr>
			${fontXml}
			${boldXml}
			${fontSizeXml}
		  </w:rPr>
		</w:style>`
}

const generateStylesXML = (
  font: string = defaultFont,
  fontSize: number = defaultFontSize,
  complexScriptFontSize: number = defaultFontSize,
  lang: string = defaultLang,
  headingConfig: HeadingOptions = defaultHeadingOptions
): string => {
  const config: HeadingOptions = Object.fromEntries(
    Object.entries(defaultHeadingOptions).map(([key, defaultValue]) => [
      key,
      headingConfig?.[key as keyof HeadingOptions]
        ? {
            ...defaultValue,
            ...headingConfig[key as keyof HeadingOptions],
          }
        : defaultValue,
    ])
  ) as HeadingOptions

  return `
  <?xml version="1.0" encoding="UTF-8" standalone="yes"?>

  <w:styles xmlns:w="${namespaces.w}" xmlns:r="${namespaces.r}">
		<w:docDefaults>
		  <w:rPrDefault>
			<w:rPr>
			  <w:rFonts w:ascii="${font}" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorBidi" />
			  <w:sz w:val="${fontSize}" />
			  <w:szCs w:val="${complexScriptFontSize}" />
			  <w:lang w:val="${lang}" w:eastAsia="${lang}" w:bidi="ar-SA" />
			</w:rPr>
		  </w:rPrDefault>
		  <w:pPrDefault>
			<w:pPr>
			  <w:spacing w:after="120" w:line="240" w:lineRule="atLeast" />
			</w:pPr>
		  </w:pPrDefault>
		</w:docDefaults>
		<w:style w:type="paragraph" w:styleId="Normal" w:default="1">
		  <w:name w:val="normal" />
		</w:style>
		<w:style w:type="character" w:styleId="Hyperlink">
		  <w:name w:val="Hyperlink" />
		  <w:rPr>
			<w:color w:val="0000FF" />
			<w:u w:val="single" />
		  </w:rPr>
		</w:style>
		${Object.entries(config)
      .filter(([key]) => key.startsWith('heading'))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) =>
        generateHeadingStyleXML(
          key.charAt(0).toUpperCase() + key.slice(1),
          value as HeadingStyleOptions
        )
      )
      .join('')}
  </w:styles>
  `
}

export default generateStylesXML
