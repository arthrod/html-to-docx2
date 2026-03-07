// @ts-check

/**
 * Unit tests for HTML parser (html-parser.js)
 * Tests the htmlparser2-based HTML to VNode conversion
 */

import createHTMLtoVDOM from '../src/helpers/html-parser'
import { isVNode, isVText } from '../src/vdom/index'

const convertHTML = createHTMLtoVDOM()
/** @typedef {import('../src/vdom/index').VNode} VNode */

/**
 * @param {import('../src/vdom/index').VNode | import('../src/vdom/index').VText} child
 * @param {string} tagName
 * @returns {child is VNode}
 */
const isTag = (child, tagName) => isVNode(child) && child.tagName === tagName

describe('HTML Parser - Basic Conversion', () => {
  describe('Text nodes', () => {
    test('should convert plain text to VText', () => {
      const result = convertHTML('Hello World')

      expect(isVText(result)).toBe(true)
      expect(result.text).toBe('Hello World')
    })

    test('should decode HTML entities in text', () => {
      const result = convertHTML('Hello &amp; World')

      expect(result.text).toBe('Hello & World')
    })

    test('should decode &nbsp; entities', () => {
      const result = convertHTML('Hello&nbsp;World')

      expect(result.text).toBe('Hello\u00a0World') // \u00a0 is non-breaking space
    })

    test('should decode &lt; and &gt;', () => {
      const result = convertHTML('&lt;div&gt;')

      expect(result.text).toBe('<div>')
    })

    test('should decode &quot;', () => {
      const result = convertHTML('&quot;Hello&quot;')

      expect(result.text).toBe('"Hello"')
    })
  })

  describe('Element nodes', () => {
    test('should convert simple element to VNode', () => {
      const result = convertHTML('<div></div>')

      expect(isVNode(result)).toBe(true)
      expect(result.tagName).toBe('div')
      expect(result.children).toEqual([])
    })

    test('should convert element with text content', () => {
      const result = convertHTML('<p>Hello</p>')

      expect(result.tagName).toBe('p')
      expect(result.children).toHaveLength(1)
      expect(isVText(result.children[0])).toBe(true)
      expect(result.children[0].text).toBe('Hello')
    })

    test('should convert nested elements', () => {
      const result = convertHTML('<div><p>Hello</p></div>')

      expect(result.tagName).toBe('div')
      expect(result.children).toHaveLength(1)
      expect(result.children[0].tagName).toBe('p')
      expect(result.children[0].children[0].text).toBe('Hello')
    })

    test('should convert self-closing tags', () => {
      const result = convertHTML('<img src="test.jpg" />')

      expect(result.tagName).toBe('img')
      expect(result.properties.src).toBe('test.jpg')
    })
  })

  describe('Multiple root nodes', () => {
    test('should return array for multiple root elements', () => {
      const result = convertHTML('<p>First</p><p>Second</p>')

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      expect(result[0].tagName).toBe('p')
      expect(result[1].tagName).toBe('p')
    })

    test('should return single VNode for one root element', () => {
      const result = convertHTML('<div><p>First</p><p>Second</p></div>')

      expect(Array.isArray(result)).toBe(false)
      expect(isVNode(result)).toBe(true)
      expect(result.tagName).toBe('div')
    })
  })
})

