function parseStylesOld(input) {
  const attributes = input.split(';')
  const styles = {}
  for (const attribute of attributes) {
    const entry = attribute.split(/:(.*)/)
    if (entry[0] && entry[1]) {
      styles[entry[0].trim()] = entry[1].trim()
    }
  }
  return styles
}

function parseStylesNew(input) {
  const styles = {}
  let start = 0
  const len = input.length

  while (start < len) {
    let semiIdx = input.indexOf(';', start)
    if (semiIdx === -1) semiIdx = len

    // We only process if there's some content
    if (semiIdx > start) {
      const colonIdx = input.indexOf(':', start)
      if (colonIdx !== -1 && colonIdx < semiIdx) {
        const key = input.slice(start, colonIdx).trim()
        const val = input.slice(colonIdx + 1, semiIdx).trim()
        if (key && val) {
          styles[key] = val
        }
      }
    }
    start = semiIdx + 1
  }
  return styles
}

const inputs = [
  'color: red; font-size: 16px; background-color: blue;',
  'margin: 0; padding: 10px 20px; border: 1px solid black; display: flex;',
  'font-family: "Times New Roman", Times, serif; line-height: 1.5; color: #333;',
  'color:red;',
  '',
]

for (const input of inputs) {
  console.log('Old:', parseStylesOld(input))
  console.log('New:', parseStylesNew(input))
}

const N = 1000000

console.time('Old')
for (let i = 0; i < N; i++) {
  parseStylesOld(inputs[i % inputs.length])
}
console.timeEnd('Old')

console.time('New')
for (let i = 0; i < N; i++) {
  parseStylesNew(inputs[i % inputs.length])
}
console.timeEnd('New')
