
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-06-03 - attrListToDict Any & Expect-Error
**Learning:** Initializing objects tightly inferred using explicitly typed `Record` map constructs allows us to eradicate dynamically bound indexing issues without needing dynamic typing like `Record<string, any>`, preventing implicit `any` fallbacks.
**Action:** When fixing dynamic map initializations inside TS files (like `out[name] = ...`), enforce `Record<string, expected_value_type>` explicit initializations and forcefully stringify loosely bound map keys.
