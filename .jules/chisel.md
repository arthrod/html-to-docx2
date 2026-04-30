
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## $(date +%Y-%m-%d) - options parameter in html5lib_serializer.ts
**Learning:** Functions that accept a generic `options = {}` parameter are common JS-era conventions that hide the shape of the options object from the TypeScript compiler, leading to destructuring errors or loose property accesses that are often suppressed with `@ts-expect-error`.
**Action:** Define an explicit interface (e.g., `SerializerOptions`) for the options object, making all properties optional (`?`) to match the default empty object assignment. Apply this interface to the function signature and remove any surrounding `@ts-expect-error` directives.
