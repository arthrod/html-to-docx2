## 2025-02-18 - Safe Dynamic Object Indexing in Iterations

**Learning:** When dynamically assigning properties to an empty object `{}` during iterations, TypeScript flags `TS(7053)` (implicitly 'any' index signature) because the compiler doesn't know the intended shape, often causing developers to lazily suppress it with `@ts-expect-error`. Additionally, keys that might evaluate to nullish variables (e.g. `const name = entry.name` where `name` might be `null`) can silently assign an unwanted property `"null"` to the object when converted to a string index.

**Action:** Explicitly type dynamic accumulator objects as `Record<string, ExpectedType>` rather than leaving them untyped. More importantly, wrap the string-based key assignments in safety checks (e.g., `if (name != null)`) and explicitly coerce the key using `String(name)` to defend against silent coercions masking a runtime assignment bug.

## 2025-02-17 - Patch command generating .orig files
**Learning:** Using `patch` with a diff file can leave `.orig` files hanging around that get accidentally staged and committed, severely polluting the PR and causing code review to fail.
**Action:** When making code modifications, prefer native tools like `replace_with_git_merge_diff` instead of `patch`. If `patch` must be used, explicitly delete `.orig` backup files before committing.

## 2024-05-24 - Do not change runtime behavior to satisfy TS(2367) dead-code warnings
**Learning:** When addressing `TS(2367)` ("types have no overlap") errors where an inferred literal union is checked against unhandled literal strings (e.g. `enc === 'utf-32'`), adding the missing literal to the function's runtime logic is extremely dangerous, as it alters standard behavior (e.g., WHATWG encoding standard ignores 'utf-32'). Alternatively, attempting to silence it by artificially widening the return type of the upstream function to `string | null` breaks the precise literal inference that TS uses to find dead code, which is "type theater".
**Action:** The correct action is to eliminate the dead code checks (the `if (enc === 'utf-32')` conditions) rather than widening types or modifying runtime output.
