## 2024-05-18 - [Typed JustHTML options objects]

**Learning:** `JustHTML` and `parseDocument` options destructured default parameters like `options = {}` and used `@ts-expect-error` to suppress compiler warnings instead of explicitly typing the `options` signature.
**Action:** Always define interfaces explicitly like `JustHTMLOptions` and `ParseDocumentOptions` for object parameters (even optional configuration ones), allowing the TS compiler to infer and match properties properly instead of suppressing the errors inside the function body.
## 2024-05-18 - Type Lie Masked by Constructor Defaults
**Learning:** When typing class properties converted from JS, explicitly check the constructor parameters and destructuring defaults. An optional constructor parameter that defaults to `null` means the class property must be typed as `T | null`, even if the intended type is `T` (e.g., `message: string | null` in `ParseError` when `message = null` is passed as a default option). Typing it strictly as `string` creates a type lie that compiles but could crash at runtime if the downstream consumers try to call string methods on a `null` value.
**Action:** When migrating JS classes to TS, always examine the constructor default assignments. If a default is `null`, the corresponding property type must explicitly include `| null`.
## 2025-02-27 - Never filter arrays or add throws to satisfy array type mismatches
**Learning:** Altering code structure (e.g. ignoring `null` returns via `if (val) array.push(val)` or throwing errors when a return was previously unhandled) simply to force compliance with a new strictly-typed array signature violates the foundational rule: "Change runtime behavior to satisfy the type checker".
**Action:** When migrating TS and resolving `TS(2345)` array assignment issues, do not add runtime logic. Instead, type the array variable properly to match the possibility of the nulls from the functions called.
