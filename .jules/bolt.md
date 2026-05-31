## 2024-05-18 - Single-Pass String Iteration Outperforms RegExp chained replace in Bun/V8
**Learning:** In Bun/V8, when escaping large strings for XML/HTML in hot paths, a manual `for` loop combined with a `charCodeAt` check and substring concatenation is significantly faster (3-5x) and allocates less memory than using sequential chained `.replace()` calls or a single `.replace()` with a global RegExp and map.
**Action:** When performing simple character replacements in a hot path, replace chained regex replace calls with single-pass manual iteration for significant performance gains.

## 2024-05-18 - Single RegExp Outperforms Multiple replace calls with Array.forEach
**Learning:** In V8/Bun, when replacing multiple specific substrings (e.g. XML tags) that share a similar structure, using a single pre-compiled global `RegExp` with a unified alternation pattern `(a|b|c)` and a dictionary map in the `.replace` callback is significantly faster than looping over an array and calling `.replace(new RegExp(...))` repeatedly. This minimizes RegExp compilations and avoids scanning the full target string multiple times.
**Action:** When performing many tag/token replacements, consolidate them into a single global regular expression with a lookup dictionary instead of using loops and chained regex replacements.
