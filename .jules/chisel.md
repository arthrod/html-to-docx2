
## 2024-05-18 - [Typed JustHTML options objects]
**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-18 - [Fix dynamically added openElements]
**Learning:** `TreeBuilder` instances had `openElements` dynamically attached after construction, causing TS errors. By directly adding the property to the class and linking it in the constructor (`this.openElements = this.open_elements`), we remove the `@ts-expect-error` while maintaining the identical runtime behavior required by caller `parser.ts`.
**Action:** When seeing properties dynamically attached on object instances with `@ts-expect-error`, define those properties correctly on the `class` itself and initialize them in the constructor.

## 2025-02-17 - Patch command generating .orig files
**Learning:** Using `patch` with a diff file can leave `.orig` files hanging around that get accidentally staged and committed, severely polluting the PR and causing code review to fail.
**Action:** When making code modifications, prefer native tools like `replace_with_git_merge_diff` instead of `patch`. If `patch` must be used, explicitly delete `.orig` backup files before committing.
