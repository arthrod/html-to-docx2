## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8
**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.
## 2024-05-19 - Fast Lookups in Document Threading
**Learning:** O(N) array lookups (`Array.find`) inside parsing loops or heavy document generation paths cause severe performance regressions, especially as comment sizes grow. Map-based lookups consistently outperform them (~1000x for 10k items).
**Action:** When working with unique IDs (like `numericId`), maintain an `O(1)` Map representation alongside any array storage when iterative lookup patterns are observed.