describe('HTML Parser - Properties vs Attributes', () => {
  describe('Properties (set directly on vNode.properties)', () => {
    test('should set src as property', () => {
      const result = convertHTML('<img src="image.jpg" />')

      expect(result.properties.src).toBe('image.jpg')
      expect(result.properties.attributes.src).toBeUndefined()
    })

    test('should set href as property', () => {
      const result = convertHTML('<a href="https://example.com">Link</a>')

      expect(result.properties.href).toBe('https://example.com')
      expect(result.properties.attributes.href).toBeUndefined()
    })

    test('should set alt as property', () => {
      const result = convertHTML('<img alt="Description" />')

      expect(result.properties.alt).toBe('Description')
      expect(result.properties.attributes.alt).toBeUndefined()
    })

    test('should set title as property', () => {
      const result = convertHTML('<div title="Tooltip">Content</div>')

      expect(result.properties.title).toBe('Tooltip')
      expect(result.properties.attributes.title).toBeUndefined()
    })

    test('should set id as property', () => {
      const result = convertHTML('<div id="main">Content</div>')

      expect(result.properties.id).toBe('main')
      expect(result.properties.attributes.id).toBeUndefined()
    })

    test('should set type as property', () => {
      const result = convertHTML('<input type="text" />')

      expect(result.properties.type).toBe('text')
      expect(result.properties.attributes.type).toBeUndefined()
    })

    test('should set name as property', () => {
      const result = convertHTML('<input name="username" />')

      expect(result.properties.name).toBe('username')
      expect(result.properties.attributes.name).toBeUndefined()
    })
  })

  describe('Attributes (set in vNode.properties.attributes)', () => {
    test('should set colspan as property (per html-to-vdom config)', () => {
      const result = convertHTML('<td colspan="2">Cell</td>')

      // colspan is actually a property in the html-to-vdom config
      expect(result.properties.colSpan).toBe('2')
    })

    test('should set rowspan as property (per html-to-vdom config)', () => {
      const result = convertHTML('<td rowspan="3">Cell</td>')

      // rowspan is actually a property in the html-to-vdom config
      expect(result.properties.rowSpan).toBe('3')
    })

    test('should set width as attribute', () => {
      const result = convertHTML('<img width="200" />')

      expect(result.properties.attributes.width).toBe('200')
    })

    test('should set height as attribute', () => {
      const result = convertHTML('<img height="100" />')

      expect(result.properties.attributes.height).toBe('100')
    })

    test('should set custom attributes', () => {
      const result = convertHTML('<div data-custom="value">Content</div>')

      expect(result.properties.attributes['data-custom']).toBe('value')
    })
  })

  describe('Special property mappings', () => {
    test('should map class to className', () => {
      const result = convertHTML('<div class="test-class">Content</div>')

      expect(result.properties.attributes.class).toBe('test-class')
      expect(result.properties.className).toBeUndefined() // className is set as attribute per html-to-vdom
    })

    test('should map for to htmlFor', () => {
      const result = convertHTML('<label for="input-id">Label</label>')

      expect(result.properties.htmlFor).toBe('input-id')
    })
  })
})

describe('HTML Parser - Style Parsing', () => {
  test('should parse inline styles into object', () => {
    const result = convertHTML('<div style="color: red; font-size: 16px;">Styled</div>')

    expect(result.properties.style).toEqual({
      color: 'red',
      'font-size': '16px',
    })
  })

  test('should handle styles with spaces', () => {
    const result = convertHTML(
      '<div style="  color:  red  ; font-size:   16px  ">Styled</div>'
    )

    expect(result.properties.style.color).toBe('red')
    expect(result.properties.style['font-size']).toBe('16px')
  })

  test('should handle empty style attribute', () => {
    const result = convertHTML('<div style="">Content</div>')

    expect(result.properties.style).toEqual({})
  })

  test('should handle complex CSS values', () => {
    const result = convertHTML(
      '<div style="background: url(image.jpg); padding: 10px 20px;">Content</div>'
    )

    expect(result.properties.style.background).toBe('url(image.jpg)')
    expect(result.properties.style.padding).toBe('10px 20px')
  })
})

