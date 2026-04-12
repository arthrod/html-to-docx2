
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-18 - Untyped Options Object Causing instanceof Error
**Learning:** An untyped options object parameter in a function signature, destructured with defaults, causes TS to infer the destructured variables strictly based on the defaults (e.g., `null`). This leads to incorrect `instanceof` errors (`TS(2358)`) when the code tries to check if the variable is an instance of a class, as the compiler thinks it's purely `null`.
**Action:** Always provide an explicit type annotation for the destructured options parameter to widen the inferred type and allow for object shapes or instances of a class, thereby resolving the error without a suppression comment.
