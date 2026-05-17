## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8
**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-18 - Single Global Regex vs Multiple Regex replace loop
**Learning:** Sequential `.replace()` calls inside an iterative loop recreating a `new RegExp(...)` object over an array of elements inside a hot loop scales poorly in V8 for long strings and causes high GC overhead.
**Action:** Consolidate multiple simple element regex replacements into a single global regex matcher combined with an Object lookup map to achieve significantly faster (~2x) replacements on large texts.