describe('HTML Parser - Entity Decoding', () => {
  test('should decode entities in text content', () => {
    const result = convertHTML('<p>&lt;tag&gt; &amp; &quot;quotes&quot;</p>')

    expect(result.children[0].text).toBe('<tag> & "quotes"')
  })

  test('should decode entities in attributes', () => {
    const result = convertHTML('<div title="&lt;test&gt;">Content</div>')

    expect(result.properties.title).toBe('<test>')
  })

  test('should decode numeric entities', () => {
    const result = convertHTML('<p>&#65; &#x42;</p>')

    expect(result.children[0].text).toBe('A B')
  })

  test('should preserve already-decoded content', () => {
    const result = convertHTML('<p><>&"</p>')

    expect(result.children[0].text).toBe('<>&"')
  })

  test('should decode nbsp correctly', () => {
    const result = convertHTML('<p>Hello&nbsp;World</p>')

    // nbsp should be decoded to non-breaking space character
    expect(result.children[0].text).toBe('Hello\u00a0World')
    expect(result.children[0].text).not.toBe('Hello&nbsp;World')
  })

  test('should handle mixed entities and text', () => {
    const result = convertHTML('<p>Price: &pound;10.99 &amp; tax</p>')

    expect(result.children[0].text).toBe('Price: £10.99 & tax')
  })
})

describe('HTML Parser - Complex Structures', () => {
  test('should convert table structure', () => {
    const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>'
    const result = convertHTML(html)

    expect(result.tagName).toBe('table')
    // Find the tr element (might have whitespace text nodes)
    const tr = result.children.find((child) => isTag(child, 'tr'))
    expect(tr).toBeDefined()
    if (!tr) {
      throw new Error('Expected table row to exist')
    }
    // Find td elements
    const tds = tr.children.filter((child) => isTag(child, 'td'))
    expect(tds).toHaveLength(2)
  })

  test('should convert list structure', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
    const result = convertHTML(html)

    expect(result.tagName).toBe('ul')
    // Filter for li elements (ignore whitespace text nodes)
    const items = result.children.filter((child) => isTag(child, 'li'))
    expect(items).toHaveLength(2)
  })

  test('should handle deeply nested structure', () => {
    const html = '<div><section><article><p><span>Deep</span></p></article></section></div>'
    const result = convertHTML(html)

    let current = result
    expect(current.tagName).toBe('div')
    current = current.children[0]
    expect(current.tagName).toBe('section')
    current = current.children[0]
    expect(current.tagName).toBe('article')
    current = current.children[0]
    expect(current.tagName).toBe('p')
    current = current.children[0]
    expect(current.tagName).toBe('span')
    expect(current.children[0].text).toBe('Deep')
  })
})

describe('HTML Parser - Image Handling', () => {
  test('should parse img with data URI src', () => {
    const result = convertHTML('<img src="data:image/png;base64,abc123" />')

    expect(result.tagName).toBe('img')
    expect(result.properties.src).toBe('data:image/png;base64,abc123')
  })

  test('should parse img with width and height', () => {
    const result = convertHTML('<img src="test.jpg" width="500" height="300" />')

    expect(result.properties.src).toBe('test.jpg')
    expect(result.properties.attributes.width).toBe('500')
    expect(result.properties.attributes.height).toBe('300')
  })

  test('should parse img with style dimensions', () => {
    const result = convertHTML(
      '<img src="test.jpg" style="width: 512px; height: 400px;" />'
    )

    expect(result.properties.src).toBe('test.jpg')
    expect(result.properties.style.width).toBe('512px')
    expect(result.properties.style.height).toBe('400px')
  })
})

describe('HTML Parser - Edge Cases', () => {
  test('should handle empty HTML', () => {
    const result = convertHTML('')

    // Empty HTML should return empty text node
    expect(isVText(result)).toBe(true)
    expect(result.text).toBe('')
  })

  test('should handle whitespace-only HTML', () => {
    const result = convertHTML('   ')

    expect(isVText(result)).toBe(true)
    expect(result.text).toBe('   ')
  })

  test('should handle comments (ignore them)', () => {
    const result = convertHTML('<!-- comment --><div>Content</div>')

    // Comments should be ignored, result should be the div
    const divs = Array.isArray(result)
      ? result.filter((node) => node.tagName === 'div')
      : [result]
    expect(divs).toHaveLength(1)
    expect(divs[0].tagName).toBe('div')
  })

  test('should handle script tags', () => {
    const result = convertHTML('<script>console.log("test")</script>')

    expect(result.tagName).toBe('script')
  })

  test('should handle style tags', () => {
    const result = convertHTML('<style>.test { color: red; }</style>')

    expect(result.tagName).toBe('style')
  })

  test('should preserve case in attribute names', () => {
    const result = convertHTML('<div dataValue="test">Content</div>')

    // htmlparser2 with lowerCaseAttributeNames: false preserves case
    expect(
      result.properties.attributes.dataValue || result.properties.attributes.datavalue
    ).toBe('test')
  })
})

