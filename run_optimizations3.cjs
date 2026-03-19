const fs = require('node:fs')
let file = 'src/helpers/xml-builder.ts'
let content = fs.readFileSync(file, 'utf8')

// The reason it breaks is because I'm adding `if (matchedParts) {` which is an extra opening `{`.
// Wait! `if(rgbRegex.test(...)) {` had `{`.
// `if(matchedParts) {` had `{`.
// So that's TWO `{`.

// My replacement:
// `{` (1)
// `const matchedParts = ...`
// `if (matchedParts) {` (2)
// `if (matchedParts) {` (3)

// So I introduced THREE `{` but the original had TWO!
// That's why there are unbalanced braces!

// If original is:
// if (rgbRegex.test(colorCodeString)) {
//   const matchedParts = colorCodeString.match(rgbRegex)
//   if (matchedParts) {

// That is exactly TWO `{`.

// So if I replace it with:
// {
//   const matchedParts = colorCodeString.match(rgbRegex)
//   if (matchedParts) {

// That is EXACTLY TWO `{`!

content = content.replace(
  /if \(rgbRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(rgbRegex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(rgbRegex)\n    if (matchedParts) {'
)

content = content.replace(
  /if \(hslRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hslRegex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(hslRegex)\n    if (matchedParts) {'
)

content = content.replace(
  /if \(hexRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hexRegex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(hexRegex)\n    if (matchedParts) {'
)

content = content.replace(
  /if \(hex3Regex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hex3Regex\)\n\s*if \(matchedParts\) \{/g,
  '{\n    const matchedParts = colorCodeString.match(hex3Regex)\n    if (matchedParts) {'
)

fs.writeFileSync(file, content)
