## 2026-05-15 - Optimize Array.find() on comments array instead of map lookup

**Learning:** When repeatedly looking up items in a growing array by a unique ID (like numeric comment IDs), using `Array.find()` results in $O(N^2)$ algorithmic complexity over repeated calls. In hot paths (such as parsing or importing documents with many comments), this severely degrades performance.

**Action:** Replace `Array.find()` lookups with an $O(1)$ `Map.get()` lookup by maintaining a parallel Map data structure (e.g., `numericCommentMap: Map<number, StoredComment>`) that is updated whenever elements are pushed to the source array. Always benchmark the performance before and after to quantify the savings.
