const fs = require('node:fs')
let file = 'src/helpers/xml-builder.ts'
let content = fs.readFileSync(file, 'utf8')

// Replace:
// if (rgbRegex.test(colorCodeString)) {
//   const matchedParts = colorCodeString.match(rgbRegex)
//   if (matchedParts) {
//
// With:
// {
//   const matchedParts = colorCodeString.match(rgbRegex)
//   if (matchedParts) {
//     if (matchedParts) {

content = content.replace(
  /if \(rgbRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(rgbRegex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(rgbRegex)\n    if (matchedParts) {\n      if (matchedParts) {'
)

content = content.replace(
  /if \(hslRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hslRegex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(hslRegex)\n    if (matchedParts) {\n      if (matchedParts) {'
)

content = content.replace(
  /if \(hexRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hexRegex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(hexRegex)\n    if (matchedParts) {\n      if (matchedParts) {'
)

content = content.replace(
  /if \(hex3Regex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hex3Regex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(hex3Regex)\n    if (matchedParts) {\n      if (matchedParts) {'
)

fs.writeFileSync(file, content)
