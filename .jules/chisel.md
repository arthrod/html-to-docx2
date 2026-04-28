
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## YYYY-MM-DD - Type Justjshtml SerializerOptions
**Learning:** Functions handling dynamic parsing configurations like `serializeSerializerTokenStream` often implicitly use `{}` and assume random boolean properties like `inject_meta_charset`, `encoding`, etc., leading to TS `any` usage.
**Action:** Extract explicit interface structures (e.g. `SerializerOptions`) inferred from property access and defaults to type options explicitly, replacing `any` fallback.
