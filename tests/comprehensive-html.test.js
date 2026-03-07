// @ts-check

// Comprehensive HTML-to-DOCX integration tests
// Generates realistic HTML content and validates the DOCX output structure

import HTMLtoDOCX from '../index.ts'
import { parseDOCX } from './helpers/docx-assertions'

/**
 * @typedef {{
 *   xml: string
 *   paragraphs: Array<{ text: string; runs: Array<{ text?: string }> }>
 * }} ParsedDocx
 */

/**
 * @param {Uint8Array | ArrayBuffer | Buffer} docx
 * @returns {Promise<ParsedDocx>}
 */
async function parseDocx(docx) {
  const parsed = await parseDOCX(docx)

  if (
    parsed &&
    typeof parsed === 'object' &&
    'xml' in parsed &&
    typeof parsed.xml === 'string' &&
    'paragraphs' in parsed &&
    Array.isArray(parsed.paragraphs)
  ) {
    return {
      xml: parsed.xml,
      paragraphs: parsed.paragraphs,
    }
  }

  throw new Error('Invalid parsed DOCX shape')
}

describe('Comprehensive HTML to DOCX', () => {
  describe('Rich HTML content', () => {
    test('should convert a full HTML document with mixed elements', async () => {
      const html = `
        <h1>Document Title</h1>
        <h2>Section 1: Text Formatting</h2>
        <p>This is a paragraph with <strong>bold</strong>, <em>italic</em>,
        <u>underline</u>, and <s>strikethrough</s> text.</p>
        <p>Here is <sup>superscript</sup> and <sub>subscript</sub> text.</p>
        <h3>Subsection: Links</h3>
        <p>Visit <a href="https://example.com">Example</a> for more.</p>
        <h2>Section 2: Lists</h2>
        <ul>
          <li>Unordered item 1</li>
          <li>Unordered item 2</li>
          <li>Unordered item 3</li>
        </ul>
        <ol>
          <li>Ordered item 1</li>
          <li>Ordered item 2</li>
          <li>Ordered item 3</li>
        </ol>
        <h2>Section 3: Table</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Value</th><th>Unit</th></tr>
          </thead>
          <tbody>
            <tr><td>Width</td><td>100</td><td>px</td></tr>
            <tr><td>Height</td><td>200</td><td>px</td></tr>
          </tbody>
        </table>
        <h2>Section 4: Nested Content</h2>
        <blockquote>
          <p>This is a blockquote with <strong>bold text</strong>.</p>
        </blockquote>
        <pre><code>const x = 42;</code></pre>
      `

      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      // Should produce substantial content
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(10)
      // Should contain heading text
      expect(parsed.xml).toContain('Document Title')
      expect(parsed.xml).toContain('Section 1')
      // Should contain table elements
      expect(parsed.xml).toMatch(/w:tbl/)
      // Should contain formatted text runs
      expect(parsed.xml).toMatch(/w:b/)
      expect(parsed.xml).toMatch(/w:i/)
    })

    test('should handle nested lists', async () => {
      const html = `
        <ol>
          <li>First level
            <ul>
              <li>Second level A</li>
              <li>Second level B
                <ol>
                  <li>Third level</li>
                </ol>
              </li>
            </ul>
          </li>
          <li>First level again</li>
        </ol>
      `

      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(4)
      expect(parsed.xml).toContain('First level')
      expect(parsed.xml).toContain('Second level A')
      expect(parsed.xml).toContain('Third level')
    })

    test('should handle RTL content', async () => {
      const html = `
        <p dir="rtl">هذا نص باللغة العربية</p>
        <p dir="ltr">This is English text</p>
      `

      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(2)
      expect(parsed.xml).toContain('هذا نص باللغة العربية')
    })

    test('should handle styled content', async () => {
      const html = `
        <p style="color: red; font-size: 24px; font-family: 'Arial', sans-serif;">
          Red large Arial text
        </p>
        <p style="text-align: center;">Centered text</p>
        <p style="text-align: right;">Right-aligned text</p>
        <p style="background-color: yellow;">Highlighted text</p>
      `

      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(4)
      expect(parsed.xml).toContain('Red large Arial text')
    })

    test('should handle line breaks', async () => {
      const html = `<p>Line one<br/>Line two<br/>Line three</p>`

      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
      // br should produce w:br elements
      expect(parsed.xml).toMatch(/w:br/)
    })

    test('should handle horizontal rules', async () => {
      const html = `
        <p>Before rule</p>
        <hr/>
        <p>After rule</p>
      `

      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(2)
    })

    test('should handle complex table with merged cells and styles', async () => {
      const html = `
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td colspan="2" style="background-color: #f0f0f0; font-weight: bold;">Header spanning 2 cols</td>
            <td>Regular</td>
          </tr>
          <tr>
            <td rowspan="2">Spanning rows</td>
            <td>Cell 1</td>
            <td>Cell 2</td>
          </tr>
          <tr>
            <td>Cell 3</td>
            <td>Cell 4</td>
          </tr>
        </table>
      `

      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.xml).toMatch(/w:tbl/)
      expect(parsed.xml).toContain('Header spanning 2 cols')
    })
  })

  describe('Document options', () => {
    test('should apply custom margins', async () => {
      const html = '<p>Test</p>'
      const docx = await HTMLtoDOCX(html, null, {
        margins: {
          top: 720,
          right: 720,
          bottom: 720,
          left: 720,
        },
      })

      const parsed = await parseDocx(docx)
      expect(parsed.xml).toMatch(/w:top="720"/)
      expect(parsed.xml).toMatch(/w:bottom="720"/)
    })

    test('should apply landscape orientation', async () => {
      const html = '<p>Landscape content</p>'
      const docx = await HTMLtoDOCX(html, null, {
        orientation: 'landscape',
      })

      const parsed = await parseDocx(docx)
      expect(parsed.xml).toMatch(/w:orient="landscape"/)
    })

    test('should apply custom page size', async () => {
      const html = '<p>A4 content</p>'
      const docx = await HTMLtoDOCX(html, null, {
        pageSize: {
          width: 11906,
          height: 16838,
        },
      })

      const parsed = await parseDocx(docx)
      expect(parsed.xml).toMatch(/w:w="11906"/)
      expect(parsed.xml).toMatch(/w:h="16838"/)
    })

    test('should apply custom heading styles', async () => {
      const html = `
        <h1>Custom Heading 1</h1>
        <h2>Custom Heading 2</h2>
      `

      const docx = await HTMLtoDOCX(html, null, {
        heading: {
          heading1: {
            fontSize: 32,
            color: '#333333',
            spacing: { before: 240, after: 120 },
          },
          heading2: {
            fontSize: 24,
            color: '#666666',
          },
        },
      })

      const parsed = await parseDocx(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(2)
    })

    test('should handle header and footer', async () => {
      const html = '<p>Document body</p>'
      const header = '<p>Header content</p>'

      const docx = await HTMLtoDOCX(html, header, {
        footer: true,
      })

      const parsed = await parseDocx(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(1)
    })

    test('should apply line numbering', async () => {
      const html = '<p>Line 1</p><p>Line 2</p><p>Line 3</p>'

      const docx = await HTMLtoDOCX(html, null, {
        lineNumber: true,
        lineNumberOptions: { countBy: 5, start: 1, restart: 'newPage' },
      })

      const parsed = await parseDocx(docx)
      expect(parsed.paragraphs.length).toBeGreaterThanOrEqual(3)
      // Should contain lnNumType element with our options
      expect(parsed.xml).toMatch(/lnNumType/)
      expect(parsed.xml).toContain('countBy')
    })
  })

  describe('Edge cases', () => {
    test('should handle empty HTML', async () => {
      const docx = await HTMLtoDOCX('')
      const parsed = await parseDocx(docx)
      expect(parsed.xml).toBeDefined()
    })

    test('should handle HTML with only whitespace', async () => {
      const docx = await HTMLtoDOCX('   \n\t  ')
      const parsed = await parseDocx(docx)
      expect(parsed.xml).toBeDefined()
    })

    test('should handle deeply nested elements', async () => {
      const html = '<div><div><div><div><p>Deep content</p></div></div></div></div>'
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.xml).toContain('Deep content')
    })

    test('should handle special characters', async () => {
      const html = '<p>&lt;script&gt;alert("xss")&lt;/script&gt;</p>'
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      // Special characters should be properly escaped
      expect(parsed.xml).not.toContain('<script>')
    })

    test('should handle Unicode characters', async () => {
      const html =
        '<p>Chinese: 你好世界 | Japanese: こんにちは | Korean: 안녕하세요 | Emoji: 🎉</p>'
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDocx(docx)

      expect(parsed.xml).toContain('你好世界')
    })
  })
})
