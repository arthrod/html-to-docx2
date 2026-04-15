
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-06-12 - Untyped Options Defaulting to `{}`
**Learning:** Functions that default options to an empty object (`options = {}`) frequently cause destructuring or property access errors, which were previously suppressed by `@ts-expect-error`. The inferred type is `{}` which has no properties.
**Action:** When encountering `@ts-expect-error TS(2339) FIXME: Property 'X' does not exist on type '{}'`, define an explicit interface for the options object. Ensure properties in the new interface are marked as optional (`?`) to correctly align with the fallback empty object assignment.
