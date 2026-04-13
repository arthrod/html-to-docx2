
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2026-04-13 - Options Pattern in justjshtml
**Learning:** The `justjshtml` directory contains untyped `options = {}` parameters suppressing TS2339 errors via `@ts-expect-error`. Since these are often destructured or checked with `Boolean()` and default to `{}`, their properties must be marked as optional (`?`) in the defined interfaces.
**Action:** When fixing options parameters, define a dedicated interface with optional fields to align with the default empty object and remove the `@ts-expect-error` directives.
