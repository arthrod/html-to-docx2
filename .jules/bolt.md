
## $(date +%Y-%m-%d) - [Regex evaluation caching]
**Learning:** Calling `regex.test(str)` followed by `str.match(regex)` evaluates the same regex twice unnecessarily.
**Action:** Replace `if (regex.test(str)) { const match = str.match(regex); ... }` with `const match = str.match(regex); if (match) { ... }` to improve performance. Also caching these checks instead of applying to all unit permutations optimizes code.

## $(date +%Y-%m-%d) - [Concurrent Promise mapping]
**Learning:** Promise.all cannot be used to execute run fragment generation asynchronously in the XML docx builder (`buildRunOrRuns`), as the specific document ordering needs to be maintained via a sequential await in loop. Ignoring `eslint-disable no-await-in-loop` directives without knowing specific context can lead to major race conditions and issues.
**Action:** Respect `eslint-disable no-await-in-loop` when working with ordered XML fragment building.
