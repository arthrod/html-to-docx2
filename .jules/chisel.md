
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-24 - [html5lib_serializer options typing]
**Learning:** `options = {}` defaults in JS often lead to TS errors when destructuring or accessing properties that aren't defined on `{}`. `@ts-expect-error` is often used to suppress these.
**Action:** Define an explicit interface for the options object with optional properties (`?`) to correctly represent the allowed shape and safely type the `{}` default value. Remove the `@ts-expect-error` comments once the type is in place.
