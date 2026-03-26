## 2024-03-24 - Optimize XML Namespace Replacements
**Learning:** Sequential calls to `new RegExp()` inside a loop across arrays of string targets are very expensive and result in redundant traversals over large strings (e.g., full XML content).
**Action:** Always prefer combining multiple targets into a single pre-compiled regex using alternation `|` and capture groups to perform replacements in a single pass.
