
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.

## 2024-05-27 - Options Bag Typing in Migration Scars
**Learning:** JS codebases often use loose `options = {}` pattern where downstream functions extract properties dynamically. This results in `@ts-expect-error TS(2339) FIXME: Property 'X' does not exist on type '{}'` when migrated to TS, rather than explicit `any` usage.
**Action:** Define an explicit `Options` interface at the top of the file mapping out all expected optional properties based on internal usage, and apply it to the `options` parameter instead of relying on default `{}` inference.
