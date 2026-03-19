const fs = require('node:fs')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  // Replace `if (regex.test(str)) {\n  const match = str.match(regex)\n  if (match) {`
  // with `const match = str.match(regex)\n  if (match) {`
  // wait, the closing brace of the `if (regex.test(str)) {` will be left.
  // We can just replace:
  // `if (regex.test(str)) {` with `` (empty)
  // `const match = str.match(regex)\n  if (match) {` with `const match = str.match(regex)\n  if (match) {`
  // But wait, there is a `}` that we need to remove!
  // Instead of structural change, we can just replace:
  // if (regex.test(str)) { -> {
  // if (cond && regex.test(str)) { -> if (cond) {
  // } else if (regex.test(str)) { -> } else {
  // } else if (cond && regex.test(str)) { -> } else if (cond) {

  // Let's implement this!

  content = content.replace(
    /if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\2\.match\(\s*\1\s*\)\s*if\s*\(\s*\4\s*\)\s*\{/g,
    (whole, regex, str, declaration, varName) => {
      return `{\n    ${declaration} ${varName} = ${str}.match(${regex})\n    if (${varName}) {\n      if (${varName}) {`
    }
  )

  content = content.replace(
    /\}\s*else\s+if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\2\.match\(\s*\1\s*\)\s*if\s*\(\s*\4\s*\)\s*\{/g,
    (whole, regex, str, declaration, varName) => {
      return `} else {\n    ${declaration} ${varName} = ${str}.match(${regex})\n    if (${varName}) {\n      if (${varName}) {`
    }
  )

  content = content.replace(
    /if\s*\(\s*(.+?)\s*&&\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(?:[a-zA-Z0-9_]+\.lastIndex\s*=\s*0\s*)?\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\3\.match\(\s*\2\s*\)\s*if\s*\(\s*\5\s*\)\s*\{/g,
    (whole, cond, regex, str, declaration, varName) => {
      return `if (${cond}) {\n    ${declaration} ${varName} = ${str}.match(${regex})\n    if (${varName}) {\n      if (${varName}) {`
    }
  )

  content = content.replace(
    /\}\s*else\s+if\s*\(\s*(.+?)\s*&&\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(?:[a-zA-Z0-9_]+\.lastIndex\s*=\s*0\s*)?\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\3\.match\(\s*\2\s*\)\s*if\s*\(\s*\5\s*\)\s*\{/g,
    (whole, cond, regex, str, declaration, varName) => {
      return `} else if (${cond}) {\n    ${declaration} ${varName} = ${str}.match(${regex})\n    if (${varName}) {\n      if (${varName}) {`
    }
  )

  // Now deal with the ones that are NOT match but just test:
  // e.g. `if (pointRegex.test(size)) { ... } else if (pixelRegex.test(size)) { ... }` where inside there is `size.match(...)`

  // This will duplicate the `if(match)` check but that's fine. It preserves exactly the same number of `{` and `}` !
  // And it correctly removes the `.test` call!
  fs.writeFileSync(filePath + '.fixed2.ts', content)
}

fixFile('src/helpers/xml-builder.ts')
