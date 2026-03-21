## 2026-03-21 - Optimize Regex Replacements
**Learning:** When performing regex replacements over massive XML strings (e.g., modifying namespace prefixes), combining multiple target elements into a single regular expression using alternation `(el1|el2)` is significantly faster than iterating over an array of elements and applying `new RegExp` sequentially for each.
**Action:** Use alternation in a single regular expression for bulk string replacements over large texts.
