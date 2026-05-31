## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8
**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2026-05-31 - Avoid array spread operator in hot paths
**Learning:** In V8/Bun hot paths, merging fragment arrays using `Array.push(...items)` introduces call stack size risks for large documents and is significantly slower (~3x) than using a standard `for` loop to push items individually.
**Action:** Avoid `Array.push(...items)` in tight XML rendering loops (e.g., merging fragments in `src/helpers/xml-builder.ts`); use a standard `for` loop instead.
