## 2025-02-18 - Safe Dynamic Object Indexing in Iterations

**Learning:** When dynamically assigning properties to an empty object `{}` during iterations, TypeScript flags `TS(7053)` (implicitly 'any' index signature) because the compiler doesn't know the intended shape, often causing developers to lazily suppress it with `@ts-expect-error`. Additionally, keys that might evaluate to nullish variables (e.g. `const name = entry.name` where `name` might be `null`) can silently assign an unwanted property `"null"` to the object when converted to a string index.

**Action:** Explicitly type dynamic accumulator objects as `Record<string, ExpectedType>` rather than leaving them untyped. More importantly, wrap the string-based key assignments in safety checks (e.g., `if (name != null)`) and explicitly coerce the key using `String(name)` to defend against silent coercions masking a runtime assignment bug.
