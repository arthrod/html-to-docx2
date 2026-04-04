## 2024-04-04 - [Optimize escapeXml with manual char loop]

**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `switch` statement on `charCodeAt` (e.g., `str.charCodeAt(i) === 38` for `&`) and substring concatenation is significantly faster and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** Use manual character iteration for XML/HTML escaping to improve performance.
