
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2026-04-25 - [Typed html5lib serializer options and implicit any dictionary]
**Learning:** `justjshtml/html5lib_serializer.ts` used `@ts-expect-error` to access undefined options on its `options` parameter and also had an implicit `any` object initialized as `{}` in `attrListToDict`.
**Action:** Replace missing interface property suppressions by extracting and explicitly typing a `SerializerOptions` interface. When initializing objects meant to act as dictionaries (like mapping attribute names to string values), use `Record<string, string | null>` instead of `{}`.
