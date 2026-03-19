const fs = require('node:fs')

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8')

  // Let's replace ONLY the `rgbRegex`, `hslRegex`, `hexRegex`, `hex3Regex` tests in fixupColorCode
  // Because those are simple standalone `if` blocks.

  // The user says "replace sequential calls of regex.test(str) and str.match(regex) with a single str.match(regex) call and checking its truthiness."

  // We can just manually replace them! Let's do a simple regex replace for ALL of them.
  // if (pixelRegex.test(marginString)) {\n  const matchedParts = marginString.match(pixelRegex)\n  if (matchedParts) {
  // We can just change it to:
  // const matchedParts_pixelRegex = marginString.match(pixelRegex);
  // if (matchedParts_pixelRegex) {
  // And then replace matchedParts inside the block with matchedParts_pixelRegex.

  let lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    let m = lines[i].match(
      /^(\s*)if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*$/
    )
    if (m && i + 2 < lines.length) {
      let indent = m[1]
      let regex = m[2]
      let string = m[3]

      let m2 = lines[i + 1].match(
        /^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_[\].'-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$/
      )
      if (m2 && m2[3] === string && m2[4] === regex) {
        let varName = m2[2]

        let m3 = lines[i + 2].match(
          new RegExp(`^\\s*if\\s*\\(\\s*${varName}\\s*\\)\\s*\\{\\s*$`)
        )
        if (m3) {
          // We have the 3 lines.
          // Replace them with:
          lines[i] = `${indent}const ${varName}_${i} = ${string}.match(${regex});`
          lines[i + 1] = `${indent}if (${varName}_${i}) {`
          lines[i + 2] = `${indent}  if (${varName}_${i}) {` // keep the block structure!

          // Replace the varName inside the block?
          // If we do `{ if (varName_i) { if (varName_i) { const varName = varName_i; ...`
          // Actually:
          lines[i] = `${indent}{` // Just create a block!
          lines[i + 1] = `${indent}  const ${varName} = ${string}.match(${regex});`
          lines[i + 2] = `${indent}  if (${varName}) {`

          // This means `if (test) {` becomes `{`.
          // So `if` is removed, but `{` is kept!
          // It's just an unconditional block.
          // Since `const match = ...; if (match) {` was ALREADY inside that block, it works!
        }
      }
    }

    // For else if:
    let mElse = lines[i].match(
      /^(\s*)\}\s*else\s+if\s*\(\s*(?:(.+?)\s*&&\s*)?([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*$/
    )
    if (mElse && i + 2 < lines.length) {
      let indent = mElse[1]
      let cond = mElse[2]
      let regex = mElse[3]
      let string = mElse[4]

      let targetIdx = i + 1
      let hasLastIndex = false
      if (lines[targetIdx].includes('.lastIndex = 0')) {
        targetIdx = i + 2
        hasLastIndex = true
      }

      if (targetIdx + 1 < lines.length) {
        let m2 = lines[targetIdx].match(
          /^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_[\].'-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$/
        )
        if (m2 && m2[3] === string && m2[4] === regex) {
          let varName = m2[2]
          let m3 = lines[targetIdx + 1].match(
            new RegExp(`^\\s*if\\s*\\(\\s*${varName}\\s*\\)\\s*\\{\\s*$`)
          )
          if (m3) {
            if (cond) {
              lines[i] = `${indent}} else if (${cond}) {`
            } else {
              lines[i] = `${indent}} else {`
            }
          }
        }
      }
    }

    // For if (cond && test)
    let mCond = lines[i].match(
      /^(\s*)if\s*\(\s*(.+?)\s*&&\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*$/
    )
    if (mCond && i + 2 < lines.length) {
      let indent = mCond[1]
      let cond = mCond[2]
      let regex = mCond[3]
      let string = mCond[4]

      let targetIdx = i + 1
      let hasLastIndex = false
      if (lines[targetIdx].includes('.lastIndex = 0')) {
        targetIdx = i + 2
        hasLastIndex = true
      }

      if (targetIdx + 1 < lines.length) {
        let m2 = lines[targetIdx].match(
          /^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_[\].'-]+)\.match\(\s*([a-zA-Z0-9_]+)\s*\)\s*$/
        )
        if (m2 && m2[3] === string && m2[4] === regex) {
          let varName = m2[2]
          let m3 = lines[targetIdx + 1].match(
            new RegExp(`^\\s*if\\s*\\(\\s*${varName}\\s*\\)\\s*\\{\\s*$`)
          )
          if (m3) {
            lines[i] = `${indent}if (${cond}) {`
          }
        }
      }
    }

    i++
  }

  fs.writeFileSync(filepath, lines.join('\n'))
}

processFile('src/helpers/xml-builder.ts')
