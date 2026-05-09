import { readFileSync, writeFileSync } from 'fs'
const path = 'src/helpers/xml-builder.ts'
let content = readFileSync(path, 'utf-8')
const startIdx = content.indexOf('const buildRunProperties =')
console.log(content.substring(startIdx, startIdx + 800))
