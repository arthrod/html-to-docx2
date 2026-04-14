
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-18 - HTML5Lib Serializer Options
**Learning:** Destructured options with a default `={}` frequently hide missing interface definitions causing cascading `@ts-expect-error`s and untyped parameter `any`s.
**Action:** When finding an `options: any` param defaulting to `{}`, extract its usage to a dedicated interface with optional properties to ensure correct types downstream.
