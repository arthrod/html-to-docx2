## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8

**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-19 - Avoid cloneDeep on flat attribute objects

**Learning:** In @turbodocx/html-to-docx, attribute objects like `RunAttributes` and `ParagraphAttributes` are flat objects. Using `cloneDeep` from `es-toolkit` to prevent mutation during iteration or property assignment introduces massive memory allocation and performance overhead in hot paths (e.g. `buildRun`).
**Action:** When copying flat objects to prevent mutation or merged attribute sets, use a shallow object spread operation (`{ ...attributes }`). This is significantly faster and allocates far less memory than deep cloning utilities.
