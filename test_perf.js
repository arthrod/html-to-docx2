let pixelRegex = /^(\d+)px$/
let str = '12px'

console.time('Test+Match')
for (let i = 0; i < 1000000; i++) {
  if (pixelRegex.test(str)) {
    let match = str.match(pixelRegex)
    if (match) {
      let x = match[1]
    }
  }
}
console.timeEnd('Test+Match')

console.time('Match only')
for (let i = 0; i < 1000000; i++) {
  let match = str.match(pixelRegex)
  if (match) {
    let x = match[1]
  }
}
console.timeEnd('Match only')
