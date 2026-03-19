const fs = require('node:fs')
let file = 'src/helpers/xml-builder.ts'
let content = fs.readFileSync(file, 'utf8')

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

fs.writeFileSync(file, content)
