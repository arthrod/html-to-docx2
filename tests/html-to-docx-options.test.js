// @ts-check

import JSZip from 'jszip'

import HTMLtoDOCX from '../src/html-to-docx-node'
import { addFilesToContainer } from '../src/html-to-docx'
import { cmToTWIP, inchToTWIP, pixelToTWIP } from '../src/utils/unit-conversion'

/**
 * @param {Uint8Array | Buffer | ArrayBuffer | Blob} output
 * @returns {Promise<JSZip>}
 */
async function loadZip(output) {
  if (output instanceof Blob) {
    return JSZip.loadAsync(await output.arrayBuffer())
  }

  return JSZip.loadAsync(output)
}

describe('html-to-docx options coverage', () => {
  test('normalizes mixed unit inputs for margins and page size', async () => {
    const result = await HTMLtoDOCX('<p>units</p>', null, {
      margins: {
        top: '96px',
        right: '2.54cm',
        bottom: '1in',
        left: 0,
      },
      pageSize: {
        width: '8.5in',
        height: '29.7cm',
      },
    })

    const zip = await loadZip(result)
    const documentXml = await zip.file('word/document.xml').async('string')

    expect(documentXml).toContain(`w:top="${pixelToTWIP(96)}"`)
    expect(documentXml).toContain(`w:right="${cmToTWIP(2.54)}"`)
    expect(documentXml).toContain(`w:bottom="${inchToTWIP(1)}"`)
    // 0 should fall back to defaults
    expect(documentXml).toContain('w:left="1800"')
    expect(documentXml).toContain(`w:w="${inchToTWIP(8.5)}"`)
    expect(documentXml).toContain(`w:h="${cmToTWIP(29.7)}"`)
  })

  test('uses default html for enabled header/footer and decodes entities', async () => {
    const zip = new JSZip()

    await addFilesToContainer(zip, '&lt;p&gt;decoded body&lt;/p&gt;', {
      decodeUnicode: true,
      footer: true,
      header: true,
    })

    const [documentXml, headerXml, footerXml] = await Promise.all([
      zip.file('word/document.xml').async('string'),
      zip.file('word/header1.xml').async('string'),
      zip.file('word/footer1.xml').async('string'),
    ])

    expect(documentXml).toContain('decoded body')
    expect(headerXml).toContain('<hdr')
    expect(footerXml).toContain('<ftr')
  })

  test('accepts null margins and pageSize without crashing', async () => {
    const result = await HTMLtoDOCX('<p>null-ish options</p>', null, {
      // runtime fallback branch: normalizeUnits(null) => null
      margins: null,
      pageSize: null,
    })

    const zip = await loadZip(result)
    const documentXml = await zip.file('word/document.xml').async('string')

    expect(documentXml).toContain('null-ish options')
    // should still produce section/page config from defaults
    expect(documentXml).toContain('<w:pgSz')
    expect(documentXml).toContain('<w:pgMar')
  })

  test('converts point-based font size options', async () => {
    const result = await HTMLtoDOCX('<p>font sizes</p>', null, {
      complexScriptFontSize: '11pt',
      fontSize: '17pt',
    })

    const zip = await loadZip(result)
    const stylesXml = await zip.file('word/styles.xml').async('string')

    // 17pt => 34 half-points, 11pt => 22 half-points
    expect(stylesXml).toContain('w:val="34"')
    expect(stylesXml).toContain('w:val="22"')
  })
})
