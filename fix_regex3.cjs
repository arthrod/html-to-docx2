const fs = require('node:fs')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  // We are going to strictly replace `if (regex.test(str)) { \n const match = str.match(regex)\n if (match) {`
  // with `const match = str.match(regex)\n if (match) {`
  // But wait, the nesting brace is dropped for the first `if`. This breaks the `{}` pairing.
  // Instead, let's just do:
  // `if (regex.test(str)) {` -> `{`
  // That will keep the `{` and just make it a block!

  // So:
  // if (pixelRegex.test(style.width)) {
  // ->
  // {

  // But what if it's `} else if (percentageRegex.test(style.width)) {` ?
  // ->
  // } else {

  // Is this totally valid JS? Yes!
  // Wait, if it's `} else {` and inside it unconditionally runs `const match = str.match(...)`, then what if neither matched?
  // Well, if it was an `else if`, it only ran if the `else if` condition was true.
  // If we change it to `} else {`, it runs ALWAYS!
  // BUT inside it, we have `const match = str.match(regex); if (match) { ... }`
  // This achieves EXACTLY the same logic, except it also runs the `match` function. Which is what we want!
  // Wait, if we change `} else if (B) {` to `} else { const b = str.match(B); if (b) { ... } }`,
  // what if we have `} else if (A) { ... } else if (B) { ... }`?
  // Then the first `else if` becomes `else { const a = ... }`. The subsequent `else if` would be broken or inside it? No!
  // It's a chain of `if ... else if ... else if`.
  // If we change them to `if (a) { ... } else { const b = str.match(B); if (b) { ... } else { const c = str.match(C); if (c) { ... } } }`
  // That requires nesting the rest of the chain inside the new `else`!
  // So simple regex replacement of `} else if (...) {` to `} else {` will cause syntax errors because the following `else if` would attach to `if (match)`?
  // No, `} else { const match = ...; if (match) { ... } } else if (...)` -> this would be a syntax error because you can't have `else if` after `else` without closing the `else` block first!

  // Ah! This is why `fix_regex2.cjs` resulted in an unexpected token error.

  // Let's do it right. We can use AST to replace it, or we can just replace:
  // `if (regex.test(str))` with `if (str.match(regex))` -- NO, that doesn't give us the match variable to use!
  // Wait, we can replace:
  // `if (regex.test(str)) {\n  const match = str.match(regex)\n  if (match) {`
  // With:
  // `let match;\nif ((match = str.match(regex))) {\n  if (true) {`
  // That preserves the curly braces perfectly, and is a single `if` statement so `else if` chains still work!

  // Let's test this!

  content = content.replace(
    /if\s*\(\s*([a-zA-Z0-9_]+)\.test\(\s*([a-zA-Z0-9_[\].'-]+)\s*\)\s*\)\s*\{\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\2\.match\(\s*\1\s*\)\s*if\s*\(\s*\4\s*\)\s*\{/g,
    (whole, regex, str, declaration, varName) => {
      // we need to avoid `let match;` leaking if it's already declared?
      // actually we can just put it inside the condition? No, `if (const match = ...)` is not valid JS.
      // But we can do `let match_temp; if (match_temp = str.match(regex)) { const match = match_temp; if (match) {`
      // Wait, can we do `if (true) { const match = str.match(regex); if (match) {` ?
      // Yes! But that's unconditional. If it was an `else if (regex.test(str))`, replacing with `else if (true)` would catch EVERYTHING, breaking the chain!

      // So we MUST put the `match` inside the `if` condition, or we do something else.
      // Wait! Why not just replace `if (regex.test(str))` with `if (str.match(regex))` and inside we STILL do `const match = str.match(regex)`?
      // The goal is to avoid running the regex TWICE! `test` then `match`.
      // If we just do `const match = str.match(regex)` and remove the `test` call, how do we chain?

      // We can't easily chain without `let match; if (match = str.match(regex))`.

      // Actually, since we only want to optimize this, let's just use Python script to perfectly format it, or just do it with a careful Regex in JS!

      return `` // won't use this regex
    }
  )
}
