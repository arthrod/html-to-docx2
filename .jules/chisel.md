
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-04-21 - untyped options object creating property access errors in html5lib_serializer
**Learning:** JS-to-TS migrations often leave `options = {}` parameters untyped which causes compiler errors when properties are accessed on it later. These errors are sometimes incorrectly suppressed with `@ts-expect-error`.
**Action:** When finding `@ts-expect-error` comments hiding property accesses on options objects, create an explicit interface defining the properties (e.g. `SerializerOptions`) inferred from their usage and use it to type the argument, which resolves the errors.
