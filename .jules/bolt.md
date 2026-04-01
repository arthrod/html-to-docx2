## 2024-04-01 - [Regex Alternation Optimization]

**Learning:** In hot paths processing massive XML strings in `generateDocumentXML`, dynamically creating `new RegExp` objects in `forEach` loops over tag arrays is extremely slow due to repeated regex compilation and sequential full-string scans.
**Action:** Replace looped `new RegExp` constructions with pre-compiled, module-scoped regular expressions using alternation `(el1|el2)` to handle multiple tags in a single pass. This reduces the number of full-string scans and memory allocations significantly.
