
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-18 - [Typed HTML5LibSerializer Options]
**Learning:** `serializeSerializerTokenStream` and `serializeStartTag` in `html5lib_serializer.ts` destructured default options using `@ts-expect-error` to suppress missing property errors.
**Action:** Always define interfaces explicitly like `HTML5LibSerializerOptions` for option parameters, allowing the TS compiler to infer properties rather than suppressing them in the function body.
