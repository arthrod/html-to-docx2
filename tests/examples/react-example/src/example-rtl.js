/* eslint-disable no-console */
const fs = require('fs')
// const HTMLtoDOCX = require('html-to-docx');
const { default: HTMLtoDOCX } = require('../../../dist/index.cjs')

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

  const docxBuffer = await HTMLtoDOCX(html, null, {
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

  // Save the buffer to file
  fs.writeFileSync('example-rtl.docx', docxBuffer)
  console.log('✅ DOCX created: example-rtl.docx')
}

generateDoc()
