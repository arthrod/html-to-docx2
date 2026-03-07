/**
 * This file demonstrates TypeScript type checking
 * It's not meant to be executed, but rather to test type definitions
 */

import HTMLtoDOCX from '../../dist/html-to-docx'

type DocxResult = Blob | Uint8Array | Buffer

const htmlString = `<!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <title>Document</title>
        </head>
        <body>
            <h1>Hello world</h1>
        </body>
    </html>`

const _doc1: Promise<DocxResult> = HTMLtoDOCX(htmlString)

const _doc2: Promise<DocxResult> = HTMLtoDOCX(htmlString, '<p>Header</p>')

const _doc3: Promise<DocxResult> = HTMLtoDOCX(htmlString, null, {
  orientation: 'landscape',
  table: {
    row: {
      cantSplit: true,
    },
  },
})

const _doc4: Promise<DocxResult> = HTMLtoDOCX(
  htmlString,
  null,
  {
    orientation: 'landscape',
    table: {
      row: {
        cantSplit: true,
      },
    },
  },
  '<p>Footer</p>'
)

// @ts-expect-error - This should show a TypeScript error because parameters are in wrong order
const _doc5 = HTMLtoDOCX(htmlString, {
  orientation: 'landscape',
  table: {
    row: {
      cantSplit: true,
    },
  },
})

const _doc6 = HTMLtoDOCX(htmlString, null, {
  // @ts-expect-error - This should show a TypeScript error because orientation has invalid value
  orientation: 'invalid',
})

const _doc7 = HTMLtoDOCX(htmlString, null, {
  // @ts-expect-error - This should show a TypeScript error because headerType has invalid value
  headerType: 'invalid',
})
