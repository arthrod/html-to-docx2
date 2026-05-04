
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-14 - Destructured Options Causing `instanceof` Errors
**Learning:** Untyped destructured parameter defaults (e.g., `{ tokenizerOpts = null } = {}`) cause the TypeScript compiler to infer `tokenizerOpts` as potentially `any` or `null`, triggering a TS2358 error when evaluating `instanceof` against it. Previous attempts to silence this used `@ts-expect-error`.
**Action:** Always replace untyped destructured object parameters with explicit interfaces matching the default values (e.g. `tokenizerOpts?: TokenizerOpts | Record<string, unknown> | null`). Ensure that destructured variables default appropriately within the function body while retaining the parameter's optionality.
