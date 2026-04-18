## 2024-05-30 - Faster inline CSS parsing

**Learning:** In inline CSS parsing (e.g., in parseStyles), replacing split(';') and regex-based string splits (str.split(/:(.\*)/)) with a while loop using indexOf(';'), indexOf(':'), and slice() significantly improves performance (~1.7-2.5x speedup) by completely eliminating Regex evaluation and intermediate array allocation overhead.
**Action:** Replace the string splitting and regex logic in parseStyles with native string manipulation loop methods.
