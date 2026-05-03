
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-18 - [Typed SerializerOptions objects in html5lib_serializer.ts]
**Learning:** `options = {}` pattern used in `serializeSerializerTokenStream` and `serializeStartTag` caused TS to infer `options` as an empty object, throwing errors when properties were accessed.
**Action:** Define an explicit `SerializerOptions` interface with all optional properties and use it in the function signatures.
