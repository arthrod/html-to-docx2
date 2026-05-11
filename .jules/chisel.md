
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-12 - Explicit Return Type for Recursive Functions
**Learning:** A recursive function without an explicit return type causes the compiler to infer `any` for recursive calls (triggering `TS(7023)` and `TS(7022)`).
**Action:** Always add an explicit return type (e.g., `: string`) to the signature of a recursive function to resolve these implicit `any` errors instead of relying on inference.
