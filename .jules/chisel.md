
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-18 - Recursive Type Inference Limits in TypeScript
**Learning:** TypeScript cannot always infer the return type of recursive functions (e.g., `nodeToHTML` calling itself on children). This causes implicit `any` return types (TS 7023) and subsequently causes implicit `any` on the recursive assignments (TS 7022).
**Action:** When migrating complex recursive tree-parsing/serialization functions, explicitly specify the return type on the main function signature. This instantly cascades type safety down the recursive tree and removes the need for multiple `@ts-expect-error` annotations on the child calls.
