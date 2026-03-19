const str = '12px'
const pixelRegex = /^(\d+)px$/
let match
if ((match = str.match(pixelRegex))) {
  console.log('matched:', match[1])
} else if ((match = str.match(/^(\d+)pt$/))) {
  console.log('matched pt:', match[1])
}
