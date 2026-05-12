## 2024-05-19 - Top-Level RegExp Reuse in Iterative Parsing
**Learning:** Instantiating `new RegExp()` inside hot loop functions (such as DOCX token splitting and tracking token identification) incurs redundant object allocation overhead, scaling poorly in large repetitive datasets.
**Action:** Lift static RegExps to the top level. For simple tests, use a non-global regex. For iterative processing via `.exec()` loops, reuse a top-level global regex by resetting its state with `.lastIndex = 0` before the loop. This minimizes garbage collection overhead in hot path processing.
