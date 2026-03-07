// @ts-check
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require('playwright')
/**
 * @typedef {'convert' | 'native'} SvgHandlingMode
 */
/**
 * @typedef {(html: string, headerHtml: string | null, options: {
 *   title?: string
 *   creator?: string
 *   footer?: boolean
 *   pageNumber?: boolean
 *   imageProcessing?: { svgHandling?: SvgHandlingMode }
 * }) => Promise<Blob | ArrayBuffer | Uint8Array>} BrowserHtmlToDocx
 */
/**
 * @typedef {{ base64: string | null; error: string | null }} BrowserGenerationResult
 */

const ROOT_DIR = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT_DIR, 'tmp')
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'example-browser-images-browser.docx')
const BUNDLE_ENTRY_PATH = path.join(OUTPUT_DIR, 'example-browser-images.entry.mjs')
const BUNDLE_OUTPUT_PATH = path.join(OUTPUT_DIR, 'example-browser-images.bundle.js')

const PNG_5X5_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=='

const browserImagesHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Browser Image Example</title>
  </head>
  <body>
    <h1>Browser Image-Only Example</h1>
    <p>This example intentionally focuses on browser-safe image inputs only.</p>

    <p>Inline data URI image:</p>
    <img src="data:image/png;base64,${PNG_5X5_BASE64}" alt="Inline PNG 1" />

    <p>Scaled image with CSS width/height:</p>
    <img
      src="data:image/png;base64,${PNG_5X5_BASE64}"
      alt="Inline PNG 2"
      style="width: 180px; height: 90px;"
    />

    <p>Image with width attribute only (height auto):</p>
    <img src="data:image/png;base64,${PNG_5X5_BASE64}" alt="Inline PNG 3" width="120" />
  </body>
</html>`

const ensureOutputDir = () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
}

const bundleBrowserEntrypoint = () => {
  fs.writeFileSync(
    BUNDLE_ENTRY_PATH,
    "import HTMLtoDOCX from '../dist/browser.js'; globalThis.__HTMLtoDOCX = HTMLtoDOCX;"
  )

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
    { cwd: ROOT_DIR, stdio: 'inherit' }
  )
}

/**
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
const generateInBrowser = async (html) => {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><html><body>Generating...</body></html>')
    await page.addScriptTag({ path: BUNDLE_OUTPUT_PATH })

    /** @type {BrowserGenerationResult} */
    const result = await page.evaluate(
      /**
       * @param {{ inputHtml: string }} payload
       */
      async ({ inputHtml }) => {
        /**
         * @param {Uint8Array} bytes
         * @returns {string}
         */
        const toBase64 = (bytes) => {
          let binary = ''
          const chunkSize = 0x8000
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize)
            binary += String.fromCharCode(...chunk)
          }
          return btoa(binary)
        }

        try {
          /** @type {{ __HTMLtoDOCX?: BrowserHtmlToDocx }} */
          const typedGlobal = globalThis
          const convert = typedGlobal.__HTMLtoDOCX
          if (typeof convert !== 'function') {
            throw new Error('Browser HTMLtoDOCX entrypoint is unavailable')
          }

          const docResult = await convert(inputHtml, null, {
            title: 'Browser Image Example',
            creator: 'html-to-docx browser example',
            footer: true,
            pageNumber: true,
            imageProcessing: {
              svgHandling: 'convert',
            },
          })

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
          return { base64: toBase64(bytes), error: null }
        } catch (error) {
          return {
            base64: null,
            error:
              error instanceof Error
                ? `${error.message}\n${error.stack || ''}`
                : String(error),
          }
        }
      },
      { inputHtml: html }
    )

    if (result.error || !result.base64) {
      throw new Error(result.error || 'Browser generation returned empty result')
    }

    return Buffer.from(result.base64, 'base64')
  } finally {
    await browser.close()
  }
}

void (async () => {
  ensureOutputDir()
  bundleBrowserEntrypoint()
  const docBuffer = await generateInBrowser(browserImagesHtml)
  fs.writeFileSync(OUTPUT_PATH, docBuffer)
  console.log(`Docx file created successfully: ${OUTPUT_PATH}`)
})().catch((error) => {
  console.error('Failed to generate browser image example:', error)
  process.exit(1)
})
