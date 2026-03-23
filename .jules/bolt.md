
## 2025-02-13 - Replace Object.keys().forEach with for...in for Performance
**Learning:** In hot XML generation paths inside `src/helpers/xml-builder.ts` and `src/helpers/html-parser.ts`, using `Object.keys(obj).forEach()` allocates intermediate arrays and causes unnecessary garbage collection, which hurts performance since these functions run thousands of times per document conversion.
**Action:** Replaced `Object.keys().forEach()` with `for...in` loops in `html-parser.ts` and `xml-builder.ts` for property and styling iterations. Next time, always prefer `for...in` over `Object.keys()` in hot paths for iterating over object keys in this codebase.
