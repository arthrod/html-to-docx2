import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { HTMLtoDOCX as HTMLtoDOCXNode } from '../../../dist/node.cjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = path.resolve(__dirname, '../../../')
const outputDirectory = path.join(repoRoot, 'tmp')

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true })
}

type RuntimeName = 'browser' | 'node'
type HTMLtoDOCXFn = typeof HTMLtoDOCXNode
type DocResult = Awaited<ReturnType<HTMLtoDOCXFn>>

/**
 * This file demonstrates how to use html-to-docx with TypeScript
 * Run with ts-node or compile with tsc and then run with node
 */

const htmlString = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>TypeScript Example</title>
    </head>
    <body>
        <h1>Hello from TypeScript</h1>
        <p>This document was created using TypeScript and html-to-docx</p>
        
        <h2>Features</h2>
        <ul>
            <li>Convert HTML to DOCX</li>
            <li>Full TypeScript support</li>
            <li>Customizable options</li>
        </ul>
        
        <table border="1">
            <tr>
                <th>Feature</th>
                <th>Supported</th>
            </tr>
            <tr>
                <td>Headers and Footers</td>
                <td>Yes</td>
            </tr>
            <tr>
                <td>Custom Page Size</td>
                <td>Yes</td>
            </tr>
            <tr>
                <td>Tables</td>
                <td>Yes</td>
            </tr>
        </table>
    </body>
</html>`

const headerHtml = `<p style="text-align: right;">TurboDocx Example</p>`
const footerHtml = `<p style="text-align: center;">Page <span id="pageNumber">X</span> of <span id="totalPages">Y</span></p>`

async function saveDocxFile(
  docResult: DocResult,
  fileName: string,
  docType: string,
  runtime: RuntimeName
) {
  let docData: Buffer
  if (docResult instanceof Buffer) {
    docData = docResult
  } else if (docResult instanceof ArrayBuffer) {
    docData = Buffer.from(docResult)
  } else if (typeof Blob !== 'undefined' && docResult instanceof Blob) {
    console.log(`Received Blob for ${docType}, converting to ArrayBuffer then Buffer...`)
    const arrayBuffer = await docResult.arrayBuffer()
    docData = Buffer.from(arrayBuffer)
  } else {
    console.error(`Unexpected result type for ${docType}:`, typeof docResult)
    const valueWithConstructor = docResult as { constructor?: { name?: string } }
    console.log(`${docType} constructor name:`, valueWithConstructor.constructor?.name)
    return
  }

  const runtimeFileName = fileName.replace(/\.docx$/i, `-${runtime}.docx`)
  const outputPath = path.join(outputDirectory, runtimeFileName)
  fs.writeFileSync(outputPath, docData)
  console.log(`${docType} document created (${runtime}): ${outputPath}`)
}

async function generateDocuments() {
  try {
    const browserModule: { default: HTMLtoDOCXFn } =
      await import('../../../dist/browser.js')
    const { default: HTMLtoDOCXBrowser } = browserModule
    const runtimes: { convert: HTMLtoDOCXFn; runtime: RuntimeName }[] = [
      { convert: HTMLtoDOCXNode, runtime: 'node' },
      { convert: HTMLtoDOCXBrowser, runtime: 'browser' },
    ]

    /* eslint-disable no-await-in-loop -- examples intentionally run sequentially per runtime */
    for (const { convert, runtime } of runtimes) {
      // Basic example
      const basicDocResult = await convert(htmlString)
      await saveDocxFile(basicDocResult, 'basic-example.docx', 'Basic', runtime)

      // Advanced example with all options
      const advancedDocResult = await convert(
        htmlString,
        headerHtml,
        {
          orientation: 'portrait',
          pageSize: {
            width: 12240, // Letter width in TWIP
            height: 15840, // Letter height in TWIP
          },
          margins: {
            top: 1440,
            right: 1800,
            bottom: 1440,
            left: 1800,
            header: 720,
            footer: 720,
          },
          title: 'TypeScript Example',
          subject: 'HTML to DOCX Conversion',
          creator: 'TurboDocx',
          keywords: ['html', 'docx', 'typescript', 'conversion'],
          description: 'An example document created with html-to-docx and TypeScript',
          lastModifiedBy: 'TypeScript Example',
          revision: 1,
          header: true,
          headerType: 'default',
          footer: true,
          footerType: 'default',
          pageNumber: true,
          table: {
            row: {
              cantSplit: true,
            },
            borderOptions: {
              size: 2,
              color: '000000',
            },
          },
        },
        footerHtml
      )

      await saveDocxFile(advancedDocResult, 'advanced-example.docx', 'Advanced', runtime)

      // RTL Direction test
      const rtlTestResult = await convert(
        `<h1>Direction Test</h1><p>This tests the direction property in TypeScript.</p>`,
        null,
        {
          direction: 'rtl',
          lang: 'ar-SA',
          title: 'RTL Direction Test',
          creator: 'TypeScript RTL Test',
        }
      )

      await saveDocxFile(rtlTestResult, 'typescript-rtl-test.docx', 'RTL Test', runtime)

      // Customizable Heading Styles test (PR #129)
      const headingStylesHtml = `
              <h1>Custom Heading Styles Demo</h1>
              <p>This demonstrates the customizable heading styles feature from PR #129.</p>
              <h2>Custom Styled Section</h2>
              <p>All headings in this document use custom fonts, sizes, and spacing.</p>
              <h3>Subsection Header</h3>
              <p>Notice the different styling for each heading level.</p>
          `

      const headingStylesResult = await convert(headingStylesHtml, null, {
        title: 'Custom Heading Styles Test',
        creator: 'TypeScript Heading Styles Test',
        heading: {
          heading1: {
            font: 'Arial',
            fontSize: 72, // 36pt in Word (OOXML uses half-points: 72 / 2 = 36pt)
            bold: true,
            spacing: {
              before: 600,
              after: 200,
            },
            keepLines: true,
            keepNext: true,
            outlineLevel: 0,
          },
          heading2: {
            font: 'Georgia',
            fontSize: 40, // 20pt in Word (40 / 2 = 20pt)
            bold: true,
            spacing: {
              before: 400,
              after: 150,
            },
            keepLines: true,
            keepNext: true,
            outlineLevel: 1,
          },
          heading3: {
            font: 'Calibri',
            fontSize: 26, // 13pt in Word (26 / 2 = 13pt)
            bold: false, // Not bold
            spacing: {
              before: 240,
              after: 100,
            },
            keepLines: true,
            keepNext: true,
            outlineLevel: 2,
          },
        },
      })

      await saveDocxFile(
        headingStylesResult,
        'typescript-heading-styles-test.docx',
        'Heading Styles Test',
        runtime
      )
    }
    /* eslint-enable no-await-in-loop */
  } catch (error) {
    console.error('Error generating documents:', error)
  }
}

void generateDocuments()
