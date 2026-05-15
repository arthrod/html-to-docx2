## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8
**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-18 - Expensive cloneDeep in DOCX run generation
**Learning:** In `@turbodocx/html-to-docx`, attribute objects like `RunAttributes` and `ParagraphAttributes` are flat objects. Using `cloneDeep` from `es-toolkit` inside the hot paths of `buildRun` and `buildTextRunFragment` causes significant memory allocation and recursive type-checking overhead. Since `buildRunProperties` acts as a read-only builder, and loop resets only require a shallow copy, deep cloning is both unnecessary and a major bottleneck.
**Action:** Replace `cloneDeep` with direct variable passing when read-only, or shallow object spread `({ ...attributes })` when a copy is required for mutation. This yields roughly 10x-20x faster attribute processing in micro-benchmarks.
