## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8

**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-24 - Remove deep cloning and array allocations in hot paths

**Learning:** In the performance-critical OOXML generation loops (like `buildRunProperties` and `buildRun`), using `cloneDeep` from `es-toolkit` on simple, flat configuration objects (like `RunAttributes`) and using `Object.keys().forEach` caused immense, unnecessary memory allocation and callback overhead. Shallow cloning via spread operators and native `for...in` loops with `hasOwnProperty` checks are drastically faster.
**Action:** Always prefer shallow copying (`{ ...obj }`) for flat objects, and use native `for...in` loops when iterating over object keys in hot paths to avoid intermediate array (`Object.keys`) and closure allocations.
