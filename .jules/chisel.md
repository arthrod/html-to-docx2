
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2025-02-28 - Typed JustJSHTML SerializerOptions

**Learning:** When fixing types for dynamic JS object arguments (`options = {}`), explicitly defining an interface and properly importing it removes multiple `@ts-expect-error` tags at once while adding compile-time checks. The `oxlint` auto-fixes can bleed into other unrelated directories (`tests/`, `scripts/`) and introduce noisy changes.

**Action:** Always verify `git status` after running linters/tests, and manually revert out-of-scope auto-formatted changes before finalizing or committing, keeping the PR scoped to the single TS migration scar.
