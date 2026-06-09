// @ts-check
/**
 * Generate the comprehensive regression baseline DOCX in a real headless browser
 * using the browser entrypoint bundle (no Node runtime conversion path).
 *
 * Run:  node tests/regression-baseline/generate-baseline-browser.cjs
 *
 * Produces:  tmp/regression-baseline-browser.docx
 */
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')

const ROOT_DIR = path.resolve(__dirname, '../..')
const OUT_DIR = path.join(ROOT_DIR, 'tmp')
const OUT_PATH = path.join(OUT_DIR, 'regression-baseline-browser.docx')
const BUNDLE_ENTRY_PATH = path.join(OUT_DIR, 'regression-browser-entry.mjs')
const BUNDLE_OUTPUT_PATH = path.join(OUT_DIR, 'regression-browser.bundle.js')

/** @typedef {{title?: string, subject?: string, creator?: string, description?: string, keywords?: string[], lastModifiedBy?: string, revision?: number, orientation?: 'portrait' | 'landscape', margins?: object, font?: string, fontSize?: number, header?: boolean, headerType?: 'default' | 'even' | 'first', footer?: boolean, footerType?: 'default' | 'even' | 'first', pageNumber?: boolean, table?: object, imageProcessing?: object, heading?: object}} DocumentOptions */
/** @typedef {{html: string, headerHtml: string, options: DocumentOptions, footerHtml: string}} BrowserGenerationPayload */
/** @typedef {{base64: string | null, byteLength: number, error: string | null}} BrowserGenerationResult */

/**
 * @param {unknown} error
 * @returns {Error}
 */
function toError(error) {
  return error instanceof Error ? error : new Error(String(error))
}

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }
}

function buildRegressionHtml() {
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

  return html
}

function getBaselineDocumentOptions() {
  /** @type {DocumentOptions} */
  return {
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
    fontSize: 22,
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
  }
}

function bundleBrowserEntrypoint() {
  const entrySource =
    "import HTMLtoDOCX from '../dist/browser.js'; globalThis.__HTMLtoDOCX = HTMLtoDOCX;"
  fs.writeFileSync(BUNDLE_ENTRY_PATH, entrySource)

  execFileSync(
    'bun',
    [
      'build',
      BUNDLE_ENTRY_PATH,
      '--bundle',
      '--target=browser',
      '--format=iife',
      `--outfile=${BUNDLE_OUTPUT_PATH}`,
    ],
    {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    }
  )
}

/**
 * @param {string} html
 * @param {string} headerHtml
 * @param {DocumentOptions} options
 * @param {string} footerHtml
 * @returns {Promise<Buffer>}
 */
async function generateViaHeadlessBrowser(html, headerHtml, options, footerHtml) {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.setContent(
      '<!doctype html><html><body><p>Generating baseline...</p></body></html>'
    )
    await page.addScriptTag({ path: BUNDLE_OUTPUT_PATH })

    const result = await page.evaluate(
      /**
       * @param {BrowserGenerationPayload} payload
       * @returns {Promise<BrowserGenerationResult>}
       */
      async (payload) => {
        /**
         * @param {Uint8Array} bytes
         * @returns {string}
         */
        const toBase64 = (bytes) => {
          // eslint-disable-line unicorn/consistent-function-scoping -- must be inside page.evaluate()
          let binary = ''
          const chunkSize = 0x8000

          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize)
            binary += String.fromCharCode(...chunk)
          }

          return btoa(binary)
        }

        try {
          const maybeHtmlToDocx = Reflect.get(globalThis, '__HTMLtoDOCX')
          if (typeof maybeHtmlToDocx !== 'function') {
            throw new Error('Browser HTMLtoDOCX entrypoint is unavailable')
          }

          const docResult = await maybeHtmlToDocx(
            payload.html,
            payload.headerHtml,
            payload.options,
            payload.footerHtml
          )

          /** @type {ArrayBufferLike} */
          let arrayBuffer
          if (docResult instanceof Blob) {
            arrayBuffer = await docResult.arrayBuffer()
          } else if (docResult instanceof ArrayBuffer) {
            arrayBuffer = docResult
          } else if (ArrayBuffer.isView(docResult)) {
            arrayBuffer = docResult.buffer
          } else {
            throw new Error(
              `Unexpected result type: ${Object.prototype.toString.call(docResult)}`
            )
          }

          const bytes = new Uint8Array(arrayBuffer)
          return {
            base64: toBase64(bytes),
            byteLength: bytes.byteLength,
            error: null,
          }
        } catch (error) {
          const normalizedError = error instanceof Error ? error : new Error(String(error))
          return {
            base64: null,
            byteLength: 0,
            error: `${normalizedError.message}\n${normalizedError.stack || ''}`,
          }
        }
      },
      {
        html,
        headerHtml,
        options,
        footerHtml,
      }
    )

    if (result.error || !result.base64) {
      throw new Error(result.error || 'Browser generation returned empty result')
    }

    return Buffer.from(result.base64, 'base64')
  } finally {
    await browser.close()
  }
}

async function main() {
  ensureOutDir()

  const html = buildRegressionHtml()
  const headerHtml =
    '<p style="text-align: right; font-size: 9pt; color: #999;">Regression Baseline v1.0</p>'
  const footerHtml =
    '<p style="text-align: center; font-size: 9pt; color: #999;">Page <span id="pageNumber"></span></p>'

  bundleBrowserEntrypoint()
  const docBuffer = await generateViaHeadlessBrowser(
    html,
    headerHtml,
    getBaselineDocumentOptions(),
    footerHtml
  )

  fs.writeFileSync(OUT_PATH, docBuffer)
  console.log(`Generated: ${OUT_PATH}`)
  console.log(`File size: ${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} KB`)

  // Keep bundle artifacts under tmp for debugging/repro; overwrite on next run.
}

main().catch((/** @type {unknown} */ error) => {
  console.error('Failed to generate browser baseline:', toError(error))
  throw error
})
