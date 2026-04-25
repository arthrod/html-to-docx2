
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-27 - SerializerOptions Type

**Learning:** When dealing with functions accepting an options object that acts as a bag of loosely-typed boolean flags, defining an explicit interface correctly documents these parameters. The untyped options object resulted in numerous @ts-expect-error comments regarding property existence when properties were dynamically checked.
**Action:** Replace empty object defaults (`options = {}`) with explicitly typed objects (`options: SerializerOptions = {}`) containing `?` optional boolean/string members, eliminating implicit any and reducing ts-expect-error clutter.
