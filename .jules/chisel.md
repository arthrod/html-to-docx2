
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2025-02-28 - Implicit Any on Recursive Functions
**Learning:** Functions that call themselves recursively (e.g., `nodeToHTML` in `serialize.ts`) will often trigger TS(7023) and TS(7022) because the compiler cannot infer the return type from a self-referential call graph without an explicit boundary.
**Action:** Always provide explicit return types (e.g., `: string`) for recursive functions instead of relying on inference. This instantly resolves implicit `any` errors for both the function's return value and any internal assignments reliant on recursive calls.
