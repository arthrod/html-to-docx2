## 2025-02-18 - Safe Dynamic Object Indexing in Iterations

**Learning:** When dynamically assigning properties to an empty object `{}` during iterations, TypeScript flags `TS(7053)` (implicitly 'any' index signature) because the compiler doesn't know the intended shape, often causing developers to lazily suppress it with `@ts-expect-error`. Additionally, keys that might evaluate to nullish variables (e.g. `const name = entry.name` where `name` might be `null`) can silently assign an unwanted property `"null"` to the object when converted to a string index.

**Action:** Explicitly type dynamic accumulator objects as `Record<string, ExpectedType>` rather than leaving them untyped. More importantly, wrap the string-based key assignments in safety checks (e.g., `if (name != null)`) and explicitly coerce the key using `String(name)` to defend against silent coercions masking a runtime assignment bug.

## 2025-02-17 - Patch command generating .orig files
**Learning:** Using `patch` with a diff file can leave `.orig` files hanging around that get accidentally staged and committed, severely polluting the PR and causing code review to fail.
**Action:** When making code modifications, prefer native tools like `replace_with_git_merge_diff` instead of `patch`. If `patch` must be used, explicitly delete `.orig` backup files before committing.