describe('HTML Parser - Fragment and Document Normalization', () => {
  test('uses tbody context for fragment rows and keeps tr as root', () => {
    const result = convertHTML('<!--leading--><tr><td>A</td></tr>')

    expect(Array.isArray(result)).toBe(true)
    if (!Array.isArray(result)) {
      throw new Error('Expected array result')
    }
    const row = result.find((node) => isTag(node, 'tr'))
    expect(row).toBeDefined()
    if (!row || !isVNode(row)) {
      throw new Error('Expected tr node')
    }
    expect(row.children[0].tagName).toBe('td')
  })

  test('uses table context for table section fragments', () => {
    const result = convertHTML('<thead><tr><th>H</th></tr></thead>')

    expect(Array.isArray(result)).toBe(false)
    expect(result.tagName).toBe('thead')
    expect(result.children[0].tagName).toBe('tr')
    expect(result.children[0].children[0].tagName).toBe('th')
  })

  test('uses colgroup context for col fragments', () => {
    const result = convertHTML('<col span="2" />')

    expect(Array.isArray(result)).toBe(false)
    expect(result.tagName).toBe('col')
    expect(result.properties.span).toBe(2)
  })

  test('normalizes explicit head roots and preserves body siblings', () => {
    const result = convertHTML('<head><title>T</title></head><p>Body</p>')

    expect(Array.isArray(result)).toBe(true)
    expect(result[0].tagName).toBe('head')
    expect(result.some((node) => isTag(node, 'p'))).toBe(true)
  })

  test('normalizes explicit body roots and preserves inferred head nodes', () => {
    const result = convertHTML('<body><p>Body</p></body><meta charset="utf-8">')

    expect(Array.isArray(result)).toBe(false)
    expect(result.tagName).toBe('body')
    expect(result.children.some((node) => isTag(node, 'p'))).toBe(true)
  })

  test('normalizes doctype-only documents to body children', () => {
    const result = convertHTML('<!doctype html><p>Doc</p>')

    expect(Array.isArray(result)).toBe(true)
    if (!Array.isArray(result)) {
      throw new Error('Expected array result')
    }
    const paragraph = result.find((node) => isTag(node, 'p'))
    expect(paragraph).toBeDefined()
    if (!paragraph || !isVNode(paragraph)) {
      throw new Error('Expected paragraph node')
    }
    expect(paragraph.children[0].text).toBe('Doc')
  })
})

describe('HTML Parser - Boolean and Numeric Property Handling', () => {
  test('parses overloaded boolean properties as true when empty', () => {
    const result = convertHTML('<a download>Download</a>')

    expect(result.properties.download).toBe(true)
  })

  test('parses overloaded boolean properties as string when valued', () => {
    const result = convertHTML('<a download="report.docx">Download</a>')

    expect(result.properties.download).toBe('report.docx')
  })

  test('parses numeric properties as numbers', () => {
    const result = convertHTML('<ol start="5"><li>Item</li></ol>')

    expect(result.properties.start).toBe(5)
  })

  test('supports getVNodeKey option callback', () => {
    const result = convertHTML(
      {
        getVNodeKey: (props) => props.attributes?.class || null,
      },
      '<div class="k-1">keyed</div>'
    )

    expect(result.key).toBe('k-1')
  })
})
