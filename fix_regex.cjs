const fs = require('node:fs')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  // For standard `if (regex.test(str)) { const match = str.match(regex); if (match) {`
  const pattern1 =
    /if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\2\.match\(\s*\1\s*\)\s*if\s*\(\s*\4\s*\)\s*\{/g

  // Note: we can't easily handle `else if (regex.test(str))` vs `if (regex.test(str))` automatically with simple `{` wrapping if we want it to stay as `else if`.
  // Wait, `} else if (regex.test(str)) { const match = str.match(regex); if (match) {`
  // could become `} else { const match = str.match(regex); if (match) {` !

  content = content.replace(pattern1, (whole, regex, str, declaration, varName) => {
    return `{
    ${declaration} ${varName} = ${str}.match(${regex})
    if (${varName}) {
      if (${varName}) {`
  })

  const pattern2 =
    /\}\s*else\s+if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\2\.match\(\s*\1\s*\)\s*if\s*\(\s*\4\s*\)\s*\{/g

  content = content.replace(pattern2, (whole, regex, str, declaration, varName) => {
    return `} else {
    ${declaration} ${varName} = ${str}.match(${regex})
    if (${varName}) {
      if (${varName}) {`
  })

  // if (condition && regex.test(str)) { ... }
  const pattern3 =
    /if\s*\(\s*(.+?)\s*&&\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(?:[a-zA-Z0-9_]+\.lastIndex\s*=\s*0\s*)?\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\3\.match\(\s*\2\s*\)\s*if\s*\(\s*\5\s*\)\s*\{/g

  content = content.replace(
    pattern3,
    (whole, condition, regex, str, declaration, varName) => {
      return `if (${condition}) {
    ${declaration} ${varName} = ${str}.match(${regex})
    if (${varName}) {
      if (${varName}) {`
    }
  )

  const pattern4 =
    /\}\s*else\s+if\s*\(\s*(.+?)\s*&&\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(?:[a-zA-Z0-9_]+\.lastIndex\s*=\s*0\s*)?\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\3\.match\(\s*\2\s*\)\s*if\s*\(\s*\5\s*\)\s*\{/g

  content = content.replace(
    pattern4,
    (whole, condition, regex, str, declaration, varName) => {
      return `} else if (${condition}) {
    ${declaration} ${varName} = ${str}.match(${regex})
    if (${varName}) {
      if (${varName}) {`
    }
  )

  fs.writeFileSync(filePath + '.fixed.ts', content)
}

fixFile('src/helpers/xml-builder.ts')
