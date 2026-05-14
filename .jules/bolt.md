## 2024-05-19 - Top-Level RegExp Reuse in Iterative Parsing
**Learning:** Instantiating `new RegExp()` inside hot loop functions (such as DOCX token splitting and tracking token identification) incurs redundant object allocation overhead, scaling poorly in large repetitive datasets.
**Action:** Lift static RegExps to the top level. For simple tests, use a non-global regex. For iterative processing via `.exec()` loops, reuse a top-level global regex by resetting its state with `.lastIndex = 0` before the loop. This minimizes garbage collection overhead in hot path processing.

## 2024-05-09 - [Eliminate cloneDeep in Paragraph Borders]
**Learning:** In the performance-sensitive `buildParagraphBorder` OOXML generation loop, unnecessary `cloneDeep` operations on constants like `paragraphBordersObject` cause significant memory allocation overhead. Additionally, using `Object.keys()` iterations is slower than native `for...in` loops.
**Action:** Remove `cloneDeep` calls on static constants when only reading values, and replace `Object.keys().forEach()` with native `for...in` loops with `hasOwnProperty` checks to eliminate memory allocation overhead and improve execution speed.
