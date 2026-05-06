
## 2024-05-14 - Optimize inline CSS parsing by eliminating string split allocation and Regex

**Learning:** In hot paths like inline CSS parsing (`parseStyles`), using `String.prototype.split` with string tokens and Regex (`/(.*)/`) causes unnecessary array allocations and Regex evaluation overhead.
**Action:** By substituting this logic with a `while` loop, combined with `String.prototype.indexOf` and `String.prototype.slice`, we completely eliminate Regex evaluation and interim array allocations. This resulted in an approximate ~3x execution time speedup during micro-benchmarks.
