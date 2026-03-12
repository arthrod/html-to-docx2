// @ts-check
/**
 * Generate the comprehensive regression baseline DOCX.
 *
 * Run:  node tests/regression-baseline/generate-baseline.cjs
 *
 * Produces:  tmp/regression-baseline-node.docx
 *
 * This file is also invoked by the OOXML validation test to ensure the
 * baseline always passes schema validation.
 */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.resolve(__dirname, '../../tmp')

/**
 * @typedef {(htmlString: string, headerHTMLString?: string | null, documentOptions?: object, footerHTMLString?: string | null) => Promise<Uint8Array | Buffer>} HtmlToDocxNode
 */

/**
 * @param {unknown} error
 * @returns {Error}
 */
function toError(error) {
  return error instanceof Error ? error : new Error(String(error))
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  const { default: htmlToDocxUntyped } = require('../../dist/node/index.cjs')
  /** @type {HtmlToDocxNode} */
  const HTMLtoDOCX = htmlToDocxUntyped

  // Read the static HTML source
  let html = fs.readFileSync(path.join(__dirname, 'regression-source.html'), 'utf-8')

  // ---------------------------------------------------------------------------
  // Inject tracking tokens & comment tokens into the HTML before the closing
  // </body> so they get converted properly.
  // ---------------------------------------------------------------------------

  const insPayload = encodeURIComponent(
    JSON.stringify({ id: 'reg-ins-1', author: 'Alice', date: '2025-06-01T10:00:00Z' })
  )
  const delPayload = encodeURIComponent(
    JSON.stringify({ id: 'reg-del-1', author: 'Bob', date: '2025-06-01T11:00:00Z' })
  )
  const cmtPayload = encodeURIComponent(
    JSON.stringify({
      id: 'reg-cmt-1',
      authorName: 'Charlie',
      authorInitials: 'C',
      date: '2025-06-01T12:00:00Z',
      text: 'This section needs review.',
    })
  )
  const threadPayload = encodeURIComponent(
    JSON.stringify({
      id: 'reg-thread-1',
      authorName: 'Diana',
      authorInitials: 'D',
      date: '2025-06-01T13:00:00Z',
      text: 'Should we keep this paragraph?',
      replies: [
        {
          id: 'reg-reply-1',
          authorName: 'Eve',
          authorInitials: 'E',
          date: '2025-06-01T13:30:00Z',
          text: 'Yes, it is important for context.',
        },
        {
          id: 'reg-reply-2',
          authorName: 'Diana',
          authorInitials: 'D',
          date: '2025-06-01T14:00:00Z',
          text: 'OK, keeping it.',
        },
      ],
    })
  )

  const trackingSection = `
  <!-- ============================================================ -->
  <!-- SECTION 14: Tracked Changes                                  -->
  <!-- ============================================================ -->
  <h2>Section 14 — Tracked Changes</h2>
  <p>This paragraph has [[DOCX_INS_START:${insPayload}]]newly inserted text by Alice[[DOCX_INS_END:${encodeURIComponent('reg-ins-1')}]] visible here.</p>
  <p>This paragraph has [[DOCX_DEL_START:${delPayload}]]text deleted by Bob[[DOCX_DEL_END:${encodeURIComponent('reg-del-1')}]] removed here.</p>
  <p>Normal paragraph between tracked changes.</p>

  <!-- ============================================================ -->
  <!-- SECTION 15: Comments                                         -->
  <!-- ============================================================ -->
  <h2>Section 15 — Comments</h2>
  <p>Here is [[DOCX_CMT_START:${cmtPayload}]]commented content by Charlie[[DOCX_CMT_END:${encodeURIComponent('reg-cmt-1')}]] in the document.</p>
  <p>Normal paragraph after comment.</p>

  <!-- ============================================================ -->
  <!-- SECTION 16: Threaded Comments                                -->
  <!-- ============================================================ -->
  <h2>Section 16 — Threaded Comments</h2>
  <p>The [[DOCX_CMT_START:${threadPayload}]]architecture decision[[DOCX_CMT_END:${encodeURIComponent('reg-thread-1')}]] was discussed in a thread with replies.</p>
  <p>Final paragraph of the regression baseline document.</p>
`

  // Insert before </body>
  html = html.replace('</body>', `${trackingSection}\n</body>`)

  // ---------------------------------------------------------------------------
  // Convert to DOCX with full options
  // ---------------------------------------------------------------------------

  const headerHtml =
    '<p style="text-align: right; font-size: 9pt; color: #999;">Regression Baseline v1.0</p>'
  const footerHtml =
    '<p style="text-align: center; font-size: 9pt; color: #999;">Page <span id="pageNumber"></span></p>'

  const docx = await HTMLtoDOCX(
    html,
    headerHtml,
    {
      title: 'Comprehensive Regression Baseline',
      subject: 'OOXML Compliance & Feature Coverage',
      creator: 'html-to-docx CI',
      description:
        'Auto-generated regression baseline covering all supported HTML-to-DOCX features.',
      keywords: ['regression', 'baseline', 'ooxml', 'validation'],
      lastModifiedBy: 'CI Pipeline',
      revision: 1,
      orientation: 'portrait',
      margins: {
        top: 1440,
        right: 1440,
        bottom: 1440,
        left: 1440,
        header: 720,
        footer: 720,
      },
      font: 'Calibri',
      fontSize: 22, // 11pt
      header: true,
      headerType: 'default',
      footer: true,
      footerType: 'default',
      pageNumber: true,
      table: {
        row: { cantSplit: true },
      },
      imageProcessing: {
        svgHandling: 'native',
      },
      heading: {
        heading1: {
          font: 'Calibri',
          fontSize: 52,
          bold: true,
          color: '1F4E79',
          spacing: { before: 480, after: 240 },
        },
        heading2: {
          font: 'Calibri',
          fontSize: 40,
          bold: true,
          color: '2E75B6',
          spacing: { before: 360, after: 180 },
        },
        heading3: {
          font: 'Calibri',
          fontSize: 30,
          bold: true,
          color: '404040',
          spacing: { before: 240, after: 120 },
        },
      },
    },
    footerHtml
  )

  const outPath = path.join(OUT_DIR, 'regression-baseline-node.docx')
  fs.writeFileSync(outPath, Buffer.from(docx))
  console.log(`Generated: ${outPath}`)
  console.log(`File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`)
}

main().catch((/** @type {unknown} */ error) => {
  console.error('Failed to generate baseline:', toError(error))
  process.exit(1)
})
