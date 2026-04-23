
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-18 - Parameter destructuring TS2358 mismatch
**Learning:** Default options parameters like `{ encoding = null, tokenizerOpts = null } = {}` typed implicitly as `any` or not typed at all cause `TS2358` errors when used with `instanceof` because TS infers the variable as literally `null`. Using `@ts-expect-error` masks this structure problem.
**Action:** When a destructured parameter's property defaults to `null` and is later used in an `instanceof` check, extract the parameter to an interface (e.g. `StreamOptions`) with proper union types (`tokenizerOpts?: TokenizerOpts | Record<string, unknown> | null`) rather than trying to type the destructuring assignment inline.
