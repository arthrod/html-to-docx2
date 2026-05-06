
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-31 - [HTML5Lib Serializer Options Typing]
**Learning:** Destructured empty objects `options = {}` used as fallbacks without type declarations cause cascading `@ts-expect-error TS(2339)` directives when optional properties are accessed.
**Action:** Always create a targeted `interface` with optional `?` properties to type such options explicitly, and assign `Record<string, string | null>` to inner dynamic mapping objects initialized as `{}` to fix TS(7053) errors without using `any`.
