/* eslint-disable no-console */
// @ts-check

const fs = require('node:fs')
// const HTMLtoDOCX = require('html-to-docx');
const { default: HTMLtoDOCX } = require('../dist/index.cjs')

/**
 * @typedef {{
 *   title: string
 *   width: number
 *   height: number
 * }} RtlOptions
 */

/**
 * @typedef {{
 *   title: string
 *   margins: { top: number; right: number; bottom: number; left: number }
 *   pageSize: { width: number; height: number }
 *   font: string
 *   fontSize: number
 *   orientation: 'portrait' | 'landscape'
 *   renderHeaders: boolean
 *   lang: string
 *   direction: 'rtl'
 * }} RtlDocxOptions
 */

/**
 * @typedef {(html: string, header: string | null, options: RtlDocxOptions) => Promise<Uint8Array | Buffer | Blob>} HtmlToDocxFn
 */

/** @type {HtmlToDocxFn} */
const htmlToDocx = HTMLtoDOCX

/**
 * @param {Uint8Array | Buffer | Blob} result
 * @returns {Promise<Uint8Array | Buffer>}
 */
async function toNodeBinary(result) {
  if (result instanceof Uint8Array || Buffer.isBuffer(result)) {
    return result
  }

  return Buffer.from(await result.arrayBuffer())
}

async function generateDoc() {
  const html = `
    <h1>مرحبا بالعالم</h1>
<p>هذا نص تجريبي باللغة العربية ليظهر من اليمين إلى اليسار</p>
  `

  /** @type {RtlOptions} */
  const options = {
    title: 'My Test Document',
    width: 12240,
    height: 15840,
  }

  const docxOptions = /** @type {const} */ ({
    title: options.title || 'Document',
    margins: {
      top: 400,
      right: 400,
      bottom: 400,
      left: 400,
    },
    pageSize: {
      width: options.width,
      height: options.height,
    },
    font: 'Arial',
    fontSize: 24,
    orientation: 'portrait',
    renderHeaders: true,
    lang: 'he-IL', // Hebrew locale
    direction: 'rtl', // 🔑 enables RTL in the generated DOCX
  })
  const docxBuffer = await htmlToDocx(html, null, docxOptions)

  // Save the buffer to file
  fs.writeFileSync('example-rtl.docx', await toNodeBinary(docxBuffer))
  console.log('✅ DOCX created: example-rtl.docx')
}

void generateDoc()
