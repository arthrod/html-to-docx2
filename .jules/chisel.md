
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-30 - Typing generic configurations as interfaces

**Learning:** When dealing with `options = {}` defaults in legacy JS-to-TS ports, the options parameters often contain disparate properties across multiple function definitions. Trying to type them as `Record<string, any>` to satisfy implicit-any errors results in lost safety for callers.

**Action:** Consolidate the optional properties across the file into a unified interface (e.g. `SerializerOptions`). Map properties based on usage checks (e.g., `options.strip_whitespace ?` -> `strip_whitespace?: boolean`). This systematically eliminates all related `@ts-expect-error`s, enforcing valid usage across the library.
