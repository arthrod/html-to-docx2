
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2026-04-30 - [Dynamically assigned properties in TreeBuilder]
**Learning:** Classes in JS-to-TS migrations often have properties assigned dynamically after instantiation (e.g., `treeBuilder.openElements = treeBuilder.open_elements`). The previous migrator suppressed the TS error with `@ts-expect-error` instead of explicitly declaring the property.
**Action:** Add the property explicitly to the class definition (e.g., `openElements?: Node[]`) using imported domain types rather than globally implicit ones, and correctly type the original property it copies from.
