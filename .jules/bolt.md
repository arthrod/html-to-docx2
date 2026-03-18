## 2024-03-18 - Optimize repetitive regex replacements over large XML strings

**Learning:** Using an array of elements with `forEach` to dynamically create and apply multiple `new RegExp` replacements over a massive XML document string is severely inefficient due to repeated whole-string sweeps.
**Action:** Always combine the elements into a single regex with alternation `(el1|el2|...)` and capture groups. Doing so allows the regex engine to make a single pass over the large string, offering significant, measurable (e.g. 5x) speedup during post-processing operations like XML namespace adjustment.
