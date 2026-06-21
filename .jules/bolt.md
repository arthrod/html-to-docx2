## 2024-06-21 - Replace Chained RegEx for String Escaping
**Learning:** Chaining multiple `.replace()` calls using Regular Expressions across hot paths like node string serialization generates massive overhead in intermediate string allocations and RegEx execution contexts inside V8/Bun, scaling linearly per chunk size and regex match count.
**Action:** Always prefer native character code loops or pre-built, highly-optimized utilities (e.g. `escapeXml`) for iterative hot-path text transformations rather than cascading RegEx instances.
