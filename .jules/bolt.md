## 2024-05-18 - Optimized CSS Inline Parsing
**Learning:** In string parsing hot paths within virtual DOM builders, chaining `String.prototype.split` combined with regexes allocates intermediate arrays and forces the JS engine to evaluate regex overhead repeatedly.
**Action:** Replaced `split` and regexes with a manual `while` loop utilizing `indexOf` and `slice` to extract key-value pairs directly, yielding ~1.3-2x performance boost.
