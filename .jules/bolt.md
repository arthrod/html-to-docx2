## 2024-05-19 - Redundant Regex Avoidance
**Learning:** In TypeScript/JavaScript performance optimization, sequential execution of `regex.test(str)` followed by `str.match(regex)` with the same arguments wastes CPU cycles on double regular expression evaluation.
**Action:** Use inline assignments (e.g., `let match; if ((match = str.match(regex)))`) to perform the truthiness check and variable binding in a single pass, while maintaining short-circuit evaluation in `if/else if` chains.
