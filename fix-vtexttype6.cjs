const fs = require('node:fs')
const path = require('node:path')

const file = path.join(__dirname, 'src/helpers/render-document-file.ts')
let content = fs.readFileSync(file, 'utf8')

content = content.replace(/\(divChild as VNode\)/g, 'divChild')
content = content.replace(/const vn = node as VNode/g, 'const vn = node')

fs.writeFileSync(file, content)
