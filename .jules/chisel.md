
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-27 - [Untyped Options Pattern in Serializer]
**Learning:** Legacy JS options objects often default to `{}` but contain numerous properties accessed dynamically via dot notation, leading to `TS(2339)` property does not exist errors. Similarly, dynamic map initialization defaulting to `{}` leads to `TS(7053)` implicit `any` index errors.
**Action:** Extract inline parameter typings into explicit `Interfaces` like `SerializerOptions`. Type dynamically populated dictionaries with explicit generics like `Record<string, string | null>` based on their specific usage (e.g., HTML attributes are inherently string or null).
