const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const { default: HTMLtoDOCX } = require('../dist/node/index.cjs')
  const outDir = path.resolve(__dirname, '../tmp')
  fs.mkdirSync(outDir, { recursive: true })

  // 1. Hebrew RTL (document-level direction)
  const hebrewHTML = `
    <h1>שלום עולם</h1>
    <p>זהו מסמך בדיקה בעברית כדי לוודא שכיוון הטקסט מימין לשמאל עובד כראוי.</p>
    <p>הנה פסקה נוספת בעברית. הכל צריך להיות מיושר לימין.</p>
    <h2>כותרת משנית</h2>
    <ul>
      <li>פריט ראשון ברשימה</li>
      <li>פריט שני ברשימה</li>
      <li>פריט שלישי ברשימה</li>
    </ul>
    <p><strong>טקסט מודגש</strong> וטקסט רגיל ו<em>טקסט נטוי</em>.</p>
  `

  const hebrewBuffer = await HTMLtoDOCX(hebrewHTML, null, {
    direction: 'rtl',
    title: 'Hebrew RTL Test',
    defaultLang: 'he-IL',
  })
  fs.writeFileSync(path.join(outDir, 'rtl-hebrew.docx'), hebrewBuffer)
  console.log('Created rtl-hebrew.docx')

  // 2. Arabic RTL (document-level direction)
  const arabicHTML = `
    <h1>مرحبا بالعالم</h1>
    <p>هذا مستند اختبار باللغة العربية للتأكد من أن اتجاه النص من اليمين إلى اليسار يعمل بشكل صحيح.</p>
    <p>هنا فقرة أخرى باللغة العربية. يجب أن يكون كل شيء محاذيًا إلى اليمين.</p>
    <h2>عنوان فرعي</h2>
    <ul>
      <li>العنصر الأول في القائمة</li>
      <li>العنصر الثاني في القائمة</li>
      <li>العنصر الثالث في القائمة</li>
    </ul>
    <p><strong>نص غامق</strong> ونص عادي و<em>نص مائل</em>.</p>
  `

  const arabicBuffer = await HTMLtoDOCX(arabicHTML, null, {
    direction: 'rtl',
    title: 'Arabic RTL Test',
    defaultLang: 'ar-SA',
  })
  fs.writeFileSync(path.join(outDir, 'rtl-arabic.docx'), arabicBuffer)
  console.log('Created rtl-arabic.docx')

  // 3. Mixed LTR with RTL sections (element-level dir attribute)
  const mixedHTML = `
    <h1>Mixed Direction Document</h1>
    <p>This is a left-to-right paragraph in English.</p>
    <div dir="rtl">
      <p>זוהי פסקה בעברית שצריכה להיות מימין לשמאל.</p>
      <p>هذه فقرة باللغة العربية يجب أن تكون من اليمين إلى اليسار.</p>
    </div>
    <p>Back to English, left-to-right text.</p>
    <p dir="rtl">هذه فقرة عربية مفردة مع dir=rtl.</p>
    <p>And this is LTR again.</p>
  `

  const mixedBuffer = await HTMLtoDOCX(mixedHTML, null, {
    title: 'Mixed Direction Test',
  })
  fs.writeFileSync(path.join(outDir, 'rtl-mixed.docx'), mixedBuffer)
  console.log('Created rtl-mixed.docx')

  // 4. CSS direction style
  const cssDirectionHTML = `
    <h1>CSS Direction Test</h1>
    <p>Normal LTR paragraph.</p>
    <p style="direction: rtl;">פסקה עם כיוון RTL דרך CSS.</p>
    <p style="direction: rtl;">فقرة مع اتجاه RTL عبر CSS.</p>
    <p>Back to normal LTR.</p>
  `

  const cssBuffer = await HTMLtoDOCX(cssDirectionHTML, null, {
    title: 'CSS Direction Test',
  })
  fs.writeFileSync(path.join(outDir, 'rtl-css-direction.docx'), cssBuffer)
  console.log('Created rtl-css-direction.docx')

  console.log('\nAll RTL test documents generated in', outDir)
}

main().catch((/** @type {unknown} */ err) => {
  console.error(err)
  process.exit(1)
})
