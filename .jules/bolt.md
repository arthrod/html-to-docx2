## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8

**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-18 - SVG String Serialization Optimization
**Learning:** During recursive string serialization of VNodes (e.g., SVG nodes), repeated string concatenation (`+=`) and `Object.entries().map().join()` causes unnecessary memory allocations and CPU overhead in Bun/V8.
**Action:** Replace direct string concatenation with an array-based string builder (`parts.push()`) passed down through the recursive calls. Replace `Object.entries()` with `for...in` and `hasOwnProperty` checks to avoid allocating intermediate arrays. This speeds up serialization by ~25-30% (~685μs to ~515μs) in synthetic benchmarks.
