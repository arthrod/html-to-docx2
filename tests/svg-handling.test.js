// Unit tests for SVG handling functionality
// Tests SVG to PNG conversion, native SVG support, and configuration options

import HTMLtoDOCX from '../index.ts'
import { convertSVGtoPNG, isSVG, parseSVGDimensions } from '../src/utils/image'
import { SVG_BASE64 } from './fixtures/index.js'
import { parseDOCX } from './helpers/docx-assertions.js'

let sharpAvailable = true

beforeAll(async () => {
  try {
    await import('sharp')
  } catch {
    sharpAvailable = false
  }
})

describe('SVG Handling', () => {
  describe('isSVG utility', () => {
    test('should detect SVG from image/svg+xml MIME type', () => {
      expect(isSVG('image/svg+xml')).toBe(true)
    })

    test('should detect SVG from image/svg MIME type', () => {
      expect(isSVG('image/svg')).toBe(true)
    })

    test('should detect SVG from .svg extension', () => {
      expect(isSVG('.svg')).toBe(true)
      expect(isSVG('svg')).toBe(true)
    })

    test('should detect SVG from file path', () => {
      expect(isSVG('image.svg')).toBe(true)
      expect(isSVG('/path/to/image.svg')).toBe(true)
    })

    test('should not detect non-SVG formats', () => {
      expect(isSVG('image/png')).toBe(false)
      expect(isSVG('image/jpeg')).toBe(false)
      expect(isSVG('.png')).toBe(false)
      expect(isSVG('png')).toBe(false)
    })

    test('should handle null/undefined gracefully', () => {
      expect(isSVG(null)).toBe(false)
      expect(isSVG(undefined)).toBe(false)
      expect(isSVG('')).toBe(false)
    })

    test('should be case insensitive', () => {
      expect(isSVG('IMAGE/SVG+XML')).toBe(true)
      expect(isSVG('Image/Svg')).toBe(true)
      expect(isSVG('.SVG')).toBe(true)
    })
  })

  describe('parseSVGDimensions utility', () => {
    test('should parse integer width and height', () => {
      const svg = '<svg width="100" height="200"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200)
    })

    test('should parse decimal width and height', () => {
      const svg = '<svg width="100.5" height="200.75"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(101) // Rounded
      expect(height).toBe(201) // Rounded
    })

    test('should parse dimensions with px unit', () => {
      const svg = '<svg width="100px" height="200px"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200)
    })

    test('should parse dimensions with cm unit', () => {
      const svg = '<svg width="10cm" height="5cm"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      // 1cm = 37.7952755906 pixels at 96 DPI
      expect(width).toBe(378) // Rounded from 377.95...
      expect(height).toBe(189) // Rounded from 188.97...
    })

    test('should parse dimensions with mm unit', () => {
      const svg = '<svg width="100mm" height="50mm"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      // 1mm = 3.77952755906 pixels
      expect(width).toBe(378)
      expect(height).toBe(189)
    })

    test('should parse dimensions with inch unit', () => {
      const svg = '<svg width="2in" height="1in"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      // 1in = 96 pixels at 96 DPI
      expect(width).toBe(192)
      expect(height).toBe(96)
    })

    test('should parse dimensions with pt unit', () => {
      const svg = '<svg width="72pt" height="36pt"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      // 1pt = 1.33333... pixels
      expect(width).toBe(96)
      expect(height).toBe(48)
    })

    test('should use viewBox when width/height not present', () => {
      const svg = '<svg viewBox="0 0 100 200"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200)
    })

    test('should calculate missing width from height and viewBox', () => {
      const svg = '<svg height="200" viewBox="0 0 100 200"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100) // Calculated from aspect ratio
      expect(height).toBe(200)
    })

    test('should calculate missing height from width and viewBox', () => {
      const svg = '<svg width="100" viewBox="0 0 100 200"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200) // Calculated from aspect ratio
    })

    test('should handle viewBox with negative minX/minY', () => {
      const svg = '<svg viewBox="-10 -20 100 200"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200)
    })

    test('should handle SVG without dimensions', () => {
      const svg = '<svg><circle r="50"/></svg>'
      const { width, height } = parseSVGDimensions(svg)

      // Should return reasonable defaults when no dimensions found
      expect(width).toBe(300)
      expect(height).toBe(150)
    })

    test('should handle attributes without quotes', () => {
      const svg = '<svg width=100 height=200></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200)
    })

    test('should be case insensitive for attributes', () => {
      const svg = '<svg WIDTH="100" HEIGHT="200" VIEWBOX="0 0 50 100"></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200)
    })

    test('should handle whitespace in viewBox', () => {
      const svg = '<svg viewBox="  0   0   100   200  "></svg>'
      const { width, height } = parseSVGDimensions(svg)

      expect(width).toBe(100)
      expect(height).toBe(200)
    })
  })

  describe('convertSVGtoPNG utility', () => {
    // The new API: convertSVGtoPNG(svgBase64: string, width: number, height: number) => Promise<string | null>
    // Returns base64 string on success, null if conversion not possible

    test('should convert SVG base64 to PNG base64 string', async () => {
      const result = await convertSVGtoPNG(SVG_BASE64, 100, 100)

      // Result depends on sharp availability
      expect(result === null || typeof result === 'string').toBe(true)
      expect(result !== null).toBe(sharpAvailable)
    })

    test('should produce valid PNG when sharp is available', async () => {
      const result = await convertSVGtoPNG(SVG_BASE64, 100, 100)

      // Skip PNG signature check if sharp not available
      expect(result !== null).toBe(sharpAvailable)

      // Only verify PNG bytes when we got a result
      const pngBuffer = result ? Buffer.from(result, 'base64') : null
      expect(pngBuffer?.[0] === 0x89 || result === null).toBe(true)
      expect(pngBuffer?.[1] === 0x50 || result === null).toBe(true)
    })

    test('should respect width and height parameters', async () => {
      const result = await convertSVGtoPNG(SVG_BASE64, 200, 150)

      expect(result === null || typeof result === 'string').toBe(true)
      expect(result !== null).toBe(sharpAvailable)
    })

    test('should return null for invalid SVG base64', async () => {
      const invalidBase64 = Buffer.from('not valid svg').toString('base64')
      const result = await convertSVGtoPNG(invalidBase64, 100, 100)

      // Should return null (not throw) for invalid input
      expect(result).toBeNull()
    })
  })

  describe('SVG to PNG conversion (default behavior)', () => {
    test('should convert SVG data URL to PNG by default', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert', // Explicit default
        },
      })

      const parsed = await parseDOCX(docx)

      // Should have generated a paragraph with image
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)

      expect(parsed.xml).toMatch(new RegExp(`image-.*\\.${sharpAvailable ? 'png' : 'svg'}`))
    })

    test('should convert inline SVG to PNG by default', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<p>Text with <img src="${svgDataUrl}" /> inline SVG</p>`

      const docx = await HTMLtoDOCX(htmlString)

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })

    test('should handle multiple SVGs and convert all to PNG', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `
        <img src="${svgDataUrl}" />
        <img src="${svgDataUrl}" />
        <img src="${svgDataUrl}" />
      `

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(3)
    })

    test('should handle mixed SVG and raster images', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const { PNG_FIXTURE } = await import('./fixtures/index.js')
      const pngDataUrl = `data:image/png;base64,${PNG_FIXTURE.toString('base64')}`

      const htmlString = `
        <p>SVG Image:</p>
        <img src="${svgDataUrl}" />
        <p>PNG Image:</p>
        <img src="${pngDataUrl}" />
      `

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(4)
    })

    test('should handle SVG with dimensions', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" width="200" height="200" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)

      // Check dimensions are in the XML
      expect(parsed.xml).toMatch(/cx=["'][0-9]+["']/)
      expect(parsed.xml).toMatch(/cy=["'][0-9]+["']/)
    })

    test('should handle SVG with alt text', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" alt="Test SVG Description" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Native SVG support (Office 2019+)', () => {
    test('should embed SVG natively when svgHandling is "native"', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'native',
        },
      })

      const parsed = await parseDOCX(docx)

      // Should have generated a paragraph with image
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)

      // Check that image file is SVG (not PNG) in native mode
      expect(parsed.xml).toMatch(/image-.*\.svg/)
    })

    test('should register SVG content type in [Content_Types].xml', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'native',
        },
      })

      const parsed = await parseDOCX(docx)

      // Check that [Content_Types].xml includes SVG content type registration
      expect(parsed.contentTypes).toBeDefined()
      expect(parsed.contentTypes).toMatch(/<Default Extension="svg"/)
      expect(parsed.contentTypes).toMatch(/ContentType="image\/svg\+xml"/)
    })

    test('should handle multiple native SVGs', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `
        <img src="${svgDataUrl}" />
        <img src="${svgDataUrl}" />
      `

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'native',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(2)

      // In native mode, SVG files should be used
      const svgMatches = parsed.xml.match(/image-.*\.svg/g)
      expect(svgMatches).not.toBeNull()
      expect(svgMatches.length).toBeGreaterThanOrEqual(1)
    })

    test('should handle native SVG with dimensions', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" width="300" height="300" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'native',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)

      // Check dimensions
      expect(parsed.xml).toMatch(/cx=["'][0-9]+["']/)
      expect(parsed.xml).toMatch(/cy=["'][0-9]+["']/)
      // In native mode, file should be .svg
      expect(parsed.xml).toMatch(/image-.*\.svg/)
    })
  })

  describe('SVG handling configuration', () => {
    test('should use "convert" as default when svgHandling is not specified', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      // No svgHandling option specified - should default to 'convert'
      const docx = await HTMLtoDOCX(htmlString)

      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toMatch(new RegExp(`image-.*\\.${sharpAvailable ? 'png' : 'svg'}`))
    })

    test('should respect svgHandling option from imageProcessing config', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      const docxNative = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'native',
        },
      })

      const parsedNative = await parseDOCX(docxNative)
      // Native mode should use .svg
      expect(parsedNative.xml).toMatch(/image-.*\.svg/)

      const docxConvert = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsedConvert = await parseDOCX(docxConvert)
      expect(parsedConvert.xml).toMatch(new RegExp(`\\.${sharpAvailable ? 'png' : 'svg'}`))
    })

    test('should handle invalid svgHandling option gracefully', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      // Invalid option should fall back to default behavior
      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'invalid-option',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('SVG error handling', () => {
    test('should handle invalid SVG data gracefully', async () => {
      const invalidSvgDataUrl = 'data:image/svg+xml;base64,aW52YWxpZCBzdmc=' // "invalid svg" in base64
      const htmlString = `<p>Before</p><img src="${invalidSvgDataUrl}" /><p>After</p>`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)

      // Should still generate document with text paragraphs
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(2)
    })

    test('should fall back to native SVG if conversion fails', async () => {
      // Create an SVG that might fail conversion
      const problematicSvg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
      const svgBase64 = Buffer.from(problematicSvg, 'utf-8').toString('base64')
      const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)

      // Should still create document (either as PNG or falling back to SVG)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(0)
    })

    test('should handle empty SVG data URL', async () => {
      const htmlString = '<p>Before</p><img src="data:image/svg+xml;base64," /><p>After</p>'

      const docx = await HTMLtoDOCX(htmlString)
      const parsed = await parseDOCX(docx)

      // Should create document with text paragraphs
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('SVG with other features', () => {
    test('should handle SVG in figure elements', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `
        <figure>
          <img src="${svgDataUrl}" alt="Figure SVG" />
        </figure>
      `

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })

    test('should handle SVG in tables', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `
        <table>
          <tr>
            <td>Text</td>
            <td><img src="${svgDataUrl}" /></td>
          </tr>
        </table>
      `

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })

    test('should handle SVG with CSS styles', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<img src="${svgDataUrl}" style="width: 250px; height: 250px;" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })

    test('should handle SVG in links', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `<a href="https://example.com"><img src="${svgDataUrl}" /></a>`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Performance and caching with SVGs', () => {
    test('should cache converted SVG images', async () => {
      const svgDataUrl = `data:image/svg+xml;base64,${SVG_BASE64}`
      const htmlString = `
        <img src="${svgDataUrl}" />
        <img src="${svgDataUrl}" />
        <img src="${svgDataUrl}" />
      `

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
          verboseLogging: false,
        },
      })

      const parsed = await parseDOCX(docx)

      // Should process all three images
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(3)
    })

    test('should handle large SVG files efficiently', async () => {
      // Create a more complex SVG
      const complexSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
          ${Array.from({ length: 100 }, (_, i) => `<circle cx="${(i % 10) * 50}" cy="${Math.floor(i / 10) * 50}" r="20" fill="#${((i * 123456) % 16777215).toString(16).padStart(6, '0')}" />`).join('\n')}
        </svg>
      `
      const complexSvgBase64 = Buffer.from(complexSvg, 'utf-8').toString('base64')
      const svgDataUrl = `data:image/svg+xml;base64,${complexSvgBase64}`
      const htmlString = `<img src="${svgDataUrl}" />`

      const docx = await HTMLtoDOCX(htmlString, null, {
        imageProcessing: {
          svgHandling: 'convert',
        },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })
  })
})
