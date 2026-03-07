import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
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
 * RTL (Right-to-Left) Language Support Example
 * Demonstrates Arabic and Hebrew text rendering with proper RTL direction
 */

const arabicHtmlString = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8" />
        <title>مثال باللغة العربية</title>
    </head>
    <body>
        <h1>مرحبا بالعالم</h1>
        <p>هذا نص تجريبي باللغة العربية ليظهر من اليمين إلى اليسار. يدعم هذا المثال النصوص العربية والعبرية.</p>
        
        <h2>قائمة مرقمة</h2>
        <ol>
            <li>العنصر الأول</li>
            <li>العنصر الثاني</li>
            <li>العنصر الثالث</li>
        </ol>
        
        <h2>قائمة نقطية</h2>
        <ul>
            <li>نقطة أولى</li>
            <li>نقطة ثانية</li>
            <li>نقطة ثالثة</li>
        </ul>
        
        <table border="1">
            <tr>
                <th>الاسم</th>
                <th>العمر</th>
                <th>المدينة</th>
            </tr>
            <tr>
                <td>أحمد</td>
                <td>25</td>
                <td>الرياض</td>
            </tr>
            <tr>
                <td>فاطمة</td>
                <td>30</td>
                <td>دبي</td>
            </tr>
        </table>
    </body>
</html>`

const hebrewHtmlString = `<!DOCTYPE html>
<html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8" />
        <title>דוגמה בעברית</title>
    </head>
    <body>
        <h1>שלום עולם</h1>
        <p>זהו טקסט לדוגמה בעברית המוצג מימין לשמאל. דוגמה זו תומכת בטקסט עברי וערבי.</p>
        
        <h2>רשימה ממוספרת</h2>
        <ol>
            <li>פריט ראשון</li>
            <li>פריט שני</li>
            <li>פריט שלישי</li>
        </ol>
        
        <table border="1">
            <tr>
                <th>שם</th>
                <th>גיל</th>
                <th>עיר</th>
            </tr>
            <tr>
                <td>דוד</td>
                <td>28</td>
                <td>תל אביב</td>
            </tr>
        </table>
    </body>
</html>`

const mixedContentHtml = `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <title>Mixed Content Example</title>
    </head>
    <body>
        <h1>Mixed Language Document</h1>
        <p>This document contains both LTR and RTL content.</p>
        
        <div dir="rtl">
            <h2>النص العربي</h2>
            <p>هذا نص باللغة العربية في وثيقة مختلطة.</p>
        </div>
        
        <div dir="ltr">
            <h2>English Text</h2>
            <p>This is English text in a mixed document.</p>
        </div>
        
        <div dir="rtl">
            <h2>טקסט עברי</h2>
            <p>זהו טקסט עברי במסמך מעורב.</p>
        </div>
    </body>
</html>`

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
    return
  }

  const runtimeFileName = fileName.replace(/\.docx$/i, `-${runtime}.docx`)
  const outputPath = path.join(outputDirectory, runtimeFileName)
  fs.writeFileSync(outputPath, docData)
  console.log(`${docType} RTL document created (${runtime}): ${outputPath}`)
}

async function generateRTLDocuments() {
  try {
    const browserModule: { default: HTMLtoDOCXFn } =
      await import('../../../dist/browser.js')
    const { default: HTMLtoDOCXBrowser } = browserModule
    const runtimes: { convert: HTMLtoDOCXFn; runtime: RuntimeName }[] = [
      { convert: HTMLtoDOCXNode, runtime: 'node' },
      { convert: HTMLtoDOCXBrowser, runtime: 'browser' },
    ]

    await Promise.all(
      runtimes.map(async ({ convert, runtime }) => {
        // Arabic RTL document
        const arabicDoc = await convert(arabicHtmlString, null, {
          direction: 'rtl',
          defaultLang: 'ar-SA',
          font: 'Arial',
          title: 'Arabic RTL Example',
          creator: 'TurboDocx RTL Test',
        })
        await saveDocxFile(arabicDoc, 'arabic-rtl-test.docx', 'Arabic RTL', runtime)

        // Hebrew RTL document
        const hebrewDoc = await convert(hebrewHtmlString, null, {
          direction: 'rtl',
          defaultLang: 'he-IL',
          font: 'Arial',
          title: 'Hebrew RTL Example',
          creator: 'TurboDocx RTL Test',
        })
        await saveDocxFile(hebrewDoc, 'hebrew-rtl-test.docx', 'Hebrew RTL', runtime)

        // Mixed content document (default LTR with RTL sections)
        const mixedDoc = await convert(mixedContentHtml, null, {
          direction: 'ltr', // Default direction
          defaultLang: 'en-US',
          font: 'Arial',
          title: 'Mixed Content Example',
          creator: 'TurboDocx RTL Test',
        })
        await saveDocxFile(mixedDoc, 'mixed-content-test.docx', 'Mixed Content', runtime)

        // LTR document for comparison
        const ltrDoc = await convert(
          `<h1>Left-to-Right Document</h1><p>This is a standard LTR document for comparison.</p>`,
          null,
          {
            direction: 'ltr',
            defaultLang: 'en-US',
            font: 'Arial',
            title: 'LTR Example',
            creator: 'TurboDocx RTL Test',
          }
        )
        await saveDocxFile(ltrDoc, 'ltr-comparison-test.docx', 'LTR Comparison', runtime)
      })
    )
  } catch (error) {
    console.error('Error generating RTL documents:', error)
  }
}

void generateRTLDocuments()
