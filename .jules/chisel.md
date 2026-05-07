
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-23 - Typing JS Destructuring Options
**Learning:** Untyped destructured options that default to `= {}` and have individual fields that default to `null` (e.g., `{ encoding = null, tokenizerOpts = null } = {}`) cause variables like `tokenizerOpts` to be inferred as strictly `null`. This creates type incompatibility errors when the JS code later uses `instanceof` on them (TS2358).
**Action:** Always create a named interface (e.g., `StreamOpts`) for destructured options, and explicitly type the fields to include their intended values, allowing for the default `null` and `undefined`.
