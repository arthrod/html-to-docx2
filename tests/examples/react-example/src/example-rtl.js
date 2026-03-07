// @ts-check

/* eslint-disable no-console */
const fs = require('fs')
// const HTMLtoDOCX = require('html-to-docx');
const { default: HTMLtoDOCX } = require('../../../dist/index.cjs')

/**
 * @param {import('../../../src').HtmlToDocxResult} value
 * @returns {Promise<Uint8Array>}
 */
async function toNodeBinary(value) {
  if (value instanceof Uint8Array) {
    return value
  }

  return new Uint8Array(await value.arrayBuffer())
}

async function generateDoc() {
  const html = `
    <h1>مرحبا بالعالم</h1>
<p>هذا نص تجريبي باللغة العربية ليظهر من اليمين إلى اليسار</p>
  `

  const options = {
    title: 'My Test Document',
    width: 12240,
    height: 15840,
  }

  const docxResult = await HTMLtoDOCX(html, null, {
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
  const docxBuffer = await toNodeBinary(docxResult)

  // Save the buffer to file
  fs.writeFileSync('example-rtl.docx', docxBuffer)
  console.log('✅ DOCX created: example-rtl.docx')
}

void generateDoc()
