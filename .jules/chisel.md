
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2026-04-20 - [Untyped Options in JS->TS Migration]
**Learning:** The pattern  without an explicit interface results in dynamic property accesses that require `@ts-expect-error` suppression. Explicitly defining an interface like `SerializerOptions` for these configuration objects prevents property-does-not-exist errors.
**Action:** Create optional-property interfaces for untyped configuration objects (e.g. `options`) rather than casting to `any` or using `@ts-expect-error`.
## $(date +%Y-%m-%d) - [Untyped Options in JS->TS Migration]
**Learning:** The pattern `options = {}` without an explicit interface results in dynamic property accesses that require `@ts-expect-error` suppression. Explicitly defining an interface like `SerializerOptions` for these configuration objects prevents property-does-not-exist errors.
**Action:** Create optional-property interfaces for untyped configuration objects (e.g. `options`) rather than casting to `any` or using `@ts-expect-error`.
