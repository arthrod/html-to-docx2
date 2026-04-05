## 2025-04-05 - Optimize static object traversal by removing cloneDeep
**Learning:** `cloneDeep` is often unnecessarily used on static configuration objects like `paragraphBordersObject` in `src/helpers/xml-builder.ts` before iterating over them. Combined with `Object.keys(obj).forEach()`, this causes significant GC pressure and performance loss in hot paths (approx 4.5x slower).
**Action:** Replace `cloneDeep(obj)` and `Object.keys(obj).forEach()` with direct iteration over `Object.entries(obj)` when the traversal does not mutate the source object.
