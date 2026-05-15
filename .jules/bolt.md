## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8
**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-24 - O(1) Map Lookups Replace Suboptimal Array.find in Hot Parsing Paths
**Learning:** In documents containing many comments or tracked items, repeatedly using `Array.find()` to locate a parent item by its ID inside the `buildRun` generation loop causes an O(N^2) bottleneck. By introducing a secondary lookup `Map` (e.g., `commentsByNumericId`) that maps IDs to items upon creation, lookups can be reduced from O(N) to O(1), leading to massive performance gains (e.g., ~168ms down to ~0.5ms for 10,000 items).
**Action:** When finding items by ID within a recursive or iterative DOM parsing loop, maintain a parallel `Map` populated during insertion rather than scanning the canonical storage array on every lookup.
