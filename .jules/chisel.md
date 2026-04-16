
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-21 - [Linter Side-Effects] **Learning:** Running the project's linter (`bun run lint`) applies broad automated fixes (e.g., `Number.parseInt`) using `oxlint --fix` which pollutes the git workspace across unrelated tests and scripts files. **Action:** Always double check `git status` after running `bun run lint` and explicitly `git restore` tests/ and scripts/ directories if unrelated code was modified before submitting.
