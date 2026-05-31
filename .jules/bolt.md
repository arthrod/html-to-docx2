## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8
**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2026-05-31 - Avoid deep cloning flat option objects
**Learning:** Using `cloneDeep` on flat objects like `RunAttributes` in tight rendering loops (e.g., DOCX XML generation) introduces a massive ~40x performance penalty compared to object spread or passing the object directly.
**Action:** Avoid deep cloning utilities on known flat structures; use object spread (`{ ...obj }`) or pass directly if unmodified.
