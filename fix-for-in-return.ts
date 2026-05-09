import { readFileSync, writeFileSync } from 'fs'

const path = 'src/helpers/xml-builder.ts'
let content = readFileSync(path, 'utf-8')

// Fix the 'if (value === undefined) return' inside the for...in loop
// Previously it was a return in a forEach callback which acts like 'continue'.
// In a for...in loop, 'return' exits the whole function which returns an incomplete XML object that crashes!
content = content.replace(
  /if \(value === undefined\) return/g,
  'if (value === undefined) continue'
)

writeFileSync(path, content)
