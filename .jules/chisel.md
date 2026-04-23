
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-14 - Untyped Options Defaulting to `{}` in HTML5Lib Serializer
**Learning:** `options = {}` pattern in JS without an interface causes cascading `@ts-expect-error` comments when properties are accessed. `bun run lint` automatically runs `oxlint --fix` which can apply unexpected stylistic changes across unrelated files (e.g., `parseInt` -> `Number.parseInt`).
**Action:** When defining the missing interfaces, explicitly mark properties as optional (`?`) so the empty object default `{}` remains valid. Always check `git status` after running the linter and use `git restore` on unrelated files to keep PR scope strict.
