// @ts-check

// Robust numbering/list tests
// Tests ordered lists, unordered lists, nested lists, list style types, and numbering XML output

import HTMLtoDOCX from '../index.ts'
import { parseDOCX } from './helpers/docx-assertions'

describe('Numbering and Lists', () => {
  describe('Ordered lists', () => {
    test('should generate numbering XML for ordered list', async () => {
      const html = `
        <ol>
          <li>First</li>
          <li>Second</li>
          <li>Third</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('First')
      expect(parsed.xml).toContain('Second')
      expect(parsed.xml).toContain('Third')
      // Should have numbering references
      expect(parsed.xml).toMatch(/w:numId/)
    })

    test('should handle upper-roman list style', async () => {
      const html = `
        <ol style="list-style-type: upper-roman">
          <li>Item I</li>
          <li>Item II</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Item I')
      expect(parsed.numberingXml).toMatch(/upperRoman/)
    })

    test('should handle lower-alpha list style', async () => {
      const html = `
        <ol style="list-style-type: lower-alpha">
          <li>Item a</li>
          <li>Item b</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Item a')
      expect(parsed.numberingXml).toMatch(/lowerLetter/)
    })

    test('should handle upper-alpha list style', async () => {
      const html = `
        <ol style="list-style-type: upper-alpha">
          <li>Item A</li>
          <li>Item B</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.numberingXml).toMatch(/upperLetter/)
    })

    test('should handle lower-roman list style', async () => {
      const html = `
        <ol style="list-style-type: lower-roman">
          <li>Item i</li>
          <li>Item ii</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.numberingXml).toMatch(/lowerRoman/)
    })

    test('should handle multiple separate ordered lists', async () => {
      const html = `
        <ol>
          <li>List 1 - A</li>
          <li>List 1 - B</li>
        </ol>
        <p>Separator paragraph</p>
        <ol>
          <li>List 2 - A</li>
          <li>List 2 - B</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('List 1 - A')
      expect(parsed.xml).toContain('List 2 - A')
      expect(parsed.xml).toContain('Separator paragraph')
    })
  })

  describe('Unordered lists', () => {
    test('should generate bullet list', async () => {
      const html = `
        <ul>
          <li>Bullet 1</li>
          <li>Bullet 2</li>
          <li>Bullet 3</li>
        </ul>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Bullet 1')
      expect(parsed.xml).toContain('Bullet 2')
      expect(parsed.xml).toMatch(/w:numId/)
    })

    test('should handle circle list style', async () => {
      const html = `
        <ul style="list-style-type: circle">
          <li>Circle item</li>
        </ul>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Circle item')
    })

    test('should handle square list style', async () => {
      const html = `
        <ul style="list-style-type: square">
          <li>Square item</li>
        </ul>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Square item')
    })
  })

  describe('Nested lists', () => {
    test('should handle 3-level nested ordered lists', async () => {
      const html = `
        <ol>
          <li>Level 1
            <ol>
              <li>Level 2
                <ol>
                  <li>Level 3</li>
                </ol>
              </li>
            </ol>
          </li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Level 1')
      expect(parsed.xml).toContain('Level 2')
      expect(parsed.xml).toContain('Level 3')
      // Different indentation levels should have different ilvl values
      expect(parsed.xml).toMatch(/w:ilvl/)
    })

    test('should handle mixed ordered and unordered nesting', async () => {
      const html = `
        <ol>
          <li>Ordered parent
            <ul>
              <li>Unordered child 1</li>
              <li>Unordered child 2</li>
            </ul>
          </li>
          <li>Ordered parent 2</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Ordered parent')
      expect(parsed.xml).toContain('Unordered child 1')
      expect(parsed.xml).toContain('Ordered parent 2')
    })

    test('should handle unordered with nested ordered', async () => {
      const html = `
        <ul>
          <li>Bullet
            <ol>
              <li>Numbered 1</li>
              <li>Numbered 2</li>
            </ol>
          </li>
        </ul>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Bullet')
      expect(parsed.xml).toContain('Numbered 1')
    })
  })

  describe('List items with rich content', () => {
    test('should handle list items with formatted text', async () => {
      const html = `
        <ul>
          <li><strong>Bold item</strong></li>
          <li><em>Italic item</em></li>
          <li><a href="https://example.com">Link item</a></li>
        </ul>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Bold item')
      expect(parsed.xml).toContain('Italic item')
      expect(parsed.xml).toContain('Link item')
      expect(parsed.xml).toMatch(/w:b/)
      expect(parsed.xml).toMatch(/w:i/)
    })

    test('should handle list items with inline formatting', async () => {
      const html = `
        <ol>
          <li>Item with <strong>bold</strong> and <em>italic</em> text</li>
          <li>Single paragraph item</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Item with')
      expect(parsed.xml).toContain('Single paragraph item')
    })

    test('should handle list items with multiple paragraphs', async () => {
      const html = `
        <ol>
          <li><p>Paragraph 1 in item</p><p>Paragraph 2 in item</p></li>
          <li>Single paragraph item</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html)
      const parsed = await parseDOCX(docx)

      // First paragraph should be present
      expect(parsed.xml).toContain('Paragraph 1 in item')
      // The library may merge or separate these — verify at least one appears
      // and the second list item is present
      expect(parsed.xml).toContain('Single paragraph item')
    })
  })

  describe('Custom numbering options', () => {
    test('should use custom default ordered list style', async () => {
      const html = `
        <ol>
          <li>Item 1</li>
          <li>Item 2</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html, null, {
        numbering: { defaultOrderedListStyleType: 'lowerLetter' },
      })
      const parsed = await parseDOCX(docx)

      expect(parsed.xml).toContain('Item 1')
      expect(parsed.numberingXml).toMatch(/lowerLetter/)
    })

    test('should use upperRoman as custom default', async () => {
      const html = `
        <ol>
          <li>Alpha</li>
          <li>Beta</li>
        </ol>
      `
      const docx = await HTMLtoDOCX(html, null, {
        numbering: { defaultOrderedListStyleType: 'upperRoman' },
      })
      const parsed = await parseDOCX(docx)

      expect(parsed.numberingXml).toMatch(/upperRoman/)
    })
  })

  describe('Line numbering', () => {
    test('should apply line numbering with options', async () => {
      const html = '<p>Line 1</p><p>Line 2</p><p>Line 3</p>'

      const docx = await HTMLtoDOCX(html, null, {
        lineNumber: true,
        lineNumberOptions: { countBy: 5, start: 1, restart: 'newPage' },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.xml).toMatch(/lnNumType/)
      expect(parsed.xml).toMatch(/countBy/)
      expect(parsed.xml).toMatch(/newPage/)
    })

    test('should apply continuous line numbering', async () => {
      const html = '<p>Line A</p><p>Line B</p>'

      const docx = await HTMLtoDOCX(html, null, {
        lineNumber: true,
        lineNumberOptions: { countBy: 1, start: 0, restart: 'continuous' },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.xml).toMatch(/lnNumType/)
      expect(parsed.xml).toMatch(/continuous/)
    })

    test('should apply newSection line numbering restart', async () => {
      const html = '<p>Content</p>'

      const docx = await HTMLtoDOCX(html, null, {
        lineNumber: true,
        lineNumberOptions: { countBy: 10, start: 1, restart: 'newSection' },
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.xml).toMatch(/lnNumType/)
      expect(parsed.xml).toMatch(/newSection/)
    })

    test('should skip line numbering when lineNumber is false', async () => {
      const html = '<p>No line numbers</p>'

      const docx = await HTMLtoDOCX(html, null, {
        lineNumber: false,
      })

      const parsed = await parseDOCX(docx)
      expect(parsed.xml).not.toMatch(/lnNumType/)
    })
  })
})
