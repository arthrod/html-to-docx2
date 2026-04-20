
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2026-04-20 - stream opts destructuring
**Learning:** Default untyped object parameters (e.g. `{ a = null } = {}`) cause inference of strictly `null` in TS, requiring  if an `instanceof` check is used.
**Action:** Extract options to a formal interface mapping allowed shapes to resolve TS(2358).
## 2024-05-18 - stream opts destructuring
**Learning:** Default untyped object parameters (e.g. `{ a = null } = {}`) cause inference of strictly `null` in TS, requiring `@ts-expect-error` if an `instanceof` check is used.
**Action:** Extract options to a formal interface mapping allowed shapes to resolve TS(2358).
