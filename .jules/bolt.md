## 2025-02-28 - Avoid cloneDeep on flat objects in hot paths
**Learning:** `cloneDeep` from `es-toolkit/compat` has significant overhead and can allocate unnecessary memory in hot paths like DOCX generation (`buildRun`, `buildRunProperties`).
**Action:** Use native object spread syntax (`{ ...obj }`) for shallow cloning flat attributes instead of deep copying. Furthermore, completely avoid copying constants when they are only iterated directly in a read-only manner.
