const fs = require('node:fs')

function optimizeFile(filePath) {
  let lines = fs.readFileSync(filePath, 'utf8').split('\n')
  let result = []

  for (let i = 0; i < lines.length; i++) {
    // 1. `if (regex.test(str)) {`
    // AND next lines are `const match = str.match(regex)` and `if (match) {`

    // Pattern for `if (...) {`
    let m = lines[i].match(
      /^(\s*)(\}?\s*else\s+)?if\s*\(\s*(.+?\.test\([^)]+\)|.*?&&\s*.+?\.test\([^)]+\))\s*\)\s*\{/
    )
    if (m && i + 2 < lines.length) {
      let indent = m[1]
      let elsePart = m[2] || ''
      let condition = m[3]

      // Parse condition to get the regex and string
      let testMatch = condition.match(
        /(?:(.+?)\s*&&\s*)?([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)/
      )
      if (testMatch) {
        let prefixCond = testMatch[1]
        let regex = testMatch[2]
        let str = testMatch[3]

        let l1 = lines[i + 1]
        let l2 = lines[i + 2]

        // Sometimes there's `pixelRegex.lastIndex = 0` in between
        let skipLine = false
        let matchLineIndex = i + 1
        let matchLine = lines[matchLineIndex]

        if (matchLine.includes('.lastIndex = 0')) {
          skipLine = true
          matchLineIndex++
          matchLine = lines[matchLineIndex]
        }

        let matchVarRegex = new RegExp(
          `(const|let|var)\\s+([a-zA-Z0-9_]+)\\s*=\\s*(?:${str.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}|${str.replace(/\?/g, '\\?')})\\.?match\\(\\s*${regex}\\s*\\)`
        )
        let matchVarMatch = matchLine.match(matchVarRegex)

        if (matchVarMatch) {
          let varDec = matchVarMatch[1]
          let varName = matchVarMatch[2]

          let ifLineIndex = matchLineIndex + 1
          let ifLine = lines[ifLineIndex]

          if (ifLine.includes(`if (${varName}) {`)) {
            // We found a match!

            // How to replace?
            // Original:
            // } else if (regex.test(str)) {
            //   const match = str.match(regex)
            //   if (match) {

            // New:
            // } else if (() => { const match = str.match(regex); if (match) { _tempMatch = match; return true; } return false; })()) {
            // That's ugly.

            // We can do:
            // } else {
            //   const match = prefixCond ? (prefixCond && str.match(regex)) : str.match(regex);
            //   if (match) {

            // But this breaks `else if` chains!!

            // Better:
            // {
            //   let _tempMatch;
            //   if (_tempMatch = str.match(regex)) { ... } else if (...) {
            // This is also annoying to parse and write.

            // What if we just do:
            // `const match = str.match(regex);`
            // `if (prefixCond ? prefixCond && match : match) {`
            // But we must compute it BEFORE the `else if` if it's an `else if`.

            // What if we don't change `else if`, but just:
            // replace `regex.test(str)` with `!!(match = str.match(regex))` and hoist `match`?
            // E.g.: `let match;` at the top of the function.
            // No, we can just do: `const matchedParts = str.match(regex)` inside the block and change `regex.test(str)` to just `true`, and wrap the whole thing?

            // Actually, if we just look at the code, in almost all these cases, they are NOT part of a long `else if` chain where removing `test` breaks the logic.
            // Wait, they ARE `else if` chains!
            // `if (pointRegex.test(size)) { ... } else if (pixelRegex.test(size)) { ... }`
            // If we remove the `.test()` and do `.match()`, we have to do:
            // `let match;`
            // `if (match = size.match(pointRegex)) { ... } else if (match = size.match(pixelRegex)) { ... }`
            // This is valid JS and very clean!
            // Let's implement this!

            console.log(`Found: ${condition} -> matchVar: ${varName}`)
          }
        }
      }
    }
  }
}

optimizeFile('src/helpers/xml-builder.ts')
