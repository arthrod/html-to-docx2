## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8

**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-18 - Single RegExp Outperforms Multiple replace calls with Array.forEach

**Learning:** In V8/Bun, when replacing multiple specific substrings (e.g. XML tags) that share a similar structure, using a single pre-compiled global `RegExp` with a unified alternation pattern `(a|b|c)` and a dictionary map in the `.replace` callback is significantly faster than looping over an array and calling `.replace(new RegExp(...))` repeatedly. This minimizes RegExp compilations and avoids scanning the full target string multiple times.
**Action:** When performing many tag/token replacements, consolidate them into a single global regular expression with a lookup dictionary instead of using loops and chained regex replacements.

## 2026-05-31 - Avoid array spread operator in hot paths

**Learning:** In V8/Bun hot paths, merging fragment arrays using `Array.push(...items)` introduces call stack size risks for large documents and is significantly slower (~3x) than using a standard `for` loop to push items individually.
**Action:** Avoid `Array.push(...items)` in tight XML rendering loops (e.g., merging fragments in `src/helpers/xml-builder.ts`); use a standard `for` loop instead.
## 2024-06-18 - Single-Pass Loop vs RegExp String Replacement for XML Escaping
**Learning:** Chained `.replace()` calls with global regular expressions (`.replace(/&/g, '&amp;').replace(/</g, '&lt;')...`) are extremely slow and allocate significant memory during the rendering of large strings (such as SVG content or long paragraphs in `serializeVNodeToSVG`). Because each `.replace()` returns an intermediate string and re-evaluates the regex engine, it degrades performance.
**Action:** When escaping large strings in hot paths, avoid chained `.replace()`. Instead, implement or reuse a manual `for` loop with `charCodeAt` checks and substring concatenation. In this codebase, reuse the `escapeXml` utility function from `src/utils/xml-escape.ts` which implements this pattern, resulting in a 3-5x performance improvement.
