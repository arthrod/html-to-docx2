
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-18 - [Typed html5lib_serializer options objects]
**Learning:** `html5lib_serializer` also used destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings for `options.inject_meta_charset`, `options.encoding`, `options.strip_whitespace`, and `options.escape_rcdata`.
**Action:** Created `SerializerOptions` interface and typed the parameters, resolving the underlying type missingness and successfully removing four `@ts-expect-error` directives.
