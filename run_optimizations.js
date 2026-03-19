const fs = require('node:fs')
let file = 'src/helpers/xml-builder.ts'
let content = fs.readFileSync(file, 'utf8')

// A safer regex to just replace the test+match with truthiness of match:
// We just want to do:
// `if (rgbRegex.test(colorCodeString)) {` -> `if (colorCodeString.match(rgbRegex)) {`
// Wait! That would STILL do a regex match. It's `O(match) + O(match)`!
// Actually, if we do: `const match = str.match(regex); if (match) { ... }`, we save one match!

// Let's do it ONLY for the simple color conversions where it's not nested inside `else if` chains.
// Wait, `else if` chains are exactly where we can use block scoping:
// `} else { const match = str.match(regex); if (match) {`
// Let's implement the block scoping manually for the 4 color ones and maybe a few others?

content = content.replace(
  /if \(rgbRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(rgbRegex\)/g,
  '{ const matchedParts = colorCodeString.match(rgbRegex); if (matchedParts) {'
)

content = content.replace(
  /if \(hslRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hslRegex\)/g,
  '{ const matchedParts = colorCodeString.match(hslRegex); if (matchedParts) {'
)

content = content.replace(
  /if \(hexRegex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hexRegex\)/g,
  '{ const matchedParts = colorCodeString.match(hexRegex); if (matchedParts) {'
)

content = content.replace(
  /if \(hex3Regex\.test\(colorCodeString\)\) \{\n\s*const matchedParts = colorCodeString\.match\(hex3Regex\)/g,
  '{ const matchedParts = colorCodeString.match(hex3Regex); if (matchedParts) {'
)

// We need to keep braces matched! We are adding an `{`. But wait, `if(regex.test(str)) {` had `{`.
// By replacing `if(regex.test(str)) { const match = ...` with `{ const match = ...; if (match) {`, we KEEP exactly the same number of `{`. The original code closed `if (matchedParts) {` and then `if (rgbRegex.test) {`.
// Now we have `{ const match=...; if (match) {` and they BOTH close!
// This works perfectly and doesn't break `else if` if we don't have it!

fs.writeFileSync(file, content)
