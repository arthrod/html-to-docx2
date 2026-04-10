## 2026-04-10 - Optimize object iteration in hot paths
**Learning:** The use of `cloneDeep` combined with `Object.keys().forEach()` over static configuration objects (like `paragraphBordersObject`) causes unnecessary memory allocations and redundant property lookups in hot paths like `buildParagraphBorder`.
**Action:** Replaced `cloneDeep` and `Object.keys().forEach` with a direct `for...of` loop using `Object.entries()` over the constant object to improve performance and avoid GC pressure.
