## 2024-05-24 - [Avoid re-creating regex in hot paths]
**Learning:** The `hasTrackingTokens` function was re-creating a regular expression without the `/g` flag on every call inside `xml-builder.ts`, which processes text heavily. Since non-global regexes don't keep state (`lastIndex`), they can be safely moved to module scope to avoid frequent memory allocations.
**Action:** Extract the non-global regex to the module scope (as `DOCX_TOKEN_TEST_REGEX`) to optimize hot paths.
