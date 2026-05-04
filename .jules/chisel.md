
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-14 - Typing HTML Encoding Parsing Functions

**Learning:** `src/vendor/justjshtml/encoding.ts` was heavy on implicit `any` parameter types.
**Action:** Carefully analyzed how each parameter was accessed to narrow down the `any` parameters to `number`, `Uint8Array`, and correctly extracted an inline options object `{ transportEncoding }` into a proper `HTMLEncodingOptions` interface. `unknown` was used for completely unknown inputs (like labels passed by external users).
