## 2024-03-30 - Optimize Object Iteration in `buildParagraphBorder`

**Learning:** In hot paths generating large XML fragments, using `cloneDeep` on static configuration objects (like `paragraphBordersObject`) before iterating their keys via `Object.keys().forEach` incurs massive and unnecessary memory allocation and garbage collection overhead (~15x slower).
**Action:** When a static configuration object's values are purely read during an operation and not mutated, replace `cloneDeep` and `Object.keys().forEach()` with a direct `for (const [key, value] of Object.entries(obj))` loop to drastically improve execution speed and reduce memory pressure.
