## 2025-02-16 - Resolving implicit any in recursive functions
**Learning:** Functions that call themselves recursively and lack an explicit return type will trigger `TS(7023)` and `TS(7022)` (implicitly having an `any` return type) because the compiler cannot infer the type before the recursion resolves. Adding `@ts-expect-error` merely masks this compiler limitation.
**Action:** Always add an explicit return type annotation (e.g., `: string`) to the signature of recursive functions to allow the compiler to correctly resolve types without altering runtime behavior.
