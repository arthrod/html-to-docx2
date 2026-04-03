## 2026-04-03 - [Optimize buildParagraphBorder by removing cloneDeep]

**Learning:** [In src/helpers/xml-builder.ts, buildParagraphBorder was unnecessarily cloning the static configuration object paragraphBordersObject and iterating over it using Object.keys().forEach(). This caused unnecessary memory allocation and redundant key lookups.]
**Action:** [Use Object.entries() with a for...of loop directly on paragraphBordersObject instead of cloning it first to avoid unnecessary allocations and iteration overhead.]
