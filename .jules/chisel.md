## 2024-05-18 - Avoid absorbing unions with unknown
**Learning:** Unioning a type with `unknown` (e.g., `TokenAttributeList | null | unknown`) completely absorbs the other types, simplifying the parameter signature entirely to `unknown` and providing zero type safety at the call site.
**Action:** When creating a union type to replace `any`, omit `unknown` to ensure proper type narrowing and compiler enforcement.
