
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-03-30 - Typed untyped `options` parameter in `html5lib_serializer.ts`
**Learning:** `options = {}` pattern in `src/vendor/justjshtml/` results in many destructuring type errors suppressed by `@ts-expect-error` because properties are unexpectedly missing.
**Action:** Created `SerializerOptions` interface to provide a defined shape for destructuring without errors.
