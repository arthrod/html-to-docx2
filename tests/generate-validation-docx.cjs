// @ts-check
/**
 * Generate DOCX files for OOXML schema validation.
 * Run: node tests/generate-validation-docx.cjs
 * Then validate each with: python3 .claude/skills/docx/scripts/office/validate.py <file>.docx -v
 */
const fs = require('fs')
const path = require('path')
/** @typedef {Blob | Buffer | Uint8Array | ArrayBuffer} HtmlToDocxResult */
/**
 * @typedef {(html: string, headerHtml: string | null, options: Record<string, string | number | boolean | { svgHandling: 'convert' | 'native' }>) => Promise<HtmlToDocxResult>} HtmlToDocxConvert
 */

const OUT_DIR = path.join(__dirname, 'regression-baseline')

/**
 * @param {HtmlToDocxResult} docResult
 * @returns {Promise<Buffer>}
 */
const toBuffer = async (docResult) => {
  if (Buffer.isBuffer(docResult)) return docResult
  if (docResult instanceof ArrayBuffer) return Buffer.from(docResult)
  if (typeof Blob !== 'undefined' && docResult instanceof Blob) {
    const arrayBuffer = await docResult.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
  if (ArrayBuffer.isView(docResult)) {
    return Buffer.from(docResult)
  }

  throw new TypeError(
    `Unsupported doc result type: ${Object.prototype.toString.call(docResult)}`
  )
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  /** @type {{ default: HtmlToDocxConvert }} */
  const { default: HTMLtoDOCX } = require('../dist/index.cjs')

  // 1. Tracked changes: insertion + deletion
  {
    const insPayload = encodeURIComponent(
      JSON.stringify({ id: 'ins-1', author: 'Alice', date: '2025-01-15T10:00:00Z' })
    )
    const delPayload = encodeURIComponent(
      JSON.stringify({ id: 'del-1', author: 'Bob', date: '2025-01-15T11:00:00Z' })
    )

    const html = `
      <h1>Tracked Changes Document</h1>
      <p>This paragraph has [[DOCX_INS_START:${insPayload}]]newly inserted[[DOCX_INS_END:${encodeURIComponent('ins-1')}]] text.</p>
      <p>This paragraph has [[DOCX_DEL_START:${delPayload}]]removed[[DOCX_DEL_END:${encodeURIComponent('del-1')}]] text.</p>
      <p>This is a normal paragraph with no changes.</p>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Tracked Changes Test' })
    fs.writeFileSync(path.join(OUT_DIR, 'test-tracked-changes.docx'), await toBuffer(docx))
    console.log('Generated: test-tracked-changes.docx')
  }

  // 2. Comments
  {
    const cmtPayload = encodeURIComponent(
      JSON.stringify({
        id: 'cmt-1',
        authorName: 'Alice',
        authorInitials: 'A',
        date: '2025-01-15T12:00:00Z',
        text: 'Please review this section',
      })
    )

    const html = `
      <h1>Comments Document</h1>
      <p>Here is [[DOCX_CMT_START:${cmtPayload}]]commented content[[DOCX_CMT_END:${encodeURIComponent('cmt-1')}]] in the doc.</p>
      <p>This paragraph has no comments.</p>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Comments Test' })
    fs.writeFileSync(path.join(OUT_DIR, 'test-comments.docx'), await toBuffer(docx))
    console.log('Generated: test-comments.docx')
  }

  // 3. Threaded comments (replies)
  {
    const threadPayload = encodeURIComponent(
      JSON.stringify({
        id: 'cmt-thread',
        authorName: 'Alice Smith',
        authorInitials: 'AS',
        date: '2025-02-01T11:00:00Z',
        text: 'Should we use a different approach here?',
        replies: [
          {
            id: 'reply-1',
            authorName: 'Bob Jones',
            authorInitials: 'BJ',
            date: '2025-02-01T11:30:00Z',
            text: 'I think the current approach is fine.',
          },
          {
            id: 'reply-2',
            authorName: 'Alice Smith',
            authorInitials: 'AS',
            date: '2025-02-01T12:00:00Z',
            text: 'OK, let us keep it then.',
          },
        ],
      })
    )

    const html = `
      <h1>Threaded Comments Document</h1>
      <p>The [[DOCX_CMT_START:${threadPayload}]]design decision[[DOCX_CMT_END:${encodeURIComponent('cmt-thread')}]] was approved.</p>
      <p>Next steps follow below.</p>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Threaded Comments Test' })
    fs.writeFileSync(
      path.join(OUT_DIR, 'test-threaded-comments.docx'),
      await toBuffer(docx)
    )
    console.log('Generated: test-threaded-comments.docx')
  }

  // 4. SVG native mode
  {
    const svgContent =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>'
    const svgBase64 = Buffer.from(svgContent).toString('base64')
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`

    const html = `
      <h1>SVG Native Document</h1>
      <p>Here is an SVG image:</p>
      <img src="${svgDataUrl}" width="100" height="100" />
      <p>End of document.</p>
    `
    const docx = await HTMLtoDOCX(html, null, {
      title: 'SVG Native Test',
      imageProcessing: { svgHandling: 'native' },
    })
    fs.writeFileSync(path.join(OUT_DIR, 'test-svg-native.docx'), await toBuffer(docx))
    console.log('Generated: test-svg-native.docx')
  }

  // 5. Mixed: tracked changes + comments + table
  {
    const insPayload = encodeURIComponent(
      JSON.stringify({ id: 'ins-mix', author: 'Alice' })
    )
    const delPayload = encodeURIComponent(JSON.stringify({ id: 'del-mix', author: 'Bob' }))
    const cmtPayload = encodeURIComponent(
      JSON.stringify({
        id: 'cmt-mix',
        authorName: 'Charlie',
        authorInitials: 'C',
        text: 'Needs work',
      })
    )

    const html = `
      <h1>Mixed Document</h1>
      <p>Paragraph with [[DOCX_INS_START:${insPayload}]]added text[[DOCX_INS_END:${encodeURIComponent('ins-mix')}]] from Alice.</p>
      <p>Paragraph with [[DOCX_DEL_START:${delPayload}]]removed text[[DOCX_DEL_END:${encodeURIComponent('del-mix')}]] from Bob.</p>
      <p>Paragraph with [[DOCX_CMT_START:${cmtPayload}]]commented text[[DOCX_CMT_END:${encodeURIComponent('cmt-mix')}]] from Charlie.</p>
      <table><tr><th>Col A</th><th>Col B</th></tr><tr><td>1</td><td>2</td></tr></table>
    `
    const docx = await HTMLtoDOCX(html, null, { title: 'Mixed Test' })
    fs.writeFileSync(path.join(OUT_DIR, 'test-mixed.docx'), await toBuffer(docx))
    console.log('Generated: test-mixed.docx')
  }

  console.log('\nAll DOCX files generated. Run validator on each:')
  console.log(
    '  python3 .claude/skills/docx/scripts/office/validate.py test-tracked-changes.docx -v'
  )
}

main().catch(console.error)
